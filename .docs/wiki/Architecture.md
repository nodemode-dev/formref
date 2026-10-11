# Architecture

| Layer | Source | Responsibility |
| --- | --- | --- |
| Rust core | `native/formref-core/src/` | Board schema, geometry, commands, layout, history and JSON-lines protocol |
| Python service | `backend/app/` | Asset ingest, durable boards, import/export, HTTP, revision events and MCP tools |
| Browser frontend | `frontend/src/` | Mounted keyed views, pointer previews, selection/camera and command dispatch |
| Agent service | `backend/app/agent/` | Claude Code, Codex, Cursor and Ollama turns with FormRef's MCP attached; see [Agent](Agent.md) |
| Project harness | `.claude/skills/formref-harness/` | Subsystem knowledge, constraints and failure recovery |

[Engine contract](Engine-Contract.md) is the detailed common model. A board has items, connections, viewport, background and revision. Items share validated geometry and extensible data. Images refer to registered original assets; notes/tasks/cards keep editable content. Connections refer to actual item IDs.

The native executable reads one UTF-8 JSON request per line and writes one corresponding JSON response per line; diagnostics go to stderr. Python maintains the engine process and routes shared operations to it. UI and MCP therefore mutate the same authoritative state rather than maintaining competing board copies.

Gestures preview in place while the pointer moves, then commit one engine command. Atomic batch commands validate a complete candidate before replacing live state. Failures preserve previous state; successful changes advance revision and can be read back or reversed through history. Service writes persist atomically.

The UI follows the Form family Studio Dark profile, orange accent, semantic surfaces and one stacking scale. Keyed item nodes and fixed chrome avoid destructive container renders; fonts and saved theme are established before app reveal.

Rust source is split into `model.rs`, `geometry.rs`, `commands.rs`, `session.rs`, `lib.rs` and `main.rs`. The backend's live store and MCP schemas are authoritative when implementation details change; update contract and documentation alongside public changes.
