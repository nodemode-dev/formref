use super::{layout_roots, number, place_grid};
use crate::geometry;
use crate::model::Board;
use crate::{required_string, EngineError, EngineResult};
use serde_json::Value;

fn name(board: &Board, index: usize) -> String {
    let item = &board.items[index];
    let source = item.data.get("source_name").and_then(Value::as_str).unwrap_or("");
    let label = if item.title.is_empty() { source } else { item.title.as_str() };
    label.to_lowercase()
}

fn features(board: &Board, index: usize) -> Option<Vec<f64>> {
    let values = board.items[index].data.get("features")?.as_array()?;
    let vector: Option<Vec<f64>> = values.iter().map(Value::as_f64).collect();
    vector.filter(|v| !v.is_empty() && v.iter().all(|n| n.is_finite()))
}

fn distance(a: &[f64], b: &[f64]) -> f64 {
    if a.len() != b.len() { return f64::INFINITY; }
    a.iter().zip(b).map(|(x, y)| (x - y) * (x - y)).sum::<f64>().sqrt()
}

fn similarity_order(board: &Board, roots: &[usize]) -> Vec<usize> {
    let mut with: Vec<(usize, Vec<f64>)> = roots.iter().filter_map(|&i| features(board, i).map(|f| (i, f))).collect();
    let without: Vec<usize> = roots.iter().copied().filter(|&i| features(board, i).is_none()).collect();
    let mut ordered = Vec::with_capacity(roots.len());
    if !with.is_empty() {
        let (first, mut current) = with.remove(0);
        ordered.push(first);
        while !with.is_empty() {
            let mut best = 0;
            let mut best_distance = f64::INFINITY;
            for (position, (index, vector)) in with.iter().enumerate() {
                let d = distance(&current, vector);
                if d < best_distance || (d == best_distance && *index < with[best].0) { best = position; best_distance = d; }
            }
            let (index, vector) = with.remove(best);
            ordered.push(index);
            current = vector;
        }
    }
    ordered.extend(without);
    ordered
}

pub fn sort(board: &mut Board, command: &Value) -> EngineResult<()> {
    let roots = layout_roots(board, command)?;
    if roots.len() < 2 { return Err(EngineError::invalid("sort needs at least 2 independent items")); }
    let key = required_string(command, "key")?;
    let gap = number(command, "gap", 24.0, 0.0, 1_000_000.0)?;
    let mut ordered = roots.clone();
    match key {
        "filename" => ordered.sort_by(|&a, &b| name(board, a).cmp(&name(board, b)).then(a.cmp(&b))),
        "aspect" => {
            let mut keyed = Vec::with_capacity(roots.len());
            for &index in &roots {
                let b = geometry::root_bounds(board, index)?;
                keyed.push((index, b.width() / b.height()));
            }
            keyed.sort_by(|a, b| a.1.total_cmp(&b.1).then(a.0.cmp(&b.0)));
            ordered = keyed.into_iter().map(|(index, _)| index).collect();
        }
        "similarity" => ordered = similarity_order(board, &roots),
        _ => return Err(EngineError::invalid("sort key must be filename, aspect or similarity")),
    }
    if command.get("descending").and_then(Value::as_bool) == Some(true) { ordered.reverse(); }
    let columns = (ordered.len() as f64).sqrt().ceil() as usize;
    place_grid(board, ordered, gap, columns)
}
