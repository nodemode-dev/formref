use windows_sys::Win32::UI::WindowsAndMessaging::{MessageBoxW, MB_ICONERROR, MB_OK, MB_SETFOREGROUND, MB_TOPMOST};

fn wide(text: &str) -> Vec<u16> {
    text.encode_utf16().filter(|unit| *unit != 0).chain(std::iter::once(0)).collect()
}

pub fn error(title: &str, text: &str) -> bool {
    let (title, text) = (wide(title), wide(text));
    unsafe { MessageBoxW(std::ptr::null_mut(), text.as_ptr(), title.as_ptr(), MB_OK | MB_ICONERROR | MB_SETFOREGROUND | MB_TOPMOST) != 0 }
}
