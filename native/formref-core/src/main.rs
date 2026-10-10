use formref_core::session::Engine;
use serde_json::{json, Value};
use std::io::{self, BufRead, Write};

const MAX_LINE_BYTES: usize = 16 * 1024 * 1024;

fn main() {
    let stdin = io::stdin();
    let mut input = stdin.lock();
    let stdout = io::stdout();
    let mut output = io::BufWriter::new(stdout.lock());
    let mut engine = Engine::default();
    loop {
        let mut line = Vec::new();
        let mut oversized = false;
        let mut eof = false;
        loop {
            let available = match input.fill_buf() {
                Ok(bytes) => bytes,
                Err(error) => { eprintln!("FormRef input error: {error}"); return; }
            };
            if available.is_empty() { eof = true; break; }
            let newline = available.iter().position(|&byte| byte == b'\n');
            let count = newline.map_or(available.len(), |n| n + 1);
            if !oversized && line.len() + count <= MAX_LINE_BYTES {
                line.extend_from_slice(&available[..count]);
            } else {
                oversized = true;
                line.clear();
            }
            input.consume(count);
            if newline.is_some() { break; }
        }
        if eof && line.is_empty() && !oversized { break; }
        let response = if oversized {
            json!({"id": null, "error": {"code": "resource_limit", "message": "request exceeds 16 MiB line limit"}})
        } else {
            match serde_json::from_slice::<Value>(&line) {
                Ok(request) => engine.request(request),
                Err(error) => json!({"id": null, "error": {"code": "parse_error", "message": error.to_string()}}),
            }
        };
        if serde_json::to_writer(&mut output, &response).is_err()
            || output.write_all(b"\n").is_err() || output.flush().is_err() { break; }
        if eof { break; }
    }
}
