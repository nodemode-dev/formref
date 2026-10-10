use crate::commands::{self, IdSource};
use crate::model::{identifier, Board};
use crate::{decode, required_string, EngineError, EngineResult};
use serde::Serialize;
use serde_json::{json, Value};
use std::collections::{BTreeMap, HashSet, VecDeque};

const MAX_OPEN_BOARDS: usize = 64;
const MAX_LIVE_BYTES: usize = 64 * 1024 * 1024;
const MAX_HISTORY_BYTES: usize = 128 * 1024 * 1024;
const MAX_UNDO: usize = 100;

struct Snapshot {
    board: Board,
    size: usize,
    age: u64,
}

struct Document {
    board: Board,
    size: usize,
    undo: VecDeque<Snapshot>,
    redo: VecDeque<Snapshot>,
}

#[derive(Serialize)]
pub struct State<'a> {
    pub board: &'a Board,
    pub can_undo: bool,
    pub can_redo: bool,
}

impl Document {
    fn state(&self) -> State<'_> {
        State { board: &self.board, can_undo: !self.undo.is_empty(), can_redo: !self.redo.is_empty() }
    }
}

pub struct Engine {
    documents: BTreeMap<String, Document>,
    source: IdSource,
    age: u64,
}

impl Default for Engine {
    fn default() -> Self { Self { documents: BTreeMap::new(), source: IdSource::default(), age: 0 } }
}

impl Engine {
    fn live_size(&self) -> usize { self.documents.values().map(|doc| doc.size).sum() }

    fn next_age(&mut self) -> u64 {
        self.age = self.age.saturating_add(1);
        self.age
    }

    fn prune_history(&mut self) {
        let mut size: usize = self.documents.values()
            .flat_map(|doc| doc.undo.iter().chain(doc.redo.iter())).map(|snapshot| snapshot.size).sum();
        while size > MAX_HISTORY_BYTES {
            let oldest = self.documents.iter().flat_map(|(id, doc)| {
                doc.undo.front().map(|s| (s.age, id.clone(), true))
                    .into_iter().chain(doc.redo.front().map(|s| (s.age, id.clone(), false)))
            }).min_by_key(|entry| entry.0);
            if let Some((_, id, undo)) = oldest {
                let doc = self.documents.get_mut(&id).unwrap();
                let removed = if undo { doc.undo.pop_front() } else { doc.redo.pop_front() };
                if let Some(snapshot) = removed { size -= snapshot.size; }
            } else { break; }
        }
    }

    fn get_document(&self, id: &str) -> EngineResult<&Document> {
        self.documents.get(id).ok_or_else(|| EngineError::new("board_not_found", format!("board {id} does not exist")))
    }

    fn state(&self, id: &str) -> EngineResult<Value> {
        serde_json::to_value(self.get_document(id)?.state()).map_err(|e| EngineError::new("internal_error", e.to_string()))
    }

    fn insert(&mut self, board: Board) -> EngineResult<Value> {
        let size = board.validate()?;
        if self.documents.contains_key(&board.id) { return Err(EngineError::new("board_exists", "board is already open")); }
        if self.documents.len() >= MAX_OPEN_BOARDS || self.live_size() + size > MAX_LIVE_BYTES {
            return Err(EngineError::new("resource_limit", "open board count or 64 MiB live document budget exceeded"));
        }
        let id = board.id.clone();
        self.documents.insert(id.clone(), Document { board, size, undo: VecDeque::new(), redo: VecDeque::new() });
        self.state(&id)
    }

    pub fn call(&mut self, method: &str, params: &Value) -> EngineResult<Value> {
        if !params.is_object() { return Err(EngineError::invalid("params must be an object")); }
        match method {
            "board.create" => {
                let mut board = Board::default();
                board.id = match params.get("id") {
                    Some(value) => {
                        let id = value.as_str().ok_or_else(|| EngineError::invalid("id must be a string"))?;
                        identifier(id, "board.id")?;
                        id.to_string()
                    }
                    None => self.source.generate("board", &mut self.documents.keys().cloned().collect::<HashSet<_>>())?,
                };
                if let Some(value) = params.get("title") {
                    board.title = value.as_str().ok_or_else(|| EngineError::invalid("title must be a string"))?.to_string();
                }
                self.insert(board)
            }
            "board.open" => {
                let board: Board = decode(params.get("board").ok_or_else(|| EngineError::invalid("missing board"))?.clone())?;
                self.insert(board)
            }
            "board.get" => self.state(required_string(params, "board_id")?),
            "board.apply" => {
                let id = required_string(params, "board_id")?.to_string();
                let command = params.get("command").ok_or_else(|| EngineError::invalid("missing command"))?;
                let doc = self.get_document(&id)?;
                let old_size = doc.size;
                let mut candidate = doc.board.clone();
                commands::apply(&mut candidate, command, &mut self.source)?;
                let doc = self.get_document(&id)?;
                if candidate == doc.board { return self.state(&id); }
                candidate.revision = doc.board.revision.checked_add(1)
                    .ok_or_else(|| EngineError::new("resource_limit", "board revision exhausted"))?;
                let size = candidate.validate()?;
                if self.live_size() - old_size + size > MAX_LIVE_BYTES {
                    return Err(EngineError::new("resource_limit", "64 MiB live document budget exceeded"));
                }
                let age = self.next_age();
                let doc = self.documents.get_mut(&id).unwrap();
                let old = std::mem::replace(&mut doc.board, candidate);
                doc.undo.push_back(Snapshot { board: old, size: old_size, age });
                while doc.undo.len() > MAX_UNDO { doc.undo.pop_front(); }
                doc.redo.clear();
                doc.size = size;
                self.prune_history();
                self.state(&id)
            }
            "board.undo" | "board.redo" => {
                let id = required_string(params, "board_id")?.to_string();
                let is_undo = method == "board.undo";
                let doc = self.get_document(&id)?;
                let stack = if is_undo { &doc.undo } else { &doc.redo };
                let snapshot = stack.back().ok_or_else(|| EngineError::new("history_empty", if is_undo { "nothing to undo" } else { "nothing to redo" }))?;
                let revision = doc.board.revision.checked_add(1)
                    .ok_or_else(|| EngineError::new("resource_limit", "board revision exhausted"))?;
                let mut restored = snapshot.board.clone();
                restored.revision = revision;
                let restored_size = restored.validate()?;
                if self.live_size() - doc.size + restored_size > MAX_LIVE_BYTES {
                    return Err(EngineError::new("resource_limit", "restored board exceeds live document budget"));
                }
                let age = self.next_age();
                let doc = self.documents.get_mut(&id).unwrap();
                if is_undo { doc.undo.pop_back(); } else { doc.redo.pop_back(); }
                let old = std::mem::replace(&mut doc.board, restored);
                let old_size = std::mem::replace(&mut doc.size, restored_size);
                let target = if is_undo { &mut doc.redo } else { &mut doc.undo };
                target.push_back(Snapshot { board: old, size: old_size, age });
                self.prune_history();
                self.state(&id)
            }
            "board.close" => {
                let id = required_string(params, "board_id")?;
                self.documents.remove(id).ok_or_else(|| EngineError::new("board_not_found", format!("board {id} does not exist")))?;
                Ok(json!({"closed": true}))
            }
            _ => Err(EngineError::new("unknown_method", format!("unknown method {method}"))),
        }
    }

    pub fn request(&mut self, request: Value) -> Value {
        let id = request.get("id").cloned().unwrap_or(Value::Null);
        let result = (|| {
            if !request.is_object() { return Err(EngineError::invalid("request must be an object")); }
            if !id.is_null() && !id.is_string() && !id.is_number() {
                return Err(EngineError::invalid("request id must be a string, number or null"));
            }
            let method = required_string(&request, "method")?;
            let empty = json!({});
            self.call(method, request.get("params").unwrap_or(&empty))
        })();
        match result {
            Ok(result) => json!({"id": id, "result": result}),
            Err(error) => json!({"id": id, "error": error}),
        }
    }
}
