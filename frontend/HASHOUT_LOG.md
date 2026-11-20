# Frontend hashout log

## Navigation

- [Entry and shell](#entry-and-shell)
- [Scene and gestures](#scene-and-gestures)
- [State and integration](#state-and-integration)
- [Stacking scale](#stacking-scale)
- [Verification](#verification)
- [Scripts](#scripts)
- [Unreleased · The page holds the window key](#unreleased--the-page-holds-the-window-key)
- [Unreleased · A reload tries the kept key first](#unreleased--a-reload-tries-the-kept-key-first)
- [Unreleased · A reset agent choice is told once](#unreleased--a-reset-agent-choice-is-told-once)
- [Unreleased · Ctrl+J is the terminal dock](#unreleased--ctrlj-is-the-terminal-dock)
- [Unreleased · AMOLED Black](#unreleased--amoled-black)
- [Unreleased · Two engine messages in every table](#unreleased--two-engine-messages-in-every-table)
- [Unreleased · The terminal panel is the family's shared dock, module 2.1.0](#unreleased--the-terminal-panel-is-the-familys-shared-dock-module-210)
- [Unreleased · The shared dock at module 2.2.1](#unreleased--the-shared-dock-at-module-221)
- [After v0.41.0 · The shared dock at module 2.2.0, and Antigravity as the fourth agent tab](#after-v0410--the-shared-dock-at-module-220-and-antigravity-as-the-fourth-agent-tab)
- [v0.39.2 · Connections, text cards, the tag cloud, tabs, Preferences at 390 px, the demo's first open and 59 untranslated strings](#v0392--connections-text-cards-the-tag-cloud-tabs-preferences-at-390-px-the-demos-first-open-and-59-untranslated-strings)
- [v0.39.1 · The credits shown in the demo boards match the records](#v0391--the-credits-shown-in-the-demo-boards-match-the-records)
- [v0.39.0 · The review pass: twenty-one bugs](#v0390--the-review-pass-twenty-one-bugs)
- [v0.39.0 · Preferences is a window with a rail](#v0390--preferences-is-a-window-with-a-rail)
- [v0.39.0 · Home, the no-board state and three demo boards](#v0390--home-the-no-board-state-and-three-demo-boards)
- [v0.39.0 · A menubar from the command registry](#v0390--a-menubar-from-the-command-registry)
- [v0.39.0 · The splash page matches formvis](#v0390--the-splash-page-matches-formvis)
- [v0.37.8 · The splash logo holds its place](#v0378--the-splash-logo-holds-its-place)
- [v0.32.0 stack export option](#v0320-stack-export-option)
- [v0.31.0 group stacks](#v0310-group-stacks)
- [v0.30.0 connection routes](#v0300-connection-routes)
- [v0.29.0 connection colours](#v0290-connection-colours)
- [v0.28.0 connection styles](#v0280-connection-styles)
- [v0.27.0 connect selected](#v0270-connect-selected)
- [v0.25.0 group connections](#v0250-group-connections)
- [v0.24.0 stars on the board](#v0240-stars-on-the-board)
- [v0.23.0 picture shape filter](#v0230-picture-shape-filter)
- [v0.22.0 star ratings](#v0220-star-ratings)
- [v0.21.0 picture info](#v0210-picture-info)
- [v0.20.0 practice log view](#v0200-practice-log-view)
- [v0.19.0 practice class plans](#v0190-practice-class-plans)
- [v0.18.0 practice breaks and log](#v0180-practice-breaks-and-log)
- [v0.17.0 timed practice](#v0170-timed-practice)
- [v0.16.0 searches for all boards](#v0160-searches-for-all-boards)
- [v0.13.0 tag suggestions](#v0130-tag-suggestions)
- [v0.12.0 tag editing](#v0120-tag-editing)
- [v0.11.0 optional Illustrator tools, tag cloud](#v0110-optional-illustrator-tools-tag-cloud)
- [v0.10.0 saved searches, palette and dialog languages](#v0100-saved-searches-palette-and-dialog-languages)
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

## Unreleased · The page holds the window key

- refers-to: `src/lib/window-key.ts` (new) :: keyHeaders, windowKey, streamTicket; `src/lib/api.ts` :: request; `src/ui/terminal-dock.ts` :: call, connect; `src/ui/chat-pane.ts` :: call, connect, open; `src/ui/panels/agent.ts`; `src/app/catalogue.ts`; `src/app/practice.ts`; `src/app/bindings.ts`; `src/app/demos.ts`; `src/app/saved-search.ts`; `src/app/tabs.ts`

The module takes the key once at boot with a top-level await, so every module that imports it evaluates after the key is known and no request can leave without it: the packaged shell's global `__FORMREF_WINDOW_KEY` first (read once, then deleted), then the development bootstrap `POST /api/window/key`, remembered in `sessionStorage` so a reload of the same tab keeps working. `request` in `lib/api.ts` and every raw `fetch` that writes, or reads the Claude Code state or the command long poll, adds `keyHeaders()`. The terminal socket sends the key as its first message. The Chat event stream asks for a one-time ticket and reopens with a new one if the stream closes. Plain reads (boards, assets, previews, settings, practice log, session, saved searches) and the board revision stream send nothing extra. No element is created, moved or re-rendered by this: in the packaged app there is no extra request at all, in development one small POST before the first module runs.

## Unreleased · A reload tries the kept key first

- refers-to: `src/lib/window-key.ts` :: loadWindowKey

In development every reload used to ask `POST /api/window/key` again, which the engine refuses (409) and logs as a second claim that never happened. `loadWindowKey` now takes the packaged global first, then the key kept in `sessionStorage`, proving it with one `POST /api/window/ticket` (a ticket nobody uses), and asks the bootstrap route only when the kept key is refused (an engine that was restarted). The top-level `await loadWindowKey()` moved to the end of the module: `streamTicket` calls `keyHeaders`, a `const` declared further down, so with the await above it the check threw before it sent anything, was swallowed, and the bootstrap was asked every time. Seen in headless Chrome against a fresh engine: load, one bootstrap (200); two reloads, no bootstrap and one ticket each (200); every write after each reload 200 or 201; after an engine restart the kept key got 403 on the ticket and the bootstrap answered 200 once.

## Unreleased · A reset agent choice is told once

- refers-to: `src/ui/panels/agent.ts` :: load, setStatus

When the engine reports `seal_broken` in the agent settings (the stored choice for outside agents or the Claude program was changed outside the app and has been put back to Ask), `load` writes one sentence into `#agent-status`: "The saved agent permission was changed outside FormRef, so it is back to Ask." That line already holds two lines of height (`.agent-status` has a `min-height`), so nothing moves, and it is set through `setStatus`, which writes only when the text differs. A later turn replaces it with the turn's own status, as that line always does. The string is in every complete language table.

## Unreleased · Ctrl+J is the terminal dock

- refers-to: `src/ui/panels/agent.ts` :: the waiting-for-an-answer notice; `src/lib/i18n/tables/*.json` (23 tables); `.docs/wiki/Agent.md`; `.docs/wiki/Shell.md`

Ctrl+J (Cmd+J on macOS) shows and hides the terminal dock, as in the other Form apps; `src/app/terminal.ts` binds it and the binding is unchanged. The Agent panel has no key of its own (the title-bar button and Ask Agent open it). Two wiki pages and the notice shown when an agent waits for an answer while the panel is out of sight said Ctrl+J opened the Agent panel. The notice now ends at "Agent panel." and each table holds the same sentence without the key: the English text is the table key, so the key and the value were edited together in each of the 23 tables, one entry at a time. es-MX and fr-CA do not carry the string and fall back to es and fr.

## Unreleased · AMOLED Black

- refers-to: `src/styles/tokens.css` :: `:root[data-theme="amoled"]`, `:root[data-oled]`; `src/styles/prefs.css` :: `.prefs-group`; `index.html` :: the head script, the first style, `#theme-select`; `src/app/bindings.ts` :: the `theme-select` handler; `src/lib/i18n/tables/*.json` (23 tables)

FormRef's themes are `:root[data-theme]` token blocks, not a profile table, so the family theme is one more block: `amoled` sets the window, panels, nodes and canvas to `#000000`, inputs and menus (`--bg-tertiary`) to `#141414`, borders to `#262626` and `#3a3a3a`, text to `#ededed`, `#a6a6a6` and `#858585`, and leaves the accent alone. `--grid-color` is `#777777`: the board draws its dots at 32% of that colour, which is `#262626` on black, a dot 38 levels above the board where Studio Dark's dot is 21 above its `#1c1b1d`, so the grid reads as it does elsewhere without lighting a large area. The hover tint goes from 5% to 10% white through `:root[data-oled]`; FormRef has no `--border-soft` token, so that half of the family rule has nothing to set.

The flag is `data-oled` beside `data-theme`, never the theme id, so another OLED block only needs the flag. The head script sets it from the saved theme before first paint and the first style paints `html` and `body` black for it, because the stylesheets arrive after the page under a slow network and the default `#0a0a0a` would show. The picker handler sets and removes it only when it changes. Measured on the start screen, an open board, the Agent panel, the terminal dock and Preferences (every element over 6,000 square pixels with a fill or an image): the board, side panels, title bar, toolbar, status bar, Agent panel and dock are already `#000000`; the one large surface that was not is `.prefs-group` (a mix of 55% `--bg-tertiary` into `--bg-secondary`, which came out `#0b0b0b`), so under `data-oled` it takes `--bg-secondary` and an inset 1px `--border-color` ring in place of its shadow, which keeps its size. The Browser clipper section is a `.prefs-group`. Left as they are because they are content or accent: images and notes on the board, the accent tint of the selected board row and of the start screen banner, the active Preferences tab. The theme name is in the 23 complete tables, one entry each after High Contrast; es-MX and fr-CA fall back.

## Unreleased · Two engine messages in every table

- refers-to: `src/lib/i18n/tables/*.json` (23 complete tables) :: "Another window already holds this engine's window key; use that window, or restart FormRef.", "Not Found"; `scripts/i18n_check.py`

`i18n_check.py` had reported the same two keys missing in every complete table, before and through this program: the 409 text of `POST /api/window/key` (`backend/app/routers/window.py`, read by the checker because it sits in a `detail=` string) and the 404 `Not Found` of the same route when the engine hands the key over on its output instead. Only the development page calls that route and `src/lib/window-key.ts` reads no `detail` from it, so a person is unlikely to see either text today; the tables are meant to be complete for backend text the page could show, and the check now passes under `--strict`. Both are in the 23 complete tables now, each in its alphabetical place among its neighbours ("Another window" after "An outside agent wants to edit", "Not Found" before "Not now"), one entry per file; es-MX and fr-CA are partial and fall back. Wording follows each table's own words for window ("Fenster", "ウィンドウ", "창"), engine and restart, and its register for commands (the same one as the Claude Code install message). `i18n_check.py --strict` now exits 0 and reports missing 0 in every table. A native read of hu, th, vi, fi, tr, uk, ru, ja, ko and zh-Hant is advised.

## Unreleased · The terminal panel is the family's shared dock, module 2.1.0

- refers-to: `src/dock/` (15 files, byte for byte from FormVis `8bbdf61b`, never edited here); `src/dock-adapter.ts`; `src/styles/dock-tokens.css`; `src/styles/dock-layout.css`; `src/styles/chat.css` (was `styles/dock.css`); `src/app/terminal.ts`; `src/app/editor.ts` :: `consent`; `src/main.ts`; `index.html` :: the head script, the stylesheet links; `src/lib/i18n.ts` :: `SKIP`; `scripts/i18n_check.py`; `src/ui/chat-pane.ts`; `src/app/direct-select.ts`

What changed for a person. The panel can sit at the right of the canvas as well as under it (only in a window 1100 px wide or more), it remembers whether it was open, Codex and Cursor have tabs when they are installed, there is a short guide the first time, and a terminal follows a theme change at once. The question about an outside agent is the family's dialog: it names the program and what it asked, and it opens above any FormRef dialog with focus.

What did not change. Ctrl+J (Cmd+J on macOS) shows and hides the panel, Ctrl+Shift+J opens Claude Code and Ctrl+Alt+J opens Chat, all three still commands in the registry, so the menus, the macOS menu bar and a person's own bindings work as before. `comboOf` reads Ctrl or Cmd as `mod` on every platform, so from the canvas Ctrl+J and Cmd+J both toggle on macOS and elsewhere, as they did. From inside a terminal or the ask line only the platform's own modifier leaves the dock (Cmd on macOS, Ctrl elsewhere), so on macOS Ctrl+J typed into a shell is still the shell's line feed: the old `isDockToggle` rule, now `passKey`. The adapter gives `isDockChord: () => false`: the module never toggles by itself, the app's key handler does, which is why a rebound key and the macOS menu bar cannot toggle twice. `passKey` lets through the keys bound to `terminal` and `claude-code` and nothing else; Ctrl+Alt+J from inside a terminal stays with the terminal, as before.

Chat stays FormRef's own pane (`ui/chat-pane.ts`: Markdown replies, the pictures Claude looked at, "Select these items", the usage meter, "From Claude Code..."), given to the module as `chat: { pane, ask: 'line' }`. The module's ask line is the one input on Chat and the Claude Code line on every other tab; board and selection go with each ask, and the note under the person's bubble is kept.

The outside-agent question is wired to what the engine does today, which is to refuse first: `offers` is Deny and "Always allow all outside agents", never "Allow once", and two notes say so ("FormRef refused this request.", "If you allow outside agents, the agent has to ask again."). Deny sends nothing and keeps the window quiet for 60 seconds, as "Not now" did. Always is the same `POST /api/agent/settings` the old dialog sent. Escape closes the question without answering. One question per agent name at a time. The hold-and-ask design in the engine report was not built here: nothing in the engine waits, so the dialog does not pretend to.

Storage: `formref.dock` (no other FormRef key uses that name) holds open, side, height, width and tab. The old `formref-term-dock-h` (a CSS length such as `312px`) is read once by the adapter's own legacy reader and by the head script, then removed.

Removed, because nothing uses it: `src/ui/terminal-dock.ts` (355 lines, `git show db10d5e:frontend/src/ui/terminal-dock.ts`), the terminal rules of `styles/dock.css` (its first 28 lines, `.term-dock*` and `.term-host`), and from `index.html` the `<section id="term-dock" class="term-dock" aria-label="Terminal" hidden>`, the `<dialog id="consent-dialog">` ("An outside agent wants to edit", "Not now", "Allow outside agents") and the two head-script lines that set `--term-dock-h`. From `main.ts`:

```ts
let consentDismissedAt = 0;
consent.ask = () => {
  const dialog = document.getElementById('consent-dialog') as HTMLDialogElement;
  if (dialog.open || document.querySelector('dialog[open]') || Date.now() - consentDismissedAt < 60000) return;
  dialog.showModal();
};
```

and the two click handlers of that dialog. From `terminal-dock.ts`, the rule the adapter's `passKey` now carries:

```ts
export function isDockToggle(e: KeyboardEvent): boolean {
  return (isMac ? e.metaKey : e.ctrlKey) && !e.altKey && e.code === 'KeyJ';
}
```

Words. FormRef translates the page after the fact, so `t` returns English. The sentences the old dock already had in the 23 tables are reused where the adapter gives the old wording (the three tooltips with their keys, both ask placeholders, the Chat lead). The module's other sentences and the two notes show in English for now; no table was half filled. `i18n_check.py` skips `src/dock/` and `src/dock-adapter.ts` and still exits 0 under `--strict`; 15 more table entries count as unused.

Seen in headless Chrome at 1440 by 900 against an engine from source with stand-in programs: the three captures before and after (closed 0 differing pixels in the dock and canvas; shell 1,893 and Chat 2,164 inside the dock box, all of them the module's own icons, four new buttons and tab details), every dock action, the question over the Help dialog, and under 4x CPU with a slow network and no cache one stage box in every frame of a cold load with the dock remembered at the bottom and at the right.

## Unreleased · The shared dock at module 2.2.1

- refers-to: `src/dock/` (every file copied unchanged from formvis commit 23b01889); ../backend/tests/test_dock_manifest.py; ../NOTICE.md
- kind: rationale
- logged: v0.44.0 · 2026-11-20

The panel's first-run guide now ends its two sentences for a computer that has Claude Code (`tourInstalledBody`, `tourReadyBody`) by saying that Codex, Cursor and Antigravity each get a button of their own when they are on the computer. Only `strings.ts`, `CONTRACT.md` and `MANIFEST.json` differ from 2.2.0; the adapter needs no change. FormRef does not translate the panel's own sentences (its 25 tables hold none of them), so there is nothing to translate again. The manifest test now expects 2.2.1.

## After v0.41.0 · The shared dock at module 2.2.0, and Antigravity as the fourth agent tab

- refers-to: `src/dock/` (16 entries with `MANIFEST.json`, byte for byte from FormVis `ddc893ae`, never edited here; `agents.ts` is new); `src/dock-adapter.ts` :: `KINDS`, `record`, `formrefDock`, `tabs`, `agentStatus`; `src/app/terminal.ts` :: `dock`, `mountDock`

Module 2.2.0 takes its agent kinds from the adapter. The folder was copied whole, each file with `git show ddc893ae:frontend/src/dock/[name]`; its files match its `MANIFEST.json`. The adapter is typed `DockAdapter<'antigravity'>`, lists `antigravity` in `tabs().builtin`, keeps that kind on a terminal record, and hands on the engine's status, which already has the `antigravity` key (`installed`, `version`, `install`, `signedIn` null). `terminal.open` already sent every kind but the shell and Claude Code to `/api/terminal/agent`, so the fourth kind needed no new call. The dock is held as `Dock<'antigravity'>`.

Not done: the engine's sentence for a missing program is not given as `note` on the status (the row says the module's own "not found" words), `keyHeaders` and the automation ids were left as they are, and no status text is put on a record.

Run: `tsc --noEmit` exit 0 with the new folder and the adapter. Not looked at in a browser: the button, the row and the tab of the fourth kind were not seen drawn here; the engine side was seen through the routes (backend log, "An Antigravity tab"). Not run: the desktop window, Windows, macOS.

## v0.39.2 · Connections, text cards, the tag cloud, tabs, Preferences at 390 px, the demo's first open and 59 untranslated strings

- refers-to: `src/ui/scene.ts` :: anchors, curve, paintLines, followLive, preload, textHeight, grownHeight, ItemNode (`spoken`, body `input` and `blur`); `src/app/card-fit.ts` (new); `src/app/tag-cloud.ts` :: draw, fitRow; `src/app/tabs.ts` :: drop; `src/app/demos.ts` :: importDemo, openDemo; `src/app/editor.ts` :: fitCamera, inputDialog; `src/app/templates.ts` :: saveAsTemplate; `src/ui/prefs-window.ts`; `src/styles/prefs.css`, `src/styles/shell.css`; `scripts/i18n_check.py`, `scripts/i18n_extra.json`; `src/lib/i18n/tables/`; `index.html`; `../backend/app/core/endpoints.py`, `../backend/app/routers/demos.py`

Connections. A line used to end at the centre of a plain card (under it) and at the left or right side of a group, a column or a card with an arrowhead, whatever the position of the other end, so two cards one above the other were joined from side to side. `anchors` now finds, for each axis, whether the two boxes clear each other once each end's padding is counted (a group's frame, a column's side, the gap before an arrowhead, nothing for a plain item); if they do, the line runs between the facing sides on that axis; with room on both axes the shorter line wins and a tie goes to left and right; boxes that overlap on both axes keep the old rule. Plain items used to end at their centre under the card; they now end on their side. The result is computed on every draw and never stored, so every saved board and template opens with the same data and only the drawing differs. A curve and an elbow leave each end square to its side, towards the middle between the ends; a top-to-bottom line is the same geometry with the axes swapped (`swapAxes` on the path data), so there is one set of rules, not two. While a card is dragged or resized, `followLive` redraws its lines and group frames once per frame from the live boxes (`live` holds the previews and is cleared by the next real state). The service's `endpoints.route` mirrors this for the exports; a probe compared the window's path `d` with the SVG export and with the PNG for the same board.

Text cards. Note, task, document and link cards (`TEXT_CARDS`) keep the height saved in the board, like every other card, and nothing resizes when a board opens, so boards and templates look as they were made. They grow downward, never shrink, when a person writes more than the card shows: while typing inline (the body's `input` handler sets the node's height and the blur saves text and height in one update), when the inspector's Text field changes (`textCommand` returns one batch of updates), and when the source editor saves (`grow` hook). The height needed comes from `textHeight`, which lays out a throwaway copy of the card out of sight in the same task and reads it back, so nothing on screen changes. Text and height are one command, so one undo returns both. Escape restores the saved height. Fit Card to Text (`fit-to-text`, in the Edit and right-click menus and the palette; a new command, so the agent catalogue now has 239) sets each chosen card's height to its text exactly, growing or shrinking; locked and hidden cards are skipped. Other cards never move, so a card that grows can lie over the card below it; that is by design, since moving other cards would change a person's layout without being asked.

Tag cloud. The strip appeared, grew and vanished as tags came and went, shifting the outline under it (1 shift when tags first appear, 4 while they grow, 1 when they go, 1 on the sample board). It is now one row of fixed height (20 px plus its margin) that is always in the page and is simply empty when the board has no tags (the `hidden` attribute is gone from `index.html`). `fitRow` hides the chips that do not fit and counts them on the +N chip, which itself must fit on the row, and it runs in one task with no paint between its reads and writes; a `ResizeObserver` redraws it when the sidebar is resized. The +N menu lists what is hidden, and the chip takes the accent when a hidden chip is chosen, so a chosen filter is never invisible. The count has a minimum width so a count going from 9 to 10 does not widen its chip. Layout shifts after: 0 in every case probed (1440 English, 1000 German).

Tabs. A tab used to be `flex: 0 1 180px` and new tabs went to the right of the active one, so adding one pushed the rest right and shrank them all (1.90e-3 for a demo opened by command, 1.34e-3 when one closed). Tabs have a fixed width `clamp(96px, 7.5vw, 140px)`, new ones go at the end, the strip scrolls the active tab into view, and closing one takes it out, then slides the following tabs over from where they were with a 160 ms transform (`drop`), which Layout Instability does not count. Shifts after: 0 for add and close.

The demo's first open. The colour demo opened on an empty data folder showed no picture for 45 s and was complete after 54 s, with 396 part-filled frames, because the window fetched the file, uploaded it, and the service then made the preview of each of the 42 pictures when it was first asked for. Now the service imports the file itself (`POST /api/demos/{id}/open`, with the old fetch and upload as the fallback on a 404), the 256 px previews ship in `public/demos/<id>/previews/` and go into the service's cache, the camera is computed before the board is drawn (`fitCamera` split out of `fit`), and `scene.preload` decodes the pictures that will be on screen before the first frame, waiting at most 15 s (`PRELOAD_WAIT`) so a slow connection still shows the board. `decoded` holds those images by source until the next preload; a node whose source is in it shows it at once with synchronous decoding. Result at 1440 wide: first frame at 9.1 s (8.8 s at 1000 German), 42 of 42 pictures in it, no part-filled frame, no camera jump. Only the 256 px previews are shipped; sizes of 512 and 1024 px, asked for on 2x screens, are still made on demand and the first frame waits for them (up to the cap), so on a high-density screen the first open is complete but slower. The shipped previews of a picture that later leaves a demo are dead weight and harmless.

Preferences at 390 px. Below 760 px the rail becomes a row of icon tabs along the top of the window, the window takes the full width, and the wire that links the active tab to its card runs straight down instead of sideways (`stacked` in the wire code, the rail's scroll follows the active tab on x instead of y). Below 520 px each field row stacks its label over its control and the full-width buttons wrap. The scroll spy used to move the active category away from a clicked one when the page could not scroll far enough to put the last sections at the top; `pinned` keeps the clicked category until the person scrolls. All of it uses the existing spacing tokens and the same `--prefs-rail-h` for the rail and the window's margin, so nothing jumps between sizes.

Strings. 59 visible strings were English in every language: messages built in code that start with a placeholder or a capitalised word the extractor in `i18n_check.py` cannot see, strings holding a semicolon, the tool and cut-out status lines, the key-capture messages, the chat pane's Select buttons and the measure tool's ratio. `scripts/i18n_extra.json` lists the 55 the extractor cannot find, `i18n_check.py` reads it, and every one of the 59 is in all 25 tables by hand (the English strings reused where the meaning is the same). Strings that carried a value were rewritten to use `{0}` placeholders so the word order can differ by language. The card controls' accessible names (Complete task, Resize reference, Rotate reference) were set once, in English, when the card was made; each node now keeps them in `spoken` and sets them again the first time it is updated after a language switch. User text is still never translated.

Templates. Save as Template looks for a saved template with the same name (ignoring case) and, if there is one, asks "Replace the template ...?" before sending `replace_id`; the confirmation is the existing input dialog with its name field hidden (`confirm`) and the replace button focused, not a new dialog.

Demo wording. The NASA cards of the three demo boards say "NASA content, not subject to copyright in the United States (NASA media guidelines)", NASA's own wording, instead of "Public domain (NASA content)", in the board files and in the two credits files; the Hubble cards keep their CC BY 4.0 credit (0.39.1). A board someone already made from a demo keeps the text it was made with.

Verified (by the agents, in headless Chrome at 4x CPU throttling): the layout-shift numbers above before and after, the window's connection path against the SVG and PNG exports, a live line during a drag, inline typing with one undo, Fit Card to Text from the right-click menu, the three demos and the starter opening with the file's geometry, the colour demo's first open on a fresh data folder on a throttled network (Slow 4G), Preferences at widths from 1440 down to 390 px with screenshots in English, German and Japanese, the agents sync check against a headless window. Not verified: a 2x screen (the larger previews), macOS and Windows windows, WebView2 and WKWebView rendering of the new Preferences rail.

## v0.39.1 · The credits shown in the demo boards match the records

- refers-to: `public/demos/CREDITS.md`; `public/demos/colour/board.formref` (the Hubble Ultra Deep Field cards); `../NOTICE.md`; `src/ui/sample.ts` (read only)

Why. The 0.39.0 entry "Home, the no-board state and three demo boards" says the pictures are NASA material already credited in the family. Reading each picture's own source page again on 15 November 2026 showed that is true of 38 of the 39 and not of the Hubble Ultra Deep Field. ESA/Hubble publishes it (release heic0406a, the same March 2004 release the Wikimedia Commons copy names as its source) under Creative Commons Attribution 4.0 International and requires the full credit line "NASA, ESA, and S. Beckwith (STScI) and the HUDF Team". The family had recorded it as public domain because its Commons page says so; Commons is a copy, not the publisher, so the publisher's terms win. The evidence table is `/home/claude/work/scratch/turn3-pictures/EVIDENCE.md`.

Records. `NOTICE.md` and `public/demos/CREDITS.md` now give every picture its credit as its own page states it and a licence column. Three rows changed apart from the Hubble one: the Pale Blue Dot credit is "NASA/JPL-Caltech" with the science.nasa.gov page (the photojournal catalogue address redirects there), and the Apollo 11 bootprint and Saturn V rows are credited with their centre, "NASA (JSC)" and "NASA (MSFC)". The 27 NASA Image and Video Library items have no credit line in their records, only the centre, so they are credited "NASA (centre)" rather than a made-up photographer. The Hubble file is the Commons copy resized to 1400 by 1400 and its tone differs slightly from the ESA/Hubble JPEG; the record says so rather than naming the ESA file as the source of the bytes. The starter sample "Quiet structures" was not listed at all: its three pictures are SVG drawings in `src/ui/sample.ts` turned into PNG when the sample is created, own work, Apache-2.0, now a row in `NOTICE.md` and a section of `CREDITS.md`.

Cards. The credit a person sees is the Text and URL of each picture's card on the board, so the records alone left the Hubble cards (the picture and its detail crop on the colour board) saying "NASA and the European Space Agency", "Public domain (NASA content)" and a Commons link. The `fix(demos)` commit of this release gives those cards the full credit and the ESA/Hubble link. A demo is imported as a new board, so a board a person made from a demo in 0.39.0 keeps the old text; nothing rewrites a person's board, and the docs say so.

No code changed: no source file, string or table is touched, so the language tables and the window build are as in 0.39.0.

Verified: the changed rows of `NOTICE.md` and `CREDITS.md` read against the evidence table; the Markdown text rule over the tracked files; the Hubble cards read out of `colour/board.formref` as they stood before the `fix(demos)` commit (Text "Credit: NASA and the European Space Agency ... Public domain (NASA content)", URL the Commons page). Not verified: the corrected cards, which are that commit's work.

## v0.39.0 · The review pass: twenty-one bugs

- refers-to: `src/ui/context-menu.ts` :: layer, keys, MenuEntry.own; `src/lib/i18n.ts` :: SKIP, doAttrs; `src/app/editor.ts` :: fit, updateInspector; `src/app/catalogue.ts` :: runCommand; `src/app/compare.ts` :: open; `src/ui/scene.ts` :: image load, card title; `src/app/home.ts` :: templateCard; `src/app/bindings.ts` :: formref://download; `src/app/tag-cloud.ts`, `comments.ts`, `saved-search.ts`, `trash.ts`, `templates.ts`; `src/styles/shell.css`, `tokens.css`; `src/lib/i18n/tables/*.json`

A full review before the public release. Each fix is one cause and one edit.

- Right-click menu: it was 903 px tall with `overflow: visible`, so its last rows were cut at 900 px and unreachable at 720 px. It is capped to the window and scrolls as the menubar's menus do; arrow keys focus without `preventScroll`, and scrolling a layer closes its submenu because the submenu is placed from the row's rectangle.
- A person's own text went through the page translator wherever it equalled a table key ("Quiet structures" read "Stille Strukturen" in German). The skip list named `#inspector-title`, an id that no longer exists; the heading is `#detail-title`. The list now names `#detail-title` and `#canvas-label`, and the other places are stopped at their source: the item's `aria-label`, tag chip tooltips, comment text (the `comment-text` class the list already named was never set), column names in the parent select, saved-search names in menus (`own: true` on a menu entry), names in the Trash dialog and saved template names. Found by a board whose every user string is a table key, scanned in German.
- Title bar: under about 650 px the lead column collapsed (`min-width: 0` in an `auto` track) and the dock toggle and mark sat on the menubar. The lead keeps its width, the menubar track is `minmax(0, auto)` and scrolls sideways, tabs keep 148 px, and the two dock toggles hide at 650 px, where their docks are already hidden. With native menus the product label had `overflow-wrap: anywhere` in a squeezed flex item and broke inside a word; it wraps at the space.
- Under 650 px the sidebar is `display: none`, so the editor auto-placed into the sidebar's 0 px column and the canvas was 170 px wide. The editor is pinned to column 2.
- Window bridge: `runCommand` awaited the command's promise, and a command that opens the input dialog resolves only when the dialog closes, so MCP `run_command` for Add Note and the like hung for 60 s, got 504 and blocked every later job. It answers as soon as a dialog that was not open before appears; later errors go to the toast.
- Fit View centred in the whole canvas and the bottom row sat under the floating zoom bar. It fits and centres in the area above the bar when the bar is visible.
- Compare follows Grayscale Canvas, as the reference view already did; the overlay sits outside the filtered canvas.
- A Markdown note with no title kept the 62 px title box and its body had 5 px. The title is hidden when it is empty on formatted cards. No demo board has such a card.
- First open of a board with many pictures showed a placeholder icon in every tile until its preview arrived. The fallback's content is hidden while a first load is pending and shown only when the load fails. Tile space was already reserved; no new loader.
- Dark notes used the theme's text colour as ink, which is dark in light themes. A fixed token `--note-ink-light` (the default theme's value, so the default look is unchanged) is the ink of a dark note.
- Language tables: 21 theme names, the four built-in template names and descriptions (backend strings shown through the page translator; Home no longer marks built-in names as the person's own), and four strings that start with a placeholder (`{0} REFERENCES`, `{0} selected`, `{0} REFERENCES SELECTED`, `{0} items · saved from a board`) are in all 23 full tables. `scripts/i18n_check.py` cannot see backend template strings or strings that start with a placeholder, so these 12 count as unused there (unused 11 became 23) and about 13 more placeholder-first strings remain English.
- Desktop: the page shows a toast when the shell reports a finished download (see the desktop log).
- `.board-tabs.single` was dead since the last tab can close; removed.

Left as they are, with the reason: the outline moving when a tagged board opens and tabs moving when one is added are one-frame content swaps, and removing them needs a reserved strip or fixed tabs; connection anchors and label placement are mirrored in the service's exports and the demo boards depend on them; cards do not grow with their text; Preferences is not laid out for 390 px.

Verified: driven at 1440 by 900, 1000 by 700 (German, light theme) and 390 by 800 with CPU throttled 4x, every feature once, with no console error, page error or failed request beyond the aborted event stream on a board switch; `tsc`, the build, the window smoke and `i18n_check.py --strict` (missing 0 in every table) pass. A data folder made by the 0.38.3 build opened with its three boards, three tabs and active tab.

## v0.39.0 · Preferences is a window with a rail

- refers-to: `src/ui/prefs-window.ts` (new) :: PrefsWindow, show; `src/styles/prefs.css` (new); `index.html` :: preferences-dialog, section.prefs-sec

Preferences was one 440 px column with 1728 px of content. It is now the family's window as formvis builds it: a floating rail of categories, foldable cards, a wire from the active tab to its card, drag by the head. The `<dialog>` element stays and is the scrim, so focus containment, Escape and the top layer come from the browser and every existing input id keeps working (the modules that bind them query the elements at import time). A category is a `section.prefs-sec[data-section]` in `index.html`; the rail is built from the sections, so adding one needs no script change. `show(section)` opens on a card.

Every language keeps the same geometry: notes reserve `--prefs-lines` lines, rows are 38 px, heads and group titles have fixed line boxes, and the Copy, Finish and Done buttons have minimum widths taken from the longest translations. Storage: `formref.prefsRailCollapsed`, `formref.prefsSpot`.

Verified: opened by the button, the menu and the key in English, German and Polish at 1440 by 900 and 1000 by 700; row heights and control positions equal in all 26 languages; no layout shift inside the dialog on a language switch. Not laid out for 390 px (the content column is about 60 px wide there).

## v0.39.0 · Home, the no-board state and three demo boards

- refers-to: `src/app/home.ts` (new) :: registerHome, showHome; `src/app/demos.ts` (new) :: DEMOS, openDemo; `src/styles/home.css` (new); `public/demos/<id>/board.formref`, `cover.webp`, `public/demos/CREDITS.md` (new); `src/app/editor.ts` :: start, leaveBoard, boardClosed, S.home; `src/app/tabs.ts` :: close, openTabs; `src/ui/reveal.ts`; `src/ui/sample.ts`; `src/main.ts`

The app used to create an empty board named "Reference studio" in every fresh data folder and could not close its last tab. It no longer creates a board by itself: with no board open it shows Home, and the last tab closes to Home. `leaveBoard()` clears the state and runs the `boardClosed` hooks; commands, keys, paste and autosave rest while `S.home` is set or no board is open (most commands already carried `hasBoard`).

Home follows formdeck's structure (a side panel with Start, Your boards and Templates, a main column of sections) and sits below the title bar, so the menubar, the tabs and the window controls stay reachable from it. Board and saved template names are marked as the person's own text. Zero layout shift on launch comes from deciding Home or board before the reveal: `revealWhenReady` waits for `restore()`, so the first visible frame is either Home filled in or the board drawn.

The three demos ship as `.formref` files with a cover picture under `public/demos/`. Opening one imports the file as a new board and runs Fit View, because the saved viewport was made in a 1440 by 900 window; nothing of the person's is changed, and opening a demo twice makes two boards. The pictures are NASA material already credited in the family (see `CREDITS.md`). The sample "Quiet structures" is the starter template; its cards were made taller so none clips its text.

Verified: fresh data folder at three sizes in English and German with 0 layout shifts, 0 console errors and 0 boards created; under the window test's network limits the reveal shows Home filled or the board drawn; each demo re-imported equal to its export.

## v0.39.0 · A menubar from the command registry

- refers-to: `src/app/menus.ts` (new) :: MENUS, FILE_ITEMS, HELP_ITEMS, bindMenus; `src/ui/menu.ts` (new) :: PopupMenu, MenuBar, trimMenu; `src/ui/native-menu.ts` (new) :: NativeMenus, accelerator; `index.html` :: nav.menubar, head script; `src/styles/shell.css`

A menubar built as formvis builds its own, in the window on Windows and Linux and in the macOS menu bar. The tree is a list of command ids; labels, keys, enabled and checked states come from the registry, so nothing is declared twice, and an id with no command is trimmed (the vector tool submenus appear and vanish with their commands). 215 of the 234 commands appear exactly once; the rest are parameter-driven or in-dialog controls.

Decisions: a root menu is capped to the space under the bar and scrolls; Alt and a letter yields to a registered shortcut; while a menu is open every key stops at the menubar. The native menu reaches the Tauri menu API through `window.__TAURI__.menu`, with no Rust command and no new dependency. A key with neither Cmd nor Alt gets no accelerator, so typing is never taken by the menu bar, and a 400 ms guard drops the second of a pair when the page and the menu bar both receive one shortcut. `has-native-menus` is set by the head script before first paint and removed if the first build fails. The title bar hides controls at five widths so the tab strip keeps at least 96 px from 960 px up in the widest language.

Verified in the browser at CPU 4x in English, German and Ukrainian. The native menu was exercised only against a stand-in for the Tauri API: no Mac here.

## v0.39.0 · The splash page matches formvis

- refers-to: `public/splash.html` :: img

The splash differed from formvis's by an extra `user-select` rule and a `draggable` attribute. It is formvis's page line for line with FormRef's icon and name. The window smoke still measures zero layout shift on it.

## v0.37.8 · The splash logo holds its place

- refers-to: `public/splash.html` :: body, p

Family ledger FB-131 (S3), found by the F7 window smoke (`tests/window/test_window.py`). The splash centred the logo together with the line and the bar under it, so a paint that landed after the logo but before the rest centred the logo alone and moved it when the rest arrived (layout shift 1.05e-4, IMG, about 1 load in 15; reproduced on demand with a server that sent the page up to the logo, waited 1 s and sent the rest). The body now starts at the top with a padding-top of `50vh - 64.5px` (half of the 127 px stack plus the 1 px border) and the line has a fixed 16 px height, so the logo's position no longer depends on later siblings and sits where it did.

Verified: the same stalled load gave 1.05e-4 before and 0 after; the F7 smoke passes 15 loads in a row on both pages.

## v0.32.0 stack export option

v0.32.1 fixes two things:
- `app/gestures.ts` marquee: members of a collapsed group are tested against their card's box (the visible members' top-left plus `STACK_W` by `STACK_H` from `ui/scene.ts`) instead of their own hidden bounds.
- `.stack-info` has `order: -1`, so the title row sits above the pile like the exported card.

`stack.cjs` now also checks two marquees. One drawn over a hidden member, off the card, selects nothing. One started off the card and covering part of it selects all four members and leaves the card in place.

`index.html`: the export dialog's static row `#export-stacks` sits under PDF paper. It is always present, so opening the dialog changes no layout.

`app/bindings.ts`:
- The row's state is read once at start from `localStorage` `formref-export-stacks`, guarded, so it stays off without storage. It is written on change.
- Every export link adds `&stacks=true` while the box is checked; the service ignores the flag for formats it does not apply to.

Probe: `$SC/ui/stackexport.cjs` covers English, German and Japanese at 4x CPU on a slow network, with a downloads-enabled context. It checks the label in each language, that the box starts unchecked, that the PNG link carries `stacks=true`, that the choice survives a reload, and that unchecking drops the flag from the SVG link.

## v0.31.0 group stacks

`ui/scene.ts`:
- `render` toggles `stacked` (CSS `display: none`) on each member of a group listed in `settings.collapsed_groups`, then calls `paintStacks`.
- `paintStacks` keeps one card per collapsed group in a `.group-stacks` layer inserted after `#items`. A card is built once and then patched in place:
  - Position is the visible members' top-left.
  - `selected` is set when every member is selected.
  - Three sheets each carry a `data-key`, so a picture or colour is written only when it changes.
  - The title is the user's (marked `data-no-i18n`) or `t('Untitled group')`. The plain `Group` key already means the verb in the tables.
  - The count is a number, so it needs no translation.
- The card is `.board-item` with `data-id` set to the first member. That way the existing pointer code selects the whole group through `expanded()` and drags all members.
- `preview()` calls `restack()`, which moves the card to the members' live minimum while dragging.
- `selection()` updates the cards too.
- The `endpoints()` resolver returns the card box, with side anchors, for a collapsed group end and for any member end.
- `paintGroupFrames` leaves collapsed groups out.

`app/commands/organize.ts` has `collapse-group` (Alt+G) and `expand-group` (Alt+Shift+G), enabled by the selection's group and its state; both sit after Name Group in the Organize menu. `app/gestures.ts` expands on a double-click of `.group-stack`, before the item double-click handling, because the card stands for a member that may be a note.

Probe: `$SC/ui/stack.cjs` covers English, German and Japanese at 4x CPU on a slow network, with three pictures and a note in a titled group connected to a far note. It checks:
- Collapsing saves; the card shows the title and a count of 4; three picture sheets show; all members are hidden; no frame is drawn; both lines meet the card.
- A drag moves every member by the same offset, with the card following mid-drag.
- The Organize menu toggles correctly.
- Double-click expands, the frame returns, and the member nodes are the same.
- An untitled card shows the translated wording, and undo removes the card.

## v0.30.0 connection routes

`ui/scene.ts`: `curve()` takes the route and builds one of three paths:
- Curved (empty): the cubic with both controls at the middle x, as before.
- Straight: `M ... L`.
- Elbow: `M ... H middle V ... H`.

Head tangents: a straight line uses the far end as the control point; curves and elbows keep the level control at the middle x, because both leave each end horizontally. The hit path gets the same `d`. `.connection` has `stroke-linejoin: round` for elbow corners.

`app/connection-style.ts`: `ROUTES` gives three `connection-route-*` commands. A Route submenu sits before Color in both menus.

Probe: `$SC/ui/route.cjs` covers English, German and Japanese at 4x CPU on a slow network. It checks the saved route and the path shape for each choice, the head after Arrow at End on an elbow, the hit path matching, and line node identity. `linecolor.cjs` now reads its menu indices one later.

## v0.29.0 connection colours

`app/connection-style.ts`:
- `COLORS` holds seven presets, each a `connection-color-*` command. `checked` compares the colour case-insensitively across every target.
- `connection-color-custom` reuses one hidden `input[type=color]` (`.connection-color-input`), created on first use and left mounted. It is placed at the last right-click point, which a capture `contextmenu` listener records, and opened with `showPicker`, falling back to `click`. The ids are captured when it opens, so a later selection change cannot redirect the picked colour.
- `reverse-connection` sends `reverse: true`. It is enabled only when a target has exactly one arrowhead, because reversing a plain or two-headed line changes nothing visible.

`ui/context-menu.ts`: `MenuEntry.swatch` draws a colour dot in the icon slot. A checked swatch gets a ring (`.ctx-swatch`) instead of the tick, so the current colour is still visible.

Probe: `$SC/ui/linecolor.cjs` covers English, German and Japanese at 4x CPU on a slow network. It checks the swatches and the ring, Blue applied to the stroke, Reverse Direction disabled and then enabled, ends swapped with the head moved, one picker node with a picked value applied, and line node identity. It deletes its board.

## v0.28.0 connection styles

`app/connection-style.ts` registers seven style commands (`connection-line-*`, `connection-arrow-*`) and `label-connection`:
- Targets are the chosen connection, or else every connection touching a selected item or a group with a selected member.
- Each command sends one `style_connections`; `checked` is true when every target already has that value.
- Labelling also goes through `style_connections`, so the connection keeps its id and style; the old disconnect-plus-connect batch is gone.

`ui/scene.ts` keeps four nodes per connection, created once and patched in place:
- `connection-hit`, a transparent 14 px stroke that takes the clicks. The visible path has `pointer-events: none`, because Chromium does not hit-test dash gaps.
- `connection`, whose `data-line` drives the dash pattern in CSS.
- `connection-head`, one filled path holding both heads.
- The label.

`anchors()` puts an arrowed item end `ARROW_GAP` outside the item's side, because lines run under items. `curve()` pulls each pointed end back to its head's base along the tangent. The numbers match `backend/app/core/endpoints.py`.

`scene.chooseLine()` swaps the `chosen` class on two paths only. `setSelection` clears it.

The right-click handler opens `connectionMenu()` for a line, and the board menu adds the Connection Style submenu while the selection touches connections.

Probe: `$SC/ui/arrows.cjs` covers English, German, Russian and Japanese at 4x CPU on a slow network. It checks the menu, the submenu, dashes, heads, the chosen mark, node identity and labelling, and deletes its board.

## v0.27.0 connect selected

`app/connect-selection.ts` turns the selection into nodes:
- A group counts as one node when more than one of its items exists and all of them are selected; it is keyed by `group:` and its id and placed at its box's top-left.
- Every other item is its own node.

The nodes are sorted in reading order: rows within 40 units count as one row, then left to right.
- Connect Selected sends one `connect`, or one `batch` of them, for each neighbouring pair not already linked in either direction. When nothing is left to link it only toasts.
- Remove Connections sends one `disconnect` with every connection touching a node or a selected item.

The right-click menu shows both under Edit only while one of them is enabled, so the menu is unchanged otherwise. The agent words live in `command-meta.ts`. Probe: $SC/ui/connectsel.cjs (English and German, 4x CPU, slow network). It builds its own board and deletes it.

## v0.25.0 group connections

`ui/scene.ts` resolves ends through `endpoints(board)`: items by id, groups as a box over their visible members, built once per render. `anchors` keeps items at their centre and puts a group's end on the frame side facing the other end. `paintGroupFrames` keeps one dashed `rect.group-frame` per connected group in the connections SVG, prepended so it sits under the lines. It writes x, y, width and height only when they change, and removes a frame when its group has no connections left. The probe moved a group and found the same frame nodes, moved. In `gestures.ts` the connect tool takes a grouped item as `group:` plus its group id, unless Alt is held, and selects the whole group as the start. The tool tooltip says so; the status line keeps its short text. Probe: $SC/ui/groupconnect.cjs (English and German, 4x CPU, slow network). It creates its own board, and the release run deleted every "Group connect" board afterwards.

v0.26.0:
- `paintGroupFrames` also frames groups with a title. It keeps a frame rect and a title text per group and patches both in place: renaming the probe's group kept the same node. The title text carries `data-no-i18n`, as it is user text.
- `EndBox.side` gives a column a side anchor at 0 px.
- Name Group lives in `commands/organize.ts`. It is enabled when every selected item shares one group, its dialog opens with the current title, and it sends `name_group`.

Probe: $SC/ui/grouptitle.cjs (English and German).

## v0.24.0 stars on the board

`ItemView.paintRating` in `ui/scene.ts` makes the badge lazily, so an unrated item never gains a node. The first time an item is rated, five star icons are inserted before the label row. After that each paint only flips `hidden`, each star's `display` when it differs, and `data-stars`. The probe watched `#items` for removed board items while rating three pictures and clearing one, and saw none. The badge sits 10 px above the label pills' band, inside the bottom-right corner, with `pointer-events: none`. Sort by Rating is one more `sortBy` key in `commands/organize.ts` and the Organize menu. Probe: $SC/ui/stars.cjs (English and German) also exports the phone viewer to $SC/vstars and taps a star chip there; viewer.cjs on that file still passes. Restore board 9b49827f's ratings after it.

## v0.23.0 picture shape filter

The kind select gains `image-portrait`, `image-landscape` and `image-square`. `matches` sends the kind through `kindMatches`, which reads these three through `shapeOf`: the item's box on the board, with width and height swapped near a quarter turn and a 10% band counted as square. Because the value is still just a kind string, saved searches (board and shared, engine `identifier` and service `IDENT` rules) keep it with no schema change, and the suggested name uses the option text. An optgroup heading was tried and dropped, because the page translator does not translate `label` attributes. Probe: $SC/ui/rate-import.cjs (German) compares the shown count for each shape with the count worked out from the board data.

## v0.22.0 star ratings

`app/rating.ts` follows the other filter modules. It pushes one predicate into `matchFilters`, redraws once through `scene.render`, marks `#filter-row` with `has-rating` so the shared clear button shows, and listens to that clear button. The filter state is `null` (off), 0 (unrated) or 1 to 5 (at least). The star button's badge is an `::after` from `data-rating`, absolutely positioned and hidden by `visibility`, so choosing a rating never moves the row (the probe measured the kind select at 95 px and the row at 28 px throughout). The inspector stars are five buttons made once and inserted at registration. A selection change only toggles each button's `on` class when it differs and sets `aria-pressed`; a mixed selection shows no stars, dimmed. The digit keys are commands `rate-0` to `rate-5`, whose agent words live in `command-meta.ts` so the extractor does not ask for translations of English agent text. Saved searches add `rating` to `current`, `isCurrent`, the suggested name, `applySearch` and `clearFilters`, and watch the button's `data-rating` so the bookmark lights when only the minimum changes. The menu says "Rated" for one or more stars, so it never says "1 stars". Probe: $SC/ui/rating.cjs (English and German); it rates astronaut, horse and rocket on board 9b49827f and saves a search, so restore that board afterwards (ratings set to 0 and searches back to `#nasa · #portrait`).

## v0.21.0 picture info

`app/picture-info.ts` is a read-only modal. It fetches `/api/assets/{id}/details`, builds the definition list while closed and then opens, as the practice dialogs do. Labels are translated text; values carry `data-no-i18n` because they are file data. Numbers, dates, byte sizes (Intl `byte`, `kilobyte`, `megabyte` units) and the EXIF time (local time with no zone, so read as local) use `formatLocale()`. Megapixels show only from 0.1 MP. The source page is `data.clip.source`, else the item url, and only http(s) becomes a link (target `_blank`, `noopener noreferrer`). The shortcut is Shift+Alt+I, not Ctrl+Shift+I, which opens DevTools in Chromium before the page sees it. Probe: $SC/ui/pinfo.cjs (English and Japanese, 4x CPU, slow network). It adds camera.jpg from $SC/pinfo to board a909d139 on first run.

## v0.20.0 practice log view

The log dialog is another script-built modal in `practice.ts`. `openLog` fetches the log, builds every row while the dialog is still closed and only then calls `showModal`, so the table never fills in visibly. The scope menu only toggles `hidden` on existing rows and rewrites the totals line (the probe checks the row nodes are the same objects afterwards). The table sits in a fixed-height scroller, so the dialog keeps one height whether it is full, filtered or empty (570 px in the probe). Board titles are user text and carry `data-no-i18n`. Pace shows a plan's own label through `t()`, otherwise the time per picture from `Intl` units. Clear Log takes a second click on the same button rather than a browser confirm, and refreshes the setup's 7-day line when the setup is open underneath. Probe: $SC/ui/practice-log.cjs (`de`; `en clear`) with three seeded entries.

## v0.19.0 practice class plans

`PLANS` holds each plan as `[pictures, seconds]` steps, which `begin` flattens into `times`, one entry per position in `order`; `show` reads `seconds = times[index]`, so the clock, bar and `untimed` class follow each picture's own time. The plain mode fills `times` with the one chosen time, so both modes share the same path. Too few pictures: `order` is built from repeated laps, each reshuffled when shuffling, then cut to the plan's length. `seen` now holds positions rather than item ids, so a repeated picture counts as another pose in the summary and log. The line under the Session select always holds text and has a two-line minimum height, so changing the plan does not move the dialog (the probe measured 566 px for every choice). Time and Pictures are disabled while a plan is chosen. The log entry carries `plan`, with `seconds_each` 0. Probe: $SC/ui/practice-class.cjs (English and German); the older practice probes now pick their selects one index later.

## v0.18.0 practice breaks and log

A break starts only when a picture times out (stepping by hand never rests). During it the `resting` class hides the frame with `visibility` and shows the centred note in the same stage, so nothing reflows; the old picture node stays in place and is swapped as before when the break ends. The next picture is decoded into a throwaway `Image` at the start of the break so the swap after it is immediate. Break time is kept apart from drawing time. Any step ends a break first. The log is written once per session from `finish()`; the setup awaits `GET /api/practice` before `showModal`, so its last line is filled before the dialog paints. Probe: $SC/ui/practice-break.cjs (English and German at 4x CPU, slow network): break state, note, countdown, automatic next picture, arrow step, summary, log entry, 7-day line, remembered choices, no blank frame outside breaks.

## v0.17.0 timed practice

`app/practice.ts` follows the Compare pattern: its view and setup dialog are built once in script and mounted on first use, so the board's DOM is untouched. The set is the selection when two or more pictures are selected, otherwise the pictures the filters leave lit (read from `.matched-out`, so every filter counts without the module knowing them), otherwise every visible picture in reading order. Each next picture is a new `Image` decoded off screen, painted with `paintImage` (crop and mask kept) and swapped for the old one with one `replaceWith`, so the frame never paints empty; the counter changes in the same task. The clock runs on `requestAnimationFrame` and writes text only when the shown second changes; the bar is a `scaleX` transform. Time stops while a picture loads, while paused and when the window is hidden (which pauses). Duration names come from `Intl.NumberFormat` units, so no table holds "30 seconds". Choices are kept in `localStorage` (`formref-practice`), wrapped in try. Mirror and grey are classes on the frame; the summary hides the clock and step buttons with `visibility`, so the bar keeps its size.

Checked at 4x CPU with slow network in English, German and Russian ($SC/ui/practice.cjs): setup lists the board's 12 pictures and localized durations, a 30 second timeout moves to the next picture, pause holds the clock and bar, arrows step, mirror and grey stay across pictures, Esc gives the summary and Esc again closes, two selected pictures become the set, choices are remembered, the board revision is unchanged, and over about 2,600 sampled frames the frame never lacked a decoded picture after the first (4 swaps, each one node).

## v0.16.0 searches for all boards

`app/saved-search.ts` keeps a second list loaded from `/api/searches` at start. The menu adds This Board and All Boards section headings only when both lists have entries, so a board without searches for all boards shows the same menu as before. `fromShared` turns label names into this board's label ids ignoring case and reports the names it could not find; the toast for them uses `t()` because the names are joined in. The bookmark lights for either kind. Probe: $SC/ui/shared.cjs.

## v0.13.0 tag suggestions

`app/tag-suggest.ts` reads the word from the last comma before the caret, folds accents and case, and offers tags from `tag-cloud.boardTagNames()` (most used first) that start with it, then those containing it, at most six, leaving out tags already in the field. The list lives in `#overlay-root` at `--z-dropdown`, positioned once under the field with `position: fixed`; rows are created once and reused, and only their text, `hidden` and the `active` class change. Choosing replaces the word and adds ", " so the next tag can follow. Enter without a highlighted row is left alone so the field still saves on Enter as before; Tab takes the highlighted or first row. Blur, `change`, any scroll (a capturing listener, since scroll does not bubble) and resize close it. `pointerdown` with `preventDefault` keeps focus in the field when a row is clicked.

Verified at 4x CPU: "a" offered animal then nasa, garage, portrait (labels are not tags); the list sat 4 px under the field, left-aligned; Down and Enter gave "animal, "; "na" then Tab gave "animal, nasa, " with focus kept; a clicked row added garage; Esc closed; Enter saved animal, nasa, garage; the field did not move.

## v0.12.0 tag editing

`tag-cloud.ts` `retag(key, change)` walks the items carrying the tag, skips and counts locked ones (the engine refuses updates to locked items), groups the rest by their resulting tag list and sends one `batch` of `update` commands, so the change is one undo step and stays far under the engine's 1000-command batch limit on any board. Rename keeps the first spelling of each tag on an item and drops a second one that folds to the same text, which is how a merge avoids duplicates; a chosen chip moves to its new key so the filter carries on. Chips open their menu on `contextmenu` (propagation stopped so the board menu does not open). Toasts that join two sentences translate each with `t()`, because the page translator looks up the whole text and would leave a joined sentence in English. MCP `rename_tag` and `remove_tag` repeat the same rules in Python.

Verified at 4x CPU and a slow network, English and German: the tag menu and label menu; grey renamed to mono and undone; portrait merged into NASA leaving the astronaut with only nasa; a chosen portrait renamed to face kept filtering two items; garage removed with one motorcycle locked reported one locked item; select by bike and by Space chose 2 and 6; the board ended as it began. MCP with outside agents briefly allowed: rename, merge, remove and their undo, and both error messages. Overflow scan in 24 languages: nothing.

## v0.11.0 optional Illustrator tools, tag cloud

Owner direction: every Illustrator feature is optional, off by default and switched only in Preferences. What counts: everything that came in under `feat(vector)` (Pen, Direct Selection, Curvature, Pencil and its fidelity, path commands and Live Corners, polygon, star, arc, spiral and grids, stroke cap, join, miter, dash and arrowheads, gradients, Outline Stroke, Offset Path, Pathfinder) plus Smart Guides. Blend modes stay: they came from the reference-board research for overlaying drawings on references. The stroke width and shape fill controls predate the vector work and stay.

`app/illustrator.ts` calls the five register functions once, takes the command ids they added by diffing the registry, and removes those commands while off. The modules' own listeners (direct-select, pencil, pen) are all gated on `S.tool`, so with the tools unreachable they do nothing; switching off returns a vector tool to Select. Smart Guides gained `setSmartGuidesAvailable`, checked in `smartAdjust`. The early script in `index.html` sets `data-illustrator` from `formref-illustrator` in localStorage (like the theme) before first paint, and `:root:not([data-illustrator="on"]) [data-illustrator-only]` hides the four toolbar tools and the inspector's stroke options, arrowheads, corners and gradient fields. Switching on adds the commands back live, appended to the palette. The catalogue lists dormant commands with `enabled: false` and every Illustrator command's description starts with a line saying they are optional, so the agent reference is the same whichever way the switch is set; `runCommand` answers how to turn them on.

Removing commands exposed two assumptions in `bindings.ts`: the keymap rebuild runs before the palette's removal handler and looked up removed commands, and the shortcut sheet kept rows for them. The palette refresh now skips missing commands; sheet rows hide (and their heading with the last visible row) and show again when re-added. The sheet also keeps one heading per group: commands registered later by modules join their group instead of starting a second heading.

Tag cloud: `app/tag-cloud.ts` counts labels (from `settings.labels` and `data.labels`) and tags (`data.tags`, folded to lower case, shown as first seen) over visible items; labels first, then by count and name. Chips are reused by key, only changed text is written, and the strip's children are replaced only when the order changes. The fourteen most used show (chosen chips always show) and `+N` opens the rest in the shared context menu. A `matchFilters` predicate requires every chosen key; `has-tags` on `#filter-row` makes the shared clear button visible, and it clears the chips. Saved searches store `tags` and `labels`, apply them without drawing, and the bookmark watches the chips' `aria-pressed`.

Verified at 4x CPU and a slow network: Illustrator tools hidden at the first paint (display none at DOMContentLoaded) and shown at first paint when on; with them off no Pen or Unite in the palette, A did nothing, no Path heading in the shortcut sheet; on in Preferences, the four tools appeared and A chose Direct Selection; a star added while on stayed drawn after switching off, and the tool went back to Select; the setting survived a reload; the catalogue kept 193 commands with the Pen marked not enabled. Tag cloud in English and German: Space 6, Vehicles 3, nasa 6 (with one NASA), animal, bike, garage, portrait, grey, silhouette; nasa then portrait narrowed to the two astronauts with each item changing once; Space and Vehicles left only the rocket; a saved search with #nasa and #portrait restored both chips and lit the bookmark; removing the only silhouette tag while chosen ended the filter; widths unchanged; a board without tags hides the cloud. Overflow scan in 24 languages: nothing.

## v0.10.0 saved searches, palette and dialog languages

`app/saved-search.ts` reads the filters from the find input, the kind select, `colorFilter()` and `similarFilter()`, and stores them in `settings.searches` with one `settings` command (whole list replaced; same name ignoring case updates in place). Names and text are cut to the engine's byte limits on a character boundary. Applying runs `setColorFilter(..., render false)` and `findSimilar(..., render false)` (or `clearSimilar(false)`) together, then sets the kind select and the find input and dispatches one `input` event, so the existing find handler redraws the board once; both filter modules gained the `render` flag for this. The bookmark button's `active` class follows a `MutationObserver` on `#filter-row` (class and style, which the colour and similar modules set), the find input, the kind select and `onState`, so neither module knows about saved searches. The same entries serve the bookmark dropdown (`gestures.menu.show` under the button) and the right-click Edit section.

Palette: `filterCommands` matched `dataset.command`, built from the English label and group, so a translated query found nothing; it now also matches the row's `textContent`, which the DOM translator keeps in the interface language.

Dialog descriptions: `i18n_check.py` skipped every `description:` literal, which also hid the 12 `inputDialog` descriptions, so they showed in English everywhere. A `description:` on a line with `inputDialog(` now counts. The corner-rounding description used a nested template literal the extractor cannot read, and a semicolon it skips; it is now two plain alternatives.

Verified at 4x CPU and a slow network, in English and German: the empty menu, a suggested name from text, kind and colour, save, the accent on the bookmark, Clear All Filters, a reload, applying with each item's class changing once and the inputs restored, a similar search saved from the palette as “≈ motorcycle left”, delete and undo; the header kept 207 by 40 px. German palette queries found Aktuelle Suche speichern and Gespeicherte Suchen. The save dialog's description showed in German. Overflow scan in 24 languages: nothing.

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

`src/ui/icons.ts` creates original inline currentColor SVGs while detached. It never rebuilds a live icon container. `public/favicon.png` is the unified v3 FormRef app icon. `src/styles/main.css` owns shell layout, scene cards, inspector fields and responsive rules. The desktop layout uses a left board/outline rail, central infinite canvas, right inspector and floating camera controls.

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
| `vite.config.ts` | Loopback-only host false, strict frontend port 5320, preview port 5321 and API proxy to 8320 |
| `scripts/i18n_check.py` | Translation coverage: missing, unused and placeholder errors per table (`./formref i18n check`) |
| `scripts/i18n_review.py` | Review pack (v0.33.0): one BOM UTF-8 CSV per language plus SUMMARY.md, with where-used places and hint checks; imports `keys()` from `i18n_check.py`, so both see the same strings (`./formref i18n review`) |
| `scripts/i18n_apply.py` | Reviewed sheet back in (v0.34.0). `csv.Sniffer` handles comma, semicolon or tab. Better wording replaces the translation; stale English or changed placeholders are refused, with exit 1. `--dry-run` writes nothing. The table is written with `indent=1`, scripts kept as written and no trailing newline, like the other tables (`./formref i18n apply`) |

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

## v0.36.0 · reveal once painted, and the app icon in the title bar

`index.html` holds `#app` hidden in a critical inline style until `body.app-ready`, so the window never shows a half-built shell; html and body start on #0a0a0a and the stylesheets take over. `src/ui/reveal.ts` `revealWhenReady()` runs once at the end of `main.ts`: it waits for the fonts (at most 2.5 s), then `revealApp()` adds `app-ready` after two animation frames and, one frame later, calls the shell's `app_ready` through `nativeInvoke` (a no-op in a browser), which closes the splash and shows the desktop window (src-tauri `reveal.rs`). `public/splash.html` is the family splash card with `formref-logo.png` (256 px, the rounded tile of the owner's icon). The title bar's text mark (an accent `fr`) is now that icon as a 28 px image with its size fixed in markup and CSS, preloaded in `index.html`, so it paints with the shell and nothing shifts.

## v0.37.0 · the Form family's 28 themes

The theme select offered six themes (Studio Dark, Studio Light, Midnight, Forest, Sand, Mono); the Form family has 28, chosen once and shared through `nodemode_ui_settings`. The 22 missing ones are added as `:root[data-theme="..."]` rules in `src/styles/tokens.css` with formvis's surface and text values mapped onto FormRef's tokens (`--bg-node` from the secondary surface, `--grid-color` and `--border-light` from the light border, `color-scheme: light` and `--text-on-accent` on the light ones), and as options in the select. A change still writes `formref-theme`, which the boot script in `index.html` reads before first paint (left untouched, since its hash is pinned in the CSP), and now also writes the shared `nodemode_ui_settings` theme so the other Form apps follow. Checked in headless Chromium: stored studio, pro-dark and soft-light paint #111, #1f1f1f and #e8ebef with the right colour scheme, and choosing Breeze Dark sets `data-theme`, #232629 and the shared key.

## v0.37.2 · the vector tools in FormRef's own words

The optional drawing tools were labelled and described with another product's name ("Illustrator tools", "as Illustrator's Pen does", "as in Illustrator's Transparency panel"). The family IP plan approved on 2026-10-23 asked for plain descriptions: the Preferences group is VECTOR TOOLS with "Vector drawing tools", the toasts say "Vector tools on" and "off", the agent catalogue prefixes "Vector tools (off by default...)", and each tool's description says what it does. Code names (`app/illustrator.ts`, `illustratorOn`, the `formref-illustrator` store key, `data-illustrator`) keep their names so stored preferences and the pre-paint script still work. The four Preferences strings were changed in place in all 23 tables with translations of the new English; `i18n_check.py` gives the same counts as before (21 missing and 11 unused per language were already there). `.claude/skills/formref-harness/references/commands.md` keeps the old descriptions until `./formref agents sync` runs against an open window.

## v0.37.3 · an About section with by nodemode.ai

FormRef had no About box, and the owner chose a minimal one for such apps (family plan of 2026-10-23). It is the last section of Studio preferences, ABOUT, rather than a new dialog, so nothing new mounts: "FormRef" with the version in a span (the checker skips a bare `v0.0.0`, and the version is bumped with `index.html` like the sidebar foot), "by nodemode.ai", and "Apache License 2.0. Third-party notices are in NOTICE.md.". The name and the credit carry `data-no-i18n` and `translate="no"`; "by nodemode.ai" still has an identity entry in each table, as "FormRef" does, because `i18n_check.py` reads `index.html` without honouring `data-no-i18n`. ABOUT and the licence line are translated in all 23 full tables; `i18n_check.py` still reports 21 missing and 11 unused per language, as before. Checked in Chromium at 4x CPU and a slow network: the section shows at the foot of the dialog, CLS 0, no page error.
