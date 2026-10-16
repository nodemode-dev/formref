use super::{affected, number};
use crate::geometry;
use crate::model::MIN_DIMENSION;
use crate::{EngineError, EngineResult};
use serde_json::{json, Map, Value};

const FLAGS: [&str; 3] = ["flip_x", "flip_y", "grayscale"];

fn images(board: &crate::model::Board, command: &Value) -> EngineResult<Vec<usize>> {
    let indices = affected(command, board)?;
    let images: Vec<usize> = indices.into_iter().filter(|&i| board.items[i].kind == "image").collect();
    if images.is_empty() { return Err(EngineError::invalid("selection contains no images")); }
    Ok(images)
}

pub fn rotate(board: &mut crate::model::Board, command: &Value) -> EngineResult<()> {
    let degrees = number(command, "degrees", 90.0, -360.0, 360.0)?;
    let indices = affected(command, board)?;
    for root in geometry::roots(board, &indices) {
        let unit = geometry::descendants(board, &[root]);
        let pivot = geometry::root_bounds(board, root)?.center();
        geometry::transform(board, &unit, pivot, 0.0, 0.0, 1.0, degrees);
    }
    Ok(())
}

pub fn opacity(board: &mut crate::model::Board, command: &Value) -> EngineResult<()> {
    let value = number(command, "value", 1.0, 0.0, 1.0)?;
    for index in affected(command, board)? { board.items[index].opacity = value; }
    Ok(())
}

pub fn flags(board: &mut crate::model::Board, command: &Value) -> EngineResult<()> {
    let indices = images(board, command)?;
    let toggle: Vec<&str> = match command.get("toggle") {
        Some(Value::Array(keys)) => keys.iter().map(|k| k.as_str().filter(|k| FLAGS.contains(k))
            .ok_or_else(|| EngineError::invalid("toggle entries must be flip_x, flip_y or grayscale"))).collect::<EngineResult<_>>()?,
        Some(_) => return Err(EngineError::invalid("toggle must be an array")),
        None => Vec::new(),
    };
    let set: Map<String, Value> = match command.get("set") {
        Some(Value::Object(values)) => values.clone(),
        Some(_) => return Err(EngineError::invalid("set must be an object")),
        None => Map::new(),
    };
    for (key, value) in &set {
        let ok = match key.as_str() {
            "flip_x" | "flip_y" | "grayscale" => value.is_boolean(),
            "sampling" => value.as_str().is_some_and(|s| s == "smooth" || s == "nearest"),
            "rating" => value.as_u64().is_some_and(|stars| stars <= 5),
            _ => false,
        };
        if !ok { return Err(EngineError::invalid(format!("set.{key} is not a valid image flag"))); }
    }
    if toggle.is_empty() && set.is_empty() { return Err(EngineError::invalid("image needs toggle or set")); }
    for index in indices {
        let data = &mut board.items[index].data;
        for key in &toggle {
            let current = data.get(*key).and_then(Value::as_bool).unwrap_or(false);
            data.insert((*key).to_string(), Value::Bool(!current));
        }
        for (key, value) in &set {
            // No stars is no rating key, so a picture rated and cleared saves as it did before.
            if key == "rating" && value.as_u64() == Some(0) { data.remove("rating"); } else { data.insert(key.clone(), value.clone()); }
        }
    }
    Ok(())
}

pub fn crop(board: &mut crate::model::Board, command: &Value) -> EngineResult<()> {
    let indices = images(board, command)?;
    let rect = if command.get("reset").and_then(Value::as_bool) == Some(true) {
        None
    } else {
        let r = command.get("rect").filter(|v| v.is_object()).ok_or_else(|| EngineError::invalid("crop needs rect or reset"))?;
        let x = number(r, "x", 0.0, 0.0, 1.0)?;
        let y = number(r, "y", 0.0, 0.0, 1.0)?;
        let w = number(r, "width", 1.0, MIN_DIMENSION, 1.0)?;
        let h = number(r, "height", 1.0, MIN_DIMENSION, 1.0)?;
        if x + w > 1.0 + 1e-10 || y + h > 1.0 + 1e-10 { return Err(EngineError::invalid("crop must fit inside the source image")); }
        Some(json!({"x": x, "y": y, "width": w, "height": h}))
    };
    for index in indices {
        match &rect {
            Some(value) => { board.items[index].data.insert("crop".into(), value.clone()); }
            None => { board.items[index].data.remove("crop"); }
        }
    }
    Ok(())
}
