# FormRef desktop context

## Org-navi-map

```text
src-tauri/
  Cargo.toml                         Pinned native shell dependencies
  Cargo.lock                         Resolved native dependency graph
  build.rs                           Application command ACL generation
  tauri.conf.json                    Loopback URLs and window security
  capabilities/main-window.json      Main webview permission boundary
  permissions/window-controls.toml   Explicit native command grants
  src/main.rs                        Native window modes and launch sizing
```

## v0.5.1 · Always on bottom

`window_configure` takes `always_on_bottom`. Tauri has no getter for it, so `ON_BOTTOM` remembers it like `CLICK_THROUGH`, and `window_state` reports it. On top and on bottom exclude each other in the shell itself (turning one on turns the other off), and the reply carries the whole state so Preferences shows both boxes truthfully. Compiled on Linux; not observed, because Xvfb has no window manager to stack windows.

## v0.4.8 · First compiled run, opacity and click-through

The shell was compiled for the first time (Rust 1.97, WebKitGTK 4.1 2.52 installed from Ubuntu) and run under Xvfb against the Vite dev server and the FastAPI service: the window appeared, the board loaded through the loopback service, and the UI rendered in WebKit. That exposed one WebKit-only defect: SVG icons created by script inside grid rows had no size and drew at 300 by 150 (Chromium clipped them), fixed with explicit sizes in `shell.css`.

New window modes: the window is now transparent (with `macOSPrivateApi` for macOS) and its page opacity is set from Preferences, so the board can sit see-through over other apps, as in PureRef. Click-through calls `set_ignore_cursor_events`; because a click-through window cannot be clicked, `tauri-plugin-global-shortcut` registers Ctrl+Alt+K (Cmd+Alt+K on macOS) from Rust to turn it back off, and the shell emits `formref://window` so the Preferences checkbox follows. Run under Xvfb: the window's X input shape was the full 1296 by 810 window, shrank to 1 by 1 after Ctrl+Alt+K, and returned to the full window after a second Ctrl+Alt+K. Not checked here: always-on-top and opacity need a window manager and compositor, which Xvfb does not have; macOS and Windows were not built.

## Contents

- [Cargo.toml](#cargotoml)
- [build.rs](#buildrs)
- [tauri.conf.json](#tauriconfjson)
- [capabilities/main-window.json](#capabilitiesmain-windowjson)
- [permissions/window-controls.toml](#permissionswindow-controlstoml)
- [src/main.rs](#srcmainrs)

## Cargo.toml

### Cargo.toml · dependencies

- refers-to: Cargo.toml :: dependencies
- kind: rationale
- logged: v0.1.0 · 2026-10-10

Tauri 2.12.3 and tauri-build 2.7.2 are exact pins with a declared Rust 1.90 minimum from their crate metadata. Serde 1.0.228 satisfies tauri-build's cargo_toml dependency; the initial 1.0.219 pin failed Cargo resolution and was corrected in one region. No shell, filesystem, dialog, updater or global-shortcut plugins enter the renderer surface. Cargo.lock records actual dependency resolution. The shell's own source uses Apache-2.0; dependency code is Apache-2.0 OR MIT.

## build.rs

### build.rs · main

- refers-to: build.rs :: main
- kind: rationale
- logged: v0.1.0 · 2026-10-10

AppManifest declares all three custom commands so application IPC access is governed by capability permissions rather than the unrestricted command default. Permission identifiers are explicitly authored in window-controls.toml.

## tauri.conf.json

### tauri.conf.json · build and bundle

- refers-to: tauri.conf.json :: build, bundle
- kind: rationale
- logged: v0.1.0 · 2026-10-10

This is a development desktop shell. The CLI owns the Vite beforeDevCommand. The repository launcher owns the backend process and cleanup. Release source loads the externally running loopback backend at port 8196, which serves the frontend and API on one origin. Bundle output is disabled; this is not a standalone installer and no backend binary is bundled.

### tauri.conf.json · security and window

- refers-to: tauri.conf.json :: app.security, app.windows
- kind: rationale
- logged: v0.1.0 · 2026-10-10

The window starts hidden with an opaque dark background, is sized and centered in setup, then shown. Browser drag/drop is enabled by disabling Tauri's native drag/drop interception. CSP permits local assets, data/blob media and inline style mutations; frame content, object content and form submissions are denied. Both policies whitelist only the exact 240-byte inline theme bootstrap with sha256-yBVVSQpNPuoZdx1EtiNlrAvz6wJCMF7+zoplR8Xa+Mg=. The source and built HTML have matching bootstrap bytes, and their hashes were checked against both policy script-src directives. Recompute this hash after changing the bootstrap; native CSP execution remains unverified. Development additionally permits Vite's loopback websocket. The three optional native controls use global Tauri IPC; there is no general shell or filesystem permission.

## capabilities/main-window.json

### capabilities/main-window.json · permissions

- refers-to: capabilities/main-window.json :: windows, remote, permissions
- kind: warning-context
- logged: v0.1.0 · 2026-10-10

Only the main window and exact development/production loopback URL ports receive the three command grants. An external website receives none. The commands only alter or inspect the calling main window. Changing the frontend or backend port requires this boundary to be updated deliberately.

## permissions/window-controls.toml

### permissions/window-controls.toml · permission entries

- refers-to: permissions/window-controls.toml :: permission entries
- kind: explainer
- logged: v0.1.0 · 2026-10-10

formref-window-configure grants window_configure. formref-window-state grants window_state. formref-window-start-drag grants window_start_drag. No core default permission set is granted.

## src/main.rs

### src/main.rs · window_configure and read_window_state

- refers-to: src/main.rs :: window_configure, read_window_state, window_start_drag
- kind: explainer
- logged: v0.1.0 · 2026-10-10

The frontend sends optional camelCase alwaysOnTop, fullscreen and decorations arguments. Each successful call reads native state back. Missing keys leave their modes untouched. An explicit pointer gesture can drag a frameless window. Every command rejects a non-main calling window. Native API failures propagate as rejected IPC promises.

### src/main.rs · setup

- refers-to: src/main.rs :: setup closure
- kind: rationale
- logged: v0.1.0 · 2026-10-10

Initial dimensions are 90 percent of the primary monitor in logical pixels, with a 960 by 600 layout floor. The configured 1280 by 800 size is the fallback if no primary monitor can be identified. Mixed-DPI sizing and each window mode remain hardware checks.

### src/main.rs · native verification

- refers-to: src/main.rs :: application compilation and runtime
- kind: todo
- logged: v0.1.0 · 2026-10-10

Cargo resolved and fetched dependencies, then compilation stopped in glib-sys because the host has no pkg-config executable. Installed npm CLI version 2.12.1 and tauri info read the configuration successfully; info reports missing webkit2gtk-4.1 and rsvg2. The desktop application did not compile or run here. macOS compilation, native mode behavior, startup/shutdown and window geometry need on-device verification. No signed installer, frozen backend, per-image overlay, click-through, global shortcut or collaborative hosting is implemented by this shell.
