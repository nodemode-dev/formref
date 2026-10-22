fn main() {
    tauri_build::try_build(
        tauri_build::Attributes::new().app_manifest(
            tauri_build::AppManifest::new().commands(&[
                "window_configure",
                "window_state",
                "window_start_drag",
                "window_layout",
                "window_place",
                "app_ready",
            ]),
        ),
    )
    .expect("FormRef desktop configuration failed");
}
