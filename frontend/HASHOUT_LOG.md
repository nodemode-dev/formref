# Frontend hashout log

## Navigation

- [Entry and shell](#entry-and-shell)
- [Scene and gestures](#scene-and-gestures)
- [State and integration](#state-and-integration)
- [Stacking scale](#stacking-scale)
- [Verification](#verification)
- [Scripts](#scripts)
- [v0.9.0 find similar](#v090-find-similar)
- [v0.8.0 find by color](#v080-find-by-color)
- [v0.7.9 overflow scan, command modules](#v079-overflow-scan-command-modules)
- [v0.7.8 compare, inspector labels](#v078-compare-inspector-labels)
- [v0.7.7 adjustments, measure, selection to board](#v077-adjustments-measure-selection-to-board)
- [v0.7.6 study aids](#v076-study-aids)
- [v0.7.5 Intl dates, keys.ts, command words](#v075-intl-dates-keysts-command-words)
- [v0.7.4 card labels translated](#v074-card-labels-translated)
- [v0.7.3 PDF text in search, window layouts](#v073-pdf-text-in-search-window-layouts)
- [v0.7.2 drop into columns, all pictures, card hints](#v072-drop-into-columns-all-pictures-card-hints)
- [v0.7.1 off-screen culling, group sizes, BeeRef files](#v071-off-screen-culling-group-sizes-beeref-files)
- [v0.6.9 crop on the board, lasso, rotate selection, stacking lock](#v069-crop-on-the-board-lasso-rotate-selection-stacking-lock)
- [v0.6.8 visible-first loading, PDF tools](#v068-visible-first-loading-pdf-tools)
- [v0.6.7 video clips, flip view, drag out, image level of detail](#v067-video-clips-flip-view-drag-out-image-level-of-detail)
- [v0.6.6 arc, spiral, grids, blending modes, duplicates](#v066-arc-spiral-grids-blending-modes-duplicates)
- [v0.6.5 several anchors, Outline Stroke, Pencil, gradient stops](#v065-several-anchors-outline-stroke-pencil-gradient-stops)
- [v0.6.4 Smart Guides, Curvature, search, visibility](#v064-smart-guides-curvature-search-visibility)
- [Canvas increment](#canvas-increment)
- [Reference editing increment](#reference-editing-increment)
- [v0.5.3 background models and cloud storage](#v053-background-models-and-cloud-storage)
- [v0.5.2 right-click regression](#v052-right-click-regression)
- [v0.5.1 editing while presenting, always on bottom](#v051-editing-while-presenting-always-on-bottom)
- [v0.4.10 clipper pairing and card footer icons](#v0410-clipper-pairing-and-card-footer-icons)
- [v0.4.9 background removal and a steady toast](#v049-background-removal-and-a-steady-toast)
- [v0.4.8 desktop window controls and WebKit icons](#v048-desktop-window-controls-and-webkit-icons)
- [v0.4.7 synced notes, map cards, inline edit commit](#v047-synced-notes-map-cards-inline-edit-commit)
- [v0.4.6 GIF frames and document export](#v046-gif-frames-and-document-export)

## v0.9.0 find similar

`app/similar-find.ts` follows `color-find.ts`: one `matchFilters` predicate (the sample itself always passes), a request counter, a picture signature checked in `onState`, and one class change per item when the answer arrives. Both filters apply together. The button sits between the color chip and the clear button in `#filter-row`; while active it gets `has-similar` and `--similar-thumb` (the sample's asset URL) as a cover background with the icon hidden, so the kind select shrank once to 119 px and never changes while filtering. The clear button is shared: each module listens to it and clears its own filter, and its `visibility` follows `has-color` or `has-similar`. Clicking the button with one picture selected starts or restarts with that picture; with the sample still selected it clears. Removing or hiding the sample, or opening another board, clears it. `similarMenu()` builds the right-click submenu of the three levels like `studyMenu()`.

Verified at 4x CPU and a slow network on a board of photographs and edited copies: widths 147, 119 and 191 px before, during and after; Similar Pictures showed the astronaut and its four copies with each item changing class once; Near Copies dropped the greyscale copy; the motorcycle found its pair; the outline listed only the five; clear restored all 13; deleting the sample cleared the filter and undo restored the item; German labels, toast and submenu; the overflow scan in 24 languages found nothing.

## v0.8.0 find by color

`editor.matchFilters` is a list of extra predicates that `matches()` checks first, so feature modules narrow the board filter (canvas dimming, outline rows, Select All) without editor importing them. `app/color-find.ts` pushes one: an item passes when no colour is applied or its id is in the last answer. The chip sets `has-color` and `--find-color` on `#filter-row` at once; the board changes only when `GET /boards/{id}/colors` answers (a request counter drops overtaken answers), so each item changes class once. While a colour is applied, `onState` compares a signature of picture and swatch ids with their asset or colour and asks again when it changes; until then a new picture counts as not containing the colour. The picker's `input` events are coalesced to one request per 150 ms and `change` gives the count toast. The chip first sat inside the find box; that shrank the search input to 91 px, so it moved beside the kind filter, whose select takes the remaining width; the clear button is always laid out and only toggles `visibility`.

Verified at 4x CPU and a slow network on a probe board: input and filter widths identical before, during and after (147, 143, 191 px); seven items dimmed and three shown for #ff0000; every item's `matched-out` class changed exactly once; Select All took the three; clear restored all; Find This Swatch Color from the palette matched the same three; Sort by Color from the palette gave rainbow order. German labels, toast and menu checked; the overflow scan in 24 languages found nothing new (its only hit is the intentionally offscreen board-title button).

## v0.7.9 overflow scan, command modules

Overflow scan: a probe opened the shell, the export, preferences, help, commands, input, trash, template and label dialogs and the context menus in all 24 languages, and listed every text node whose scroll width exceeded its box. Hits were the sidebar wordmark (`.product-label` was 42 px with 1 px tracking; now 80 px, 0.6 px, `overflow-wrap: anywhere`), Russian "Play" and Norwegian "Spacing gap". After the fixes the scan lists nothing.

Command modules: `app/commands/` has one file per menu group, each exporting a `*_COMMANDS` array, plus `when.ts` for the shared enabled checks (`has`, `hasImages`, `hasBoard`, `anyLocked`, `hasCutout`). Group files never import `../commands`, so there is no cycle. `commands.ts` spreads the arrays in the old order (the two clipper token commands keep their place after View through `CLIP_COMMANDS`, and Edit Board Labels stays among Insert), registers them, and re-exports `lockLabel`, `bindShell`, `snapScale`, `snapScaleNow` and `setOpacity` so importers are unchanged. Verified: `agents sync --check` reports the reference unchanged; the same throttled probe (add note, select all, palette with 168 rows and filter, preferences with clipper token, panel toggle) gave identical results on the build before and after the split.

## v0.7.8 compare, inspector labels

`app/compare.ts` builds its overlay once (bar, two boxes, divider) and mounts it into `#overlay-root` on first use at `--z-overlay`; opening only sets two image sources and visibility. Each box takes its picture's board shape (item width over height) and `paintImage()` paints the original inside it, so crop, flips, lasso, adjustments and value studies match the board. Side by side gives both the same height; the other views centre both at the same height and change only the second box: opacity (onion skin), `clip-path: inset()` plus a divider (swipe), or `mix-blend-mode: difference`. A capturing keydown handler owns keys while it is open so nothing reaches the board. Verified at 4x CPU and a slow network: box sizes per view, opacity 0.3, clip 25 percent from a drag with the divider placed, difference blend, swap, Esc closing with the board zoom and selection unchanged; German bar labels.

Inspector labels: compact inspector buttons may wrap (auto height, `overflow-wrap`, `hyphens: auto`), and in the two-column grids the icon sits above the label so the label gets the full width. A scan of every inspector button in all 23 translated languages went from many cut-off labels (German 19, Hungarian 20, Ukrainian 22) to none.

## v0.7.7 adjustments, measure, selection to board

`lib/image-geometry.ts` builds the picture filter in one place, `imageFilter()`: brightness, contrast and saturate (from `data.adjust`, percent, 100 omitted) then the value study or grayscale view. `app/adjust.ts` writes only the selected pictures' image `filter` while a slider moves (no engine call, no re-render) and sends one `batch` of updates on `change`; `adjust` is stored only when some value differs from 100. The inspector reads the first picture's values through `onInspector`, skipping the slider being dragged. Verified at 4x CPU: board pixels after 120/140/50 matched the PNG export and the CSS formula within one level (red 161,42,41 vs 161,41,41); one undo per slider release.

`app/measure.ts` follows the lasso pattern (capturing listeners on the stage, an SVG overlay in the world layer). Sizes are divided by the zoom so lines and labels keep their screen size; a per-frame check repaints only when the zoom or flip changes, and labels are mirrored back in a flipped view. Verified: 300 px at 0.0 degrees, then 205 px at 43.0 degrees and 0.68x the first, Shift giving 45.0 degrees; the board revision did not change; Esc removed every label.

`app/board-extract.ts` posts the selection to `/api/boards/{id}/extract`, applies the source state when moving, refreshes the board list and opens the new board in a new tab. Verified: moving a column through the palette made "Moved column" with the column and its child, left the other column, and Undo on the source brought both back with their connection.

## v0.7.6 study aids

`app/study.ts` puts one hidden SVG in the body with filters `formref-values-2` to `-8`: a luminance matrix (Rec. 709 weights) then a discrete component transfer with that many evenly spaced steps, in sRGB so the steps fall where the eye puts them. `paintImage()` uses the filter when `data.value_levels` is 2 to 8 and falls back to grayscale or none. The drawing grid is a `.study-grid` node inside each image box (hidden until painted, so it never flashes), two 1 px linear gradients tiled at `100 / n` percent plus an inset shadow for the far edges, with `mix-blend-mode: difference` so white lines invert whatever is under them. Both live in item data, so they undo, save and sync like any edit, and exports never read them. The right-click Images menu gets Value Study and Drawing Grid submenus (Off plus steps, checked when every selected picture agrees) built by `studyMenu()`. Verified at 4x CPU: Notan set `value_levels` 2 and the filter, the 4 x 4 grid showed at 25 percent, Off cleared both, Extract Palette added and selected 6 swatches with its message, one undo removed them, and the SVG export did not change. German menus read "Tonwertstudie", "Notan (2 Tonwerte)", "Tonwerte: 3".

## v0.7.5 Intl dates, keys.ts, command words

`lib/i18n.ts` adds `formatLocale()` (the interface language's BCP 47 tag; in English the browser's own `en-*` region) and `relativeTime(ms)` through `Intl.RelativeTimeFormat` (seconds under 45 s, then minutes, hours, then a short date). Comments, Trash rows, the chat session list and table cells use them; the Trash detail now starts with a word ("Removed {0} · {1} item{2}") because the extractor skips strings that start with a placeholder. Checked at 4x CPU: German "16. Okt. 2026", "1.234,50 $", "vor 5 Minuten · Erledigt", "Entfernt vor 6 Sekunden"; en-GB browser "16 Oct 2026", "US$1,234.50"; Japanese "2026年10月16日", "6 分前 · 解決済み".

`app/keys.ts` holds what was the key block of `commands.ts` unchanged (labels, `comboOf`, the keymap rebuilt on registry changes, defaults from `registry.defaults`, overrides, `assignKey`, reserved keys, `commandForKey`); `assignKey` reads `registry.get`. Importers moved to it. Verified: Ctrl+K, Shift+H and ? still work; a saved override (Flip View Horizontally on Alt+H) loaded after reload and freed Shift+H.

`app/command-meta.ts` gives each command of the original table a sentence; `catalogue.ts` prefers a command's own `description`, then these words, and adds `default_keys`. All 174 catalogue entries now carry real words.

## v0.7.4 card labels translated

`KIND_LABELS` in `ui/scene.ts` gives each card kind an English word that goes through `t()` (Task for to-dos and Synced as a capitalised word, because the extractor skips hyphenated single words and lower-case strings; the eyebrow is uppercase in CSS either way). Checked in German: "Studio-Notiz" and "Video" on the board.

## v0.7.3 PDF text in search, window layouts

`app/pdf-text.ts` keeps page text per PDF asset. `matches()` asks it only while the search box has a term, so boards are not scanned for PDFs until someone searches; the first ask starts one fetch per asset (marked `null` while in flight) and returns nothing yet, and when the text arrives `onPdfText` runs the same re-filter as typing. A PDF file card matches on all its pages; an image from PDF Pages to Images (`data.pdf_source`, `data.pdf_page`) matches on its own page only. Verified at 4x CPU and a slow network: "verdigris" and "cafe" (accent folded from "Café") matched the PDF and page 2 only, "rim light" the PDF and page 1.

`app/window-layout.ts` registers on `boardOpened`, a hook list `applyState()` runs when a different board comes up. A board with `settings.window` calls the shell's `window_place`, then sets Always on Top and window opacity through the Preferences controls themselves (setting the input and dispatching its event), so those controls and the stored opacity stay in step. Save reads `window_layout`, `window_state` and the opacity slider into one `settings` command. The commands are desktop-only (`__TAURI__.core` present) and appear in the Canvas menu only there. Verified in the shell under Xvfb: a board saved at 120,90 1000x700 opened there; after moving and resizing to 200,150 1240x780, Save stored those numbers and the 0.9 opacity; a layout at 5000,3000 3000x900 opened centred on the 1600x1000 screen at 1600x900.

## v0.7.2 drop into columns, all pictures, card hints

`app/drop-into.ts`: the target is the topmost visible column under the pointer that is not itself being moved and has no `data.drops_locked`. Only the moving roots count (items whose parent is not also moving; columns never nest). `moveCommands()` returns the `transform` alone when nothing changes parent, or a `batch` of the transform plus one `update` per root: joining sets `parent_id` and, when the item sits at or below the column, a new top `z` so it shows above the column; an item dragged out of its column with the pointer outside that column gets `parent_id: null`. One batch is one undo step. `highlightDrop()` toggles `drop-target` on one column node only when the target changes. Lock Against Drops toggles `data.drops_locked` on selected columns and only appears in the right-click menu when a column is selected. Verified at 4x CPU: drop in (parent set, z above), the column carrying its child, two undos restoring the original place, a locked column refusing, drag out releasing.

The All pictures export row checks the board for pictures first and shows a message instead of downloading an error. The column footer and the other card hints now come from `t()` in `ui/scene.ts` because the page translator skips card content (it is user content); `bindings.ts` re-renders the scene on a language change, and `text()` writes only nodes whose words changed. `formref://window-state` from the desktop tray feeds the same `showNative()` that the page's own window controls use.

## v0.7.1 off-screen culling, group sizes, BeeRef files

`ui/scene.ts` marks a node `culled` when `inView()` says it lies beyond the view plus one view of margin; `.board-item.culled` sets `content-visibility: hidden` and `visibility: hidden`, so the box keeps its size and position (no layout change) while its contents skip layout and paint. The flag is re-evaluated in `Scene.detail()` on every camera draw and in `ItemNode.update()`, so an item moved into view by an agent shows without a camera move. Pointer code finds items by `closest('.board-item')` and geometry comes from board state, so culled nodes need no special cases. Verified on a 120-picture board at 4x CPU and a slow network: 111 culled at open, none culled on screen after panning, all shown after Fit.

`app/group-normalize.ts` measures each item's rotated bounds the same way the engine's `normalize` does, takes the median per group and sends one `batch` of `normalize` commands (one undo step). Items with a `parent_id`, locked or hidden items are left alone.

The export row `data-export="bee"` follows the other export rows; afterwards `bindings.ts` counts items with no BeeRef form (anything not image, note, document, to-do or link) and says how many were left out. `upload()` sends dropped `.bee` files to `/api/import` as new boards. The i18n extractor skips strings that start with a camel-case word such as BeeRef, so user-facing strings put a plain word first.

## v0.6.9 crop on the board, lasso, rotate selection, stacking lock

`app/crop-mode.ts` draws in the world layer an overlay with the item's own box and rotation: a faint full picture (`crop-ghost`), a clipped bright copy inside the crop box (`crop-window`) and the handle frame, while the real item is hidden by the `cropping` class. Geometry is kept in item-local display space (after flips); pointer positions go through `worldPoint` (so a flipped view works) and the inverse rotation. Apply converts the box back to source-normalized crop (undoing flips) and moves and resizes the item about its rotated centre, as one batch so it is one undo step.

Lasso masks live in source-normalized coordinates on `data.mask`. On the board, `maskPath()` in `lib/image-geometry.ts` sets a CSS `polygon()` on the whole-picture image element, whose own box is the source, so crops and flips (CSS transforms on that element) need no conversion and previews at any level of detail clip the same. The backend applies the same polygon as alpha in `image_source`, which PNG, SVG and PDF all use.

`app/transform-tools.ts`: Rotate Selection rotates centres about the selection's unrotated bounding-box centre and adds the angle, normalised to -180 to 180. `orderable()` removes stacking-locked ids before any `order` command; the engine is unchanged.

## v0.6.8 visible-first loading, PDF tools

`ui/scene.ts` keeps the visible world rectangle in `viewRect`, set by `Scene.detail()` from `drawCamera`. An image node with no source yet that lies outside the view plus one view of margin on every side stays `deferred` (image and fallback hidden, the grey image box showing) and loads when a camera change brings it in range; nothing is unloaded. The first render of a session, before any camera, loads everything as before. `app/pdf.ts` runs PDF Pages to Images through the backend and selects the new pages; the Export dialog's paper choice defaults to Letter for en-US, en-CA, es-MX, es-US and fr-CA.

## v0.6.7 video clips, flip view, drag out, image level of detail

Clip points live in `lib/media.ts`: `paintPlayer` keeps `{start, end, rate, loop}` in a WeakMap per media element, and listeners added once when the element is made read it on loadedmetadata, play and timeupdate; the native `loop` is only used when there is no clip, because it would jump to 0. Frame steps assume 30 fps unless `data.fps` is set; the browser exposes no frame rate. `app/video.ts` owns the inspector fields and commands.

Flipping is view state (`S.flipX`, `S.flipY`), never saved. The camera stays in unflipped stage coordinates: `drawCamera` writes a mirrored transform, `stagePoint()` mirrors the pointer, panning negates the drag and wheel zoom passes the mirrored point. Overlays in the world layer (selection, anchors, guides) mirror with it; screen-space overlays (marquee, menus, toasts) do not.

`app/drag-out.ts` only arms a native drag on Alt with the Select tool: pointerdown in the capture phase makes that item's root draggable and stops the board gesture. The drag carries `DownloadURL`, `text/uri-list`, `text/plain` and `application/x-formref-item`; capture-phase listeners swallow our own type so a drop back on the board is not imported.

Level of detail (`ui/scene.ts`): `detailEdge()` picks 256, 512, 1024 or 2048 from the item size over its crop times zoom times device pixel ratio, or the original beyond 2048. `ItemNode.edge` only grows (Infinity is the original), so zooming out never reloads; `Scene.detail()` runs from `drawCamera` and updates only nodes that need more pixels. The colour picker's loaded check now accepts a preview URL; sampling reads original pixels on the server.

## v0.6.6 arc, spiral, grids, blending modes, duplicates

The four generators live in `lib/vector/path.ts`. The spiral works in unit radius, one anchor per quarter turn with KAPPA handles scaled to that anchor's own radius, then fits the whole curve (handles included) to the w by h box, so the item size is the drawn size. Grids are one item of many paths; the divider limits (499, polar rings 498) keep inside the engine's 1000 paths per vector. Blending is `data.blend` drawn as `mix-blend-mode` on the item root, written only when it changes; the world layer is its own stacking context, so items blend with each other and not with the canvas colour. Normal stores null. Duplicates are found in `backend/app/core/features.py`: a 9 by 8 grey difference hash per asset, cached as `dhash` in the asset record, grouped greedily against each group's first image; identical files always group because their asset ids match.

## v0.6.5 several anchors, Outline Stroke, Pencil, gradient stops

`direct-select.ts` keeps the selected anchors as `picked` (keys `path:index`) for one item, `pickedItem`; `chosen` stays the last one so `chosenAnchor()` and Cut Path work as before. The box starts on a pointerdown that misses every anchor, handle and board item while a path is the target, and is captured on the stage so the item marquee in `gestures.ts` never starts; a click without a drag clears the picks and the item selection, as a click on empty canvas did. Delete removes picked anchors per path from the highest index down so indices stay valid. Average's horizontal means one shared y, vertical one shared x. Delete Segment needs two picked neighbours; a closed path is reopened starting after the segment.

`strokeOutline()` in `lib/vector/boolean.ts` unions a rectangle per flattened segment with join pieces (a disc for round, the bevel triangle on both sides, plus the miter tip while 1 / cos(theta/2) is within the limit) and caps (discs for round, the end segments lengthened by half the width for projecting). The inner join pieces fall inside the segment rectangles, so both sides are added without working out which side is outer. The result is drawn with `data.stroke = "none"`, which `scene.ts` honours, because the engine refuses a stroke width of 0. Dashes are not expanded. An unset miter limit now draws at 10 (it was SVG's 4 while the inspector said 10).

The Pencil reuses the Draw gesture (`type: 'pen'`) and only differs at pointerup, where `pencilItem()` in `app/pencil.ts` simplifies at a fidelity-dependent screen tolerance and runs `smoothPath`. Gradient stops are an optional `stops` array; two-stop gradients keep the old `from`/`to` shape, and `paintGradient` adds or removes `stop` elements inside the item's own gradient element only.

## v0.6.4 Smart Guides, Curvature, search, visibility

`app/smart-guides.ts` snaps in `gestureDelta` after the grid snap, for move gestures only: the moving selection's union box (rotated items by their rotated bounds) is compared edge, centre, edge against every other visible item, nearest match per axis within 6 screen pixels, and one path in a world-space overlay draws both guides; pointerup and pointercancel clear it. The on or off state lives in localStorage under `formref-smart-guides` because it is a viewer preference, not board state. Resize and rotate do not snap to guides yet, and there is no snapping to anchor points.

The Curvature tool shares the Pen's state in `direct-select.ts`: `curve` marks it, `curveAnchors()` runs `smoothPath` over the placed points every frame and keeps the anchors in `corners` as they are (corner points, and a picked-up path's own anchors so continuing it does not reshape it). Clicking a placed point again toggles it, which is also how a double-click lands. Open ends get no handles, as `smoothPath` leaves them.

`matches()` in `editor.ts` folds case and accents (NFD with marks removed) and adds comment text and the JSON of `data.table`. `app/visibility.ts` uses ordinary `update` commands on `hidden` and `locked`, so undo and agents work; Isolate keeps the parents and children of the selection.

## v0.6.3 Pathfinder pieces, Offset Path, continue path

`pieces()` in `lib/vector/boolean.ts` builds Divide's faces incrementally (each new shape splits every existing face into inside and outside, plus its own leftover), so a piece's style index is the topmost shape covering it. Merge keys pieces by colour and fill. `offset()` is a Minkowski sum with a disc built from edge rectangles and vertex circles (16 steps), unioned in one call; it is exact for round joins and never self-intersects, but miter and bevel joins are not offered. Pen continuation in `direct-select.ts` only picks up unrotated items, because it rewrites the item box in world pixels; Live Corner radii are carried across by the average scale.

## v0.6.2 chat, languages, Pathfinder, arrowheads, gradients

`src/ui/chat-pane.ts` listens to `/api/chat/events` (one EventSource opened on first use) and appends nodes as events arrive; streamed Markdown goes through `chat-markdown.ts` (formlit's, unchanged), which renders finished blocks once and only rewrites the live tail. `src/lib/i18n.ts` keeps each translated Text node's and attribute's English in WeakMaps, so a node rewritten by the app in English is translated again and a switch back restores English exactly; the observer is idle in English unless a translated node changes. The shell stays hidden until a saved non-English table is loaded, with a 4 s safety reveal in `index.html`. `lib/vector/boolean.ts` works on `flatten()` output, so Pathfinder results are polygons, not curves. Arrowheads are drawn in a second SVG in the item's pixel box because the vector SVG stretches with `preserveAspectRatio="none"`. Gradients live in each drawing's own `<defs>` with the item id in the gradient id.

## v0.6.1 command registry, catalogue, vector paths

`src/app/registry.ts` is the single command store; `commands.ts` registers its table into it so ids, keys and iStack's menu order stay as they were, and feature modules (`terminal.ts`, `vector.ts`, `direct-select.ts`) register their own. `bindings.ts` appends palette and shortcut rows for late registrations instead of rebuilding. `catalogue.ts` mirrors descriptions to the backend and long-polls `/api/commands/next`; the window-only, risky and read-only sets there are defaults a command can override with its own fields.

`src/lib/vector/path.ts` holds no DOM. Live corners trim both neighbouring segments at the round corner's tangent points (distance r / tan(theta/2)) for all three styles, as Illustrator does, and clamp r so the trim is at most half of either segment. Vectors are stored in a w by h design box and drawn with `preserveAspectRatio="none"` and a non-scaling stroke, so the engine's resize needs no knowledge of anchors; radii stretch with non-uniform scaling (Illustrator's Scale Corners on). `direct-select.ts` pools its marker nodes and only toggles classes and attributes; it intercepts pointer events in the capture phase only on its own markers, so the select tool's move and marquee are untouched.

## v0.6.0 terminal dock

`src/ui/terminal-dock.ts` is adapted from formlit's dock and loads lazily from `src/app/terminal.ts`, so xterm (about 340 kB) is not in the first paint. The dock is a grid row of `.editor`; `.statusbar` is pinned to row 4 in `styles/dock.css` so a hidden dock collapses its auto row to zero instead of shifting the status bar. Height comes from `--term-dock-h`, restored by the head script before first paint. Each tab mounts one host node and one tab button; hide only toggles `hidden` and the PTYs keep running. Keys typed in the stage stop propagating except the Ctrl/Cmd+J family, and `gestures.ts` lets `terminal`, `claude-code` and `agent` fire from inside text fields. `comboOf` reads `event.code` for Alt combinations because macOS Option changes `event.key`. Throttled run recorded in the v0.6.0 commit body.

## v0.5.3 background models and cloud storage

`app/cutout.ts` owns the inspector's Background block: the Method select (Plain background, Subject (Auto), Object, Person, Sharp edges, Click to select (SAM 2.1)), the model status line with Download and Import file, and SAM point picking. Status comes from `GET /api/models`, polled each second only while a download runs. Picking is a capture-phase pointerdown on the stage, active only on the one selected image: it maps the click with `imageCoordinates` (the colour picker's mapping, so points are in the image as shown), draws keep (green) and leave-out (red, Alt-click) dots inside the painted image box, and Escape or another selection ends it. Remove Background reads the method and points through `cutoutOptions`. Status lines reserve room for their longest message (three lines for errors), because download progress and errors arrive without input; the throttled run measured a 0.005 shift before that. Choosing the method by keyboard, as a person does, then measured zero.

## v0.5.2 right-click regression

A full re-run of every earlier probe found the right-click menu silent whenever no image was selected. v0.4.9's `hasCutout` called `selectedImages()`, which throws without an image; the menu builder evaluates every `enabled` check, so one throw stopped `menu.show` after the browser menu had already been suppressed. `hasCutout` now uses `selected()`, and `isEnabled` in `commands.ts` wraps every check (menu, palette rows, keys, `run`) so a faulty check reads as disabled and logs a warning. The v0.4.9 probe only right-clicked an image, which is why it passed; the verification specialist now requires a right-click on empty canvas with nothing selected whenever commands change.

## v0.5.1 editing while presenting, always on bottom

`present.ts` keeps its capture-phase guards but each now checks `editing`; the Edit button (in `#present-actions`, beside Exit Presentation) flips it and the `presenting-edit` class, which brings back the selection outline, handles, card footers and the lock badge on locked cards only, while the panels stay hidden. With Edit on, Escape still leaves unless it is ending a text edit, closing a menu or closing the enlarged card. `S.presenting` makes `rememberCamera` skip saving, so neither the fitted camera nor the zoom keys write the board's view; the zoom keys used to. Preferences gained Always on bottom; both window boxes are refreshed from the shell's reply, since each switches the other off. Run in throttled Chromium: read-only drag and Delete did nothing; with Edit a drag moved the note, handles showed, an inline edit saved and Ctrl+Z undid it; Edit off blocked drags again; leaving reset Edit; the saved view was unchanged; no shifts, no console errors. The run caught the lock badge showing on every card in Edit mode, fixed before commit.

## v0.4.10 clipper pairing and card footer icons

Preferences has a Browser clipper section: the token sits in a read-only password field filled when Preferences opens (`api.clipToken`), Copy writes it to the clipboard, and New token resets it. Copy Browser Clipper Token is also in the palette. Clips need no frontend code: they are ordinary engine adds, so the open board picks them up from its event stream. Looking at clipped link cards showed the footer arrow rendering as an unsized SVG (300 by 150), which pushed the address and the Double-click hint out of every link, board, file and document card; `.card-footer > svg` is now 14 px.

## v0.4.9 background removal and a steady toast

Remove Background and Restore Background are commands in the Images menu and buttons in the inspector, beside a Tolerance slider (1 to 60) that shows its value and, for an image already cut out, the tolerance it used. Both call `api.background`, adopt the returned state and report images the service skipped. `scene.ts` marks a cut-out image with `cutout`, which drops its card shadow and fill so the subject sits on the canvas; selection is dashed so its box still shows. The throttled run found the toast sliding sideways when a long message replaced a short one: the centred root resized with its text. `#toast-root` is now a fixed zero-height strip and the toast is positioned inside it, so changing text never moves anything that was already on screen.

## v0.4.8 desktop window controls and WebKit icons

Preferences gained Window opacity (page opacity over the now transparent desktop window, remembered per browser in localStorage) and Click-through, which listens for the shell's `formref://window` event so the checkbox follows the global shortcut. Running the page in WebKitGTK showed script-made SVG icons in grid rows drawing at WebKit's default 300 by 150; explicit icon sizes in `shell.css` fix it for the desktop shell and Safari alike.

## v0.4.7 synced notes, map cards, inline edit commit

Synced Copy and Stop Syncing are table commands (Insert menu, palette); the card header adds "synced". `lib/media.ts` turns Google Maps (@lat,lon,zoom, place and search links) and OpenStreetMap (#map= and mlat/mlon) into keyless embed URLs, and map links are added at 420 by 320. A real bug surfaced while testing: clicking the empty canvas after typing in a note never saved the text, because the marquee gesture calls preventDefault and focus never left the note; `gestures.ts` now blurs an open inline edit on the stage before any gesture. Throttled run: a synced copy made from the menu, an inline edit on the copy reached the source, one Ctrl+Z reverted both, Stop Syncing unlinked one, and an OpenStreetMap link became a 420 by 320 map card with the expected embed address; no shifts, no console errors. The map tiles themselves need the public web.
- [v0.4.5 media and table cards](#v045-media-and-table-cards)

## v0.4.6 GIF frames and document export

`ui/gif-player.ts` decodes a GIF once with ImageDecoder (frames arrive composited) and draws frames on a canvas that copies the image's crop and flip styles, so the overlay lines up exactly; the image underneath is only made transparent. Playback uses each frame's own duration divided by the speed; decoding is serialised so fast scrubbing never draws out of order. Keep frame turns the canvas into a PNG and places it through the normal upload path. The document editor gained an Export select that downloads the saved card. Throttled run: an 8-frame GIF opened with controls playing, pause held the frame, comma and full stop stepped and wrapped, the slider jumped to frame 6 and its pixels matched that frame, Keep frame added an image, and PDF and Word downloads came through; no console errors. The only shift was the inspector switching to an upload's new selection.
- [v0.4.4 presenter view](#v044-presenter-view)

## v0.4.5 media and table cards

`lib/media.ts` creates or patches one player per card (video, audio, or an iframe for YouTube nocookie, Vimeo, Spotify and SoundCloud embeds) and only replaces it when the type changes, so a playing video survives board updates. Autoplay is muted because browsers allow nothing else. `ui/table-view.ts` keeps one table per card and patches cells in place; cell editing is contenteditable on the cell with Enter, Tab and Escape, and commits one update. `lib/table.ts` evaluates formulas with a small recursive-descent parser (no eval), caches each cell once per paint and reports #CYCLE and #ERR. Pointer and double-click handling skip players and tables so controls and cell editing work on the board. The selection badge got a fixed width after it shifted the panel tabs when an upload selected its new cards. Throttled run: a webm played, seeked and looped and a wav loaded; a table took typed cells and =SUM(B1:B2)*1.2 (51), switched to currency ($51.00), gained a checkbox column, showed #ERR for a divide by zero and recovered with Ctrl+Z; no console errors. The remaining shift is the inspector switching to the uploaded selection, as for any upload. H.264 mp4 playback was not checked (the test Chromium has no H.264); embeds need the public web.
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
