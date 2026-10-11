# Canvas

Collect images, notes and planning content on an infinite board, then select items to move, resize, rotate or edit them. Use relationships for connections, columns for organization, tasks for completion state and board cards for local board navigation.

| Action | Default input |
| --- | --- |
| Pan | Space + drag or middle-button drag |
| Zoom about pointer | Wheel |
| Marquee | Drag an empty board region |
| Undo | Ctrl/Cmd+Z |
| Redo | Ctrl/Cmd+Shift+Z |
| Export | Ctrl/Cmd+S |
| Import | I |
| Remove selection | Delete |
| Group/ungroup | G / Shift+G |
| Duplicate selection | D |
| Fit content | F |
| Reset zoom | 1 |

Image geometry supports crop, flips, rotation, opacity and grayscale. Preserve original image bytes while arranging; a display thumbnail is not an export source. The inspector changes selected properties through the same engine commands used by agents.

Align, distribute, pack and normalize operate on engine-selected IDs. Locked content is protected from mutating layout commands; unlock intentionally before rearranging it. A group transform operates about shared bounds, and a completed user operation should produce one undo step.

The current manual and toolbar are authoritative for offered controls; keyboard shortcuts reserved by a browser may behave differently from a native desktop shell. Rendering/gesture checks and any unfinished controls are recorded in the release's verification notes.

## Grid and reference viewing

Canvas preferences persist on the board through Rust settings. Grid visibility is independent from snapping; changing grid size changes world spacing even while the grid is hidden. Snap selected uses visible rotated bounds and moves group/parent units together. With snapping enabled, dragging uses one common movement delta for the selection. Undo reverses the completed mutation.

Pack gap and distribution gap are separate inputs. An empty distribution gap keeps equal-spacing behavior; a numeric gap sets edge-to-edge spacing on the chosen axis. Geometry uses visible rotated bounds.

Canvas grayscale previews the board without replacing original assets. Per-image grayscale remains an editable image property; the preview setting does not turn a color export into grayscale.

Reference presentation opens a mounted viewer for visible image references. Previous/next navigation and configurable timed playback use deterministic layer/document ordering. The presentation dialog prevents board editing while open. Pause stops timed movement; closing or Escape returns to the board. Switching boards or removing the active reference stops playback. GIF frame scrubbing, video/audio playback and proprietary slideshow formats remain outside this increment.

## Color capture and document editing

Choose Sample image color in the canvas toolbar, then click a registered image. Color capture reports the original source pixel, RGBA/RGB/HSV and HEX; opacity/grayscale preview does not change the value. Crop, flips, rotation and camera pan/zoom are mapped back to the original. Copy HEX or Create swatch from the result. Escape leaves sampling; changing boards discards pending results. Add color swatch creates an editable card; Swatch HEX in the inspector accepts exactly #RRGGBB or #RRGGBBAA. Color edits use the shared undo history.

Add document creates a card and opens Reference editor. Select a note and use Open editor or Format note for the same focused workflow. Title, Text format and Source are draft fields; Preview renders the bounded safe subset. Heading, List, Strong, Emphasis and Link insert source markup. Links accept absolute HTTP(S) URLs; raw HTML remains literal. Save commits source/title/format through Rust, Cancel discards the draft, and reopening reads saved source. Plain notes retain their inline editing behavior. Creating a new card is already a board mutation; canceling its source draft does not delete that card.

Unrelated external board edits retain the draft, focus and caret. A changed saved title/source/format disables Save while preserving the draft; Reload saved deliberately replaces it, or Cancel exits. Conditional saves reject a racing revision with no overwrite and let you retry after checking the latest state. This is local stale-write protection, not hosted multi-user collaboration. Preview shows at most 4,096 lines while Save preserves complete source within the existing Rust budgets; a small canvas card/export clips its rendered text to the card geometry.
