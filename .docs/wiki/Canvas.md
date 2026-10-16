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

Remove Background (Images menu or the inspector) makes the background transparent. The original is kept, so Restore Background brings it back, Remove Background again starts from the original, and Ctrl+Z undoes either. Choose the Method in the inspector; the models are FormCut's, with the same files and checksums:

| Method | Model | Size | Good for |
| --- | --- | --- | --- |
| Plain background | none | | product shots, scans, logos and sketches on a plain backdrop; Tolerance sets how far a colour may differ, and busy or blending backgrounds are refused |
| Object | U2Net small, built in | 4.6 MB | any photo, offline from the first run |
| Person | U2Net human segmentation | 176 MB | people |
| Sharp edges | IS-Net general | 179 MB | crisp outlines, objects with fine structure |
| Subject (Auto) | Person, else Object | | FormCut's rule: the person matte when it covers at least one percent of the image, otherwise the object one |
| Click to select | SAM 2.1 Hiera Tiny | about 150 MB | the one thing you point at: Pick points on the image, click what to keep, Alt-click what to leave out (up to 16), then Remove |

A model other than Object downloads when you press Download; each file is checked against its published SHA-256 and discarded if it differs. On a machine that cannot reach GitHub or Hugging Face, Import file takes the same files from elsewhere, checked the same way. Models live in `models/` in the data folder and run through ONNX Runtime on the best processor present (Core ML, DirectML or CUDA when available, else the CPU).

Align, distribute, pack and normalize operate on engine-selected IDs. Locked content is protected from mutating layout commands; unlock intentionally before rearranging it. A group transform operates about shared bounds, and a completed user operation should produce one undo step.

The current manual and toolbar are authoritative for offered controls; keyboard shortcuts reserved by a browser may behave differently from a native desktop shell. Rendering/gesture checks and any unfinished controls are recorded in the release's verification notes.

## Illustrator tools are optional

The Pen, Curvature, Pencil and Direct Selection tools, path editing and Live Corners, polygon, star, arc, spiral and grid shapes, stroke, arrowhead and gradient options, Pathfinder and Smart Guides are off by default (v0.11.0). Preferences, Illustrator tools turns them on for this browser or desktop window and they appear at once; turning them off removes their commands, keys and controls and returns an active vector tool to Select. Paths already on a board draw, move and export either way. Agents see these commands in the catalogue marked as optional; running one while they are off answers that the person can turn them on.

## Grid and reference viewing

Canvas preferences persist on the board through Rust settings. Grid visibility is independent from snapping; changing grid size changes world spacing even while the grid is hidden. Snap selected uses visible rotated bounds and moves group/parent units together. With snapping enabled, dragging uses one common movement delta for the selection. Undo reverses the completed mutation.

Pack gap and distribution gap are separate inputs. An empty distribution gap keeps equal-spacing behavior; a numeric gap sets edge-to-edge spacing on the chosen axis. Geometry uses visible rotated bounds.

Canvas grayscale previews the board without replacing original assets. Per-image grayscale remains an editable image property; the preview setting does not turn a color export into grayscale.

Reference presentation opens a mounted viewer for visible image references. Previous/next navigation and configurable timed playback use deterministic layer/document ordering. The presentation dialog prevents board editing while open. Pause stops timed movement; closing or Escape returns to the board. Switching boards or removing the active reference stops playback. GIF frame scrubbing, video/audio playback and proprietary slideshow formats remain outside this increment.

## Color capture and document editing

Choose Sample image color in the canvas toolbar, then click a registered image. Color capture reports the original source pixel, RGBA/RGB/HSV and HEX; opacity/grayscale preview does not change the value. Crop, flips, rotation and camera pan/zoom are mapped back to the original. Copy HEX or Create swatch from the result. Escape leaves sampling; changing boards discards pending results. Add color swatch creates an editable card; Swatch HEX in the inspector accepts exactly #RRGGBB or #RRGGBBAA. Color edits use the shared undo history.

Add document creates a card and opens Reference editor. Select a note and use Open editor or Format note for the same focused workflow. Title, Text format and Source are draft fields; Preview renders the bounded safe subset. Heading, List, Strong, Emphasis and Link insert source markup. Links accept absolute HTTP(S) URLs; raw HTML remains literal. Save commits source/title/format through Rust, Cancel discards the draft, and reopening reads saved source. Plain notes retain their inline editing behavior. Creating a new card is already a board mutation; canceling its source draft does not delete that card.

Unrelated external board edits retain the draft, focus and caret. A changed saved title/source/format disables Save while preserving the draft; Reload saved deliberately replaces it, or Cancel exits. Conditional saves reject a racing revision with no overwrite and let you retry after checking the latest state. This is local stale-write protection, not hosted multi-user collaboration. Preview shows at most 4,096 lines while Save preserves complete source within the existing Rust budgets; a small canvas card/export clips its rendered text to the card geometry.
