use formref_core::session::Engine;
use serde_json::{json, Value};

fn ok(engine: &mut Engine, method: &str, params: Value) -> Value {
    match engine.call(method, &params) {
        Ok(value) => value,
        Err(error) => panic!("{method} failed: {} {}", error.code, error.message),
    }
}

fn err(engine: &mut Engine, method: &str, params: Value) -> String {
    match engine.call(method, &params) {
        Ok(value) => panic!("{method} should have failed, got {value}"),
        Err(error) => error.code,
    }
}

fn apply(engine: &mut Engine, command: Value) -> Value {
    ok(engine, "board.apply", json!({"board_id": "b1", "command": command}))
}

fn board(engine: &mut Engine) -> Value {
    ok(engine, "board.get", json!({"board_id": "b1"}))["board"].clone()
}

fn item<'a>(board: &'a Value, id: &str) -> &'a Value {
    board["items"].as_array().unwrap().iter().find(|i| i["id"] == id).unwrap_or_else(|| panic!("no item {id}"))
}

fn without_revision(mut board: Value) -> Value {
    board.as_object_mut().unwrap().remove("revision");
    board
}

fn three_notes() -> Engine {
    let mut engine = Engine::default();
    ok(&mut engine, "board.create", json!({"id": "b1", "title": "Test board"}));
    apply(&mut engine, json!({"type": "add", "items": [
        {"id": "a", "kind": "note", "x": 0.0, "y": 0.0, "width": 100.0, "height": 50.0, "text": "first"},
        {"id": "b", "kind": "note", "x": 200.0, "y": 0.0, "width": 100.0, "height": 50.0, "text": "second"},
        {"id": "c", "kind": "note", "x": 400.0, "y": 0.0, "width": 100.0, "height": 50.0, "text": "third"}
    ]}));
    engine
}

#[test]
fn adding_items_keeps_their_ids_and_moves_the_revision() {
    let mut engine = three_notes();
    let state = ok(&mut engine, "board.get", json!({"board_id": "b1"}));
    let ids: Vec<&str> = state["board"]["items"].as_array().unwrap().iter().map(|i| i["id"].as_str().unwrap()).collect();
    assert_eq!(ids, ["a", "b", "c"]);
    assert_eq!(state["board"]["revision"], 1);
    assert_eq!(state["can_undo"], true);
    assert_eq!(err(&mut engine, "board.apply", json!({"board_id": "b1", "command": {"type": "add", "items": [{"id": "a"}]}})), "invalid_command");
}

#[test]
fn moving_items_shifts_exactly_those_items() {
    let mut engine = three_notes();
    apply(&mut engine, json!({"type": "transform", "ids": ["a", "b"], "dx": 10.0, "dy": -5.0}));
    let b = board(&mut engine);
    assert_eq!((item(&b, "a")["x"].as_f64().unwrap(), item(&b, "a")["y"].as_f64().unwrap()), (10.0, -5.0));
    assert_eq!(item(&b, "b")["x"].as_f64().unwrap(), 210.0);
    assert_eq!(item(&b, "c")["x"].as_f64().unwrap(), 400.0);
}

#[test]
fn undo_and_redo_restore_each_state_exactly() {
    let mut engine = three_notes();
    let start = without_revision(board(&mut engine));
    apply(&mut engine, json!({"type": "transform", "ids": ["a"], "dx": 50.0}));
    let moved = without_revision(board(&mut engine));
    apply(&mut engine, json!({"type": "group", "ids": ["a", "b"], "group_id": "g1"}));
    apply(&mut engine, json!({"type": "remove", "ids": ["c"]}));
    for _ in 0..3 {
        ok(&mut engine, "board.undo", json!({"board_id": "b1"}));
    }
    assert_eq!(without_revision(board(&mut engine)), start);
    ok(&mut engine, "board.redo", json!({"board_id": "b1"}));
    assert_eq!(without_revision(board(&mut engine)), moved);
    let revision = board(&mut engine)["revision"].as_u64().unwrap();
    assert!(revision > 4, "revision went back to {revision}");
}

#[test]
fn undo_with_nothing_left_says_so_and_a_new_change_clears_redo() {
    let mut engine = Engine::default();
    ok(&mut engine, "board.create", json!({"id": "b1"}));
    assert_eq!(err(&mut engine, "board.undo", json!({"board_id": "b1"})), "history_empty");
    apply(&mut engine, json!({"type": "rename", "title": "One"}));
    ok(&mut engine, "board.undo", json!({"board_id": "b1"}));
    apply(&mut engine, json!({"type": "rename", "title": "Two"}));
    assert_eq!(err(&mut engine, "board.redo", json!({"board_id": "b1"})), "history_empty");
    assert_eq!(board(&mut engine)["title"], "Two");
}

#[test]
fn groups_and_connections_stay_consistent_when_an_end_is_removed() {
    let mut engine = three_notes();
    apply(&mut engine, json!({"type": "group", "ids": ["a", "b"], "group_id": "g1"}));
    apply(&mut engine, json!({"type": "connect", "connection": {"id": "k1", "from": "group:g1", "to": "c"}}));
    apply(&mut engine, json!({"type": "connect", "connection": {"id": "k2", "from": "a", "to": "c"}}));
    let b = board(&mut engine);
    assert_eq!(item(&b, "a")["group_id"], "g1");
    assert_eq!(b["connections"].as_array().unwrap().len(), 2);
    apply(&mut engine, json!({"type": "remove", "ids": ["c"]}));
    let b = board(&mut engine);
    assert!(b["connections"].as_array().unwrap().is_empty(), "connections to a removed item stayed: {}", b["connections"]);
    apply(&mut engine, json!({"type": "ungroup", "ids": ["a", "b"]}));
    assert!(item(&board(&mut engine), "a")["group_id"].is_null());
}

#[test]
fn a_bad_connection_is_refused_and_changes_nothing() {
    let mut engine = three_notes();
    let before = board(&mut engine);
    for connection in [json!({"from": "a", "to": "a"}), json!({"from": "a", "to": "missing"}), json!({"from": "a", "to": "b", "line": "wavy"})] {
        let code = err(&mut engine, "board.apply", json!({"board_id": "b1", "command": {"type": "connect", "connection": connection}}));
        assert!(code == "invalid_command" || code == "item_not_found", "{code}");
    }
    assert_eq!(board(&mut engine), before);
}

#[test]
fn a_locked_item_does_not_move() {
    let mut engine = three_notes();
    apply(&mut engine, json!({"type": "update", "ids": ["a"], "patch": {"locked": true}}));
    let before = board(&mut engine);
    err(&mut engine, "board.apply", json!({"board_id": "b1", "command": {"type": "transform", "ids": ["a"], "dx": 5.0}}));
    assert_eq!(board(&mut engine), before);
}

#[test]
fn a_failing_batch_applies_none_of_its_commands() {
    let mut engine = three_notes();
    let before = board(&mut engine);
    err(&mut engine, "board.apply", json!({"board_id": "b1", "command": {"type": "batch", "commands": [
        {"type": "transform", "ids": ["a"], "dx": 5.0},
        {"type": "connect", "connection": {"from": "a", "to": "nowhere"}}
    ]}}));
    assert_eq!(board(&mut engine), before);
}

#[test]
fn a_saved_board_opens_again_unchanged() {
    let mut engine = three_notes();
    apply(&mut engine, json!({"type": "group", "ids": ["a", "b"], "group_id": "g1"}));
    apply(&mut engine, json!({"type": "connect", "connection": {"id": "k1", "from": "a", "to": "c", "label": "leads to", "arrow": "end"}}));
    let saved = serde_json::to_string(&board(&mut engine)).unwrap();
    ok(&mut engine, "board.close", json!({"board_id": "b1"}));
    let mut fresh = Engine::default();
    let reopened = ok(&mut fresh, "board.open", json!({"board": serde_json::from_str::<Value>(&saved).unwrap()}));
    assert_eq!(serde_json::to_string(&reopened["board"]).unwrap(), saved);
}

#[test]
fn a_board_that_breaks_its_own_rules_is_refused_on_open() {
    let mut engine = Engine::default();
    let duplicate = json!({"id": "b2", "version": 1, "items": [{"id": "x", "width": 10.0, "height": 10.0}, {"id": "x", "width": 10.0, "height": 10.0}]});
    assert_eq!(err(&mut engine, "board.open", json!({"board": duplicate})), "invalid_command");
    let dangling = json!({"id": "b3", "version": 1, "items": [{"id": "x", "width": 10.0, "height": 10.0}], "connections": [{"id": "k", "from": "x", "to": "gone"}]});
    assert_eq!(err(&mut engine, "board.open", json!({"board": dangling})), "invalid_command");
    let future = json!({"id": "b4", "version": 2});
    assert_eq!(err(&mut engine, "board.open", json!({"board": future})), "invalid_command");
}

#[test]
fn the_line_protocol_answers_every_request_with_its_id() {
    let mut engine = Engine::default();
    let reply = engine.request(json!({"id": 7, "method": "board.create", "params": {"id": "b9"}}));
    assert_eq!(reply["id"], 7);
    assert!(reply.get("result").is_some());
    let reply = engine.request(json!({"id": "x", "method": "no.such.method", "params": {}}));
    assert_eq!(reply["id"], "x");
    assert_eq!(reply["error"]["code"], "unknown_method");
    let reply = engine.request(json!({"id": [1], "method": "board.get"}));
    assert_eq!(reply["error"]["code"], "invalid_command");
}
