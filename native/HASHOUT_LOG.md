# Native engine HASHOUT_LOG

## Org-navi-map

| Path | Role |
| --- | --- |
| `formref-core/Cargo.toml` | Rust package and direct dependency pins |
| `formref-core/Cargo.lock` | Exact dependency versions |
| `formref-core/src/commands.rs` | Atomic commands and board arrangement |
| `formref-core/src/geometry.rs` | Rotated bounds and hierarchical transformations |
| `formref-core/src/lib.rs` | Module exports and explicit errors |
| `formref-core/src/main.rs` | Bounded JSON-lines stdio |
| `formref-core/src/model.rs` | Serializable board data and validation |
| `formref-core/src/session.rs` | Open boards, revisions and history |
| `licenses/` | Dependency MIT notices and Unicode license |
| `README.md` | Standalone protocol and resource limits |

## Table of contents

- [commands.rs](#commandsrs)
- [geometry.rs](#geometryrs)
- [lib.rs](#librs)
- [main.rs](#mainrs)
- [model.rs](#modelrs)
- [session.rs](#sessionrs)
- [Implementation](#implementation)
- [Observed verification](#observed-verification)
- [Limits of verification](#limits-of-verification)

## commands.rs

### formref-core/src/commands.rs · apply and apply_inner

- refers-to: `formref-core/src/commands.rs` :: `apply`, `apply_inner`, layout helpers and `order`
- kind: rationale
- logged: v0.1.0 · 2026-10-10

The public command boundary clones before mutation and commits only a valid result. Batch constituents validate individually to prevent an invalid hierarchy reaching a later traversal. Layout treats selected descendants as one unit, while layer order preserves unselected properties.

## geometry.rs

### formref-core/src/geometry.rs · transform and hierarchy

- refers-to: `formref-core/src/geometry.rs` :: `bounds`, `descendants`, `roots`, `require_unlocked`, `transform`, `resize_drawing`
- kind: explainer
- logged: v0.1.0 · 2026-10-10

Rotation-aware bounds drive layout. Hierarchical transforms move descendants once; locked ancestors protect children. Local drawing points and widths scale with item dimensions during transform, normalization and direct size updates. Nonuniform resize scales x/y separately and uses the geometric mean for stroke width. Explicit replacement points or width data are honored; metadata-only patches do not scale drawing data.

## lib.rs

### formref-core/src/lib.rs · EngineError and decode

- refers-to: `formref-core/src/lib.rs` :: `EngineError`, `required_string`, `decode`
- kind: explainer
- logged: v0.1.0 · 2026-10-10

Serializable error codes are shared by command and protocol boundaries. Decoding failures remain explicit command errors instead of silent defaults for invalid typed fields.

## main.rs

### formref-core/src/main.rs · main

- refers-to: `formref-core/src/main.rs` :: `main`, bounded stdin loop
- kind: rationale
- logged: v0.1.0 · 2026-10-10

The reader drains oversized lines without retaining their bytes, reports one error, and continues with the next request. Stdout contains protocol responses only; transport diagnostics use stderr.

## model.rs

### formref-core/src/model.rs · Board and Item validation

- refers-to: `formref-core/src/model.rs` :: `Board::validate`, `Item::validate`, `validate_json`
- kind: warning-context
- logged: v0.1.0 · 2026-10-10

Unknown kinds and extra fields are extension seams, but they do not bypass finite geometry, JSON node/depth limits, identifiers, hierarchy or endpoint validation. Known image crops and drawing geometry have additional validation.

## session.rs

### formref-core/src/session.rs · Engine::call and prune_history

- refers-to: `formref-core/src/session.rs` :: `Engine::call`, `prune_history`
- kind: rationale
- logged: v0.1.0 · 2026-10-10

Revision increases on committed changes, undo and redo. Identical and failed commands keep revision/history unchanged. Snapshot pruning respects a shared memory budget; history is session-local and Python owns durable current-board persistence.

## Implementation

- The library is separated into model validation, rotation-aware geometry, commands and session/history modules. The main executable handles bounded stdio transport only.
- New files were written directly. Existing regions were edited by hand using the line editor after re-reading them. No patch, diff, bundle, codemod, scripted source replacement or test file was produced.
- Atomicity exists at both the public command entry point and the live session commit boundary. Each batch constituent must leave a valid document; a bad command cannot expose an invalid hierarchy to a later traversal.
- Layer ordering preserves unselected and locked item fields. Equal z values use array order as a stable tie breaker.
- Defaults match the Form family canvas `#1c1b1d` and node `#191919` colors.
- Live documents and history snapshots have shared byte budgets, and stdin has a bounded read path. The retained per-board undo maximum is 100 entries.
- Image flips, crops, grayscale and sampling are validated/persisted metadata. Media decoding and pixel export belong to the backend/frontend; the engine is headless.
- Group IDs identify selection sets. Parent IDs define hierarchical ownership. UI selection resolves groups before dispatch; descendant mutation is handled in Rust.
- Complete dependency MIT license texts and Unicode notice were retained. No comparison-product source code was imported.

## Observed verification

- `cargo build --offline --release --manifest-path native/formref-core/Cargo.toml` completed using Rust/Cargo 1.99.0 and cached pinned dependencies.
- 68 manually supplied live protocol requests exercised create, open, get, apply, undo, redo and close; add, remove, update, transform, duplicate, align, distribute, pack, width/height/area normalize, grouping, ungrouping, layer order, connect, disconnect, background, viewport and batch. Drawing checks covered uniform transform, normalization, uniform/nonuniform direct resize, metadata-only updates, explicit replacement points/width, undo and subsequent transform. Invalid shape points returned an explicit error.
- Parent and child transformed together through scale 2, rotation 90 and translation about an explicit pivot; undo and redo restored the correct geometry with increasing revision.
- Negative dimensions inside a rename/update batch left the original title, revision and history unchanged. A successful two-transform batch was undone in one step.
- Locked movement and mixed unlock/property patches rejected; unlock-only succeeded. Layer movement preserved a neighboring locked item's z and lock fields.
- A partial nested data update preserved crop and flip values while adding grayscale. Unknown extension item kinds survived round-trip commands.
- Cloning two connected items generated new item and connection IDs. Cloning a container remapped the child parent and group identifiers. Removing a container removed its child and related edge; undo restored them.
- Invalid crops, coordinate overflow requests, dimensions overflowing after scale, missing endpoints, cyclic parents, zero pack columns, zero viewport zoom, malformed JSON and missing/closed boards returned explicit errors. Unchanged commands preserved revision and redo.

## Limits of verification

- No self-authored test suite or runner was written, as required by dev-rules. The first output formatter used during a live check had a syntax error; it did not alter the engine, and the same requests were rerun successfully with the formatter corrected.
- No DOM code is owned by this subsystem; DOM stability is not applicable to these files.
- macOS compilation and native window behavior were not run here. The library has no window integration.
- History-cap exhaustion, full-size document/line stress, combined memory-budget exhaustion and large-board performance have not been exercised. Limits are implemented but should be covered by the independent TEST_PLAN.
- Undo history is session-local, as specified in the native README. Current-board persistence is owned by Python.
