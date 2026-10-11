# FormRef native engine

The Rust library owns board commands, validation, layout and undo/redo. The executable owns the bounded JSON-lines transport. It does not read or write files, decode media, call HTTP, or depend on the DOM. Python owns persistence, assets and exports.

From the repository root:

```bash
cargo build --release --manifest-path native/formref-core/Cargo.toml
native/formref-core/target/release/formref-core
```

Use `--offline` for the build when the exact locked dependencies already exist in the Cargo cache. The binary accepts one JSON request per line on stdin, writes one response per line on stdout, and sends transport diagnostics to stderr. `.docs/wiki/Engine-Contract.md` specifies board fields, engine methods, commands and the shared HTTP/MCP contract.

```json
{"id":1,"method":"board.create","params":{"id":"study","title":"Reference study"}}
{"id":2,"method":"board.apply","params":{"board_id":"study","command":{"type":"add","items":[{"id":"image-a","kind":"image","width":320,"height":240,"asset_id":"registered-asset"}]}}}
```

Command discriminators use `type`; `op` is accepted as a compatibility alias. Missing add-item and connection IDs receive collision-free session IDs. Existing identifiers are preserved on open. Unknown item kinds and extra JSON fields are preserved for extensions; geometry, relationships and resource limits still apply.

## Geometry and relationships

Positions are world coordinates and dimensions are unrotated positive dimensions. Rotation is in degrees about the item center. Layout uses the visible axis-aligned bounds after rotation. Transform defaults to the collective center and applies scale, rotation and translation to item centers and dimensions. Stroke/shape local points and stroke widths scale with dimensions during transform, normalization and direct size updates. Nonuniform direct resize scales local x/y separately and stroke width by the geometric mean; explicit replacement points or stroke width in the patch are honored unchanged.

`parent_id` references another same-board item. Hierarchies may be at most 64 levels deep and cannot contain cycles. Transform, layout, duplication, grouping, ordering and removal include descendants. A child selected together with an ancestor is moved once. Removal also removes related connections. Duplication remaps parent and group IDs and duplicates connections whose two endpoints are cloned. A child cloned without its parent retains the existing parent ID.

`group_id` is a selection tag; the client resolves group selection. Commands operate on the explicitly selected items and their parent descendants. Updating a container's individual geometry fields does not reposition its descendants; use transform for whole-container movement. Locked ancestors protect descendants. Only an update whose complete patch is `{"locked":false}` can change a locked item. Connecting and disconnecting also respect endpoint locks.

Layer ordering uses `z` and board-array position as a stable tie breaker. Order commands update the selected items and may reorder the array; unselected and locked item fields are preserved. A renderer should derive its display rank from `(z, array position)` while preserving mounted item nodes.

Each complete command validates before commit. A batch applies all commands to a private document and creates one undo entry; each constituent command must leave a valid document. Invalid and unchanged commands never create history. Undo and redo increase revision monotonically. Undo history is session-local; persistence restores the current board state without old undo snapshots.

## Resource bounds

| Resource | Limit |
| --- | --- |
| Request line | 16 MiB; oversized lines are drained and rejected |
| Serialized document | 8 MiB |
| Live documents | 64 boards and 64 MiB combined |
| History | 100 undo entries per board, 128 MiB combined snapshot budget |
| Items / connections | 10,000 / 20,000 per board |
| Parent hierarchy / extension JSON | 64 levels / 32 levels |
| Extension JSON nodes | 200,000 across a document |
| Stroke points | 50,000 per stroke |
| Batch | 1,000 total commands, 16 nesting levels |
| Coordinate / dimension | Absolute coordinate up to 1 billion; dimension 0.000001 through 10 million |
| Zoom | 0.0001 through 1,000 |

Oldest snapshots are discarded if the shared history budget is reached. Text and identifier lengths also have explicit limits. Finite-number checks and complete-document validation prevent transform overflow, invalid image crops, duplicate IDs, missing parents and missing connection endpoints.

## Dependencies

Original FormRef engine code uses the repository Apache-2.0 license. The direct dependencies are serde 1.0.229 and serde_json 1.0.152. Cargo.lock records all exact transitive versions. Their selected MIT licenses, the transitive build dependency licenses and the Unicode-3.0 notice are retained in `native/licenses`. No BeeRef, PureRef or Milanote code is included.
