# Frontend hashout log

## Navigation

- [Entry and shell](#entry-and-shell)
- [Scene and gestures](#scene-and-gestures)
- [State and integration](#state-and-integration)
- [Stacking scale](#stacking-scale)
- [Verification](#verification)
- [Scripts](#scripts)

## Entry and shell

`index.html` owns the persistent application shell, inspector inputs, export chooser, command palette, preferences, and modal fields. `src/styles/tokens.css` owns all theme colors, spacing, sizes and layers. Studio Dark takes its surface values and orange accent from the attached FormVis family. Six appearance profiles and a custom accent are persisted before first paint. No remote fonts, icon dependency, framework or compiled iStack bundle is shipped.

`src/ui/icons.ts` creates original inline currentColor SVGs while detached. It never rebuilds a live icon container. `public/favicon.svg` is an original FormRef mark. `src/styles/main.css` owns shell layout, scene cards, inspector fields and responsive rules. The desktop layout uses a left board/outline rail, central infinite canvas, right inspector and floating camera controls.

## Scene and gestures

`src/ui/scene.ts` maintains a map from permanent engine item ID to mounted DOM node. Item geometry, title, text and image presentation patch individual properties. The image box reserves dimensions while a new source decodes offscreen; a failed replacement leaves existing image pixels visible until a valid replacement succeeds. Card input focus and in-progress text survive external state updates. Item order follows engine z then document array order by moving existing nodes only when paint order changes. Hidden items remain addressable in the outline; navigator nodes hide immediately and are removed on item deletion.

`src/main.ts` dispatches gestures to the Rust authority through the API. Drag, resize and rotate preview CSS properties, then commit one command. Column drag previews descendants and the engine validates containment. Group selection expands all matching group IDs. Marquee works against item bounds; rotated marquee accuracy is an intentionally bounded axis-aligned approximation. Shift resize keeps aspect ratio; Shift rotate snaps to 15 degrees. Space/middle-button/Hand pans; wheel zoom remains anchored at the pointer. The engine receives the camera after 400 ms of idle input.

Image controls include normalized source crop, reset crop, horizontal/vertical flips, grayscale, nearest/smooth sampling and opacity. A flip is applied about the crop center in source coordinates so canvas and compositor select the same source pixels. Stroke/shape geometry uses engine-local points; imported lines preserve their original direction. Shape fill defaults to none unless explicitly stored. Drawing resize commits width/height and lets Rust scale local points. The inspector exposes stroke width, line color, shape kind, fill color and filled/unfilled state.

Notes and tasks use plain text. Double-click edits note/task text in place; blur commits it. Link cards open only HTTP(S) URLs in a separate tab with no opener. File cards download registered assets. Nested-board cards enter their saved child canvas on double-click. Column containment is assigned explicitly with the inspector parent field. Tasks store completed state; scheduling and assignees are not included. Tags use comma-separated strings and are searchable with title, text and URL. Arrange exposes pack, align, distribute, width/height/area normalization, groups and front/back ordering.

`src/ui/sample.ts` contains three original SVG architectural illustrations, renders them to PNG in the browser and uploads each as a registered source asset. The optional sample board is a real editable document with notes, images, task, link, palette shapes and a connector. It does not use reference-product screenshots or assets. Sample and file uploads capture the destination board ID so changing board during encoding/upload cannot place items in another board.

## State and integration

`src/lib/types.ts` mirrors the shared `docs/CONTRACT.md` schema. `src/lib/api.ts` owns relative API requests, uploads, relinking, import/export URLs and SSE transport. `src/main.ts` serializes commands and accepts monotonically increasing revisions. SSE subscribes to the explicit `revision` event, reloads externally mutated state and patches the existing item nodes. Failed API actions produce a fixed-position notification. Startup failure leaves the reserved shell mounted and reports disconnected service state.

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
