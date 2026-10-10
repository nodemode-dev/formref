use crate::{EngineError, EngineResult};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use std::collections::{HashMap, HashSet};

pub const MAX_ITEMS: usize = 10_000;
pub const MAX_CONNECTIONS: usize = 20_000;
pub const MAX_DOCUMENT_BYTES: usize = 8 * 1024 * 1024;
pub const MAX_COORDINATE: f64 = 1_000_000_000.0;
pub const MAX_DIMENSION: f64 = 10_000_000.0;
pub const MIN_DIMENSION: f64 = 0.000001;

fn one() -> f64 { 1.0 }
fn width() -> f64 { 260.0 }
fn height() -> f64 { 180.0 }
fn version() -> u32 { 1 }
fn kind() -> String { "note".into() }
fn title() -> String { "Untitled board".into() }
fn background() -> String { "#1c1b1d".into() }
fn color() -> String { "#191919".into() }

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(default)]
pub struct Viewport {
    pub x: f64,
    pub y: f64,
    pub zoom: f64,
}

impl Default for Viewport {
    fn default() -> Self { Self { x: 0.0, y: 0.0, zoom: 1.0 } }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(default, deny_unknown_fields)]
pub struct BoardSettings {
    pub grid_visible: bool,
    pub grid_size: f64,
    pub snap_enabled: bool,
    pub grayscale: bool,
}

impl Default for BoardSettings {
    fn default() -> Self {
        Self { grid_visible: true, grid_size: 24.0, snap_enabled: false, grayscale: false }
    }
}

impl BoardSettings {
    pub fn validate(&self) -> EngineResult<()> {
        finite(self.grid_size, "settings.grid_size", 4.0, 512.0)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(default)]
pub struct Item {
    pub id: String,
    pub kind: String,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub rotation: f64,
    pub z: f64,
    pub opacity: f64,
    pub locked: bool,
    pub hidden: bool,
    pub group_id: Option<String>,
    pub parent_id: Option<String>,
    pub title: String,
    pub text: String,
    pub color: String,
    pub asset_id: Option<String>,
    pub url: String,
    pub data: Map<String, Value>,
    #[serde(flatten)]
    pub extra: Map<String, Value>,
}

impl Default for Item {
    fn default() -> Self {
        Self { id: String::new(), kind: kind(), x: 0.0, y: 0.0, width: width(),
            height: height(), rotation: 0.0, z: 0.0, opacity: one(), locked: false,
            hidden: false, group_id: None, parent_id: None, title: String::new(),
            text: String::new(), color: color(), asset_id: None, url: String::new(),
            data: Map::new(), extra: Map::new() }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(default)]
pub struct Connection {
    pub id: String,
    pub from: String,
    pub to: String,
    pub label: String,
    pub color: String,
    #[serde(flatten)]
    pub extra: Map<String, Value>,
}

impl Default for Connection {
    fn default() -> Self {
        Self { id: String::new(), from: String::new(), to: String::new(),
            label: String::new(), color: "#8c97ad".into(), extra: Map::new() }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(default)]
pub struct Board {
    pub id: String,
    pub title: String,
    pub version: u32,
    pub revision: u64,
    pub items: Vec<Item>,
    pub connections: Vec<Connection>,
    pub viewport: Viewport,
    pub settings: BoardSettings,
    pub background: String,
    #[serde(flatten)]
    pub extra: Map<String, Value>,
}

impl Default for Board {
    fn default() -> Self {
        Self { id: String::new(), title: title(), version: version(), revision: 0,
            items: Vec::new(), connections: Vec::new(), viewport: Viewport::default(),
            settings: BoardSettings::default(), background: background(), extra: Map::new() }
    }
}

pub fn text_limit(value: &str, field: &str, max: usize) -> EngineResult<()> {
    if value.len() > max {
        return Err(EngineError::invalid(format!("{field} exceeds {max} bytes")));
    }
    Ok(())
}

pub fn identifier(value: &str, field: &str) -> EngineResult<()> {
    if value.trim().is_empty() || value.len() > 256 || value.chars().any(char::is_control) {
        return Err(EngineError::invalid(format!("{field} must be a nonempty identifier of at most 256 bytes without control characters")));
    }
    Ok(())
}

pub fn finite(value: f64, field: &str, min: f64, max: f64) -> EngineResult<()> {
    if !value.is_finite() || value < min || value > max {
        return Err(EngineError::invalid(format!("{field} must be finite and between {min} and {max}")));
    }
    Ok(())
}

fn validate_json(value: &Value, depth: usize, count: &mut usize) -> EngineResult<()> {
    *count += 1;
    if depth > 32 || *count > 200_000 {
        return Err(EngineError::invalid("extension data exceeds nesting or node limit"));
    }
    match value {
        Value::Number(n) if n.as_f64().is_none_or(|v| !v.is_finite()) => {
            return Err(EngineError::invalid("extension data contains an invalid number"));
        }
        Value::String(s) => text_limit(s, "extension string", 1024 * 1024)?,
        Value::Array(values) => {
            for child in values { validate_json(child, depth + 1, count)?; }
        }
        Value::Object(values) => {
            for (key, child) in values {
                text_limit(key, "extension key", 256)?;
                validate_json(child, depth + 1, count)?;
            }
        }
        _ => {}
    }
    Ok(())
}

fn data_number(data: &Map<String, Value>, key: &str, min: f64, max: f64) -> EngineResult<()> {
    if let Some(value) = data.get(key) {
        let n = value.as_f64().ok_or_else(|| EngineError::invalid(format!("data.{key} must be a number")))?;
        finite(n, &format!("data.{key}"), min, max)?;
    }
    Ok(())
}

fn data_boolean(data: &Map<String, Value>, key: &str) -> EngineResult<()> {
    if data.get(key).is_some_and(|v| !v.is_boolean()) {
        return Err(EngineError::invalid(format!("data.{key} must be a boolean")));
    }
    Ok(())
}

fn drawing_data(data: &Map<String, Value>) -> EngineResult<()> {
    data_number(data, "stroke_width", MIN_DIMENSION, 10_000.0)?;
    if let Some(value) = data.get("points") {
        let points = value.as_array().ok_or_else(|| EngineError::invalid("drawing points must be an array"))?;
        if points.len() > 50_000 { return Err(EngineError::invalid("drawing exceeds 50000 points")); }
        for point in points {
            for key in ["x", "y"] {
                let n = point.get(key).and_then(Value::as_f64)
                    .ok_or_else(|| EngineError::invalid("drawing points need numeric x and y"))?;
                finite(n, "drawing point", -MAX_COORDINATE, MAX_COORDINATE)?;
            }
        }
    }
    Ok(())
}

impl Viewport {
    pub fn validate(&self) -> EngineResult<()> {
        finite(self.x, "viewport.x", -MAX_COORDINATE, MAX_COORDINATE)?;
        finite(self.y, "viewport.y", -MAX_COORDINATE, MAX_COORDINATE)?;
        finite(self.zoom, "viewport.zoom", 0.0001, 1000.0)
    }
}

impl Item {
    fn validate(&self, nodes: &mut usize) -> EngineResult<()> {
        identifier(&self.id, "item.id")?;
        identifier(&self.kind, "item.kind")?;
        finite(self.x, "item.x", -MAX_COORDINATE, MAX_COORDINATE)?;
        finite(self.y, "item.y", -MAX_COORDINATE, MAX_COORDINATE)?;
        finite(self.width, "item.width", MIN_DIMENSION, MAX_DIMENSION)?;
        finite(self.height, "item.height", MIN_DIMENSION, MAX_DIMENSION)?;
        finite(self.rotation, "item.rotation", -1_000_000.0, 1_000_000.0)?;
        finite(self.z, "item.z", -MAX_COORDINATE, MAX_COORDINATE)?;
        finite(self.opacity, "item.opacity", 0.0, 1.0)?;
        for (field, value) in [("group_id", &self.group_id), ("parent_id", &self.parent_id), ("asset_id", &self.asset_id)] {
            if let Some(value) = value { identifier(value, field)?; }
        }
        text_limit(&self.title, "item.title", 4096)?;
        text_limit(&self.text, "item.text", 1024 * 1024)?;
        text_limit(&self.url, "item.url", 16384)?;
        text_limit(&self.color, "item.color", 256)?;
        validate_json(&Value::Object(self.data.clone()), 0, nodes)?;
        validate_json(&Value::Object(self.extra.clone()), 0, nodes)?;
        match self.kind.as_str() {
            "swatch" => {
                let bytes = self.color.as_bytes();
                if ![7, 9].contains(&bytes.len()) || bytes[0] != b'#' || !bytes[1..].iter().all(u8::is_ascii_hexdigit) {
                    return Err(EngineError::invalid("swatch color must be #RRGGBB or #RRGGBBAA"));
                }
            }
            "note" | "document" => {
                if let Some(format) = self.data.get("text_format") {
                    if !format.as_str().is_some_and(|value| ["plain", "markdown"].contains(&value)) {
                        return Err(EngineError::invalid("data.text_format must be plain or markdown"));
                    }
                }
            }
            "image" => {
                for key in ["flip_x", "flip_y", "grayscale"] { data_boolean(&self.data, key)?; }
                if self.data.get("sampling").is_some_and(|v| !v.is_string()) {
                    return Err(EngineError::invalid("data.sampling must be a string"));
                }
                if let Some(value) = self.data.get("crop") {
                    let crop = value.as_object().ok_or_else(|| EngineError::invalid("image crop must be an object"))?;
                    let mut numbers = [0.0; 4];
                    for (index, key) in ["x", "y", "width", "height"].iter().enumerate() {
                        numbers[index] = crop.get(*key).and_then(Value::as_f64)
                            .ok_or_else(|| EngineError::invalid(format!("image crop.{key} must be a number")))?;
                        finite(numbers[index], &format!("crop.{key}"), if index > 1 { MIN_DIMENSION } else { 0.0 }, 1.0)?;
                    }
                    if numbers[0] + numbers[2] > 1.0 + 1e-10 || numbers[1] + numbers[3] > 1.0 + 1e-10 {
                        return Err(EngineError::invalid("image crop must fit inside the source image"));
                    }
                }
            }
            "todo" => data_boolean(&self.data, "checked")?,
            "board" => {
                if let Some(value) = self.data.get("board_id") {
                    identifier(value.as_str().ok_or_else(|| EngineError::invalid("data.board_id must be a string"))?, "data.board_id")?;
                }
            }
            "stroke" => drawing_data(&self.data)?,
            "shape" => {
                drawing_data(&self.data)?;
                if let Some(value) = self.data.get("shape") {
                    if !value.as_str().is_some_and(|s| ["rect", "ellipse", "line"].contains(&s)) {
                        return Err(EngineError::invalid("data.shape must be rect, ellipse or line"));
                    }
                }
                if self.data.get("fill").is_some_and(|v| !v.is_string()) {
                    return Err(EngineError::invalid("data.fill must be a string"));
                }
            }
            _ => {}
        }
        Ok(())
    }
}

impl Board {
    pub fn validate(&self) -> EngineResult<usize> {
        identifier(&self.id, "board.id")?;
        text_limit(&self.title, "board.title", 4096)?;
        text_limit(&self.background, "board.background", 256)?;
        if self.version != 1 { return Err(EngineError::invalid("unsupported board version")); }
        if self.items.len() > MAX_ITEMS || self.connections.len() > MAX_CONNECTIONS {
            return Err(EngineError::invalid("board exceeds item or connection limit"));
        }
        self.viewport.validate()?;
        self.settings.validate()?;
        let mut nodes = 0;
        validate_json(&Value::Object(self.extra.clone()), 0, &mut nodes)?;
        let mut ids = HashSet::with_capacity(self.items.len());
        let mut parents = HashMap::new();
        for item in &self.items {
            item.validate(&mut nodes)?;
            if !ids.insert(item.id.as_str()) { return Err(EngineError::invalid("duplicate item identifier")); }
            if let Some(parent) = &item.parent_id { parents.insert(item.id.as_str(), parent.as_str()); }
        }
        for item in &self.items {
            if let Some(parent) = &item.parent_id {
                if !ids.contains(parent.as_str()) { return Err(EngineError::invalid("parent_id references a missing item")); }
                let mut cursor = item.id.as_str();
                let mut seen = HashSet::new();
                while let Some(next) = parents.get(cursor) {
                    if !seen.insert(cursor) { return Err(EngineError::invalid("parent hierarchy contains a cycle")); }
                    if seen.len() > 64 { return Err(EngineError::invalid("parent hierarchy exceeds 64 levels")); }
                    cursor = next;
                }
            }
        }
        let mut connections = HashSet::new();
        for connection in &self.connections {
            identifier(&connection.id, "connection.id")?;
            identifier(&connection.from, "connection.from")?;
            identifier(&connection.to, "connection.to")?;
            text_limit(&connection.label, "connection.label", 4096)?;
            text_limit(&connection.color, "connection.color", 256)?;
            validate_json(&Value::Object(connection.extra.clone()), 0, &mut nodes)?;
            if !connections.insert(&connection.id) { return Err(EngineError::invalid("duplicate connection identifier")); }
            if connection.from == connection.to { return Err(EngineError::invalid("a connection needs two different items")); }
            if !ids.contains(connection.from.as_str()) || !ids.contains(connection.to.as_str()) {
                return Err(EngineError::invalid("connection endpoint references a missing item"));
            }
        }
        let size = serde_json::to_vec(self).map_err(|e| EngineError::invalid(e.to_string()))?.len();
        if size > MAX_DOCUMENT_BYTES { return Err(EngineError::invalid("board exceeds 8 MiB serialized document limit")); }
        Ok(size)
    }
}
