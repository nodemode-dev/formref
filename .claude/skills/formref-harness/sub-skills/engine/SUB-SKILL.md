---
name: engine
description: FormRef's Rust board engine. Load for any change to the board model, a new or changed board command, validation limits, undo and redo, or layout maths such as pack, sort, align, rotate or snap.
---

# Engine

`native/formref-core` is a long-running process speaking JSON lines on stdin and stdout. The FastAPI service owns the process (`backend/app/core/engine.py`) and is the only client. Every mutation from the canvas, REST, MCP or the agent becomes one `board.apply` request, so one undo history covers all of them.

## Map

| File | Holds |
| --- | --- |
| `src/model.rs` | `Board`, `Item`, `Connection`, `BoardSettings`, every validation limit, per-kind data rules (image flags, crop, sampling, features, swatch colour, shape kind) and `comments` on any item; `BoardSettings.labels` and `item_labels` for coloured labels; `table_data` for table cards |
| `src/commands.rs` :: `sync_copies`, `duplicate` | synced notes: content updates spread across a shared `data.sync_id`; plain duplicates drop it |
| `src/commands.rs` | `apply` (validate, clone, apply, validate again, commit), the dispatch match in `apply_inner`, add, remove, update, transform, duplicate, align, distribute, pack and `place_grid`, normalize, order, group, connect, settings, snap, batch |
| `src/commands/image.rs` | rotate, opacity, image (flip, grayscale, sampling), crop |
| `src/commands/arrange.rs` | sort by filename, aspect or similarity |
| `src/geometry.rs` | bounds, descendants, roots, lock checks, transform, resize of drawings |
| `src/session.rs` | open boards, revisions, bounded undo and redo, memory budgets |

## Adding a command

1. Put a new family in its own file under `src/commands/` and declare it with `mod` in `commands.rs`; extend an existing family in place.
2. Reuse the helpers in `commands.rs` (`affected` for selection plus descendants plus lock check, `layout_roots`, `number`, `place_grid`) instead of re-deriving selection rules.
3. Register one arm in the `apply_inner` match. Reject bad input with `EngineError::invalid`; never partially apply, because `apply` only commits a board that validates.
4. Tighten `model.rs` validation when the command writes a new `data` key.
5. Surface it: an MCP tool or action (mcp specialist), then a command-table entry (ui-shell specialist).

## Proving it

Build with `cargo build --release --offline` in `native/formref-core`, then pipe hand-written JSON-lines requests into `target/release/formref-core` (`board.create`, `board.apply`, `board.undo`, `board.get`). Show at least one accepted case, one refused case with the revision unchanged, and an undo that restores the earlier state. Keep the request file in a scratch folder, not the repository, and record what ran in `native/formref-core/HASHOUT_LOG.md`.
