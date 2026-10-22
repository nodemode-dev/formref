#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod reveal;

use std::sync::atomic::{AtomicBool, Ordering};

use serde::Serialize;
use tauri::image::Image;
use tauri::menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, LogicalSize, Manager, WebviewWindow};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

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
    tauri::Builder::default()
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
            let window = app.get_webview_window("main").ok_or("Main window missing")?;
            if let Some(monitor) = window.primary_monitor()? {
                let scale = monitor.scale_factor();
                let width = (f64::from(monitor.size().width) / scale * 0.9).max(960.0);
                let height = (f64::from(monitor.size().height) / scale * 0.9).max(600.0);
                window.set_size(LogicalSize::new(width, height))?;
            }
            window.center()?;
            reveal::conceal(&window);
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
        .run(tauri::generate_context!())
        .expect("FormRef desktop shell could not start");
}
