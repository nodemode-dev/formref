# FormRef core canvas hashout log

Focused v0.2.0 log. The complete baseline engine map, protocol limits and earlier build observations remain in [native/HASHOUT_LOG.md](../HASHOUT_LOG.md).

## Org-navi-map

| Region | Files | Entry |
| --- | --- | --- |
| Typed canvas settings and old-board defaults | [src/model.rs](src/model.rs) | [Model](#model) |
| Atomic settings, connected snap and explicit distribution spacing | [src/commands.rs](src/commands.rs) | [Commands](#commands) |
| World rectangle bounds, descendant expansion and lock ancestry | [src/geometry.rs](src/geometry.rs) | [Geometry integration](#geometry-integration) |
| Existing revisions, undo/redo and JSON-lines protocol | [src/session.rs](src/session.rs), [src/main.rs](src/main.rs) | [History and protocol](#history-and-protocol) |
| Cross-layer schemas and MCP mapping | [docs/CANVAS_CONTRACT.md](../../docs/CANVAS_CONTRACT.md) | [Contract](#contract) |
| Release build and supplied stdin observations | [Cargo.toml](Cargo.toml), [Cargo.lock](Cargo.lock) | [Verification](#verification) |

## Table of contents

- [Model](#model)
- [Commands](#commands)
- [Geometry integration](#geometry-integration)
- [History and protocol](#history-and-protocol)
- [Contract](#contract)
- [Verification](#verification)
- [Limits](#limits)

## Model

Added strict `BoardSettings` with defaults `grid_visible=true`, `grid_size=24.0`, `snap_enabled=false`, `grayscale=false`. `Board.settings` is typed and included in equality, serialization and document validation. Missing fields receive defaults when old version-1 documents open. Unknown settings fields and incorrect primitive types are rejected. Grid size accepts finite fractional world units in the inclusive range `4..512`. The document version is unchanged.

## Commands

`settings` merges only the supplied patch into the current typed object, decodes strictly and validates before assignment. Existing candidate cloning and post-command validation keep standalone and batched mutations atomic.

`snap` expands selected descendants and group memberships, joins included parent-child and group relationships into connected units, checks all member and ancestor locks before translating, and snaps each unit's rotated collective left/top bounds to the nearest world grid. Midpoint ties round away from zero. Group and hierarchy closure use item-index maps and visited sets, so each item translates once. A grid override never changes saved settings. Tiny deltas below `1e-9` are suppressed to keep repeated snaps unchanged.

`distribute` now accepts an optional explicit gap from `0` through `1000000`. Explicit spacing requires two independent roots and anchors the first sorted root. Omitted spacing retains the old three-root span calculation. Existing `pack` already supports gap and needed no change.

## Geometry integration

The new command reuses `geometry::collective`, `geometry::require_unlocked` and `geometry::translate`. Bounds include all affected rotated rectangles, including hidden members. Selecting a parent includes descendants; selecting a child checks its ancestor locks without automatically including the ancestor. Parent and descendant selected together move once. Image data, crop, flips, drawing points and widths are unaffected by pure translations.

## History and protocol

The unchanged session layer compares candidates before recording a revision or snapshot. Settings and snap therefore participate in the existing one-step undo/redo and batch contract. Unchanged patches, already snapped items and rejected commands keep history and revision unchanged. Invocation remains `native/formref-core/target/release/formref-core` from the repository root, accepting one request JSON object per stdin line and returning one response per stdout line.

## Contract

[CANVAS_CONTRACT.md](../../docs/CANVAS_CONTRACT.md) records the exact settings keys/defaults, command shapes, grid/gap ranges, snap closure and midpoint behavior, gesture ownership and MCP mappings. Frontend drag gestures compute one quantized delta and send existing `transform`; the engine has no implicit `transform.snap` flag. Explicit `snap` expands groups itself; existing pack/distribute retain caller-owned group expansion.

## Verification

On 2026-10-10, `cargo build --offline --release` completed successfully in 5.28 seconds. No dependency or version changes were made in this increment. The built binary was handed to the backend agent for actual SDK and persistence observations.

Manually supplied 57 JSON-lines requests across three live executable invocations, with a read-only output formatter and no assertions, authored tests or runner files:

- 19 settings requests observed missing/partial old-board defaults, strict unknown-field/type rejection, valid fractional and boundary grid sizes, patch/undo/redo, unchanged/empty patches, invalid ranges and nulls, and a rejected batch preserving the prior revision and settings.
- 25 snap requests observed positive and negative midpoint ties, a 90-degree rotated rectangle, repeat no-op, undo/redo, a per-command grid override preserving the saved grid, invalid overrides, unselected locked group-member rejection, ancestor-lock rejection, parent plus child moving once, connected groups through a parent hierarchy, and empty/duplicate/missing identifier errors.
- 13 arrangement requests observed a two-root 12-unit horizontal gap, zero vertical gap, undo, invalid negative/string/over-limit gaps, preserved state after failure, retained legacy three-root distribution, legacy two-root rejection and existing pack with a 12-unit gap.

Concrete observations: midpoint items `(12,12)` and `(-12,-12)` became `(24,24)` and `(-24,-24)` on a 24-unit grid. A rotated 20 by 10 item at `(5,7)` and 90 degrees became `(-5,5)`, placing its rotated bounds at world origin. A parent/child/peer unit at `(10,10)`, `(40,20)`, `(70,10)` became `(0,0)`, `(30,10)`, `(60,0)` together; a locked peer left the original revision at zero. Explicit distribution placed the second item at `x=42` after a first item at `x=10` with width 20 and gap 12.

## Limits

These are live build and protocol observations, not automated test coverage. Frontend camera-scaled grid rendering, grayscale preview, ordered focus playback, REST persistence and MCP transport remain their owning agents' verification scope and are not claimed as engine-only observations here. Native desktop compilation remains outside this headless core increment.
