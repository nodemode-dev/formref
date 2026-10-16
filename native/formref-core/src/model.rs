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
    /// Board-wide coloured labels; items refer to them by id in data.labels.
    pub labels: Vec<Label>,
    /// The desktop window this board opens in: logical position and size, on top, and window opacity.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub window: Option<WindowLayout>,
    /// Named filters the board remembers: find text, kind, colour and a similar-picture sample. Left out of the saved board while empty, so older boards stay byte-identical.
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub searches: Vec<SavedSearch>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct SavedSearch {
    pub id: String,
    pub name: String,
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub text: String,
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub kind: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub color: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tolerance: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub similar: Option<SimilarSearch>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct SimilarSearch {
    pub item_id: String,
    pub level: String,
}

pub const MAX_SEARCHES: usize = 24;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct WindowLayout {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    #[serde(default)]
    pub always_on_top: bool,
    #[serde(default = "full_opacity")]
    pub opacity: f64,
}

fn full_opacity() -> f64 { 1.0 }

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct Label {
    pub id: String,
    pub name: String,
    pub color: String,
}

impl Default for BoardSettings {
    fn default() -> Self {
        Self { grid_visible: true, grid_size: 24.0, snap_enabled: false, grayscale: false, labels: Vec::new(), window: None, searches: Vec::new() }
    }
}

pub const MAX_LABELS: usize = 32;
pub const MAX_ITEM_LABELS: usize = 12;

impl BoardSettings {
    pub fn validate(&self) -> EngineResult<()> {
        finite(self.grid_size, "settings.grid_size", 4.0, 512.0)?;
        if self.labels.len() > MAX_LABELS { return Err(EngineError::invalid("a board can define at most 32 labels")); }
        let mut seen = std::collections::HashSet::new();
        for label in &self.labels {
            identifier(&label.id, "label.id")?;
            if !seen.insert(label.id.as_str()) { return Err(EngineError::invalid("label ids must be unique")); }
            if label.name.trim().is_empty() { return Err(EngineError::invalid("label.name cannot be empty")); }
            text_limit(&label.name, "label.name", 40)?;
            let bytes = label.color.as_bytes();
            if bytes.len() != 7 || bytes[0] != b'#' || !bytes[1..].iter().all(u8::is_ascii_hexdigit) {
                return Err(EngineError::invalid("label.color must be #RRGGBB"));
            }
        }
        if let Some(window) = &self.window {
            finite(window.x, "settings.window.x", -100_000.0, 100_000.0)?;
            finite(window.y, "settings.window.y", -100_000.0, 100_000.0)?;
            finite(window.width, "settings.window.width", 200.0, 20_000.0)?;
            finite(window.height, "settings.window.height", 200.0, 20_000.0)?;
            finite(window.opacity, "settings.window.opacity", 0.2, 1.0)?;
        }
        if self.searches.len() > MAX_SEARCHES { return Err(EngineError::invalid("a board can keep at most 24 saved searches")); }
        let mut seen = std::collections::HashSet::new();
        for search in &self.searches {
            identifier(&search.id, "search.id")?;
            if !seen.insert(search.id.as_str()) { return Err(EngineError::invalid("saved search ids must be unique")); }
            if search.name.trim().is_empty() { return Err(EngineError::invalid("search.name cannot be empty")); }
            text_limit(&search.name, "search.name", 60)?;
            text_limit(&search.text, "search.text", 200)?;
            if !search.kind.is_empty() { identifier(&search.kind, "search.kind")?; text_limit(&search.kind, "search.kind", 32)?; }
            if let Some(color) = &search.color {
                let bytes = color.as_bytes();
                if bytes.len() != 7 || bytes[0] != b'#' || !bytes[1..].iter().all(u8::is_ascii_hexdigit) {
                    return Err(EngineError::invalid("search.color must be #RRGGBB"));
                }
            }
            if let Some(tolerance) = search.tolerance { finite(tolerance, "search.tolerance", 1.0, 100.0)?; }
            if let Some(similar) = &search.similar {
                identifier(&similar.item_id, "search.similar.item_id")?;
                if !matches!(similar.level.as_str(), "close" | "related" | "loose") {
                    return Err(EngineError::invalid("search.similar.level must be close, related or loose"));
                }
            }
            if search.text.trim().is_empty() && search.kind.is_empty() && search.color.is_none() && search.similar.is_none() {
                return Err(EngineError::invalid("a saved search needs text, a kind, a color or a similar picture"));
            }
        }
        Ok(())
    }
}

/// data.labels on an item: at most 12 ids, each defined in the board's settings.labels.
pub fn item_labels(data: &Map<String, Value>, defined: &std::collections::HashSet<&str>) -> EngineResult<()> {
    let Some(value) = data.get("labels") else { return Ok(()) };
    let list = value.as_array().ok_or_else(|| EngineError::invalid("data.labels must be an array of label ids"))?;
    if list.len() > MAX_ITEM_LABELS { return Err(EngineError::invalid("an item can carry at most 12 labels")); }
    for entry in list {
        let id = entry.as_str().ok_or_else(|| EngineError::invalid("data.labels must be an array of label ids"))?;
        if !defined.contains(id) { return Err(EngineError::invalid(format!("label {id} is not defined on this board"))); }
    }
    Ok(())
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

/// Vector paths: data.vector = {w, h, paths: [{closed, anchors: [{x, y, in?, out?, radius?, style?}]}]} in a w by h design box.
fn vector_data(data: &Map<String, Value>) -> EngineResult<()> {
    let Some(value) = data.get("vector") else { return Ok(()) };
    let vector = value.as_object().ok_or_else(|| EngineError::invalid("data.vector must be an object"))?;
    data_number(vector, "w", MIN_DIMENSION, MAX_COORDINATE)?;
    data_number(vector, "h", MIN_DIMENSION, MAX_COORDINATE)?;
    let paths = vector.get("paths").and_then(Value::as_array).ok_or_else(|| EngineError::invalid("data.vector.paths must be an array"))?;
    if paths.is_empty() || paths.len() > 1000 { return Err(EngineError::invalid("a vector holds 1 to 1000 paths")); }
    let mut total = 0usize;
    for path in paths {
        let path = path.as_object().ok_or_else(|| EngineError::invalid("each vector path must be an object"))?;
        data_boolean(path, "closed")?;
        let anchors = path.get("anchors").and_then(Value::as_array).ok_or_else(|| EngineError::invalid("vector path anchors must be an array"))?;
        total += anchors.len();
        if total > 50_000 { return Err(EngineError::invalid("a vector exceeds 50000 anchors")); }
        for anchor in anchors {
            let anchor = anchor.as_object().ok_or_else(|| EngineError::invalid("each anchor must be an object"))?;
            for key in ["x", "y"] {
                let n = anchor.get(key).and_then(Value::as_f64).ok_or_else(|| EngineError::invalid("anchors need numeric x and y"))?;
                finite(n, "anchor", -MAX_COORDINATE, MAX_COORDINATE)?;
            }
            for handle in ["in", "out"] {
                if let Some(h) = anchor.get(handle).filter(|h| !h.is_null()) {
                    for key in ["x", "y"] {
                        let n = h.get(key).and_then(Value::as_f64).ok_or_else(|| EngineError::invalid("anchor handles need numeric x and y"))?;
                        finite(n, "anchor handle", -MAX_COORDINATE, MAX_COORDINATE)?;
                    }
                }
            }
            data_number(anchor, "radius", 0.0, MAX_COORDINATE)?;
            if anchor.get("style").is_some_and(|s| !s.as_str().is_some_and(|s| ["round", "inverted", "chamfer"].contains(&s))) {
                return Err(EngineError::invalid("anchor style must be round, inverted or chamfer"));
            }
        }
    }
    Ok(())
}

pub const TABLE_TYPES: [&str; 6] = ["text", "number", "currency", "percent", "date", "checkbox"];

/// Table cards: data.table = {columns: [{name, type}], rows: [[cell text]]}; formulas are cell text starting with =.
fn table_data(data: &Map<String, Value>) -> EngineResult<()> {
    let Some(value) = data.get("table") else { return Ok(()) };
    let table = value.as_object().ok_or_else(|| EngineError::invalid("data.table must be an object"))?;
    let columns = table.get("columns").and_then(Value::as_array).ok_or_else(|| EngineError::invalid("table.columns must be an array"))?;
    if columns.is_empty() || columns.len() > 26 { return Err(EngineError::invalid("a table has 1 to 26 columns")); }
    for column in columns {
        let name = column.get("name").and_then(Value::as_str).ok_or_else(|| EngineError::invalid("table column name must be a string"))?;
        text_limit(name, "table column name", 60)?;
        let kind = column.get("type").and_then(Value::as_str).unwrap_or("text");
        if !TABLE_TYPES.contains(&kind) { return Err(EngineError::invalid("table column type must be text, number, currency, percent, date or checkbox")); }
    }
    let rows = table.get("rows").and_then(Value::as_array).ok_or_else(|| EngineError::invalid("table.rows must be an array"))?;
    if rows.len() > 500 { return Err(EngineError::invalid("a table has at most 500 rows")); }
    for row in rows {
        let cells = row.as_array().ok_or_else(|| EngineError::invalid("each table row must be an array"))?;
        if cells.len() > columns.len() { return Err(EngineError::invalid("a table row has more cells than columns")); }
        for cell in cells {
            text_limit(cell.as_str().ok_or_else(|| EngineError::invalid("table cells must be text"))?, "table cell", 2000)?;
        }
    }
    Ok(())
}

/// Card comments: data.comments is a list of {id, text, author, at, resolved?}.
fn comments(data: &Map<String, Value>) -> EngineResult<()> {
    let Some(value) = data.get("comments") else { return Ok(()) };
    let list = value.as_array().ok_or_else(|| EngineError::invalid("data.comments must be an array"))?;
    if list.len() > 200 { return Err(EngineError::invalid("an item can hold at most 200 comments")); }
    for entry in list {
        let entry = entry.as_object().ok_or_else(|| EngineError::invalid("each comment must be an object"))?;
        let id = entry.get("id").and_then(Value::as_str).ok_or_else(|| EngineError::invalid("comment.id must be a string"))?;
        identifier(id, "comment.id")?;
        let text = entry.get("text").and_then(Value::as_str).ok_or_else(|| EngineError::invalid("comment.text must be a string"))?;
        if text.trim().is_empty() { return Err(EngineError::invalid("comment.text cannot be empty")); }
        text_limit(text, "comment.text", 4000)?;
        let author = entry.get("author").and_then(Value::as_str).ok_or_else(|| EngineError::invalid("comment.author must be a string"))?;
        text_limit(author, "comment.author", 80)?;
        data_number(entry, "at", 0.0, 1.0e13)?;
        data_boolean(entry, "resolved")?;
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
        comments(&self.data)?;
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
                if self.data.get("sampling").is_some_and(|v| !v.as_str().is_some_and(|s| s == "smooth" || s == "nearest")) {
                    return Err(EngineError::invalid("data.sampling must be smooth or nearest"));
                }
                if let Some(value) = self.data.get("features") {
                    let vector = value.as_array().ok_or_else(|| EngineError::invalid("data.features must be an array"))?;
                    if vector.len() > 512 || vector.iter().any(|n| n.as_f64().is_none()) {
                        return Err(EngineError::invalid("data.features must be at most 512 numbers"));
                    }
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
            "stroke" => { drawing_data(&self.data)?; vector_data(&self.data)?; }
            "table" => table_data(&self.data)?,
            "shape" => {
                drawing_data(&self.data)?;
                if let Some(value) = self.data.get("shape") {
                    if !value.as_str().is_some_and(|s| ["rect", "ellipse", "line", "path"].contains(&s)) {
                        return Err(EngineError::invalid("data.shape must be rect, ellipse, line or path"));
                    }
                }
                vector_data(&self.data)?;
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
        let labels: HashSet<&str> = self.settings.labels.iter().map(|label| label.id.as_str()).collect();
        for item in &self.items {
            item.validate(&mut nodes)?;
            item_labels(&item.data, &labels)?;
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
