# FormRef core hashout log

Focused v0.2.0 and v0.3.0 log. The complete baseline engine map, protocol limits and earlier build observations remain in [native/HASHOUT_LOG.md](../HASHOUT_LOG.md).

## Org-navi-map

| Region | Files | Entry |
| --- | --- | --- |
| Typed canvas settings and old-board defaults | [src/model.rs](src/model.rs) | [Model](#model) |
| Swatch colors and formatted source validation | [src/model.rs](src/model.rs), [Engine contract](../../.docs/wiki/Engine-Contract.md) | [Reference editing](#reference-editing) |
| Atomic settings, connected snap and explicit distribution spacing | [src/commands.rs](src/commands.rs) | [Commands](#commands) |
| World rectangle bounds, descendant expansion and lock ancestry | [src/geometry.rs](src/geometry.rs) | [Geometry integration](#geometry-integration) |
| Existing revisions, undo/redo and JSON-lines protocol | [src/session.rs](src/session.rs), [src/main.rs](src/main.rs) | [History and protocol](#history-and-protocol) |
| Cross-layer schemas and MCP mapping | [Engine contract](../../.docs/wiki/Engine-Contract.md) | [Contract](#contract) |
| Release build and supplied stdin observations | [Cargo.toml](Cargo.toml), [Cargo.lock](Cargo.lock) | [Verification](#verification) |
| iStack image commands: rotate, opacity, image flags, crop | [src/commands/image.rs](src/commands/image.rs) | [iStack commands](#istack-commands) |
| Sort by filename, aspect, similarity and color (`data.color_order`, missing values last in original order); shared grid placement | [src/commands/arrange.rs](src/commands/arrange.rs), [src/commands.rs](src/commands.rs) :: place_grid | [iStack commands](#istack-commands) |

## Table of contents

- [Model](#model)
- [Commands](#commands)
- [Geometry integration](#geometry-integration)
- [History and protocol](#history-and-protocol)
- [Contract](#contract)
- [Verification](#verification)
- [Limits](#limits)
- [Reference editing](#reference-editing)
- [Comments](#comments)
- [Labels](#labels)
- [Ratings](#ratings)
- [Group connections](#group-connections)
- [Tables](#tables)
- [Synced notes](#synced-notes)
- [Window layout](#window-layout)

## Window layout

v0.7.3: `BoardSettings.window` is an optional `WindowLayout` (`x`, `y`, `width`, `height` in logical pixels, `always_on_top`, `opacity`), validated in `BoardSettings::validate` (positions within 100000, sizes 200 to 20000, opacity 0.2 to 1) and denied unknown fields. It is skipped when serialising an unset value, so boards without a layout save exactly as before. The `settings` command merges a partial window patch into the stored one, and `window: null` clears it. Probed through the backend: a full layout stored, width 50 and an unknown field were refused with their messages, null cleared it.

v0.10.0: `BoardSettings.searches` is a `Vec<SavedSearch>` (`id`, `name`, optional `text`, `kind`, `color`, `tolerance`, `similar` of `SimilarSearch { item_id, level }`), skipped when empty so boards without searches save byte for byte as before. `validate` caps the list at 24 and checks unique ids, a nonempty name of at most 60 bytes, text at most 200 bytes, kind as an identifier of at most 32 bytes, `#RRGGBB`, tolerance 1 to 100 and the three levels, and refuses a search with nothing in it. The sample's item id is not checked against the board on purpose: deleting the picture must not make the board's settings invalid; the window skips a missing sample. Probed through the backend: a full search stored; an empty name, an empty search, a bad colour, a bad level, a duplicate id, an unknown field and tolerance 0 were each refused with their message; an empty list removed the key from the saved file.

v0.11.0: `SavedSearch` gains `tags` and `labels` (both `Vec<String>`, skipped when empty), at most 12 each (`MAX_ITEM_LABELS`); a tag must be nonempty after trimming and at most 60 bytes, a label an identifier. Label ids are not checked against `settings.labels` for the same reason as the similar sample: deleting a label must not make the settings invalid. The "needs something" check counts them. Probed: tags and labels stored; an empty tag and 13 tags refused.

## Synced notes

v0.4.7: `duplicate` takes `synced: true` to give note and document copies a shared `data.sync_id`, and `update` calls `sync_copies` first, so a content change (title, text, colour, text format, font) lands on every unlocked copy inside the same command and therefore the same undo step. Position, size and everything else stay per copy. A plain duplicate drops the id, so copies are only linked on purpose. Sync is done in the engine rather than the UI so REST, MCP and agents keep copies in step too. Probed on the release binary: a synced duplicate shared the id, a plain duplicate did not, an edit reached the unlocked copy but not a locked one or an unrelated note, and one undo reverted all of it.

## Tables

v0.4.5: `table_data` validates table cards (1 to 26 typed columns, at most 500 rows, cell text up to 2000 characters). Cells stay raw text and formulas stay text in the engine; evaluation belongs to the frontend so the engine never interprets user formulas and undo restores exactly what was typed. An unknown column type was refused over MCP.

## Group connections

v0.25.0: a connection end may be `group:` plus a group id. The prefix was chosen over a new field so `Connection` keeps its shape and old clients still round-trip the board.
- `group_endpoint` and `Board::endpoint_members` resolve an end, item id first.
- `Board::validate` accepts an end that names an item or a present group.
- The connect arm checks each end exists, that the two ends share no item, and that every member is unlocked. The disconnect arm uses the members for its lock check.
- `apply_inner` calls `prune_group_connections` just before its own `validate`, so connections to a group that the command just dissolved go in the same step instead of failing validation. Item ends are untouched; the remove arm still drops those.

v0.26.0 added `BoardSettings.group_titles`, a `BTreeMap` so it saves in a stable order, skipped while empty so older boards stay byte-identical. The `name_group` command sets or removes a title. `prune_group_connections` also drops titles of groups that are gone, so no separate cleanup path is needed. A dedicated command was chosen over a settings patch because `merge_object` has no way to delete a map key.

v0.28.0 added `Connection.line` (`CONNECTION_LINES`: empty, dashed, dotted) and `Connection.arrow` (`CONNECTION_ARROWS`: empty, end, start, both):
- They are typed fields rather than `extra` keys so `validate` can refuse unknown values. Both are skipped while empty, so older boards stay byte-identical.
- `style_connections` takes ids plus any of label, color, line and arrow, and needs at least one of them. A field that is absent or null stays as it is. A field that is not a string is refused.
- It runs the same member lock check as disconnect and edits in place, so ids survive. Before this, relabelling was a disconnect and connect pair that kept the id only because the client reused it.
- Probed through the API: bad values on connect and style, an empty patch, a missing id, a non-string and a locked end are all refused; undo restores the previous style.

Probed through the API: group to group, item to group, an overlapping pair and a missing group are refused. Ungroup, removing a group's items and regrouping all its members elsewhere each prune, and undo restores; removing one member keeps the group and its connections.

## Ratings

v0.22.0: a picture's stars are `data.rating`, a whole number from 1 to 5 checked in the image arm of `Item::validate`. They are set through the existing `image` command's `set` (`rating` 0 to 5). 0 removes the key instead of storing it, so a picture rated and cleared saves byte for byte as before. `SavedSearch.rating` (0 for unrated, 1 to 5 for at least that many) is optional and skipped when absent, so older boards stay byte-identical; it also counts as the one field a saved search needs. Probed through the window: rate with a key and the inspector, clear by clicking the same star, undo restores the previous rating. v0.24.0 added the `rating` sort key in `arrange::sort`: most stars first, unrated last, ties by their current index so the order is stable; `descending` reverses it as for the other keys.

## Labels

v0.4.3: labels are defined once per board in `BoardSettings.labels` and items carry ids in `data.labels`, so a rename or recolour is one settings change that every item shows, as in Milanote. `Board::validate` refuses an item id that is not defined, and the `settings` arm prunes deleted ids from every item in the same step, so deleting a label never leaves the board invalid and one undo restores both. Probed on the release binary: define two, label an item, refuse an undefined id, delete one (pruned from the item), undo (both back), refuse an empty name.

## Comments

v0.4.2: `model.rs::comments` validates `data.comments` on every item kind (at most 200; identifier id, non-empty text up to 4000, author up to 80, numeric `at`, boolean `resolved`), so a bad thread is refused whether it arrives from the UI, REST or MCP. Comments live in item data rather than a board-level list so they move, duplicate, undo and delete with their item for free. Probed on the release binary: an empty text and a string `resolved` were each rejected with no state change; a valid thread was accepted.

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

The [Engine contract](../../.docs/wiki/Engine-Contract.md) records the settings keys/defaults, command shapes, grid/gap ranges, snap closure and midpoint behavior, gesture ownership and MCP mappings. Frontend drag gestures compute one quantized delta and send existing `transform`; the engine has no implicit `transform.snap` flag. Explicit `snap` expands groups itself; existing pack/distribute retain caller-owned group expansion.

## Verification

On 2026-10-10, `cargo build --offline --release` completed successfully in 5.28 seconds. No dependency or version changes were made in this increment. The built binary was handed to the backend agent for actual SDK and persistence observations.

Manually supplied 57 JSON-lines requests across three live executable invocations, with a read-only output formatter and no assertions, authored tests or runner files:

- 19 settings requests observed missing/partial old-board defaults, strict unknown-field/type rejection, valid fractional and boundary grid sizes, patch/undo/redo, unchanged/empty patches, invalid ranges and nulls, and a rejected batch preserving the prior revision and settings.
- 25 snap requests observed positive and negative midpoint ties, a 90-degree rotated rectangle, repeat no-op, undo/redo, a per-command grid override preserving the saved grid, invalid overrides, unselected locked group-member rejection, ancestor-lock rejection, parent plus child moving once, connected groups through a parent hierarchy, and empty/duplicate/missing identifier errors.
- 13 arrangement requests observed a two-root 12-unit horizontal gap, zero vertical gap, undo, invalid negative/string/over-limit gaps, preserved state after failure, retained legacy three-root distribution, legacy two-root rejection and existing pack with a 12-unit gap.

Concrete observations: midpoint items `(12,12)` and `(-12,-12)` became `(24,24)` and `(-24,-24)` on a 24-unit grid. A rotated 20 by 10 item at `(5,7)` and 90 degrees became `(-5,5)`, placing its rotated bounds at world origin. A parent/child/peer unit at `(10,10)`, `(40,20)`, `(70,10)` became `(0,0)`, `(30,10)`, `(60,0)` together; a locked peer left the original revision at zero. Explicit distribution placed the second item at `x=42` after a first item at `x=10` with width 20 and gap 12.

## Limits

These are live build and protocol observations, not automated test coverage. Frontend camera-scaled grid rendering, grayscale preview, ordered focus playback, REST persistence and MCP transport remain their owning agents' verification scope and are not claimed as engine-only observations here. Native desktop compilation remains outside this headless core increment.

## Reference editing

### src/model.rs · Item::validate reference source and color

- refers-to: `src/model.rs` :: `Item::validate`, known-kind match
- kind: rationale
- logged: v0.3.0 · 2026-10-10

Swatches store a single canonical color in the existing `Item.color` field. Validation accepts exactly a hash followed by six or eight ASCII hexadecimal digits, preserving supplied case and alpha. The existing `#191919` default remains valid. No mutable RGB/HSV parallel fields or duplicate source fields were introduced. Optional bounded sample provenance uses existing extension data and survives native state serialization.

Notes and documents accept an absent `data.text_format`, or the exact strings `plain` and `markdown`; invalid values and primitive types reject. Omission retains legacy plaintext meaning without inserting a new field into old item data. `Item.text` remains the authoritative UTF-8 source with the existing 1 MiB limit, JSON node/depth limits and 8 MiB board budget. Unknown extension kinds keep the existing extension behavior. Rust stores source literally; it does not parse Markdown, execute HTML or select links.

The known-kind validation runs on open and after every generic command and batch constituent. Existing cloned candidates, lock checks and session history provide atomic mutation, undo/redo and unchanged-command detection without new public commands or dependencies.

### Release binary · observed v0.3.0 readback

- refers-to: `src/main.rs` :: stdin protocol; `src/session.rs` :: board state/history; `src/commands.rs` :: add/update/group/transform
- kind: explainer
- logged: v0.3.0 · 2026-10-10

`cargo build --offline --release --manifest-path native/formref-core/Cargo.toml` succeeded in 5.18 seconds. No version or dependency changes were made. The binary was handed to the backend agent before service/MCP verification.

Manually supplied 44 protocol requests and retained the full response readbacks in the planning sidecar's [COLOR_NOTE_ENGINE_EVIDENCE_v0.3.0.json](../../../formref_sidecar/COLOR_NOTE_ENGINE_EVIDENCE_v0.3.0.json), a bounded 103949-byte observation record. A read-only JSON response formatter produced that artifact; no assertions, request generator, test file or runner was written.

Observed default, mixed-case six-digit and eight-digit transparent swatches; canonical alpha edits and color undo/redo; Markdown source and Unicode document text; legacy and explicit plaintext; rejected short, missing-hash, non-hex, seven-digit, whitespace, Unicode-digit, numeric and CSS-function colors; rejected format values, nulls, booleans, numbers, objects and incorrect case. A failed rename/text/color batch retained the original title, source, revision 7 and history. Locked swatch/document edits rejected. A saved document was undone and redone, and unchanged format retained revision 13. New kinds participated in grouping and translation with undo/redo. Native open/get retained swatch alpha, provenance, format, literal source and geometry; invalid swatch/document snapshots failed explicitly.

This record establishes engine validation and source-state readback only. The reopened snapshot contains a manually supplied projection of the observed source items, not a portable ZIP round trip. Maximum-size stress, sampling, safe rendered Markdown, focused editor behavior, exports, process persistence and actual MCP transport remain separate owning-agent acceptance checks. Edited existing files: `src/model.rs` and this log; rewritten files: zero. No shared contract, version file or other agent's source was edited.

## iStack commands

- refers-to: `src/commands/image.rs` :: rotate, opacity, flags, crop; `src/commands/arrange.rs` :: sort; `src/commands.rs` :: place_grid, dispatch arms
- kind: rationale
- logged: v0.3.2 · 2026-10-11

iStack's Images and Organize menus (Rotate 90, Set Opacity, Flip, Toggle Grayscale, Toggle Pixel Art, Crop, Reset Crop, Sort by Aspect Ratio, Sort by Filename, Sort by Similarity) needed engine commands so the menu, REST, MCP and the agent all reach one undoable step instead of hand-built `update` patches. New families live in their own files under `src/commands/` and are registered as match arms in `apply_inner`; the existing commands were not moved, because moving them changes nothing a user can see.

`rotate` turns each selected root about its own centre (default 90 degrees, range -360 to 360), so a mixed selection rotates in place rather than around the group. `image` only touches image items and refuses a selection with none; `set.sampling` accepts `smooth` or `nearest`, and the model now rejects any other sampling string. `crop` takes a normalised rect that must fit the source, or `reset: true`, which removes the crop key. `sort` reuses pack's grid placement, which was split out of `pack` as `place_grid`; ties keep board order, so the result is deterministic. Similarity sorting walks nearest neighbours by Euclidean distance over `data.features` (at most 512 numbers, computed by the backend at ingest); items without features keep their order at the end.

Run on 2026-10-11 through the release binary with 20 JSON-lines requests: rotate, opacity, image flags, crop and reset, all three sort keys, and six rejected commands (out-of-range opacity, no images, bad sampling, overflowing crop, unknown key, locked item), each leaving the revision unchanged; two undos restored the earlier layout exactly. The request file was a one-off in the session scratch folder, not committed.
