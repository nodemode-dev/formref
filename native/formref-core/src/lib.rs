pub mod commands;
pub mod geometry;
pub mod model;
pub mod session;

use serde::Serialize;
use serde_json::Value;

#[derive(Debug, Clone, Serialize)]
pub struct EngineError {
    pub code: String,
    pub message: String,
}

impl EngineError {
    pub fn new(code: &str, message: impl Into<String>) -> Self {
        Self { code: code.into(), message: message.into() }
    }
    pub fn invalid(message: impl Into<String>) -> Self {
        Self::new("invalid_command", message)
    }
}

pub type EngineResult<T> = Result<T, EngineError>;

pub fn required_string<'a>(object: &'a Value, field: &str) -> EngineResult<&'a str> {
    object.get(field).and_then(Value::as_str)
        .ok_or_else(|| EngineError::invalid(format!("{field} must be a string")))
}

pub fn decode<T: serde::de::DeserializeOwned>(value: Value) -> EngineResult<T> {
    serde_json::from_value(value).map_err(|e| EngineError::invalid(e.to_string()))
}
