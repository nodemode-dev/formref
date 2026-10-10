#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use tauri::{LogicalSize, Manager, WebviewWindow};

#[derive(Serialize)]
struct WindowState {
    always_on_top: bool,
    fullscreen: bool,
    decorations: bool,
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
        fullscreen: window.is_fullscreen().map_err(|error| error.to_string())?,
        decorations: window.is_decorated().map_err(|error| error.to_string())?,
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
    fullscreen: Option<bool>,
    decorations: Option<bool>,
) -> Result<WindowState, String> {
    main_window_only(&window)?;
    if let Some(value) = always_on_top {
        window.set_always_on_top(value).map_err(|error| error.to_string())?;
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
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            window_configure,
            window_state,
            window_start_drag
        ])
        .setup(|app| {
            let window = app.get_webview_window("main").ok_or("Main window missing")?;
            if let Some(monitor) = window.primary_monitor()? {
                let scale = monitor.scale_factor();
                let width = (f64::from(monitor.size().width) / scale * 0.9).max(960.0);
                let height = (f64::from(monitor.size().height) / scale * 0.9).max(600.0);
                window.set_size(LogicalSize::new(width, height))?;
            }
            window.center()?;
            window.show()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("FormRef desktop shell could not start");
}
