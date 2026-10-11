# Frontend hashout log

## Navigation

- [Entry and shell](#entry-and-shell)
- [Scene and gestures](#scene-and-gestures)
- [State and integration](#state-and-integration)
- [Stacking scale](#stacking-scale)
- [Verification](#verification)
- [Scripts](#scripts)
- [Canvas increment](#canvas-increment)
- [Reference editing increment](#reference-editing-increment)
- [v0.4.4 presenter view](#v044-presenter-view)
- [v0.4.3 labels and web capture](#v043-labels-and-web-capture)

## v0.4.4 presenter view

`app/present.ts` adds `.presenting` to the app, which zeroes the layout variables and hides the chrome, asks for full screen and fits the board without saving the viewport (the remember timer is cleared, so no board write and no history entry). Read-only is enforced by capture-phase listeners on the stage (pointerdown, dblclick, contextmenu) and on the window (keys), which stop events before the editor sees them, so no editing path needed a presenting check. The enlarged card decodes the original image before showing it. Leaving full screen by the browser also leaves presenting. Throttled run: chrome hidden and the stage filled the window; Delete, N and a double-click changed nothing; a card enlarged, the arrows stepped through 7 cards, Escape closed the card and then the view; no console errors; the board revision did not move. Selection outlines, footers, checkboxes and lock badges are hidden while presenting.
- [v0.4.2 comments and templates](#v042-comments-and-templates)

## v0.4.3 labels and web capture

`app/labels.ts` renders label chips in the inspector (on, partly on, off across the selection) and the Board labels dialog; toggling is one batch of per-item updates. `scene.ts` keeps a label map refreshed on every render and patches an `item-labels` row of pills on each item. `app/capture.ts` handles dropped HTML images, URL lists and plain addresses, pasted addresses and the Add Images from the Web command; page results open a fixed-cell picker (broken thumbnails dim instead of collapsing, so the grid never reflows). `editor.ts` gained `placeAssets`, which `upload` now uses too. Ctrl+Shift+I was avoided because it opens developer tools. Throttled run: no shifts on cold load or through the label work, no console errors; labels defined, applied to two items, renamed and deleted with the cards following; Find matched a label name; a dropped image address and two picked page images landed. One small shift (0.003) came when a dropped image became the selection and the inspector switched to image fields, the same as dropping a file.
- [v0.4.1 shortcut changes and trash](#v041-shortcut-changes-and-trash)

## v0.4.2 comments and templates

`app/comments.ts` subscribes through a new `onInspector` hook in `editor.ts` and keeps one keyed row per comment, patching author, time, text and the resolved class in place; the section is static markup inside the inspector, so showing it moves nothing that was already painted. Each board item gains a hidden `item-comments` badge (open count) patched from `scene.ts`. `app/templates.ts` drives the template dialog and Save as Template. New icons: comment, resolve, template, template-save. Throttled run: zero layout shifts across cold load, the comment thread and the template dialog, no console errors; add, resolve, Ctrl+Z reopen and delete followed the board; Save as Template appeared under Your templates; Storyboard opened with 12 items. A look at all four starters led to taller heading and caption notes so their text shows, and to dropping the storyboard's frame links, which drew across the frames.
- [v0.4.0 confirm card and readable notes](#v040-confirm-card-and-readable-notes)
- [v0.3.3 shell rebuild](#v033-shell-rebuild)

## v0.4.1 shortcut changes and trash

The shortcut sheet's keys are buttons: click, press keys, and `assignKey` moves the combo (taking it from its old owner), rebuilds the keymap and tells listeners, which patch the sheet and the palette text in place. Capture runs as a window keydown listener in the capture phase, so the canvas never sees the keys, and Escape cancels without closing the dialog. Reserved browser keys and Space are refused with a note. Overrides load at start from `/api/preferences`. `app/trash.ts` renders the Trash dialog from `/api/trash`; restore applies the returned state, a deleted board is reopened after restore, and Empty Trash needs a second click. The agent card had used an undefined `--accent` token; it now uses `--accent-line` and `--accent-ink`. Throttled run: zero layout shifts on cold load and across both dialogs, no console errors; N moved to Shift+N, Ctrl+T refused, Shift+N then taken by Lock with a note, saved, restored after reload and reset; a deleted card and a deleted board both restored.

## v0.4.0 confirm card and readable notes

`ui/panels/agent.ts` renders a `confirm` event as a Confirm card (Decline, Allow all, Allow) in the agent log and posts the answer; the card is closed by `confirm_closed`, by its own answer, or when the turn ends. A toast points to the panel when it is hidden. Notes created by agents or MCP without a colour got the engine default `#191919` under the pastel-note ink, so they were unreadable; `scene.ts` now marks dark note paper `dark-note` by luminance and the ink switches to the primary text colour. The board-list count now updates from every applied state instead of only on open. Throttled run: the card appeared, Allow went through, the count followed, no console errors; the only layout shift was the outline list closing over the removed row.

## v0.3.3 shell rebuild

- refers-to: `src/main.ts`; `src/app/editor.ts`; `src/app/commands.ts`; `src/app/menu.ts`; `src/app/gestures.ts`; `src/app/bindings.ts`; `src/ui/context-menu.ts`; `src/ui/dock.ts`; `src/ui/icons.ts`; `src/styles/shell.css`; `index.html`
- kind: rationale
- logged: v0.3.3 · 2026-10-11

The monolith is gone. `main.ts` only wires modules. `app/editor.ts` holds board state (`S`), selection, camera, the engine queue and every renderer hook, lifted from the old `main.ts` with its logic unchanged. `app/commands.ts` is the one command table: id, label, icon, keys, handler, enabled check. The context menu (`app/menu.ts`), the command palette and the keyboard (`app/gestures.ts`) and the shortcut sheet (`app/bindings.ts`) all read it, so a label, icon or key cannot differ between them.

The right-click menu follows iStack's order and labels: File section (New, New Tab, Open, Open in New Tab, Add Images, Paste, Save / Export), Edit section (Undo, Redo, Select All, Deselect All), then Canvas (Toggle Grid, Snap Grid Off to 2x, Grayscale Canvas, Background Color, Fit View, Fit Canvas to Content, Reset Zoom), Organize, Images, Layer, Lock Selected, Add Note, Draw Mode, Slideshow and Delete Selected. Two labels name FormRef's own format instead of iStack's (Open Board File, Save Board (.formref)), because FormRef reads .istack but writes .formref. FormRef extras sit in an Insert submenu, at the end of Organize and Images, and as Ask Agent. Shortcuts follow iStack where it had one (D draw, L lock, C crop, R rotate 90, Ctrl+P pack, Ctrl+G and Ctrl+Shift+G group and ungroup, Shift+S slideshow, Shift+Up and Down front and back, Ctrl+0 reset zoom); FormRef keys that collided moved (duplicate Ctrl+D, link Shift+L, connect Shift+C, rectangle Shift+R, circle Shift+O, line Shift+I, toggle grid G).

Docks: `--sidebar-w` and `--inspector-w` drop to the 44 px rail width when `html[data-left-dock]` or `html[data-right-dock]` is `collapsed`. The head script restores both, the theme and the open right-hand panel before first paint. The shell itself stays hidden until an inline script right after its markup adds `shell-ready`: under a throttled network the browser painted a half-parsed toolbar and the last buttons slid 36 px when the rest arrived, which the throttled check recorded as a layout shift. The body background is painted throughout, so nothing flashes.

Icons: one glyph per meaning, named after the action, and `icon()` throws on an unknown name so a typo fails instead of drawing the board glyph. The context menu renders into `#overlay-root`, a direct child of `body`, at `--z-dropdown`; no raw z-index exists outside `tokens.css`.

Throttled check (4x CPU, 150 ms latency, 400 kbit/s, Chromium): zero layout shift on cold load and on reload with both docks collapsed; menu structure and Images submenu read back in order; Rotate 90 and Sort by Similarity from the menu changed the engine's board; Ctrl+K palette with 83 commands; the shortcut sheet with nine groups; the Agent tab switching panels; no console errors.

## Entry and shell

`index.html` owns the persistent application shell, inspector inputs, export chooser, command palette, preferences, and modal fields. `src/styles/tokens.css` owns all theme colors, spacing, sizes and layers. Studio Dark takes its surface values and orange accent from the attached FormVis family. Six appearance profiles and a custom accent are persisted before first paint. No remote fonts, icon dependency, framework or compiled iStack bundle is shipped.

`src/ui/icons.ts` creates original inline currentColor SVGs while detached. It never rebuilds a live icon container. `public/favicon.svg` is an original FormRef mark. `src/styles/main.css` owns shell layout, scene cards, inspector fields and responsive rules. The desktop layout uses a left board/outline rail, central infinite canvas, right inspector and floating camera controls.

## Scene and gestures

`src/ui/scene.ts` maintains a map from permanent engine item ID to mounted DOM node. Item geometry, title, text and image presentation patch individual properties. The image box reserves dimensions while a new source decodes offscreen; a failed replacement leaves existing image pixels visible until a valid replacement succeeds. Card input focus and in-progress text survive external state updates. Item order follows engine z then document array order by moving existing nodes only when paint order changes. Hidden items remain addressable in the outline; navigator nodes hide immediately and are removed on item deletion.

`src/main.ts` dispatches gestures to the Rust authority through the API. Drag, resize and rotate preview CSS properties, then commit one command. Column drag previews descendants and the engine validates containment. Group selection expands all matching group IDs. Marquee works against item bounds; rotated marquee accuracy is an intentionally bounded axis-aligned approximation. Shift resize keeps aspect ratio; Shift rotate snaps to 15 degrees. Space/middle-button/Hand pans; wheel zoom remains anchored at the pointer. The engine receives the camera after 400 ms of idle input.

Image controls include normalized source crop, reset crop, horizontal/vertical flips, grayscale, nearest/smooth sampling and opacity. A flip is applied about the crop center in source coordinates so canvas and compositor select the same source pixels. Stroke/shape geometry uses engine-local points; imported lines preserve their original direction. Shape fill defaults to none unless explicitly stored. Drawing resize commits width/height and lets Rust scale local points. The inspector exposes stroke width, line color, shape kind, fill color and filled/unfilled state.

Legacy notes and tasks keep plain text editing. Double-click edits a plain note/task in place; blur commits it. Formatted notes and document cards open the explicit source editor described below. Link cards open only HTTP(S) URLs in a separate tab with no opener. File cards download registered assets. Nested-board cards enter their saved child canvas on double-click. Column containment is assigned explicitly with the inspector parent field. Tasks store completed state; scheduling and assignees are not included. Tags use comma-separated strings and are searchable with title, text, URL and color. Arrange exposes pack, align, distribute, width/height/area normalization, groups and front/back ordering.

`src/ui/sample.ts` contains three original SVG architectural illustrations, renders them to PNG in the browser and uploads each as a registered source asset. The optional sample board is a real editable document with notes, images, task, link, palette shapes and a connector. It does not use reference-product screenshots or assets. Sample and file uploads capture the destination board ID so changing board during encoding/upload cannot place items in another board.

## State and integration

`src/lib/types.ts` mirrors the shared `.docs/wiki/Engine-Contract.md` schema. `src/lib/api.ts` owns relative API requests, uploads, relinking, import/export URLs and SSE transport. `src/main.ts` serializes commands and accepts monotonically increasing revisions. SSE subscribes to the explicit `revision` event, reloads externally mutated state and patches the existing item nodes. Failed API actions produce a fixed-position notification. Startup failure leaves the reserved shell mounted and reports disconnected service state.

`src/lib/host.ts` handles NodeMode integration separately. It requires parent source and the referrer-derived parent origin, honors explicitly permitted color token messages, waits for host initialization and sends the family image-assignment envelope. Assignment status says sent until an acknowledgement is received. Standalone mode disables that action. Native window preferences appear only when the Tauri global is present and invoke the shell's `window_state` and `window_configure` commands. Native runtime behavior remains subject to platform verification.

## Stacking scale

| Token | Layer |
| --- | --- |
| `--z-base` | Scene flow |
| `--z-raised` | Marquee |
| `--z-sticky` | Reserved sticky band |
| `--z-chrome` | Toolbars, captions and floating canvas controls |
| `--z-dropdown` | Reserved menus |
| `--z-scrim` | Reserved overlay backdrops |
| `--z-overlay` | Body-level dialogs |
| `--z-popover` | Reserved dialog popovers |
| `--z-toast` | Body-level notifications |
| `--z-tooltip` | Reserved tooltips |

All component z-index declarations reference named tokens. Scene item ordering uses DOM paint order rather than arbitrary inline numeric z-index values. Overlay and notification roots are direct body children.

## Verification

Strict TypeScript 7.0.2 compilation and Vite 8.3.4 production bundling passed. Actual npm registry metadata confirmed TypeScript Apache-2.0 and Vite MIT licensing. Tauri CLI 2.12.1 installation/version verification was run by the desktop setup owner. Browser UI verified under throttling: 4x CPU slowdown, 120 ms network latency, 192 KiB/s download and 96 KiB/s upload. Root integration evidence at `research/UI_EVIDENCE.json` records no page errors and successful inspector persistence, double-click note editing, SSE updates with input focus preserved, undo/redo, crop/flip/nearest sampling, file import, pack/group/ungroup, pointer drag/resize, freehand creation, search and command filtering, Light/Studio themes, rotation and normalization to a 300 px visible width, pan/zoom/fit, official MCP mutation visibly arriving through SSE, a 331,318 byte portable project download, and hard reload restoring 13 persisted items. The world, items and outline containers, all original 13 item roots and all 3 image nodes retained identity through the second interaction phase. Pointer capture starts after a 3 px move threshold so clicks and double-clicks retain their original target. Verification covers these browser workflows; native window execution, Windows scripts and assignment to a live NodeMode host were not exercised. No self-authored test file or test runner was created.

## Scripts

| File | Purpose |
| --- | --- |
| `oc_install` | POSIX frontend dependency install |
| `oc_install.bat` | Windows frontend dependency install |
| `boot_frontend` | POSIX Vite boot |
| `boot_frontend.bat` | Windows Vite boot |
| `package.json` | Development, strict build, preview and Tauri commands |
| `vite.config.ts` | Loopback-only host false, strict frontend port 5196 and API proxy to 8196 |

The shell script syntax was checked by the desktop setup owner. Windows scripts are not executed in this Linux environment.

## Layout stability

A cold-load observer attributed initial movement to the board list growing by one row and to intrinsic title, save-status and count widths. A single appended CSS region reserves a three-row 108 px board list, a 180 px title slot, an 80 px save-status slot and a 40 px left-aligned count slot, all derived from existing spacing tokens. Overflow stays inside the reserved board list; no container or item was recreated. Final v0.1.0 cold-load verification and Commands/Preferences opening passed with zero recorded layout shifts, four decoded images, Studio Dark background `rgb(17, 17, 17)` and no page errors under 4x CPU slowdown, 120 ms latency, 192 KiB/s download and 96 KiB/s upload. Evidence is recorded in `research/FINAL_STABILITY_EVIDENCE.json`. This zero-CLS result is scoped to the observed cold-load and panel-opening paths; the broader interaction results and native/host lifecycle limits remain as stated above.

## Canvas increment

The v0.2.0 frontend increment keeps canvas settings in the Rust board document through the validated `settings` command. Studio preferences mount grid visibility, finite 4 through 512 pixel grid size, drag snapping and canvas grayscale controls. Grid spacing and origin follow the saved world size and live camera. Grid visibility and snapping are independent. Canvas grayscale filters the mounted world and reference viewer without modifying source assets or item presentation fields; it is a preview setting and does not force export colors.

Drag preview and commit share one quantized delta anchored at the collective rotated bounds of affected items. Move closure includes groups and descendants until stable, including hidden members; affected IDs are sent once to `transform`, which deduplicates descendants. The ordinary 3 pixel gesture threshold remains based on pointer movement rather than snapped distance. Explicit Snap selection uses the Rust `snap` command, which snaps independent units separately and preserves each connected unit's internal offsets. Pack gap defaults to 24 pixels. Distribution gap is explicit when filled; blank retains automatic span distribution. Both fields accept 0 through 1,000,000 pixels.

`src/ui/reference-view.ts` owns a permanently mounted reference dialog and one persistent image node. Visible registered image references are ordered by z then document order. Focus uses the selected image when available; previous and next wrap in order. Cropping, flips, rotation, opacity, grayscale and sampling mirror item presentation. New source pixels decode before replacing the previous image. Playback defaults to 10 seconds and accepts a local 1 through 60 second interval. Presentation hides its reserved header/footer while playing and keeps board editing behind a modal; arrows step, Space plays or pauses, and Escape exits. Board change/deletion, active image removal, an empty sequence and user pause/exit clear playback. Global edit shortcuts, pasted files and delegated background actions remain blocked while the dialog is open; external MCP/SSE changes can still update the shared board.

Strict TypeScript checking and the Vite production build passed. Root integration evidence at `research/CANVAS_UI_EVIDENCE_v0.2.0.json` records nine new workflow paths under 4x CPU slowdown, 120 ms latency, 192 KiB/s download and 96 KiB/s upload, with no page errors. Cold-load and the second interaction phase recorded zero layout shifts; all original 11 item roots, world/items/outline containers and the reference image node retained identity, and focused input was preserved. Verified settings persisted hidden grid with snapping and grayscale enabled; grid spacing tracked camera zoom and a fractional 32.5 pixel size remained valid. Explicit horizontal/vertical distribution used a 14 pixel gap and packing used 17 pixels. Snap moved `(0,196)` to `(0,192)` and undo restored it; a snapped drag moved `(13,37)` to `(64,64)`. Three visible image references supported previous/next, a one-second timed advance, Space pause after focus moved to BODY, and Escape exit. Delete, note creation and pasted files were blocked during reference view. The viewer also worked at 1024 by 768 pixels. Its key handler is gated at document level because hiding the focused presentation control moves Chromium focus to BODY. This browser evidence is scoped to the recorded workflows; board deletion/empty-sequence cleanup is implemented but was not included in these observations, and native window execution and live NodeMode host assignment remain unverified. No self-authored test file or test runner was added.

## Reference editing increment

The v0.3.0 frontend adds managed-image color capture, strict editable swatches, opt-in formatted notes and focused document editing. `src/lib/image-geometry.ts` shares crop painting between the keyed scene and reference viewer. Decoded source dimensions use the backend's bounded floor/ceil crop raster; sampling inverts the live camera and item rotation into the actual painted image box before sending inclusive normalized coordinates. `src/ui/color-picker.ts` calls the real read-only sampling endpoint, displays source RGBA/RGB/HSV/HEX and frame-zero coordinates, and labels that opacity and grayscale are ignored. Copy HEX uses the browser clipboard with a selectable-value fallback. Create swatch persists canonical color and optional source provenance through Rust. Board change, target geometry change and mode exit abort pending requests and ignore late results; sampling pointer input returns before any drag gesture can commit. Escape exits the tool. `src/lib/color.ts` derives display values from exactly six or eight hexadecimal color digits; the inspector edits canonical HEX rather than separate mutable RGB/HSV fields.

`src/lib/markdown.ts` implements the shared bounded source-line subset with headings one through three, lists, strong, emphasis and absolute HTTP(S) links. The inline parser excludes nested bracket labels and performs no recursive Markdown parsing. Raw HTML and unsupported links remain literal text. Links use text nodes, safe destinations and no opener. The renderer keeps mounted block and inline variants, caches unchanged source and changes only affected leaves; canvas previews stop at 48 source lines, while the focused preview stops at 4,096 lines with an explicit disclosure. Full source remains in `item.text`. This is not full CommonMark, rich HTML or a remote preview fetcher.

`src/ui/source-editor.ts` owns one persistent body-level Reference editor dialog with title, source textarea, format, preview and Heading/List/Strong/Emphasis/Link controls. Save and Cancel are explicit. Unrelated SSE revisions advance current board state without writing the draft, moving its caret or rebuilding preview nodes. External changes to the focused item's title, source or format disable Save and expose Reload saved while retaining the draft. Save flushes queued canvas commands and sends the latest guarded `expected_revision`; a stale 409 reloads saved state without clobbering the draft. Plain notes and tasks retain their original inline editor. Document cards and formatted notes use the focused editor; the inspector and command palette expose Open editor and Format note. Swatch/document kinds participate in the existing keyed outline, filters, selection, geometry and history.

Strict TypeScript compilation and Vite production bundling passed. Actual Chromium, FastAPI and release Rust observations at `research/COLOR_NOTE_UI_EVIDENCE_v0.3.0.json` ran under 4x CPU slowdown, 120 ms latency, 192 KiB/s download and 96 KiB/s upload. A known three-by-two RGBA asset, cropped to its right two columns, flipped both ways and rotated 37 degrees, returned cyan at source pixel `(2,1)` with item opacity 0.6 and item/canvas grayscale enabled. Sampling did not change revision. At 145 percent zoom the observed camera matrix was `[1.45499,0,0,1.45499,-64.6726,-85.5727]` and the same original pixel remained correct. Clipboard copy, captured swatch creation, eight-digit alpha editing and undo/redo passed. A 107,471-byte Unicode Markdown source saved exactly; cancel/reopen, literal HTML, blocked unsafe anchors, visible headings/lists/emphasis, formatting actions, same-item conflict and Reload saved passed. An unrelated revision preserved focused textarea, selection `(75,85)`, source, preview container, line and anchor identity. World/items/outline containers, original item roots and decoded image also retained identity. Default 180 by 150 pixel swatches keep canonical HEX and RGB footer inside their card.

Initial layout observations exposed a wrapped board heading, intrinsic canvas caption width and wrapped note title moving later content. Minimal CSS reserves the inspector heading, note/document title rows, caption label, result outputs and derived swatch values; swatches use a compact single-line title and tile. Final cold load, unrelated title revision, delayed sample and mode/board cancellation paths recorded zero non-input layout shifts and no page errors under the same throttling. A 900 ms delayed sample was canceled on mode exit with the prior result retained and status reset; board change cleared values, disabled copy/create and exited sampling. This zero-CLS result is scoped to those observed paths. Native Tauri execution and live NodeMode assignment remain unverified. Atomic stale-save rejection, inclusive pixel edges, transparent alpha, portable source preservation and restart are independently recorded by the backend service owner. No self-authored test file or probe runner was created; observational calls remained inline and evidence stays outside the canonical repository.
