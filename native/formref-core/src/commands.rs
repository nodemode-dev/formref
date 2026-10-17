use crate::geometry;
use crate::model::{finite, identifier, Board, Connection, Item, Viewport, MAX_COORDINATE, MAX_ITEMS};
use crate::{decode, required_string, EngineError, EngineResult};
use serde_json::{Map, Value};
use std::collections::{HashMap, HashSet};

mod arrange;
mod image;

pub struct IdSource {
    next: u64,
}

impl Default for IdSource {
    fn default() -> Self { Self { next: 1 } }
}

impl IdSource {
    pub fn generate(&mut self, prefix: &str, occupied: &mut HashSet<String>) -> EngineResult<String> {
        loop {
            let id = format!("{prefix}-{}", self.next);
            self.next = self.next.checked_add(1).ok_or_else(|| EngineError::new("resource_limit", "identifier sequence exhausted"))?;
            if occupied.insert(id.clone()) { return Ok(id); }
        }
    }
}

fn all_identifiers(board: &Board) -> HashSet<String> {
    let mut ids: HashSet<String> = board.items.iter().map(|item| item.id.clone()).collect();
    ids.extend(board.connections.iter().map(|connection| connection.id.clone()));
    ids.extend(board.items.iter().filter_map(|item| item.group_id.clone()));
    ids
}

fn ids(command: &Value) -> EngineResult<Vec<String>> {
    let values = command.get("ids").and_then(Value::as_array).ok_or_else(|| EngineError::invalid("ids must be an array"))?;
    if values.len() > MAX_ITEMS { return Err(EngineError::invalid("ids exceeds selection limit")); }
    values.iter().map(|v| {
        let id = v.as_str().ok_or_else(|| EngineError::invalid("ids must contain strings"))?;
        identifier(id, "ids entry")?;
        Ok(id.to_string())
    }).collect()
}

fn number(command: &Value, key: &str, default: f64, min: f64, max: f64) -> EngineResult<f64> {
    let value = match command.get(key) {
        Some(v) => v.as_f64().ok_or_else(|| EngineError::invalid(format!("{key} must be a number")))?,
        None => default,
    };
    finite(value, key, min, max)?;
    Ok(value)
}

fn field<'a>(command: &'a Value, key: &str) -> EngineResult<&'a Value> {
    command.get(key).ok_or_else(|| EngineError::invalid(format!("missing {key}")))
}

fn selected(command: &Value, board: &Board) -> EngineResult<Vec<usize>> {
    geometry::selected(board, &ids(command)?)
}

fn affected(command: &Value, board: &Board) -> EngineResult<Vec<usize>> {
    let indices = selected(command, board)?;
    let indices = geometry::descendants(board, &indices);
    geometry::require_unlocked(board, &indices)?;
    Ok(indices)
}

fn merge_object(target: &mut Map<String, Value>, patch: &Map<String, Value>, depth: usize) -> EngineResult<()> {
    if depth > 32 { return Err(EngineError::invalid("patch exceeds nesting limit")); }
    for (key, value) in patch {
        if let (Some(Value::Object(old)), Value::Object(new)) = (target.get_mut(key), value) {
            merge_object(old, new, depth + 1)?;
        } else {
            target.insert(key.clone(), value.clone());
        }
    }
    Ok(())
}

/// Synced notes: a content change on one copy (title, text, colour, text format, font) is applied to every
/// other unlocked item on the board that shares its data.sync_id, in the same step and so the same undo.
fn sync_copies(board: &mut Board, updated: &[usize], patch: &Map<String, Value>) -> EngineResult<()> {
    let mut content = Map::new();
    for key in ["title", "text", "color"] {
        if let Some(value) = patch.get(key) { content.insert(key.to_string(), value.clone()); }
    }
    if let Some(Value::Object(data)) = patch.get("data") {
        let shared: Map<String, Value> = data.iter().filter(|(key, _)| ["text_format", "font"].contains(&key.as_str())).map(|(k, v)| (k.clone(), v.clone())).collect();
        if !shared.is_empty() { content.insert("data".into(), Value::Object(shared)); }
    }
    if content.is_empty() { return Ok(()); }
    let groups: HashSet<String> = updated.iter().filter_map(|&i| board.items[i].data.get("sync_id").and_then(Value::as_str).map(str::to_string)).collect();
    if groups.is_empty() { return Ok(()); }
    let chosen: HashSet<usize> = updated.iter().copied().collect();
    for index in 0..board.items.len() {
        let item = &board.items[index];
        if chosen.contains(&index) || item.locked || !item.data.get("sync_id").and_then(Value::as_str).is_some_and(|id| groups.contains(id)) { continue; }
        let mut value = serde_json::to_value(item).map_err(|e| EngineError::invalid(e.to_string()))?;
        merge_object(value.as_object_mut().ok_or_else(|| EngineError::invalid("item is not an object"))?, &content, 0)?;
        board.items[index] = decode(value)?;
    }
    Ok(())
}

pub fn apply(board: &mut Board, command: &Value, source: &mut IdSource) -> EngineResult<()> {
    board.validate()?;
    let mut candidate = board.clone();
    let mut count = 0;
    apply_inner(&mut candidate, command, source, 0, &mut count)?;
    *board = candidate;
    Ok(())
}

fn apply_inner(board: &mut Board, command: &Value, source: &mut IdSource, depth: usize, count: &mut usize) -> EngineResult<()> {
    *count += 1;
    if depth > 16 || *count > 1000 {
        return Err(EngineError::invalid("batch exceeds depth or 1000-command limit"));
    }
    if !command.is_object() { return Err(EngineError::invalid("command must be an object")); }
    let kind = command.get("type").or_else(|| command.get("op")).and_then(Value::as_str)
        .ok_or_else(|| EngineError::invalid("command requires a string type"))?;
    match kind {
        "add" => {
            let values = field(command, "items")?.as_array().ok_or_else(|| EngineError::invalid("items must be an array"))?;
            if values.len() + board.items.len() > MAX_ITEMS { return Err(EngineError::invalid("board exceeds item limit")); }
            let mut occupied = all_identifiers(board);
            for value in values {
                let mut item: Item = decode(value.clone())?;
                if item.id.is_empty() {
                    item.id = source.generate("item", &mut occupied)?;
                } else if !occupied.insert(item.id.clone()) {
                    return Err(EngineError::invalid(format!("identifier {} already exists", item.id)));
                }
                board.items.push(item);
            }
        }
        "remove" => {
            let indices = affected(command, board)?;
            let removed: HashSet<String> = indices.iter().map(|&i| board.items[i].id.clone()).collect();
            board.items.retain(|item| !removed.contains(&item.id));
            board.connections.retain(|connection| !removed.contains(&connection.from) && !removed.contains(&connection.to));
        }
        "update" => {
            let indices = selected(command, board)?;
            let patch = field(command, "patch")?.as_object().ok_or_else(|| EngineError::invalid("patch must be an object"))?;
            for key in ["id", "kind"] {
                if patch.contains_key(key) { return Err(EngineError::invalid(format!("update cannot change {key}"))); }
            }
            let unlock_only = patch.len() == 1 && patch.get("locked") == Some(&Value::Bool(false));
            if !unlock_only { geometry::require_unlocked(board, &indices)?; }
            sync_copies(board, &indices, patch)?;
            for index in indices {
                let mut value = serde_json::to_value(&board.items[index]).map_err(|e| EngineError::invalid(e.to_string()))?;
                let object = value.as_object_mut().ok_or_else(|| EngineError::invalid("item is not an object"))?;
                merge_object(object, patch, 0)?;
                let mut resized: Item = decode(value)?;
                let sx = resized.width / board.items[index].width;
                let sy = resized.height / board.items[index].height;
                if sx != 1.0 || sy != 1.0 {
                    let explicit = patch.get("data").and_then(Value::as_object);
                    let scale_points = !explicit.is_some_and(|data| data.contains_key("points"));
                    let scale_width = !explicit.is_some_and(|data| data.contains_key("stroke_width"));
                    geometry::resize_drawing(&mut resized, sx, sy, scale_points, scale_width);
                }
                board.items[index] = resized;
            }
        }
        "transform" => {
            let indices = affected(command, board)?;
            let dx = number(command, "dx", 0.0, -MAX_COORDINATE, MAX_COORDINATE)?;
            let dy = number(command, "dy", 0.0, -MAX_COORDINATE, MAX_COORDINATE)?;
            let scale = number(command, "scale", 1.0, 0.000001, 1_000_000.0)?;
            let rotation = number(command, "rotation", 0.0, -1_000_000.0, 1_000_000.0)?;
            let pivot = if let Some(pivot) = command.get("pivot") {
                if !pivot.is_object() { return Err(EngineError::invalid("pivot must be an object")); }
                (number(pivot, "x", 0.0, -MAX_COORDINATE, MAX_COORDINATE)?, number(pivot, "y", 0.0, -MAX_COORDINATE, MAX_COORDINATE)?)
            } else {
                geometry::collective(board, &indices)?.center()
            };
            if dx != 0.0 || dy != 0.0 || scale != 1.0 || rotation != 0.0 {
                geometry::transform(board, &indices, pivot, dx, dy, scale, rotation);
            }
        }
        "duplicate" => duplicate(board, command, source)?,
        "align" => align(board, command)?,
        "distribute" => distribute(board, command)?,
        "pack" => pack(board, command)?,
        "normalize" => normalize(board, command)?,
        "group" => {
            let indices = affected(command, board)?;
            let group_id = match command.get("group_id") {
                Some(value) => {
                    let value = value.as_str().ok_or_else(|| EngineError::invalid("group_id must be a string"))?;
                    identifier(value, "group_id")?;
                    value.to_string()
                }
                None => source.generate("group", &mut all_identifiers(board))?,
            };
            for index in indices { board.items[index].group_id = Some(group_id.clone()); }
        }
        "ungroup" => {
            let indices = affected(command, board)?;
            for index in indices { board.items[index].group_id = None; }
        }
        "name_group" => {
            // A title on a group's frame; an empty title removes it. Locked members block it like any group edit.
            let group = field(command, "group_id")?.as_str().ok_or_else(|| EngineError::invalid("group_id must be a string"))?.to_string();
            let members = board.endpoint_members(&format!("{}{group}", crate::model::GROUP_ENDPOINT));
            if members.is_empty() { return Err(EngineError::new("item_not_found", format!("group {group} has no items on this board"))); }
            geometry::require_unlocked(board, &members)?;
            let title = command.get("title").and_then(Value::as_str).unwrap_or("").trim().to_string();
            if title.is_empty() { board.settings.group_titles.remove(&group); } else { board.settings.group_titles.insert(group, title); }
        }
        "collapse_group" => {
            // Shows a group as one stack card (collapsed true) or as its items again; a view state, so locked members do not block it.
            let group = field(command, "group_id")?.as_str().ok_or_else(|| EngineError::invalid("group_id must be a string"))?.to_string();
            if board.endpoint_members(&format!("{}{group}", crate::model::GROUP_ENDPOINT)).is_empty() {
                return Err(EngineError::new("item_not_found", format!("group {group} has no items on this board")));
            }
            let collapsed = field(command, "collapsed")?.as_bool().ok_or_else(|| EngineError::invalid("collapsed must be true or false"))?;
            if collapsed { board.settings.collapsed_groups.insert(group); } else { board.settings.collapsed_groups.remove(&group); }
        }
        "order" => order(board, command)?,
        "rotate" => image::rotate(board, command)?,
        "opacity" => image::opacity(board, command)?,
        "image" => image::flags(board, command)?,
        "crop" => image::crop(board, command)?,
        "sort" => arrange::sort(board, command)?,
        "connect" => {
            let mut connection: Connection = decode(field(command, "connection")?.clone())?;
            // Either end may be one item or a whole group ("group:" and its id), so groups connect like single nodes.
            let mut indices = Vec::new();
            for endpoint in [&connection.from, &connection.to] {
                let members = board.endpoint_members(endpoint);
                if members.is_empty() { return Err(EngineError::new("item_not_found", format!("{endpoint} is not an item or group on this board"))); }
                indices.extend(members);
            }
            if connection.from == connection.to || board.endpoint_members(&connection.from).iter().any(|i| board.endpoint_members(&connection.to).contains(i)) {
                return Err(EngineError::invalid("a connection needs two different items or groups that do not overlap"));
            }
            geometry::require_unlocked(board, &indices)?;
            let mut occupied = all_identifiers(board);
            if connection.id.is_empty() {
                connection.id = source.generate("connection", &mut occupied)?;
            } else if occupied.contains(&connection.id) {
                return Err(EngineError::invalid("connection identifier already exists"));
            }
            board.connections.push(connection);
        }
        "disconnect" => {
            let ids = ids(command)?;
            if ids.is_empty() { return Err(EngineError::invalid("ids must contain at least one connection")); }
            let mut seen = HashSet::new();
            let mut endpoints = HashSet::new();
            for id in &ids {
                if !seen.insert(id.clone()) { return Err(EngineError::invalid("duplicate connection identifier in ids")); }
                let connection = board.connections.iter().find(|connection| &connection.id == id)
                    .ok_or_else(|| EngineError::new("connection_not_found", format!("connection {id} does not exist")))?;
                endpoints.insert(connection.from.clone());
                endpoints.insert(connection.to.clone());
            }
            let indices: Vec<usize> = endpoints.iter().flat_map(|endpoint| board.endpoint_members(endpoint)).collect();
            geometry::require_unlocked(board, &indices)?;
            board.connections.retain(|connection| !seen.contains(&connection.id));
        }
        "style_connections" => {
            let ids = ids(command)?;
            if ids.is_empty() { return Err(EngineError::invalid("ids must contain at least one connection")); }
            let text = |key: &str| -> EngineResult<Option<String>> {
                match command.get(key) {
                    None | Some(Value::Null) => Ok(None),
                    Some(Value::String(value)) => Ok(Some(value.clone())),
                    Some(_) => Err(EngineError::invalid(format!("{key} must be a string"))),
                }
            };
            let (label, color, line, arrow, route) = (text("label")?, text("color")?, text("line")?, text("arrow")?, text("route")?);
            let reverse = match command.get("reverse") {
                None | Some(Value::Null) => false,
                Some(Value::Bool(value)) => *value,
                Some(_) => return Err(EngineError::invalid("reverse must be true or false")),
            };
            if label.is_none() && color.is_none() && line.is_none() && arrow.is_none() && route.is_none() && !reverse {
                return Err(EngineError::invalid("style_connections needs label, color, line, arrow, route or reverse"));
            }
            let mut seen = HashSet::new();
            let mut indices = Vec::new();
            for id in &ids {
                if !seen.insert(id.clone()) { return Err(EngineError::invalid("duplicate connection identifier in ids")); }
                let connection = board.connections.iter().find(|connection| &connection.id == id)
                    .ok_or_else(|| EngineError::new("connection_not_found", format!("connection {id} does not exist")))?;
                indices.extend(board.endpoint_members(&connection.from));
                indices.extend(board.endpoint_members(&connection.to));
            }
            geometry::require_unlocked(board, &indices)?;
            for connection in board.connections.iter_mut().filter(|connection| seen.contains(&connection.id)) {
                if let Some(value) = &label { connection.label = value.clone(); }
                if let Some(value) = &color { connection.color = value.clone(); }
                if let Some(value) = &line { connection.line = value.clone(); }
                if let Some(value) = &arrow { connection.arrow = value.clone(); }
                if let Some(value) = &route { connection.route = value.clone(); }
                // Reversing swaps the ends, so an arrow at the end now points the other way.
                if reverse { std::mem::swap(&mut connection.from, &mut connection.to); }
            }
        }
        "settings" => {
            let patch = field(command, "patch")?.as_object().ok_or_else(|| EngineError::invalid("settings patch must be an object"))?;
            let mut value = serde_json::to_value(&board.settings).map_err(|e| EngineError::invalid(e.to_string()))?;
            merge_object(value.as_object_mut().ok_or_else(|| EngineError::invalid("settings must be an object"))?, patch, 0)?;
            let settings: crate::model::BoardSettings = decode(value)?;
            settings.validate()?;
            // A deleted label disappears from every item in the same step.
            let kept: std::collections::HashSet<String> = settings.labels.iter().map(|label| label.id.clone()).collect();
            for item in &mut board.items {
                if let Some(Value::Array(ids)) = item.data.get_mut("labels") {
                    ids.retain(|id| id.as_str().is_some_and(|id| kept.contains(id)));
                }
            }
            board.settings = settings;
        }
        "snap" => snap(board, command)?,
        "viewport" => {
            let viewport: Viewport = decode(field(command, "viewport")?.clone())?;
            viewport.validate()?;
            board.viewport = viewport;
        }
        "rename" => board.title = required_string(command, "title")?.to_string(),
        "background" => board.background = required_string(command, "color")?.to_string(),
        "batch" => {
            let commands = field(command, "commands")?.as_array().ok_or_else(|| EngineError::invalid("commands must be an array"))?;
            if commands.len() > 1000 { return Err(EngineError::invalid("batch exceeds 1000 commands")); }
            for child in commands {
                apply_inner(board, child, source, depth + 1, count)?;
            }
        }
        _ => return Err(EngineError::new("unknown_command", format!("unknown command type {kind}"))),
    }
    board.prune_group_connections();
    board.validate()?;
    Ok(())
}

fn duplicate(board: &mut Board, command: &Value, source: &mut IdSource) -> EngineResult<()> {
    let indices = affected(command, board)?;
    if board.items.len() + indices.len() > MAX_ITEMS { return Err(EngineError::invalid("duplicate would exceed item limit")); }
    let mut occupied = all_identifiers(board);
    let mut mapping = HashMap::new();
    let mut groups = HashMap::new();
    for &index in &indices {
        mapping.insert(board.items[index].id.clone(), source.generate("item", &mut occupied)?);
        if let Some(group) = &board.items[index].group_id {
            if !groups.contains_key(group) { groups.insert(group.clone(), source.generate("group", &mut occupied)?); }
        }
    }
    // synced: true makes note and document copies that stay in sync with their source (see sync_copies);
    // a plain duplicate is always independent.
    let synced = command.get("synced").and_then(Value::as_bool).unwrap_or(false);
    let mut copies = Vec::with_capacity(indices.len());
    for &index in &indices {
        if synced && ["note", "document"].contains(&board.items[index].kind.as_str()) && board.items[index].data.get("sync_id").and_then(Value::as_str).is_none() {
            let id = source.generate("sync", &mut occupied)?;
            board.items[index].data.insert("sync_id".into(), Value::String(id));
        }
        let mut item = board.items[index].clone();
        if !synced || !["note", "document"].contains(&item.kind.as_str()) { item.data.remove("sync_id"); }
        item.id = mapping[&item.id].clone();
        item.x += 24.0;
        item.y += 24.0;
        if let Some(parent) = &item.parent_id {
            if let Some(new_parent) = mapping.get(parent) { item.parent_id = Some(new_parent.clone()); }
        }
        if let Some(group) = &item.group_id { item.group_id = groups.get(group).cloned(); }
        copies.push(item);
    }
    let mut connections = Vec::new();
    for connection in &board.connections {
        if let (Some(from), Some(to)) = (mapping.get(&connection.from), mapping.get(&connection.to)) {
            let mut copy = connection.clone();
            copy.id = source.generate("connection", &mut occupied)?;
            copy.from = from.clone();
            copy.to = to.clone();
            connections.push(copy);
        }
    }
    board.items.extend(copies);
    board.connections.extend(connections);
    Ok(())
}

fn layout_roots(board: &Board, command: &Value) -> EngineResult<Vec<usize>> {
    let indices = selected(command, board)?;
    geometry::require_unlocked(board, &geometry::descendants(board, &indices))?;
    Ok(geometry::roots(board, &indices))
}

fn align(board: &mut Board, command: &Value) -> EngineResult<()> {
    let roots = layout_roots(board, command)?;
    let mode = required_string(command, "mode")?;
    if !["left", "right", "top", "bottom", "center_x", "center_y"].contains(&mode) {
        return Err(EngineError::invalid("unknown alignment mode"));
    }
    let whole = geometry::collective(board, &geometry::descendants(board, &roots))?;
    for index in roots {
        let b = geometry::root_bounds(board, index)?;
        let (dx, dy) = match mode {
            "left" => (whole.left - b.left, 0.0),
            "right" => (whole.right - b.right, 0.0),
            "top" => (0.0, whole.top - b.top),
            "bottom" => (0.0, whole.bottom - b.bottom),
            "center_x" => (whole.center().0 - b.center().0, 0.0),
            "center_y" => (0.0, whole.center().1 - b.center().1),
            _ => unreachable!(),
        };
        geometry::translate(board, &geometry::descendants(board, &[index]), dx, dy);
    }
    Ok(())
}

fn distribute(board: &mut Board, command: &Value) -> EngineResult<()> {
    let roots = layout_roots(board, command)?;
    let axis = required_string(command, "axis")?;
    if axis != "x" && axis != "y" { return Err(EngineError::invalid("axis must be x or y")); }
    let explicit_gap = if command.get("gap").is_some() { Some(number(command, "gap", 0.0, 0.0, 1_000_000.0)?) } else { None };
    let minimum = if explicit_gap.is_some() { 2 } else { 3 };
    if roots.len() < minimum { return Err(EngineError::invalid(format!("distribute needs at least {minimum} independent items"))); }
    let mut placements = Vec::new();
    for index in roots { placements.push((index, geometry::root_bounds(board, index)?)); }
    placements.sort_by(|a, b| {
        let av = if axis == "x" { a.1.left } else { a.1.top };
        let bv = if axis == "x" { b.1.left } else { b.1.top };
        av.total_cmp(&bv).then(a.0.cmp(&b.0))
    });
    let first = placements.first().unwrap().1;
    let last = placements.last().unwrap().1;
    let span = if axis == "x" { last.right - first.left } else { last.bottom - first.top };
    let size: f64 = placements.iter().map(|(_, b)| if axis == "x" { b.width() } else { b.height() }).sum();
    let gap = explicit_gap.unwrap_or((span - size) / (placements.len() - 1) as f64);
    let mut cursor = if axis == "x" { first.left } else { first.top };
    for (index, b) in placements {
        let (dx, dy) = if axis == "x" { (cursor - b.left, 0.0) } else { (0.0, cursor - b.top) };
        geometry::translate(board, &geometry::descendants(board, &[index]), dx, dy);
        cursor += if axis == "x" { b.width() + gap } else { b.height() + gap };
    }
    Ok(())
}

fn pack(board: &mut Board, command: &Value) -> EngineResult<()> {
    let roots = layout_roots(board, command)?;
    let gap = number(command, "gap", 24.0, 0.0, 1_000_000.0)?;
    let columns = match command.get("columns") {
        Some(value) => value.as_u64().filter(|&n| n > 0 && n <= MAX_ITEMS as u64)
            .ok_or_else(|| EngineError::invalid("columns must be a positive integer up to 10000"))? as usize,
        None => (roots.len() as f64).sqrt().ceil() as usize,
    };
    place_grid(board, roots, gap, columns)
}

fn place_grid(board: &mut Board, roots: Vec<usize>, gap: f64, columns: usize) -> EngineResult<()> {
    let origin = geometry::collective(board, &geometry::descendants(board, &roots))?;
    let mut x = origin.left;
    let mut y = origin.top;
    let mut row_height: f64 = 0.0;
    for (order, index) in roots.into_iter().enumerate() {
        if order > 0 && order % columns == 0 {
            y += row_height + gap;
            x = origin.left;
            row_height = 0.0;
        }
        let b = geometry::root_bounds(board, index)?;
        geometry::translate(board, &geometry::descendants(board, &[index]), x - b.left, y - b.top);
        x += b.width() + gap;
        row_height = row_height.max(b.height());
    }
    Ok(())
}

fn normalize(board: &mut Board, command: &Value) -> EngineResult<()> {
    let roots = layout_roots(board, command)?;
    let mode = required_string(command, "mode")?;
    if !["width", "height", "area"].contains(&mode) { return Err(EngineError::invalid("normalize mode must be width, height or area")); }
    let value = number(command, "value", 0.0, 0.000001, 100_000_000_000_000.0)?;
    for index in roots {
        let b = geometry::root_bounds(board, index)?;
        let factor = match mode {
            "width" => value / b.width(),
            "height" => value / b.height(),
            "area" => (value / (b.width() * b.height())).sqrt(),
            _ => unreachable!(),
        };
        geometry::transform(board, &geometry::descendants(board, &[index]), b.center(), 0.0, 0.0, factor, 0.0);
    }
    Ok(())
}

fn order(board: &mut Board, command: &Value) -> EngineResult<()> {
    let indices = affected(command, board)?;
    let mode = required_string(command, "mode")?;
    if !["front", "back", "forward", "backward"].contains(&mode) { return Err(EngineError::invalid("unknown order mode")); }
    let selection: HashSet<usize> = indices.into_iter().collect();
    let mut ordered: Vec<usize> = (0..board.items.len()).collect();
    ordered.sort_by(|&a, &b| board.items[a].z.total_cmp(&board.items[b].z).then(a.cmp(&b)));
    match mode {
        "front" => {
            let mut unselected: Vec<usize> = ordered.iter().copied().filter(|i| !selection.contains(i)).collect();
            unselected.extend(ordered.iter().copied().filter(|i| selection.contains(i)));
            ordered = unselected;
        }
        "back" => {
            let mut selected: Vec<usize> = ordered.iter().copied().filter(|i| selection.contains(i)).collect();
            selected.extend(ordered.iter().copied().filter(|i| !selection.contains(i)));
            ordered = selected;
        }
        "forward" => {
            if ordered.len() > 1 {
                for i in (0..ordered.len() - 1).rev() {
                    if selection.contains(&ordered[i]) && !selection.contains(&ordered[i + 1]) { ordered.swap(i, i + 1); }
                }
            }
        }
        "backward" => {
            for i in 1..ordered.len() {
                if selection.contains(&ordered[i]) && !selection.contains(&ordered[i - 1]) { ordered.swap(i, i - 1); }
            }
        }
        _ => unreachable!(),
    }
    let mut current: Vec<usize> = (0..board.items.len()).collect();
    current.sort_by(|&a, &b| board.items[a].z.total_cmp(&board.items[b].z).then(a.cmp(&b)));
    if ordered != current {
        let mut cursor = 0;
        while cursor < ordered.len() {
            if !selection.contains(&ordered[cursor]) { cursor += 1; continue; }
            let start = cursor;
            while cursor < ordered.len() && selection.contains(&ordered[cursor]) { cursor += 1; }
            let length = cursor - start;
            let low = if start > 0 { Some(board.items[ordered[start - 1]].z) } else { None };
            let high = if cursor < ordered.len() { Some(board.items[ordered[cursor]].z) } else { None };
            for offset in 0..length {
                let z = match (low, high) {
                    (Some(a), Some(b)) => a + (b - a) * (offset + 1) as f64 / (length + 1) as f64,
                    (Some(a), None) => a + (offset + 1) as f64,
                    (None, Some(b)) => b - (length - offset) as f64,
                    (None, None) => offset as f64,
                };
                board.items[ordered[start + offset]].z = z;
            }
        }
        let mut items: Vec<Option<Item>> = std::mem::take(&mut board.items).into_iter().map(Some).collect();
        board.items = ordered.into_iter().map(|index| items[index].take().unwrap()).collect();
    }
    Ok(())
}

fn snap(board: &mut Board, command: &Value) -> EngineResult<()> {
    let initial = selected(command, board)?;
    let grid = number(command, "grid_size", board.settings.grid_size, 4.0, 512.0)?;
    let positions: HashMap<&str, usize> = board.items.iter().enumerate().map(|(index, item)| (item.id.as_str(), index)).collect();
    let mut children = vec![Vec::new(); board.items.len()];
    let mut groups: HashMap<&str, Vec<usize>> = HashMap::new();
    for (index, item) in board.items.iter().enumerate() {
        if let Some(parent) = &item.parent_id { children[positions[parent.as_str()]].push(index); }
        if let Some(group) = &item.group_id { groups.entry(group).or_default().push(index); }
    }
    let mut pending = initial;
    let mut included = vec![false; board.items.len()];
    let mut expanded_groups = HashSet::new();
    while let Some(index) = pending.pop() {
        if included[index] { continue; }
        included[index] = true;
        pending.extend(children[index].iter().copied());
        if let Some(group) = board.items[index].group_id.as_deref() {
            if expanded_groups.insert(group) { pending.extend(groups[group].iter().copied()); }
        }
    }
    let affected: Vec<usize> = (0..board.items.len()).filter(|&index| included[index]).collect();
    geometry::require_unlocked(board, &affected)?;
    let mut visited = vec![false; board.items.len()];
    let mut connected_groups = HashSet::new();
    let mut units = Vec::new();
    for &start in &affected {
        if visited[start] { continue; }
        let mut unit = Vec::new();
        let mut pending = vec![start];
        while let Some(index) = pending.pop() {
            if visited[index] { continue; }
            visited[index] = true;
            unit.push(index);
            pending.extend(children[index].iter().copied().filter(|&child| included[child]));
            if let Some(parent) = board.items[index].parent_id.as_deref() {
                let parent = positions[parent];
                if included[parent] { pending.push(parent); }
            }
            if let Some(group) = board.items[index].group_id.as_deref() {
                if connected_groups.insert(group) { pending.extend(groups[group].iter().copied()); }
            }
        }
        units.push(unit);
    }
    for unit in units {
        let bounds = geometry::collective(board, &unit)?;
        let dx = (bounds.left / grid).round() * grid - bounds.left;
        let dy = (bounds.top / grid).round() * grid - bounds.top;
        geometry::translate(board, &unit, if dx.abs() < 1e-9 { 0.0 } else { dx }, if dy.abs() < 1e-9 { 0.0 } else { dy });
    }
    Ok(())
}
