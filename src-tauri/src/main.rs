#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod engine_start;
mod reveal;
#[cfg(windows)]
mod win_job;
#[cfg(windows)]
mod win_say;

use std::fs::{self, File};
use std::io::{BufRead, BufReader, Write};
use std::net::{SocketAddr, TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::process::{Child, ChildStdout, Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{mpsc, Mutex};
use std::time::{Duration, Instant};

use serde::Serialize;
use tauri::image::Image;
use tauri::menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, LogicalSize, Manager, RunEvent, WebviewUrl, WebviewWindow, WebviewWindowBuilder};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

/// The port the dev service, the command line and outside MCP clients use; the app takes it when it is free.
const ENGINE_PORT: u16 = 8320;

/// The bundled engine (FastAPI service), started by a packaged app and stopped when it exits.
struct Engine(Mutex<Option<Child>>);

fn engine_port() -> Result<u16, String> {
    let preferred = SocketAddr::from(([127, 0, 0, 1], ENGINE_PORT));
    let taken = TcpStream::connect_timeout(&preferred, Duration::from_millis(200)).is_ok();
    if !taken && TcpListener::bind(preferred).is_ok() {
        return Ok(ENGINE_PORT);
    }
    let listener = TcpListener::bind(("127.0.0.1", 0)).map_err(|error| format!("no free loopback port: {error}"))?;
    listener.local_addr().map(|address| address.port()).map_err(|error| error.to_string())
}

/// Tauri installs each externalBin beside the app's own executable, without the target triple.
fn sidecar(name: &str) -> Result<PathBuf, String> {
    let exe = std::env::current_exe().map_err(|error| error.to_string())?;
    let dir = exe.parent().ok_or("the app's folder could not be found")?;
    let path = dir.join(if cfg!(windows) { format!("{name}.exe") } else { name.to_string() });
    if path.is_file() {
        Ok(path)
    } else {
        Err(format!("{name} is missing from this install ({})", path.display()))
    }
}

const KEY_LINE: &str = "formref-window-key: ";

fn relay_engine_output(stdout: ChildStdout, mut log: File, keys: mpsc::Sender<String>) {
    let mut reader = BufReader::new(stdout);
    let mut raw = Vec::new();
    let mut handed = false;
    loop {
        raw.clear();
        match reader.read_until(b'\n', &mut raw) {
            Ok(0) | Err(_) => break,
            Ok(_) => {}
        }
        let text = String::from_utf8_lossy(&raw);
        let line = text.trim_end();
        if !handed {
            if let Some(key) = line.strip_prefix(KEY_LINE) {
                if key.len() >= 32 && key.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_') {
                    handed = keys.send(key.to_string()).is_ok();
                    continue;
                }
            }
        }
        let _ = writeln!(log, "{line}");
    }
}

fn start_engine(app: &AppHandle, port: u16) -> Result<(Child, PathBuf, mpsc::Receiver<String>), engine_start::Failure> {
    let engine = sidecar("formref-engine").map_err(|_| engine_start::Failure::Missing)?;
    let core = sidecar("formref-core").map_err(engine_start::Failure::NotStarted)?;
    let logs = app.path().app_log_dir().map_err(|error| engine_start::Failure::NotStarted(error.to_string()))?;
    fs::create_dir_all(&logs).map_err(|error| engine_start::Failure::NotStarted(format!("{}: {error}", logs.display())))?;
    let log_path = logs.join("engine.log");
    let log = File::create(&log_path).map_err(|error| engine_start::Failure::NotStarted(format!("{}: {error}", log_path.display())))?;
    let err = log.try_clone().map_err(|error| engine_start::Failure::NotStarted(error.to_string()))?;
    let mut command = Command::new(engine);
    command
        .env("FORMREF_PORT", port.to_string())
        .env("FORMREF_API_URL", format!("http://127.0.0.1:{port}"))
        .env("FORMREF_ENGINE_PATH", core)
        .env(engine_start::SHELL_ENV, std::process::id().to_string())
        .env(engine_start::OLD_SHELL_ENV, std::process::id().to_string())
        .env("FORMREF_WINDOW_KEY_STDOUT", "1")
        .current_dir(&logs)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(err);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x0800_0000);
    }
    let mut child = command.spawn().map_err(|error| engine_start::Failure::NotStarted(error.to_string()))?;
    #[cfg(windows)]
    win_job::hold(&child);
    let (sender, keys) = mpsc::channel();
    if let Some(stdout) = child.stdout.take() {
        std::thread::spawn(move || relay_engine_output(stdout, log, sender));
    }
    Ok((child, log_path, keys))
}

fn wait_for(port: u16, child: &mut Child) -> Result<(), engine_start::Failure> {
    let address = SocketAddr::from(([127, 0, 0, 1], port));
    let limit = engine_start::Wait::Address.limit();
    let started = Instant::now();
    while started.elapsed() < limit {
        if let Ok(Some(status)) = child.try_wait() {
            return Err(engine_start::Failure::Stopped(status.code()));
        }
        if TcpStream::connect_timeout(&address, Duration::from_millis(250)).is_ok() {
            return Ok(());
        }
        std::thread::sleep(Duration::from_millis(150));
    }
    Err(engine_start::Failure::TimedOut(engine_start::Wait::Address))
}

fn engine_exit_code(app: &AppHandle) -> Option<i32> {
    let state = app.try_state::<Engine>()?;
    let mut waited = Duration::ZERO;
    while waited < engine_start::EXIT_WAIT {
        if let Ok(mut slot) = state.0.lock() {
            let seen = slot.as_mut().map(|child| child.try_wait());
            match seen {
                Some(Ok(Some(status))) => return status.code(),
                Some(Ok(None)) => {}
                _ => return None,
            };
        }
        std::thread::sleep(engine_start::EXIT_STEP);
        waited += engine_start::EXIT_STEP;
    }
    None
}

fn stop_engine(app: &AppHandle) {
    if let Some(state) = app.try_state::<Engine>() {
        if let Ok(mut slot) = state.0.lock() {
            if let Some(mut child) = slot.take() {
                #[cfg(windows)]
                win_job::end();
                // The onefile engine is a launcher with the server as its child: asked to stop, it stops the server
                // and removes the folder it unpacked; a forced kill reaches only the launcher and leaves both behind.
                #[cfg(unix)]
                {
                    let pid = child.id().to_string();
                    let asked = Command::new("kill")
                        .args(["-TERM", pid.as_str()])
                        .stdout(Stdio::null())
                        .stderr(Stdio::null())
                        .status()
                        .is_ok_and(|status| status.success());
                    if asked {
                        for _ in 0..30 {
                            std::thread::sleep(Duration::from_millis(50));
                            if matches!(child.try_wait(), Ok(Some(_))) {
                                return;
                            }
                        }
                    }
                }
                let _ = child.kill();
                let _ = child.wait();
            }
        }
    }
}

/// A link the page opens in a new window (a link card, a Markdown link, a cloud sign-in) goes to the system
/// browser: the web view opens no window of its own, so without this the link did nothing.
fn open_outside(url: &str) {
    #[cfg(target_os = "macos")]
    let mut command = Command::new("open");
    #[cfg(windows)]
    let mut command = {
        let mut command = Command::new("rundll32");
        command.arg("url.dll,FileProtocolHandler");
        command
    };
    #[cfg(all(unix, not(target_os = "macos")))]
    let mut command = Command::new("xdg-open");
    if let Ok(mut child) = command.arg(url).stdin(Stdio::null()).stdout(Stdio::null()).stderr(Stdio::null()).spawn() {
        std::thread::spawn(move || {
            let _ = child.wait();
        });
    }
}

/// Builds the main window from its config entry (created by hand, `create: false`). A packaged app points it
/// at the engine's own origin, which serves the window and the API together, so relative `/api` calls,
/// event streams and terminal sockets work as they do from `./formref serve`. Dev keeps the configured URL,
/// which Tauri resolves against `devUrl` (Vite, which proxies `/api` to 8320).
fn open_main(app: &AppHandle, port: Option<u16>, key: Option<String>) -> Result<(), String> {
    let mut config = app.config().app.windows.iter().find(|window| window.label == "main").cloned().ok_or("Main window missing")?;
    if let Some(port) = port {
        let url = tauri::Url::parse(&format!("http://127.0.0.1:{port}/")).map_err(|error| error.to_string())?;
        config.url = WebviewUrl::External(url);
    }
    let builder = WebviewWindowBuilder::from_config(app, &config).map_err(|error| error.to_string())?;
    let builder = match (port, key) {
        (Some(port), Some(key)) => builder.initialization_script(format!(
            "if (window.location.origin === {}) {{ window.__FORMREF_WINDOW_KEY = {}; }}",
            js_string(&format!("http://127.0.0.1:{port}")),
            js_string(&key)
        )),
        _ => builder,
    };
    // The macOS web view cancels every download unless a handler is set, so exports and Save Board did nothing
    // there. With one, the file goes to the Downloads folder and the page is told when it has arrived.
    #[cfg(not(windows))]
    let builder = builder.on_download(|webview, event| {
        if let tauri::webview::DownloadEvent::Finished { success, .. } = event {
            let _ = webview.emit("formref://download", success);
        }
        true
    });
    let builder = builder.on_new_window(|url, _features| {
        if matches!(url.scheme(), "http" | "https") {
            open_outside(url.as_str());
        }
        tauri::webview::NewWindowResponse::Deny
    });
    let window = builder.build().map_err(|error| error.to_string())?;
    if let Some(monitor) = window.primary_monitor().map_err(|error| error.to_string())? {
        let scale = monitor.scale_factor();
        let width = (f64::from(monitor.size().width) / scale * 0.9).max(960.0);
        let height = (f64::from(monitor.size().height) / scale * 0.9).max(600.0);
        window.set_size(LogicalSize::new(width, height)).map_err(|error| error.to_string())?;
    }
    window.center().map_err(|error| error.to_string())?;
    reveal::conceal(&window);
    Ok(())
}

fn js_string(text: &str) -> String {
    let mut out = String::from("\"");
    for c in text.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            c if (c as u32) < 0x20 || c == '\u{2028}' || c == '\u{2029}' => out.push_str(&format!("\\u{:04x}", c as u32)),
            c => out.push(c),
        }
    }
    out.push('"');
    out
}

fn fail(app: &AppHandle, failure: engine_start::Failure, log: Option<&Path>) {
    let failure = match failure {
        engine_start::Failure::Stopped(None) => engine_start::Failure::Stopped(engine_exit_code(app)),
        other => other,
    };
    let tail = log.and_then(|path| fs::read(path).ok()).map(|raw| engine_start::last_lines(&String::from_utf8_lossy(&raw))).unwrap_or_default();
    let message = engine_start::message(&failure, &tail, log);
    eprintln!("{message}");
    if let Some(splash) = app.get_webview_window("splash") {
        let text = js_string(&message);
        let _ = splash.set_size(LogicalSize::new(640.0, 420.0));
        let _ = splash.center();
        let _ = splash.eval(&format!(
            "var p=document.querySelector('p');p.textContent={text};p.style.height='auto';p.style.lineHeight='17px';p.style.padding='0 24px';p.style.whiteSpace='pre-wrap';p.style.overflowWrap='anywhere';p.style.userSelect='text';p.style.webkitUserSelect='text';document.body.style.paddingTop='24px';document.body.style.overflowY='auto';document.querySelector('.bar').style.display='none';"
        ));
        let _ = splash.show();
    }
    #[cfg(windows)]
    win_say::error(engine_start::APP, &message);
    #[cfg(not(windows))]
    hold_until_closed(app);
    stop_engine(app);
    app.exit(1);
}

#[cfg(not(windows))]
fn hold_until_closed(app: &AppHandle) {
    let Some(splash) = app.get_webview_window("splash") else { return };
    let _ = splash.set_decorations(true);
    let _ = splash.set_resizable(true);
    let _ = splash.set_closable(true);
    let _ = splash.set_focus();
    while app.get_webview_window("splash").is_some() {
        std::thread::sleep(engine_start::HELD_STEP);
    }
}

fn start(app: &AppHandle, log: &mut Option<PathBuf>) -> Result<(u16, String), engine_start::Failure> {
    let port = engine_port().map_err(engine_start::Failure::NotStarted)?;
    let (mut child, path, keys) = start_engine(app, port)?;
    *log = Some(path);
    let ready = wait_for(port, &mut child);
    if let Ok(mut slot) = app.state::<Engine>().0.lock() {
        *slot = Some(child);
    }
    ready?;
    let key = keys.recv_timeout(engine_start::Wait::Key.limit()).map_err(|error| match error {
        mpsc::RecvTimeoutError::Timeout => engine_start::Failure::TimedOut(engine_start::Wait::Key),
        mpsc::RecvTimeoutError::Disconnected => engine_start::Failure::Stopped(None),
    })?;
    Ok((port, key))
}

fn boot(app: AppHandle) {
    let mut log = None;
    let opened = start(&app, &mut log).and_then(|(port, key)| {
        open_main(&app, Some(port), Some(key)).map_err(|error| {
            eprintln!("FormRef: {error}");
            engine_start::Failure::Window
        })
    });
    if let Err(failure) = opened {
        fail(&app, failure, log.as_deref());
    }
}

/// Click-through has no getter in Tauri, so the shell remembers it. While it is on, the window cannot be
/// clicked at all, which is why a global shortcut (Ctrl or Cmd + Alt + K) can always turn it back off.
static CLICK_THROUGH: AtomicBool = AtomicBool::new(false);
/// Always on bottom has no getter either. It keeps the board behind other windows, like a desktop backdrop.
static ON_BOTTOM: AtomicBool = AtomicBool::new(false);

#[derive(Serialize, Clone)]
struct WindowState {
    always_on_top: bool,
    always_on_bottom: bool,
    fullscreen: bool,
    decorations: bool,
    click_through: bool,
}

fn set_click_through(window: &WebviewWindow, value: bool) -> Result<(), String> {
    window.set_ignore_cursor_events(value).map_err(|error| error.to_string())?;
    CLICK_THROUGH.store(value, Ordering::SeqCst);
    window.emit("formref://window", value).map_err(|error| error.to_string())
}

fn main_window_only(window: &WebviewWindow) -> Result<(), String> {
    if window.label() != "main" {
        return Err("Desktop controls are limited to the main window".into());
    }
    Ok(())
}

fn read_window_state(window: &WebviewWindow) -> Result<WindowState, String> {
    main_window_only(window)?;
    Ok(WindowState {
        always_on_top: window.is_always_on_top().map_err(|error| error.to_string())?,
        always_on_bottom: ON_BOTTOM.load(Ordering::SeqCst),
        fullscreen: window.is_fullscreen().map_err(|error| error.to_string())?,
        decorations: window.is_decorated().map_err(|error| error.to_string())?,
        click_through: CLICK_THROUGH.load(Ordering::SeqCst),
    })
}

/// Summon or dismiss: a hidden, minimised or unfocused window comes to the front; a focused one hides.
fn toggle_visible(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let shown = window.is_visible().unwrap_or(false) && !window.is_minimized().unwrap_or(false);
        if shown && window.is_focused().unwrap_or(false) {
            let _ = window.hide();
        } else {
            let _ = window.unminimize();
            let _ = window.show();
            let _ = window.set_focus();
        }
    }
}

/// Tells the page the window changed from outside it (tray or shortcut), so its desktop checkboxes stay honest.
fn announce(window: &WebviewWindow) {
    sync_tray(window);
    if let Ok(state) = read_window_state(window) {
        let _ = window.emit("formref://window-state", state);
    }
}

/// The tray's check marks, kept in step whichever way a mode changed (page, tray or shortcut).
struct TrayChecks {
    top: CheckMenuItem<tauri::Wry>,
    through: CheckMenuItem<tauri::Wry>,
}

fn sync_tray(window: &WebviewWindow) {
    if let Some(checks) = window.app_handle().try_state::<TrayChecks>() {
        let _ = checks.top.set_checked(window.is_always_on_top().unwrap_or(false));
        let _ = checks.through.set_checked(CLICK_THROUGH.load(Ordering::SeqCst));
    }
}

fn build_tray(app: &tauri::App) -> tauri::Result<()> {
    let show = MenuItem::with_id(app, "toggle", "Show or Hide FormRef", true, None::<&str>)?;
    let top = CheckMenuItem::with_id(app, "top", "Always on Top", true, false, None::<&str>)?;
    let through = CheckMenuItem::with_id(app, "through", "Click-through", true, false, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit FormRef", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &PredefinedMenuItem::separator(app)?, &top, &through, &PredefinedMenuItem::separator(app)?, &quit])?;
    app.manage(TrayChecks { top: top.clone(), through: through.clone() });
    TrayIconBuilder::with_id("formref")
        .icon(Image::from_bytes(include_bytes!("../icons/icon.png"))?)
        .tooltip("FormRef")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(move |app, event| {
            let window = app.get_webview_window("main");
            match event.id().as_ref() {
                "toggle" => toggle_visible(app),
                "top" => if let Some(window) = window {
                    let on = !window.is_always_on_top().unwrap_or(false);
                    if on && ON_BOTTOM.swap(false, Ordering::SeqCst) { let _ = window.set_always_on_bottom(false); }
                    let _ = window.set_always_on_top(on);
                    announce(&window);
                },
                "through" => if let Some(window) = window {
                    let _ = set_click_through(&window, !CLICK_THROUGH.load(Ordering::SeqCst));
                    announce(&window);
                },
                "quit" => app.exit(0),
                _ => {}
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                toggle_visible(tray.app_handle());
            }
        })
        .build(app)?;
    Ok(())
}

#[tauri::command]
fn window_state(window: WebviewWindow) -> Result<WindowState, String> {
    read_window_state(&window)
}

#[tauri::command]
fn window_configure(
    window: WebviewWindow,
    always_on_top: Option<bool>,
    always_on_bottom: Option<bool>,
    fullscreen: Option<bool>,
    decorations: Option<bool>,
    click_through: Option<bool>,
) -> Result<WindowState, String> {
    main_window_only(&window)?;
    if let Some(value) = click_through {
        set_click_through(&window, value)?;
    }
    // On top and on bottom exclude each other: turning one on turns the other off.
    if let Some(value) = always_on_top {
        if value && ON_BOTTOM.swap(false, Ordering::SeqCst) {
            window.set_always_on_bottom(false).map_err(|error| error.to_string())?;
        }
        window.set_always_on_top(value).map_err(|error| error.to_string())?;
    }
    if let Some(value) = always_on_bottom {
        if value {
            window.set_always_on_top(false).map_err(|error| error.to_string())?;
        }
        window.set_always_on_bottom(value).map_err(|error| error.to_string())?;
        ON_BOTTOM.store(value, Ordering::SeqCst);
    }
    if let Some(value) = fullscreen {
        window.set_fullscreen(value).map_err(|error| error.to_string())?;
    }
    if let Some(value) = decorations {
        window.set_decorations(value).map_err(|error| error.to_string())?;
    }
    sync_tray(&window);
    read_window_state(&window)
}

#[derive(Serialize)]
struct Placement {
    x: f64,
    y: f64,
    width: f64,
    height: f64,
}

/// The window's outer position and inner size in logical pixels, the units a saved board layout uses.
#[tauri::command]
fn window_layout(window: WebviewWindow) -> Result<Placement, String> {
    main_window_only(&window)?;
    let scale = window.scale_factor().map_err(|error| error.to_string())?;
    let position = window.outer_position().map_err(|error| error.to_string())?.to_logical::<f64>(scale);
    let size = window.inner_size().map_err(|error| error.to_string())?.to_logical::<f64>(scale);
    Ok(Placement { x: position.x, y: position.y, width: size.width, height: size.height })
}

/// Moves and sizes the window to a saved layout, kept on a connected monitor so a layout from a larger
/// or since-unplugged screen never leaves the window out of reach.
#[tauri::command]
fn window_place(window: WebviewWindow, x: f64, y: f64, width: f64, height: f64) -> Result<Placement, String> {
    main_window_only(&window)?;
    if ![x, y, width, height].iter().all(|value| value.is_finite()) || width < 200.0 || height < 200.0 {
        return Err("Window layout is out of range".into());
    }
    let monitors = window.available_monitors().map_err(|error| error.to_string())?;
    let fits = |m: &tauri::Monitor| {
        let scale = m.scale_factor();
        let p = m.position().to_logical::<f64>(scale);
        let s = m.size().to_logical::<f64>(scale);
        (x + 40.0 >= p.x && x + 40.0 <= p.x + s.width && y + 20.0 >= p.y && y + 20.0 <= p.y + s.height).then_some((p, s))
    };
    let (mut x, mut y, mut width, mut height) = (x, y, width, height);
    match monitors.iter().find_map(fits) {
        Some((p, s)) => {
            width = width.min(s.width);
            height = height.min(s.height);
            x = x.min(p.x + s.width - width).max(p.x);
            y = y.min(p.y + s.height - height).max(p.y);
        }
        None => {
            if let Some(monitor) = window.primary_monitor().map_err(|error| error.to_string())? {
                let s = monitor.size().to_logical::<f64>(monitor.scale_factor());
                let p = monitor.position().to_logical::<f64>(monitor.scale_factor());
                width = width.min(s.width);
                height = height.min(s.height);
                x = p.x + (s.width - width) / 2.0;
                y = p.y + (s.height - height) / 2.0;
            }
        }
    }
    window.set_size(LogicalSize::new(width, height)).map_err(|error| error.to_string())?;
    window.set_position(tauri::LogicalPosition::new(x, y)).map_err(|error| error.to_string())?;
    window_layout(window)
}

#[tauri::command]
fn window_start_drag(window: WebviewWindow) -> Result<(), String> {
    main_window_only(&window)?;
    window.start_dragging().map_err(|error| error.to_string())
}

fn main() {
    reveal::mark_launch();
    let toggle =Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyK);
    #[cfg(target_os = "macos")]
    let toggle = Shortcut::new(Some(Modifiers::SUPER | Modifiers::ALT), Code::KeyK);
    // Summon: brings FormRef to the front from any app, or hides it when it already has focus.
    let summon = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyF);
    #[cfg(target_os = "macos")]
    let summon = Shortcut::new(Some(Modifiers::SUPER | Modifiers::ALT), Code::KeyF);
    let app = tauri::Builder::default()
        .manage(Engine(Mutex::new(None)))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, shortcut, event| {
                    if event.state() != ShortcutState::Pressed { return; }
                    if shortcut == &toggle {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = set_click_through(&window, !CLICK_THROUGH.load(Ordering::SeqCst));
                            sync_tray(&window);
                        }
                    } else if shortcut == &summon {
                        toggle_visible(app);
                    }
                })
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            window_configure,
            window_state,
            window_start_drag,
            window_layout,
            window_place,
            reveal::app_ready
        ])
        .setup(move |app| {
            reveal::round_splash(app.handle());
            // A packaged app starts its own engine and opens the window on it once it answers; a dev shell
            // (./formref desktop) uses the service and Vite server the launcher started.
            if cfg!(debug_assertions) {
                open_main(app.handle(), None, None)?;
            } else {
                let handle = app.handle().clone();
                std::thread::spawn(move || boot(handle));
            }
            // The escape hatch for click-through; if another app owns the keys the shell still runs.
            if let Err(error) = app.global_shortcut().register(toggle) {
                eprintln!("FormRef: click-through shortcut unavailable: {error}");
            }
            if let Err(error) = app.global_shortcut().register(summon) {
                eprintln!("FormRef: show and hide shortcut unavailable: {error}");
            }
            // A desktop without a tray (some Linux sessions) still runs; the summon shortcut remains.
            if let Err(error) = build_tray(app) {
                eprintln!("FormRef: tray icon unavailable: {error}");
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("FormRef desktop shell could not start");
    app.run(|handle, event| {
        if let RunEvent::Exit = event {
            stop_engine(handle);
        }
    });
}
