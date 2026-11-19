# FormRef desktop context

## Org-navi-map

```text
src-tauri/
  Cargo.toml                         Pinned native shell dependencies
  Cargo.lock                         Resolved native dependency graph
  build.rs                           Application command ACL generation
  tauri.conf.json                    Bundled window, sidecars, installers and window security
  tauri.dev.conf.json                Dev merge: no sidecars for ./formref desktop
  entitlements.plist                 macOS hardened runtime exceptions for the onefile engine
  capabilities/main-window.json      Main webview permission boundary
  permissions/window-controls.toml   Explicit native command grants
  src/main.rs                        Engine sidecar, native window modes and launch sizing
  binaries/                          Frozen sidecars per host triple (built, not tracked)
```

## Unreleased · The engine hands the window its key

- refers-to: src/main.rs :: relay_engine_output, start_engine, boot, open_main

The shell starts the engine with `FORMREF_WINDOW_KEY_STDOUT=1` and a piped standard output instead of the log file. `relay_engine_output` runs on its own thread for as long as the engine runs: it reads bytes up to each newline, so odd bytes cannot stop it and the pipe never fills, sends the one `formref-window-key: ` line to a channel (never to the log) and writes every other line to `engine.log`. `boot` waits for the engine's port as before, then waits at most 10 seconds for the key on the channel and shows the splash message if it never comes. `open_main` adds one `initialization_script` that sets `window.__FORMREF_WINDOW_KEY` only when `location.origin` is the engine's own `http://127.0.0.1:<port>`; the dev shell passes no key and the page asks the development bootstrap instead. The method is `WebviewWindowBuilder::initialization_script(self, impl Into<String>) -> Self` in tauri 2.12.3 (the pinned version, read from its source). This could not be compiled here.

## v0.39.0 · Downloads, outside links, a clean engine stop and the menu permission

- refers-to: src/main.rs :: open_main, open_outside, stop_engine; capabilities/main-window.json :: permissions; tauri.conf.json :: app.security.csp (unchanged)

Downloads. The page saves every export, Save Board, Save Image and attachment with a link that carries the `download` attribute. On macOS the web view cancels such a navigation unless the shell set a download handler (wry 0.57 `wkwebview/navigation.rs`: `shouldPerformDownload` with no handler answers Cancel), and Tauri sets one only when the window was built with `on_download`. So in the packaged macOS app those commands did nothing. `open_main` now sets a handler on macOS and Linux that lets every download start; the web view then writes the file to the Downloads folder under a name that does not overwrite, and the shell emits `formref://download` with the result so the page can say where the file went. Windows keeps WebView2's own download handling.

Outside links. `window.open` and `target="_blank"` (link cards, Markdown links, a picture's source link, cloud sign-in) ask the web view for a new window, and with no handler it opens none, so the links did nothing. `on_new_window` denies the window and hands http and https addresses to the system (`open`, `xdg-open`, `rundll32 url.dll,FileProtocolHandler`), with no new dependency.

Engine stop. The onefile engine is a launcher with the server as its child. `child.kill()` reached only the launcher: the server lived on until it noticed the shell was gone, and the folder the launcher unpacked stayed in the temp folder after every quit (formvis met the same and measured 5.3 GB of such folders). `stop_engine` asks first with `kill -TERM` on Unix, which the launcher passes on and then cleans up, waits up to 1.5 s, and only then forces. On Windows the forced stop remains, and the unpacked folder is left in `%TEMP%`.

Menu permission. The macOS menu bar is built by the page through `window.__TAURI__.menu`, so the capability gained `core:default`, which holds the core menu permissions. No Rust command was added.

The CSP hash. `app.security.csp` allows one inline script by hash. That hash is the head script of `index.html` at 0.1.0, when the shell loaded the page from the bundle. Since 0.38.0 the main window is `WebviewUrl::External` at the engine's `http://127.0.0.1` origin, which sends no CSP header, so this CSP governs only the bundled splash, whose inline script Tauri hashes itself at build time. The stale hash is inert and the page's new inline scripts need none; it was left in place.

Signed without notarization. `bundle.macOS` keeps `hardenedRuntime` and `entitlements.plist` (library validation off, unsigned executable memory allowed). Tauri's bundler passes the entitlements file to every sign target and signs each `externalBin` in `Contents/MacOS` as an executable with the hardened runtime (read in the bundler's `macos/sign.rs` and `app.rs`), so the onefile engine may load the libraries PyInstaller signed ad hoc. What no build setting changes: Gatekeeper refuses the first open of a downloaded app that is not notarized until the person chooses Open Anyway.

Verified: `cargo check` for Linux and for `aarch64-apple-darwin` passes. Not verified: the shell was never built or run here, on any system; every behaviour above is read from the sources.

## v0.38.1 · formref-core links the C runtime statically on Windows

`../build_app.bat` builds `formref-core.exe`, the Rust core sidecar, with plain `cargo build`, and Rust's MSVC target links the Visual C++ runtime (`vcruntime140.dll`) dynamically by default, so on a Windows PC without the Visual C++ Redistributable the core would not start. The script now adds `-C target-feature=+crt-static` to `RUSTFLAGS` for that one build and restores the previous value right after it, so `tauri build` later in the same script keeps tauri-build's own static vcruntime linking and the two methods never meet in one link. Not run on Windows here; `dumpbin /dependents formref-core.exe` on a build should no longer list VCRUNTIME140.dll.

## v0.38.1 · The Linux packages pull in the media plugins

`tauri.conf.json` `bundle.linux` now follows formdeck. Video items on the board (`frontend/src/app/video.ts`) play in WebKitGTK, which decodes with GStreamer, so the deb recommends `gstreamer1.0-plugins-base`, `gstreamer1.0-plugins-good` and `gstreamer1.0-libav`, the rpm recommends `gstreamer1-plugins-base` and `gstreamer1-plugins-good`, and the AppImage bundles the media framework (`appimage.bundleMediaFramework`); formcompiler installs the base and good sets on the Linux runner so the AppImage step finds them. apt and dnf install recommends by default; `dpkg -i` and `--no-install-recommends` skip them. On Ubuntu 24.04 `libwebkit2gtk-4.1-0` already depends on base and good but only suggests `gstreamer1.0-libav` (the H.264 and AAC decoders), so the deb recommends it. The AppImage carries base and good only, since libav would copy the runner's own FFmpeg into the app. Checked: the config parses and formcompiler's `registry.py check` passes; no Linux build was run here.

## v0.38.0 · An installable app with its own engine

- refers-to: tauri.conf.json :: build.frontendDist, app.windows[main].create, bundle; tauri.dev.conf.json (new); entitlements.plist (new); capabilities/main-window.json :: remote.urls; src/main.rs :: Engine, engine_port, sidecar, start_engine, wait_for, stop_engine, open_main, fail, boot, setup, run; Cargo.toml :: description

Until now the shell loaded `http://127.0.0.1:8320` as its frontendDist and bundling was off, so `tauri build` made no installer and the window needed `./formref serve` running beside it. Now `frontendDist` is the built window (`../frontend/dist`, built by `beforeBuildCommand`), `devUrl` stays `http://localhost:5320`, and the bundle is on for every target with two sidecars: `binaries/formref-engine` (the FastAPI service frozen by `backend/freeze_engine`) and `binaries/formref-core` (the Rust board engine the service drives, shipped as its own executable so Tauri signs it with the app on macOS instead of it being unpacked unsigned from the onefile). Icons are the existing `icon.png` (512 px, RGBA), `icon.icns` and `icon.ico`; no other PNG sizes were generated, Tauri accepts this set. LICENSE, NOTICE.md and the third-party licence texts ship as resources. macOS: minimum 12.0 as the family sets it, hardened runtime, and `entitlements.plist` with `disable-library-validation` and `allow-unsigned-executable-memory`, which a PyInstaller onefile needs to load the libraries it unpacks. No Windows signing here: formcompiler adds it.

Packaged start: the splash is built from the bundle as before. The main window is `create: false` in the config, so nothing loads the bundled index on its own (it calls `/api` relative to its origin and must come from the engine). `boot` runs off the main thread: `engine_port` takes 8320 when nothing answers there and it can be bound, otherwise a free loopback port; `start_engine` runs the sidecar with `FORMREF_PORT`, `FORMREF_API_URL`, `FORMREF_ENGINE_PATH` (the `formref-core` sidecar) and `FORMREF_PARENT_PID`, no console window on Windows, and its output in `engine.log` in the app's log folder; `wait_for` waits up to 120 s for the port to accept a connection (uvicorn binds only after the service's startup), failing early if the engine exits. Then `open_main` builds the main window from its config entry with the URL `http://127.0.0.1:<port>/`, the engine's own origin, which serves the window and the API together exactly as `./formref serve` does (the origin guard admits a page's own origin), sizes it to 90 percent of the primary monitor and hands it to `reveal::conceal`, so the reveal sequence is unchanged. If anything fails, `fail` writes the reason and the log path into the splash and the app quits after 15 s. `RunEvent::Exit` (window close, tray Quit) kills and reaps the engine; the engine also exits by itself when the shell's process is gone.

The main window's remote capability URL moved from `http://127.0.0.1:8320/*` to `http://127.0.0.1:*/*`, because the engine falls back to another port when 8320 is in use; the main window only ever navigates to the engine, and the commands still refuse every window but `main`.

Dev (`./formref desktop`, a debug build) does not start a sidecar: `open_main` keeps the configured URL, which Tauri resolves against `devUrl`, and the launcher still starts the service on 8320 (Vite proxies `/api` there). Tauri's build checks every externalBin exists, so the launcher passes `--config src-tauri/tauri.dev.conf.json`, which empties `bundle.externalBin`.

### ../build_app, ../build_app.bat, ../formref, ../formref.bat · the launchers that build and run the shell

- refers-to: ../build_app :: desktop step; ../build_app.bat (rewritten); ../formref :: desktop; ../formref.bat :: desktop
- kind: rationale
- logged: v0.38.0 · 2026-10-30

`build_app` runs `backend/freeze_engine` with the backend venv's Python between the window build and `tauri build`, so the sidecars exist when Tauri bundles; arguments after `--` still go to `tauri build` (formcompiler's `--config`). `build_app.bat` had taken no tauri arguments and chained steps with `&` inside parentheses; it now takes `--web`, `-h`, an optional `--`, and forwards every other argument to `tauri build`, falls back to `%FORMCOMPILER_CONFIG_ARG%` when given none (so a plain `call build_app.bat` from formcompiler still merges its config, and an explicit argument is never doubled), checks Python 3.12, creates the venv with that same Python (`py -3` in `oc_install.bat` could pick another), sets `FORMREF_PYTHON` to the venv only for the freeze, and stops with `exit /b 1` after each failed step, one step per line so no `%VAR%` is expanded inside a block that set it. `./formref desktop` and `formref.bat desktop` run `tauri dev --config` with `tauri.dev.conf.json` (an absolute path, so the CLI's working directory does not matter), and `./formref desktop build` is `./build_app --`, since a bare `tauri build` now needs the frozen sidecars.

Not compiled here: the sandbox has no Tauri crates offline, so `cargo check` was not run; `rustfmt --check` parsed `main.rs`. `WebviewWindowBuilder::from_config` with `create: false` is the pattern formportal's shell compiles with. No installer was built or launched on any OS.

## v0.7.3 · Window layouts

`window_layout` returns the outer position and inner size in logical pixels (the units saved in `board.settings.window`). `window_place` checks the values, then finds the connected monitor that contains a point just inside the saved top-left corner; on that monitor it shrinks the size to fit and pulls the window fully on screen, and when no monitor contains it (a screen since unplugged) it centres the window on the primary monitor at a size that fits. Both commands sit behind the `formref-window-layout` permission, granted to the main window only, and are added to the app manifest in `build.rs`.

## v0.7.2 · Tray icon and show or hide shortcut

`build_tray` adds a tray icon (the bundled `icons/icon.png`) whose left click calls `toggle_visible` and whose menu holds Show or Hide FormRef, Always on Top, Click-through and Quit. `toggle_visible` hides a window that is visible and focused, and otherwise unminimises, shows and focuses it; the same function answers the global shortcut Ctrl+Alt+F (Cmd+Option+F on macOS). The two check items are kept in managed state (`TrayChecks`) and `sync_tray` sets them from the real window state after any change from the page (`window_configure`), the tray or the click-through shortcut; tray changes also emit `formref://window-state` with the whole `WindowState`, which the page's Preferences checkboxes follow. If a desktop has no tray host, or another app owns the shortcut, the shell logs it and runs on. The menu labels are English: they are native and drawn before the page's language tables load.

Checked on Linux under Xvfb with webkit2gtk 4.1: `cargo check` and `cargo clippy` clean; with the window focused, Ctrl+Alt+F hid it and pressed again showed it. Xvfb has no tray host, so the tray menu itself was not exercised.

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

This is a development desktop shell. The CLI owns the Vite beforeDevCommand. The repository launcher owns the backend process and cleanup. Release source loads the externally running loopback backend at port 8320, which serves the frontend and API on one origin. Bundle output is disabled; this is not a standalone installer and no backend binary is bundled.

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

### icons/ · the app icon as a taped stack of reference prints

- refers-to: icons/icon.icns, icon.ico, icon.png (also the tray icon via main.rs build_tray); ../assets/formref-mark.svg, formref_icon.png, formref_icon_macos.png; ../frontend/public/favicon.png; ../assets/icon_src/
- kind: rationale
- logged: v0.35.0 · 2026-10-20

The orange F with a tilted frame was the last flat icon outside the redrawn Form family. The new mark is an image stack, the owner's direction: three prints with white borders fanned on the family tile (bloom, rim, drop shadow), centred in it and filling about 72 percent of its width, a grey blank at the back, a violet print in the middle, and a front print showing a sunset scene in the family paint (blue, violet, pink, amber) with layered mountains and a soft sun, held by a strip of translucent tape so it reads as a reference pinned to a board rather than a photo library. One design is used at every size and in the favicon and README mark. The macOS .icns uses the 824 px tile inside a 1024 canvas with a 100 px margin; .ico and icon.png stay full bleed, and icon.png also feeds the tray icon. assets/icon_src/ regenerates every file.

v0.36.0: the owner's render assets/formref_icon_macos.png is now the master and every icon file is a resize of it (the macOS set as given, small sizes, .ico and the Clipper icons from its tile); assets/icon_src/README.txt records it and marks gen.py and render.mjs as not to be run.

### src/reveal.rs · splash card and concealed reveal, as formvis

- refers-to: src/reveal.rs; src/main.rs :: main, setup, generate_handler; tauri.conf.json :: splash window; build.rs; permissions/window-controls.toml :: formref-app-ready; capabilities/main-window.json; ../frontend/public/splash.html; ../frontend/src/ui/reveal.ts
- kind: rationale
- logged: v0.36.0 · 2026-10-22

The Form family boot sequence from formvis 1.96.4: a 360 by 200 rounded splash (transparent, no shadow, built hidden, masked to a 16 px radius natively on macOS by round_splash, then shown) with the FormRef icon, Starting FormRef and a bar that fills over 2.6 s. The main window stays hidden (macOS: on screen at alpha 0, ignoring the mouse, so its web view keeps rendering) until the page calls app_ready after its first paint; it appears at max(2.6 s from launch, ready), the bar completes in 220 ms and the splash closes; a 20 s fallback shows it anyway. Constants equal formvis. Two deliberate differences: the main window keeps its transparent background (board transparency modes) instead of reveal::BACKGROUND, and there is no overlay title bar or traffic-light placement, because FormRef keeps the native frame and switches decorations at run time. The splash page loads from the same origin as the main page (frontendDist, the engine on 127.0.0.1:8320, or the Vite dev server).
