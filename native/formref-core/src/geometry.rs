use crate::model::{Board, Item};
use crate::{EngineError, EngineResult};
use std::collections::{HashMap, HashSet};

#[derive(Debug, Clone, Copy)]
pub struct Bounds {
    pub left: f64,
    pub top: f64,
    pub right: f64,
    pub bottom: f64,
}

impl Bounds {
    pub fn width(self) -> f64 { self.right - self.left }
    pub fn height(self) -> f64 { self.bottom - self.top }
    pub fn center(self) -> (f64, f64) {
        ((self.left + self.right) * 0.5, (self.top + self.bottom) * 0.5)
    }
    pub fn union(self, other: Self) -> Self {
        Self { left: self.left.min(other.left), top: self.top.min(other.top),
            right: self.right.max(other.right), bottom: self.bottom.max(other.bottom) }
    }
}

pub fn bounds(item: &Item) -> Bounds {
    let angle = item.rotation.to_radians();
    let w = item.width * angle.cos().abs() + item.height * angle.sin().abs();
    let h = item.width * angle.sin().abs() + item.height * angle.cos().abs();
    let cx = item.x + item.width * 0.5;
    let cy = item.y + item.height * 0.5;
    Bounds { left: cx - w * 0.5, top: cy - h * 0.5, right: cx + w * 0.5, bottom: cy + h * 0.5 }
}

pub fn collective(board: &Board, indices: &[usize]) -> EngineResult<Bounds> {
    let mut result = None;
    for &index in indices {
        let b = bounds(&board.items[index]);
        result = Some(result.map_or(b, |old: Bounds| old.union(b)));
    }
    result.ok_or_else(|| EngineError::invalid("selection must contain at least one item"))
}

pub fn selected(board: &Board, ids: &[String]) -> EngineResult<Vec<usize>> {
    if ids.is_empty() { return Err(EngineError::invalid("ids must contain at least one item")); }
    if ids.len() > board.items.len() {
        return Err(EngineError::invalid("selection exceeds board item count"));
    }
    let positions: HashMap<&str, usize> = board.items.iter().enumerate().map(|(i, item)| (item.id.as_str(), i)).collect();
    let mut seen = HashSet::new();
    ids.iter().map(|id| {
        if !seen.insert(id.as_str()) { return Err(EngineError::invalid("ids contains a duplicate identifier")); }
        positions.get(id.as_str()).copied().ok_or_else(|| EngineError::new("item_not_found", format!("item {id} does not exist")))
    }).collect()
}

pub fn descendants(board: &Board, indices: &[usize]) -> Vec<usize> {
    let mut ids: HashSet<&str> = indices.iter().map(|&i| board.items[i].id.as_str()).collect();
    let mut children: HashMap<&str, Vec<usize>> = HashMap::new();
    for (index, item) in board.items.iter().enumerate() {
        if let Some(parent) = &item.parent_id { children.entry(parent).or_default().push(index); }
    }
    let mut pending = indices.to_vec();
    let mut expanded = indices.to_vec();
    while let Some(index) = pending.pop() {
        if let Some(children) = children.get(board.items[index].id.as_str()) {
            for &child in children {
                if ids.insert(board.items[child].id.as_str()) {
                    pending.push(child);
                    expanded.push(child);
                }
            }
        }
    }
    expanded
}

pub fn roots(board: &Board, indices: &[usize]) -> Vec<usize> {
    let ids: HashSet<&str> = indices.iter().map(|&i| board.items[i].id.as_str()).collect();
    let parents: HashMap<&str, Option<&str>> = board.items.iter().map(|item| (item.id.as_str(), item.parent_id.as_deref())).collect();
    indices.iter().copied().filter(|&i| {
        let mut cursor = board.items[i].parent_id.as_deref();
        while let Some(id) = cursor {
            if ids.contains(id) { return false; }
            cursor = parents.get(id).copied().flatten();
        }
        true
    }).collect()
}

pub fn require_unlocked(board: &Board, indices: &[usize]) -> EngineResult<()> {
    let positions: HashMap<&str, &Item> = board.items.iter().map(|item| (item.id.as_str(), item)).collect();
    for &index in indices {
        let mut item = &board.items[index];
        loop {
            if item.locked {
                return Err(EngineError::new("item_locked", format!("item {} is locked", item.id)));
            }
            match item.parent_id.as_deref().and_then(|id| positions.get(id)) {
                Some(parent) => item = parent,
                None => break,
            }
        }
    }
    Ok(())
}

pub fn translate(board: &mut Board, indices: &[usize], dx: f64, dy: f64) {
    for &index in indices {
        board.items[index].x += dx;
        board.items[index].y += dy;
    }
}

pub fn transform(board: &mut Board, indices: &[usize], pivot: (f64, f64), dx: f64, dy: f64, scale: f64, degrees: f64) {
    let angle = degrees.to_radians();
    let cosine = angle.cos();
    let sine = angle.sin();
    for &index in indices {
        let item = &mut board.items[index];
        let cx = item.x + item.width * 0.5;
        let cy = item.y + item.height * 0.5;
        let x = (cx - pivot.0) * scale;
        let y = (cy - pivot.1) * scale;
        let new_cx = pivot.0 + x * cosine - y * sine + dx;
        let new_cy = pivot.1 + x * sine + y * cosine + dy;
        item.width *= scale;
        item.height *= scale;
        item.x = new_cx - item.width * 0.5;
        item.y = new_cy - item.height * 0.5;
        item.rotation = (item.rotation + degrees).rem_euclid(360.0);
        if scale != 1.0 { resize_drawing(item, scale, scale, true, true); }
    }
}

pub fn root_bounds(board: &Board, index: usize) -> EngineResult<Bounds> {
    collective(board, &descendants(board, &[index]))
}

pub fn resize_drawing(item: &mut Item, sx: f64, sy: f64, scale_points: bool, scale_width: bool) {
    if item.kind != "stroke" && item.kind != "shape" { return; }
    if scale_points {
        if let Some(points) = item.data.get_mut("points").and_then(serde_json::Value::as_array_mut) {
            for point in points {
                for (key, factor) in [("x", sx), ("y", sy)] {
                    if let Some(value) = point.get_mut(key) {
                        if let Some(number) = value.as_f64() { *value = serde_json::Value::from(number * factor); }
                    }
                }
            }
        }
    }
    if scale_width {
        let width = item.data.get("stroke_width").and_then(serde_json::Value::as_f64).unwrap_or(2.0);
        item.data.insert("stroke_width".into(), serde_json::Value::from(width * (sx * sy).sqrt()));
    }
}
