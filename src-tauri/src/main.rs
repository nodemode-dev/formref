#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::atomic::{AtomicBool, Ordering};

use serde::Serialize;
use tauri::{Emitter, LogicalSize, Manager, WebviewWindow};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

/// Click-through has no getter in Tauri, so the shell remembers it. While it is on, the window cannot be
/// clicked at all, which is why a global shortcut (Ctrl or Cmd + Alt + K) can always turn it back off.
static CLICK_THROUGH: AtomicBool = AtomicBool::new(false);
/// Always on bottom has no getter either. It keeps the board behind other windows, like a desktop backdrop.
static ON_BOTTOM: AtomicBool = AtomicBool::new(false);

#[derive(Serialize)]
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
    read_window_state(&window)
}

#[tauri::command]
fn window_start_drag(window: WebviewWindow) -> Result<(), String> {
    main_window_only(&window)?;
    window.start_dragging().map_err(|error| error.to_string())
}

fn main() {
    let toggle = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyK);
    #[cfg(target_os = "macos")]
    let toggle = Shortcut::new(Some(Modifiers::SUPER | Modifiers::ALT), Code::KeyK);
    tauri::Builder::default()
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, shortcut, event| {
                    if shortcut == &toggle && event.state() == ShortcutState::Pressed {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = set_click_through(&window, !CLICK_THROUGH.load(Ordering::SeqCst));
                        }
                    }
                })
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            window_configure,
            window_state,
            window_start_drag
        ])
        .setup(move |app| {
            let window = app.get_webview_window("main").ok_or("Main window missing")?;
            if let Some(monitor) = window.primary_monitor()? {
                let scale = monitor.scale_factor();
                let width = (f64::from(monitor.size().width) / scale * 0.9).max(960.0);
                let height = (f64::from(monitor.size().height) / scale * 0.9).max(600.0);
                window.set_size(LogicalSize::new(width, height))?;
            }
            window.center()?;
            window.show()?;
            // The escape hatch for click-through; if another app owns the keys the shell still runs.
            if let Err(error) = app.global_shortcut().register(toggle) {
                eprintln!("FormRef: click-through shortcut unavailable: {error}");
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("FormRef desktop shell could not start");
}
