# FormRef changelog

## v0.40.0 · 2026-11-19

Only the FormRef window can change your boards and settings, your choice for outside agents stays what you chose, and a true-black theme.

- Only the FormRef window can change things. Changes from outside the app's window are refused, and so are starting a terminal, Claude Code or Chat and changing the agent settings from outside it. Agents that connect through MCP still follow your choice under Allow outside agents, as before.
- `./formref open` and `./formref import` now count as outside agents, so they work only while Allow outside agents is on. Otherwise they stop and say that outside agents are off.
- Your choice for outside agents and the Claude program you chose are sealed with a key kept in the system keychain. If the saved choice is changed outside FormRef, it goes back to off, FormRef asks again, and the Agent panel says so once. After this update, turn Allow outside agents on again if you had it on. On a computer without a keychain the choice works as before, without the seal.
- The agent settings, Confirm changes among them, can be changed only in the window. An agent cannot change them.
- Each Claude Code tab and each Chat run gets its own access to the board, which ends when the tab closes or the run ends.
- While a Claude Code or Ollama turn runs in the Agent panel, other agents are no longer let in without your choice.
- The Ollama address must be on this computer: `localhost` or a loopback address. Any other address is refused.
- New theme, AMOLED Black: a true-black window for OLED screens, with panels told apart by their outlines. It is in Preferences with the other themes.
- Ctrl+J (Cmd+J on a Mac) shows and hides the terminal panel, as before. The Agent and Shell wiki pages and the notice shown when an agent waits for your answer no longer say that it opens the Agent panel.
- The terminal panel itself is unchanged in this release. Underneath, the engine is prepared for the Form family's shared dock: when it refuses an outside agent's change it tells the window which program asked and what it asked to do, one call reports whether Claude Code, Codex and Cursor are installed and how to install each, Codex and Cursor can run in terminal tabs of their own with access that ends when the tab closes, and a program that has finished is told apart from what it printed. None of this is shown in the window yet.
- Two engine messages that had no translation, the refusal of a second window and "Not Found", are translated in every language, and so are the new notice in the Agent panel and the name of the new theme.
- For people who work on FormRef: `./formref agents sync` also copies the skills from `.claude/skills` to `.agents/skills` and writes `agents/manifest.json`, which says what FormRef offers agents: its 47 MCP tools, which of them only read, which can wait for your Allow, its skill and its terminal panel. `--check` fails while either is out of date, and neither needs the window to have been opened.
- In development, a reloaded page keeps its right to make changes instead of being refused.
- The wiki gives the right count of 47 MCP tools, and the Agent, MCP and security pages and the README say how outside agents are asked and that only the window can change the choice.
- One new bundled package, keyring (MIT), with its licence text and inventory entry.

## v0.39.2 · 2026-11-15

PDF export that needs nothing installed, a calmer board, and the fixable items from the last release's open list.

- PDF export (board, pages, tiles and a single note or document) and SVG pictures work on every computer without Cairo or any other library installed. PDFs embed the fonts they use, links stay clickable and connection labels are readable.
- A connection meets the side of each card that faces the other card, so cards above and below each other are joined top to bottom.
- A note, task, document or link card grows while you type, when you change its text in the Inspector and when you save it in the editor, in one undo step. Fit Card to Text sizes chosen cards to their text. Other cards never move, so a card that grows can lie over the card below it.
- The tag cloud is one row that is always there, with a +N chip for tags that do not fit, and the board tabs have a fixed width and slide over when one closes, so nothing in the sidebar or the tab row jumps any more.
- The colour demo appears complete the first time you open it: its pictures come with the app and are ready in the first frame.
- Preferences is usable at 390 px wide, with the categories along the top.
- The engine's self-check also checks the PDF font and SVG libraries, so a desktop build that lacks them fails its build-time check instead of failing on a person's first export.
- Card text in Chinese, Japanese, Korean, Thai and other scripts the default font lacks wraps by the font that actually draws it, so nothing overlaps or runs past the card in PNG, SVG and PDF exports, and the PNG no longer shows boxes for those characters.
- Every package and library the app bundles now has its licence text and an inventory entry in `licenses/third-party/`, including PDFium and the libraries inside numpy, onnxruntime and pywinpty.
- 59 messages that were English in every language are translated in all 25 languages besides English, and the card controls' labels for screen readers follow a language switch.
- Codex and Cursor are found in their usual install places, not only on the PATH. Saving a template under a name you already use asks before it replaces that template.
- The NASA pictures in the demo boards carry NASA's own wording: not subject to copyright in the United States. A board you already made from a demo keeps the text it was made with.
- The one-file engine removes the stale folders earlier runs left in the temporary folder when it starts (written for Windows, checked on Linux).

## v0.39.1 · 2026-11-15

Community files, and the credit and licence of every demo picture checked at its source.

- The repository has a code of conduct, a contributing guide and a security policy, and the README links them.
- Every picture in the three demo boards now carries the credit and terms its own source states. 38 are NASA pictures, not subject to copyright in the United States. The Hubble Ultra Deep Field is published by ESA/Hubble under Creative Commons Attribution 4.0 and is credited "NASA, ESA, and S. Beckwith (STScI) and the HUDF Team"; it was listed before as public domain.
- On the colour demo board, the Hubble Ultra Deep Field cards show that full credit and link to the ESA/Hubble page. A board you already made from a demo keeps the text it was made with.
- The three pictures of the "Quiet structures" starter board are listed as own work under Apache-2.0.
- The release guide names the right formcompiler repository.

## v0.39.0 · 2026-11-15

A Home page with demo boards, a menubar, a new Preferences window, and a full bug pass before release.

- FormRef opens on Home when no board is open: your recent boards, templates, three demo boards and a starter board. It no longer creates an empty board by itself, and closing the last tab returns to Home.
- Three demo boards show the tools at work: a colour board sorted by colour, a value study with a compare pair and a practice set, and a poster project with ratings, a table and labelled connections. Each opens as a new board of your own.
- A menubar holds every command: File, Edit, View, Insert, Images, Organize, Window and Help, in the window on Windows and Linux and in the menu bar on a Mac.
- Preferences is one window with a category rail and foldable cards, the same size in every language.
- The right-click menu fits the window and scrolls, so its last rows can always be reached.
- Your own words are never translated: board titles, tags, comments, saved searches and template names stay as you typed them in every language.
- Theme names, the built-in templates and the item counts are translated in all 26 languages.
- Fit View keeps the board clear of the zoom bar, Compare follows Grayscale Canvas, dark notes stay readable in light themes, and a Markdown note without a title shows its text.
- A demo or a large board opens with quiet tiles that fill in, instead of a placeholder icon in every tile.
- In the desktop app on a Mac, exports and Save Board now arrive in the Downloads folder and links open in your browser. Quitting the app no longer leaves the engine's temporary files behind on macOS and Linux.
- Agents: a command sent to the window is no longer lost after a window closes, and a command that opens a dialog answers at once instead of timing out.
- The window stays usable when it is narrow: the top bar no longer overlaps itself and the canvas keeps the full width.

## v0.38.3 · 2026-11-04

README screenshots and a leaner repository.

- The README shows a reference board with real photos, textures, notes and links, plus the value study, compare and palette tools.
- An unused logo file is removed.

## v0.38.2 · 2026-11-03

A new app icon and a rewritten README.

- FormRef uses the unified Form family icon on the desktop, in the browser tab and on the start-up screen.
- The README is rewritten, and the repository lists its code owners.

## v0.38.1 · 2026-10-31

Fixes for the Windows and Linux apps.

- The Windows desktop app no longer opens to a blank window on PCs where an installer set the `.js` file type to `text/plain` in the registry: the engine now serves scripts and stylesheets with their real types.
- The Windows build links formref-core's C runtime statically, so it starts on PCs without the Visual C++ Redistributable.
- The Linux packages recommend the GStreamer plug-ins the window uses for audio and video, and the AppImage carries them.

## v0.38.0 · 2026-10-30

An app of its own.

- FormRef installs as a desktop app on macOS, Linux and Windows. The app carries its own engine, starts it when it opens and stops it when it quits, so nothing else has to run beside it.
- If the engine cannot start, the start-up screen says why and where its log is.
- build_app and build_app.bat make the installers on the computer they run on, and both pass extra arguments to the desktop build.
- Scripts keep the line endings their system needs on every checkout.

## v0.37.8 · 2026-10-26

A steady start.

- The start-up screen's logo no longer jumps when the rest of the screen appears.
- A window smoke test loads the built window and the start-up screen under throttling and fails on any layout shift, console error, failed request or refused request; it runs on every change.

## v0.37.7 · 2026-10-26

Only FormRef's own window.

- The service and its terminals answer only FormRef's own window, its desktop shell, agents on this computer and the paired clipper. A page served from another port on this computer could open a terminal and edit boards before.
- A test suite checks the board engine, saving and opening boards, iStack import, the clipper's pairing and the service's guard; it runs on every change.

## v0.37.6 · 2026-10-26

Symbols kept.

- The desktop app and the board engine are built unstripped, since macOS builds fail on a stripped binary.

## v0.37.5 · 2026-10-25

Own ports.

- FormRef's dev window, preview and engine now use 5320, 5321 and 8320, so they no longer collide with another form app on the same computer.

## v0.37.4 · 2026-10-25

Cross-site requests.

- A web page can no longer reach the service through an image or a link.

## v0.37.3 · 2026-10-24

Holder and credit.

- `LICENSE` and the README's Licensing section name the copyright holder NodeAgentc, Inc.
- Studio preferences end with an ABOUT section: FormRef and its version, "by nodemode.ai", and the licence line, translated in every language but the name and credit.

## v0.37.2 · 2026-10-23

Names and notices.

- The vector tools carry FormRef's own names and descriptions in every language: VECTOR TOOLS in the sidebar, "Vector tools on/off" toasts and catalogue entries that name no other product.
- `README.md` and `NOTICE.md` gain a trademark notice for the products named only for formats and provenance; AGENTS.md and CLAUDE.md record the rule.

## v0.37.1 · 2026-10-22

Checks and releases.

- The repository's GitHub Actions now run basic checks (frontend, backend and scripts) on main, on pull requests and on `compile_vX.Y.Z` branches.
- Releases are built by formcompiler (`nodemode-ai/formcompiler`) and published on its release page as `formref-vX.Y.Z`. FormRef cannot be released yet; formcompiler will build it once the desktop shell bundles its own interface.
- There is no change to the app itself.

## v0.35.0 · 2026-10-20

New app icon.

- The orange F is replaced by a stack of three reference prints held by a strip of tape, drawn in the Form family style: the front print shows a sunset in the family colors on the dark tile.
- The same design is used for the macOS, Windows and Linux app icons, the tray icon, the browser tab icon and the README.
- On macOS the icon sits inside the standard margin so it lines up with other Dock icons.

## v0.34.0 · 2026-10-17

Reviewed wording back in.

- `./formref i18n apply <sheet.csv>` takes a reviewer's returned sheet and puts every Better wording into that language's translations. The language comes from the file name, or `--lang`.
- It refuses, and lists, rows whose English is no longer in the app or whose placeholders were changed; everything else still goes in. `--dry-run` shows the changes without writing them.
- Sheets saved with semicolons by some spreadsheet apps are read as well.

## v0.33.0 · 2026-10-17

Translation review pack.

- `./formref i18n review <folder>` writes one spreadsheet (CSV) per language for a native speaker to check. Each holds every English string, its translation, where it appears in the app, and automatic hints: missing, placeholder trouble, still in English, much longer than the English (may not fit), a different final mark, and single words whose sense (noun or verb) needs checking. Empty Verdict and Better wording columns take the reviewer's answers. A summary lists the counts per language.
- Name languages to limit the pack, for example `./formref i18n review review de ja`.
- `./formref i18n check` runs the existing coverage check.

## v0.32.1 · 2026-10-17

Stack card fixes.

- Dragging a selection box over empty-looking canvas no longer selects a collapsed group whose hidden items lie there. A box that touches the stack card selects the whole group.
- The stack card's title and count now sit at the top, as in picture exports.

## v0.32.0 · 2026-10-17

Export what you see.

- The export dialog has a new option, Collapsed groups as stacks. With it on, PNG, SVG, the three PDF forms and the phone viewer draw each collapsed group as one card, as in the window: its title with the number of items, and its top three pictures fanned inside. Connections to the group or its items meet the card.
- The option is remembered in this browser. It is off by default, so exports show every item as before.
- Markdown, Board JSON, the FormRef project, BeeRef and All pictures always include every item. Agents pass `stacks` to `export_board`.

## v0.31.0 · 2026-10-17

Collapse a group into a stack.

- Collapse Group (Alt+G, Organize in the right-click menu, or the command palette) turns the selected group into one compact card. The card shows the group's top three pictures fanned like a pile, its title (or "Untitled group") and how many items it holds.
- Click the card to select the group and drag it to move the whole group; the card follows as you drag. Double-click it, or use Expand Group (Alt+Shift+G), to show the items again in place.
- Connections to the group, or to any item inside it, meet the card while it is collapsed.
- Collapsing is saved with the board and undoes like any change. It survives duplicating a board, templates, and copying or moving a selection to a new board. Exports still show every item. Agents collapse and expand with the `collapse_group` arrangement.

## v0.30.0 · 2026-10-17

Straight and elbow connections.

- A Route submenu in the connection menu and in Connection Style draws a line as a curve (as before), straight, or as an elbow of right angles: level out of each end, then one vertical run at the middle. Elbows turn with rounded corners.
- Arrowheads follow the route, so a straight line's head points along the line.
- PNG and SVG exports draw all three routes, and a PNG's labels now sit exactly where the window shows them. Agents set `route` on `connect_items` and `style_connections`.

## v0.29.0 · 2026-10-17

Colour and direction for connections.

- The connection menu and the Connection Style submenu have a Color submenu: orange (what new connections get), red, yellow, green, blue, purple and grey, each shown as a dot with the current colour ringed, plus Custom Color for any colour from the system picker. Recolouring the selection's connections is one undo step.
- Reverse Direction swaps a line's start and end, so a single arrowhead points the other way. It is offered while a line has an arrow at one end.
- Agents pass `reverse` to `style_connections`.

## v0.28.0 · 2026-10-17

Lines that say which way they read.

- Right-click a connection for its own menu: Solid, Dashed or Dotted Line; No Arrowheads, Arrow at End, Arrow at Start or Arrows at Both Ends; Label Connection; Remove Connection. The end is the reference or group the line was drawn to.
- With references selected, the right-click menu's Connection Style submenu styles every connection touching them at once, in one undo step. Every style is also in the command palette.
- An arrowhead at a reference stops just outside its edge instead of hiding under it. A chosen connection is drawn heavier, and dashed and dotted lines are as easy to click as solid ones.
- Relabelling a connection keeps the connection itself, its id and its style.
- PNG and SVG exports draw dashes, dots and arrowheads; Markdown writes `<-` and `<->` for lines pointing back or both ways. Agents set `line` and `arrow` on `connect_items` and restyle with the new `style_connections` tool.

## v0.27.0 · 2026-10-17

Connect from the selection.

- Connect Selected (Ctrl/Cmd+Shift+L, the command palette, or the right-click menu while things are selected) joins the selected references and groups without switching to the connect tool. Two become one line; three or more become a chain in reading order, top to bottom and left to right. A group counts as one node when all of its items are selected. Pairs that are already connected are skipped, and the whole change is one undo step.
- Remove Connections removes every connection that touches the selected references or groups.

## v0.26.0 · 2026-10-17

Named groups.

- Organize, Name Group (also in the command palette) gives the selected group a title. A titled group shows a dashed frame with its title above it, whether or not it has connections, so a group reads as a named collection. Saving an empty title removes it, renaming keeps the frame in place, and each change is one undo step. Ungrouping removes the title with the group.
- Lines to and from a column now meet the column's side, as they do for groups, instead of crossing its cards to the centre.
- PNG and SVG exports draw titled frames and make room for the titles; Markdown names a titled group by its title. Duplicating a board, templates and moving a selection to a new board keep the titles with their groups. Agents name a group with the `name_group` arrangement.

## v0.25.0 · 2026-10-17

Groups connect like nodes.

- With the connect tool (Shift+C), clicking a grouped reference now connects its whole group, so groups link to each other and to single references like nodes in a diagram. Alt-click connects just that one reference instead.
- A connected group gets a dashed frame around its items, and its lines meet the frame's side instead of crossing between the items. Moving the group moves its frame and lines.
- Ungrouping a group, or removing all of its items, removes its connections in the same undo step; undo brings them back.
- PNG and SVG exports draw the frames and lines as the board shows them, and Markdown names a group by its first items. Duplicating a board, saving and using templates, restoring from the trash and moving a selection to a new board keep group connections. Agents connect a group by giving `group:` and the group id as an end.

## v0.24.0 · 2026-10-16

Stars where you look at pictures.

- Rated pictures show their stars in the bottom-right corner on the board.
- Organize, Sort by Rating arranges the selection, or the board, from most stars to fewest, with unrated pictures last in their current order. Agents can sort by rating too.
- The phone viewer adds a chip for each rating on the board (5, 4 and up, 3 and up, and so on) beside the tag chips; tapping one dims every picture below it, and it combines with chosen tags.

## v0.23.0 · 2026-10-16

Ratings from picture files, and a picture shape filter.

- A star rating stored in a picture file becomes its rating on the board when it is added from the window, the browser clipper, `./formref import` or an agent. FormRef reads the rating Lightroom, Bridge, darktable and digiKam write, and the one Windows writes. A Lightroom "rejected" mark is not a rating, so those pictures stay unrated. A picture exported with stars and added again keeps them.
- The kind filter can show only portrait, landscape or square pictures, judged by how each picture sits on the board (a quarter turn counts). Saved searches keep this choice like any other kind.

## v0.22.0 · 2026-10-16

Star ratings.

- Pictures can have 1 to 5 stars. Press 1 to 5 with pictures selected (0 clears), or click the stars in the inspector's Image section; clicking a picture's current star again clears it. Each change is one undo step.
- The star button beside the kind filter keeps pictures with five stars, at least 4, 3 or 2 stars, any rating, or only unrated pictures. A small badge shows the choice, and the clear button clears it with the other filters. Saved searches, for one board and for all boards, keep the rating filter.
- The All pictures ZIP writes each rated picture's stars into the file as an XMP rating, which Lightroom, Bridge, darktable, digiKam and Windows read. A rating already in the file is replaced; unrated pictures keep theirs.

## v0.21.0 · 2026-10-16

Picture Info.

- Picture Info (the button in the inspector's Image section, Images menu, or Shift+Alt+I) shows the selected picture's original file name, format, pixel size and file size, and how large it shows on the board. When the file holds camera details, it also shows the camera, lens, focal length, aperture, shutter speed, ISO, date taken and editing software. Keywords stored in the file and the page a clipped picture came from are listed too, the page as a link.
- Copy Info puts the details on the clipboard as text. Nothing on the board changes.

## v0.20.0 · 2026-10-16

A Practice Log view.

- View, Practice Log, or Practice Log in the Timed Practice setup, lists every finished session, newest first, with its date and time, board, number of pictures, pace (the time per picture or the class plan) and drawing time. A menu switches between all boards and this board only, and totals for what is shown sit beside it.
- Clear Log empties the log after a second click on the same button.

## v0.19.0 · 2026-10-16

Class plans for Timed Practice.

- Timed Practice has a Session choice. Besides the same time for every picture, it offers Warm-up, 10 minutes (10 × 30 seconds, then 5 × 1 minute), Class, 30 minutes (adding 2 × 5 minutes and 1 × 10 minutes) and Class, 1 hour (adding 1 × 30 minutes). Each picture gets its own time from the plan, and the setup lists the sequence in the chosen language.
- When there are fewer pictures than the plan needs, they repeat, shuffled again for each round when Shuffle is on. Breaks, pause, mirror and grey work as before, and the practice log records which plan was used. Agents can choose one with the `plan` setting of `timed-practice`.

## v0.18.0 · 2026-10-16

Breaks and a log for Timed Practice.

- Timed Practice can take a break of 5, 10 or 30 seconds or a minute between pictures. The screen shows "Break" and which picture comes next, the clock counts the break down, and the next picture loads during it. Space pauses a break and the right arrow ends it early. Break time is not counted as drawing time.
- Finished sessions are kept in a practice log in the data folder (the last 500), and the setup shows the last 7 days: sessions, pictures and drawing time. Agents can set the break with the `rest` setting of `timed-practice`.

## v0.17.0 · 2026-10-16

Timed Practice for drawing sessions.

- View, Timed Practice (Alt+T) shows pictures one at a time full screen, each for 30 seconds, 1, 2, 5 or 10 minutes, or with no limit, as gesture and figure drawing sites do. It uses the selected pictures when two or more are selected, otherwise the pictures the filters show, otherwise every picture on the board, and can shuffle them, stop after 5 to 30 and start in grey.
- Space pauses, the arrow keys step, H mirrors, G turns grey on or off and Esc ends with a summary of how many pictures and how long. A bar under the clock shows the time left. The session pauses when the window is hidden. Nothing on the board changes.
- The choices are remembered for next time. Agents can start a session with `timed-practice` and its seconds, count, shuffle and grey settings.

## v0.16.0 · 2026-10-16

Saved searches for every board.

- The bookmark beside the item count has Save Search for All Boards. Such a search keeps the find text, kind, color, tags and label names, and every board lists it in an All Boards section next to its own searches. A similar picture stays with the board it came from.
- Labels match by name on each board, ignoring case; a board without one of the labels says so and applies the rest.
- Searches for all boards are kept in the data folder, not in a board, so undo does not bring a deleted one back. Agents can save one with `save-shared-search`, and `apply-saved-search` finds them too.

## v0.15.0 · 2026-10-16

Tags travel with exported pictures.

- The All pictures ZIP now writes each tagged picture's labels, tags and title into the file, where Lightroom, Bridge, darktable, digiKam and Windows read them. JPEG and PNG files carry them inside without the picture itself changing (other information in the file, such as camera details and ratings, is kept); other formats get a small .xmp file beside them. Untagged pictures are exactly the original files, as before.
- When a picture's file has keywords in several places, FormRef now takes them from XMP when it has them, as photo tools do. Before, a keyword removed in one tool could come back from an older field.

## v0.14.0 · 2026-10-16

Pictures arrive tagged.

- Keywords saved inside picture files now become the picture's tags when you add it: from Lightroom, Bridge, Apple Photos, darktable or digiKam (XMP), older Photoshop and newsroom tools (IPTC), and the Tags field in Windows. This works for dropped and pasted files, Add Images, the browser clipper, Add Images from the Web, and `./formref import` of a folder. The tags show in the tag cloud and the inspector straight away and can be renamed or removed like any others.

## v0.13.0 · 2026-10-16

Tags while typing, and tags in exports.

- Typing in the inspector's tags field now suggests the board's tags that start with (or contain) what you are typing, most used first. Arrow keys and Enter pick one, Tab takes the first, and Esc closes the list.
- The phone viewer page has a row of tag chips under the board's name; tap one or several to show only the pictures that carry them.
- One page per item PDFs print each item's title and tags at the bottom of the page.
- Markdown exports list each item's tags, and SVG exports keep them with each item.

## v0.12.0 · 2026-10-16

Tidying tags from the tag cloud.

- Right-click a tag in the tag cloud: Select Items With This Tag, Rename or Merge Tag, and Remove Tag From All Items. Renaming to a name another tag already has merges the two, and no item ends up with the same tag twice; a tag you are filtering by keeps filtering under its new name. Each change is one undo step, and locked items keep their tags (the message says how many).
- Right-click a label in the cloud: Select Items With This Label, or Edit Board Labels.
- Agents can call rename_tag and remove_tag, with the same rules.

## v0.11.0 · 2026-10-16

Illustrator tools become optional, and a tag cloud.

- The Illustrator tools are now off by default and can only be turned on in Preferences, under Illustrator tools. That covers the Pen, Curvature, Pencil and Direct Selection tools, path editing and corners, Pathfinder, polygons, stars and the other shapes, stroke, arrowhead and gradient options, and Smart Guides. Off, they are gone from the toolbar, menus, command palette, shortcuts and inspector; on, they come back at once without a restart. Paths already on a board stay visible and can still be moved either way.
- Tag cloud: under the reference filter in the left panel, chips show every label (with its colour) and tag on the board, with how many items carry it. Click one or several to show only the items that carry all of them; the x clears them. Saved searches remember the chosen tags.
- The shortcut sheet lists each group once; commands that modules added later used to start a second heading.
- Swedish: the Pencil tool had the Pen's name.

## v0.10.0 · 2026-10-16

Saved searches, and fixes for other languages.

- Saved searches: the bookmark beside the item count in the left panel keeps your filters (find text, kind, colour and similar picture) under a name on the board. Save Current Search suggests a name from the filters, such as “window” · Images · #c0392b. Picking a saved search brings every filter back at once, and the bookmark lights up while what you see is a saved search. Clear All Filters and Delete Saved Search are in the same menu, and a deleted search comes back with Undo. A board keeps up to 24, and they travel with the board when you save or export it.
- The command palette now finds commands by their names in your language. Before, typing a translated name found nothing.
- Dialog explanations (for example in Delete Board, Save as Template and Set Opacity) were shown in English in every language; they are now translated.
- Agents can save and delete searches with save_search and delete_search.

## v0.9.0 · 2026-10-16

Finding pictures that look alike.

- Find Similar: select one picture and click the similar button beside the colour dot in the left panel (or right-click, Images, Find Similar). The board dims everything except the pictures that look like it, and the button shows the picture you started from. It judges colour mix, where light and dark sit, and where colours sit, so brighter, darker, cropped, mirrored, greyscale and re-saved copies are found.
- Three levels in the right-click menu: Near Copies, Similar Pictures (the default) and Loosely Similar, which also brings in pictures of a similar kind.
- The x beside the filter now clears both the colour and the similar filter. Deleting the picture you started from, or switching boards, ends the search.
- Agents can call find_similar for a ranked list with a score for every picture.

## v0.8.0 · 2026-10-16

Finding pictures by colour.

- Find by Color: the colour dot beside the reference filter in the left panel opens a colour picker. The board dims everything except the pictures and swatches that contain the colour, and the list on the left shows only those. Select All then selects just them. The x clears it. Dragging in the picker narrows the board as you go.
- Find This Swatch Color (right-click, or the command palette) looks for a selected swatch's colour, so a swatch from Extract Palette finds every picture that shares it.
- Sort by Color (right-click, Organize, or By color in the inspector) lays pictures out in rainbow order of their main colour, with black, white and grey pictures after them from light to dark. One undo puts them back.
- Agents can call find_by_color to get the matching pictures, best first, and sort with the key color.

## v0.7.9 · 2026-10-16

No cut-off text, in any language.

- Every panel, menu and dialog was checked in all 23 translated languages. The FormRef wordmark under the logo no longer cuts off; Russian "Play" and Norwegian "Spacing gap" got shorter words that fit.
- Behind the scenes, the command list is now split by menu (File, Edit, Insert and so on). Nothing changes on screen: every command, shortcut and menu position is the same.

## v0.7.8 · 2026-10-16

Checking a drawing against its reference.

- Compare Pictures (Alt+C, or right-click, Images) with two pictures selected opens them full screen in four views:
  - Side by Side.
  - Onion Skin: the second faded over the first.
  - Swipe: a divider you drag across.
  - Difference: areas that match go black.
  Dragging on the pictures moves the slider. Keys 1 to 4 switch views, S swaps the pictures and Esc closes. Nothing on the board changes.
- Inspector buttons now fit their labels in every language: icons sit above the words and long words wrap. Before, German cut off 19 labels and Ukrainian 22.

## v0.7.7 · 2026-10-16

Adjusting pictures, measuring proportions, and splitting boards.

- Brightness, Contrast and Saturation sliders in the inspector for pictures. The picture changes while you drag, and letting go is one undo step. The original is kept, and PNG, SVG, PDF and phone viewer exports show the same adjusted colours as the board. Reset Adjustments puts them back.
- Measure (Shift+M, or right-click, Canvas): drag to measure a length and its angle; every later line also shows its ratio to the first, such as "0.68× first". Shift keeps 45 degree steps. Esc clears, and nothing is saved to the board.
- Copy or Move Selection to New Board (right-click, Organize): the selection, the items inside its columns, and the connections between them go to a new board in a new tab. Moving takes them off this board through the Trash, so Undo here brings them back.

## v0.7.6 · 2026-10-16

Study aids for drawing and painting from references.

- Value Study (right-click, Images): shows the selected pictures as 2 to 8 flat grey values, with 2 as a notan, to judge light and shadow. The pictures and exports are unchanged; Off brings the colours back.
- Drawing Grid (right-click, Images): an even 3 x 3 to 12 x 12 grid over the selected pictures for copying proportions. The lines invert what is under them, so they show on light and dark pictures alike. Board view only.
- Extract Palette (right-click, Images): adds the picture's main colours as grouped swatch cards below it, most used first. It reads the visible crop, and a second palette lands below the first instead of on top of it. Agents can call it as the MCP tool `extract_palette`.

## v0.7.5 · 2026-10-16

Dates in your language, and agents that know every command.

- Dates and numbers follow the interface language: comments and the Trash say "5 minutes ago" (or "vor 5 Minuten", "5 分前"), and table dates, money and numbers use the language's format. In English, your browser's region is kept, so a UK browser still shows day-first dates. Table check marks and a comment's resolved tag are translated too.
- Every command now says what it does to agents (MCP `describe_command` and `list_commands`), not just its name.
- `./formref agents sync` writes the agent skill's command reference (all commands, their default shortcuts and what they do) from the running app; `--check` reports when it is out of date.
- Shortcut handling moved into its own module; saved shortcuts carry over unchanged.

## v0.7.4 · 2026-10-16

Boards on a phone or tablet.

- Export, Phone viewer: one HTML file that opens in any phone or tablet browser, read-only. Drag to move, pinch or use the buttons to zoom, tap a picture to fill the screen, double-tap to see the whole board. Pictures are sized for a phone (a 5 MB board SVG came out at 150 KB), and the page works offline. Nothing is served from your computer, so FormRef still only listens to itself; copy the file to the device by AirDrop, a cloud folder or a cable. The viewer's own few words are in English.
- Card labels on the board ("Document", "Column" and so on) now follow the interface language.

## v0.7.3 · 2026-10-16

Finding words in PDFs, boards that remember their window, and readable notes in exports.

- Search finds words inside PDFs on the board. Page images made with PDF Pages to Images match page by page, so a search points at the right page. Scanned PDFs without a text layer are not searched.
- Desktop: Save Window Layout with Board (right-click, Canvas) keeps the window's position, size, Always on Top and opacity with the board, and opening the board puts the window back. A layout from a screen that is no longer connected lands on the current screen. Forget Board Window Layout clears it.
- Fixed: note text was missing from SVG and PDF exports and hard to read in PNG exports. Exported notes and documents now show their title above their text, in dark ink on light notes as on the board.

## v0.7.2 · 2026-10-16

Columns that collect what you drop on them, every picture out in one go, and FormRef one keystroke away.

- Drag items onto a column to put them in it; drag them out to take them out. The column is outlined while you drag, and the move is one undo step. Lock Against Drops (right-click a selected column) keeps a column closed to new items.
- Export, All pictures: a ZIP of every picture's original file, numbered in reading order, each picture once. Also through MCP (`format: "images"`).
- Desktop: a tray icon that shows or hides FormRef on click, with Always on Top, Click-through and Quit in its menu, and Ctrl+Alt+F (Cmd+Option+F on a Mac) to bring FormRef to the front from any app or hide it.
- Card hints on the board ("Double-click to edit" and the like) now follow the interface language.

## v0.7.1 · 2026-10-16

Moving boards to and from BeeRef, and very large boards that stay fast.

- Export a board as a BeeRef `.bee` file: pictures keep their original files, crop, rotation, mirroring, opacity and grayscale; notes, documents, to-dos and links become BeeRef text. Drawings and shapes have no BeeRef form, and the export says how many were left out.
- Open or drop a `.bee` file to bring a BeeRef board in as a new board. Positions match BeeRef to the pixel, including flipped and rotated crops.
- Items more than a screen outside the view skip drawing, so boards with hundreds of references pan and zoom smoothly; they return before they reach the edge.
- Normalize Sizes Within Each Group gives each group's items the group's median height, width or area while every group keeps its own scale.
- Animated WebP and GIF references play on the board; the zoom-sized previews always serve the animated original.
- The MCP `export_board` tool writes `.bee` too.

## v0.6.9 · 2026-10-16

Cropping, shaping and arranging references on the board.

- Crop (C) on one image now works on the board: the whole picture shows faintly around a crop box with handles; Enter or double-click applies, and the image keeps its scale. Cropping again brings hidden parts back.
- Lasso Crop: draw around the part of an image to keep; the rest is transparent on the board and in PNG, SVG and PDF exports. Clear Lasso undoes it.
- Rotate Selection (Alt+R) turns several references together about the centre of the selection.
- Lock Stacking Order keeps a background behind: Bring to Front and Send to Back skip it.

## v0.6.8 · 2026-10-16

PDF in and out, and big boards that open with what is on screen.

- Export a board as PDF at full resolution: the whole board on one page, one page per item in reading order, or printed at 100% across pages, on A4, Letter, A3 or Tabloid.
- PDF Pages to Images turns pages of a PDF on the board into image references beside it.
- Images outside the view wait to load until you pan or zoom near them, so big boards open faster.

## v0.6.7 · 2026-10-16

Reference-board work from the PureRef, BeeRef and Milanote wishlists.

- Video references: In and Out points (typed or taken from the current frame, Alt+I and Alt+O) that the player keeps to and loops between, Previous and Next Frame (, and .), and Speed from 0.25x to 2x. Present mode keeps them.
- Flip View Horizontally (Shift+H) and Vertically (Shift+V) mirror the view to check a drawing with fresh eyes; the board is unchanged.
- Alt-drag an image out of the window to copy its original file into a folder or another app.
- Big boards: images load a preview sized to the zoom (256 to 2048 px) and the original only when zoomed in, which also stops zoomed-out screentone from shimmering.
- `./formref open <board>` and `./formref import <folder>` from the command line (also in `formref.bat`).
- The right-click Organize menu lists Select Duplicate Images, Hide, Isolate, Show All and Unlock All.

## v0.6.6 · 2026-10-16

More shape tools, blending modes and duplicate detection.

- Add Arc, Add Spiral, Add Rectangular Grid and Add Polar Grid, with Illustrator's options for agents (slope, decay, segments, dividers and more).
- Blending mode for every item (Multiply, Screen, Overlay, Difference and the rest of Illustrator's sixteen), under Opacity in the inspector.
- Select Duplicate Images selects the extra copies of pictures that appear more than once, the same file or a near-identical copy, leaving one of each.

## v0.6.5 · 2026-10-16

Several anchors at once, Outline Stroke, the Pencil and multi-stop gradients.

- Direct Selection: drag a box on empty canvas to select the anchors inside it, or Shift-click anchors; dragging, Delete and the arrow keys act on all of them.
- Average (both, horizontal or vertical) and Delete Segment between two selected neighbouring anchors.
- Outline Stroke turns a stroke into a filled shape with its caps, joins and miter limit.
- Pencil (Shift+N): freehand that becomes a smooth editable path, with Pencil Fidelity from 1 (accurate) to 5 (smooth); end near the start to close it.
- Gradients take up to 16 stops, each with its own opacity (Gradient stops field in the inspector).
- Fix: the inspector showed Round caps and corners for paths that were drawn with butt caps and miter corners; it now shows what is drawn, and the miter limit draws at 10 as shown.

## v0.6.4 · 2026-10-16

Smart Guides, the Curvature tool, deeper search and hiding.

- Smart Guides (Ctrl/Cmd+U): moved items snap to the edges and centres of other items, with guide lines.
- Curvature tool (Shift+~): click points and the curve bends through them; click a placed point again to make it a corner.
- Search also finds words in comments and table cells, ignoring case and accents.
- Hide Selected (Ctrl/Cmd+3), Show All (Ctrl/Cmd+Alt+3), Isolate Selected and Unlock All (Ctrl/Cmd+Alt+2).

## v0.6.3 · 2026-10-16

More Pathfinder, Offset Path and continuing paths.

- Pathfinder: Divide, Trim, Merge and Crop, which keep several pieces.
- Offset Path: a new path a set distance outside (or inside, with a negative value) the selected shapes, with round joins; the originals stay.
- The Pen continues an open path: select it, press Shift+P and click one of its ends.
- German: the save status and the colour-capture buttons no longer spill out of their space.

## v0.6.2 · 2026-10-16

Chat in the dock, 26 languages, Pathfinder, arrowheads and gradients.

- Chat (Ctrl/Cmd+Alt+J): a Chat tab in the terminal dock, as in formlit. Claude answers in formatted text through FormRef's tools, with each tool call shown, a memory and cost meter, Stop, New Chat, Open in Claude Code and From Claude Code. The Agent panel keeps its title-bar button.
- MCP over HTTP at http://127.0.0.1:8196/mcp. The dock's Claude Code and Chat use it, and other MCP clients on this computer can too (outside-agent consent still applies). New `run_commands` runs several window commands in order.
- Languages: the whole window in 26 languages, English by default (Preferences, Language): Spanish, Mexican Spanish, Brazilian Portuguese, French, Canadian French, German, Italian, Dutch, Danish, Finnish, Norwegian Bokmål, Swedish, Russian, Polish, Czech, Hungarian, Ukrainian, Turkish, Simplified and Traditional Chinese, Japanese, Korean, Indonesian, Thai and Vietnamese. It switches in place, your own board text is never translated, and a saved language shows from the first frame.
- Pathfinder: Unite, Minus Front, Intersect, Exclude, Minus Back.
- Direct Selection: click an anchor to select it, then Delete removes it and the arrow keys nudge it (Shift for 10 px); double-click a segment to add an anchor; Cut Path at Selected Anchor (Ctrl/Cmd+Shift+X).
- Arrowheads (Arrow, Open arrow, Circle, Square, Bar) with a scale, and linear and radial gradient fills.

## v0.6.1 · 2026-10-16

Vector paths with Illustrator's Live Corners, and one command registry agents can use.

- Round corner points: Round Corners rounds every corner of a shape or path (Round, Inverted round or Chamfer), and the inspector shows the largest radius that fits. Rectangles, ellipses, lines and freehand strokes become editable paths the first time.
- Direct Selection tool (A): anchors, handles and a corner widget on every corner. Drag a widget to round all corners (Shift for one), Alt-click it to change the style, drag anchors and handles, Alt-click an anchor to switch corner and smooth.
- Pen tool (Shift+P): click for corners, drag for curves, click the first point to close, Enter to finish.
- Stroke options: caps, corners, miter limit, dashes. Add Polygon and Add Star (3 to 1000). Path commands: Convert to Path, Add Anchor Points, Simplify, Smooth, Reverse Path Direction, Join (Ctrl/Cmd+Shift+E).
- Every menu, palette and shortcut command lives in one registry, as in formvis and formlit; agents can list, describe and run them (`list_commands`, `describe_command`, `run_command`), except window-only commands, and risky ones need your yes.

## v0.6.0 · 2026-10-16

A terminal and Claude Code inside FormRef, and one build script.

- Terminal dock (Ctrl/Cmd+J): real login shells in tabs under the canvas, resizable, kept running while hidden.
- Claude Code (Ctrl/Cmd+Shift+J): your own Claude Code sign-in in a dock tab, already connected to FormRef's tools, so it can arrange, add and edit on the open board while you watch. The Ask line sends a request with the board and the selected items. Set its start folder, program and first message in the Agent panel.
- The Agent panel moves to Ctrl/Cmd+Alt+J. Alt shortcuts now work on macOS.
- `./build_app` (or `build_app.bat`) builds everything from the repo root: tools check, install, Rust core, window and desktop packages. `--web` stops after the web build.
- `./formref claude` starts Claude Code in your own terminal with FormRef's tools.

## v0.5.4 · 2026-10-13

`./formref desktop build` builds the desktop app from the repo root: the Rust core, then the Tauri build. The app still loads its window from the FormRef backend on 127.0.0.1:8196, so the backend has to be running.

## v0.5.3 · 2026-10-11

Background models and cloud storage, from FormCut.

- Remove Background has a Method: FormCut's models alongside the model-free plain-background cut. Object (U2Net small) is built in and works offline; Person (U2Net), Sharp edges (IS-Net), Subject (Auto) and Click to select (SAM 2.1) download from the inspector, each checked against its published checksum. Click to select: pick points on the image, Alt-click to leave something out.
- Import file adds a model you already have, for machines that cannot reach the download hosts.
- Cloud storage, opt-in: connect Google Drive or Dropbox in Preferences with your own app credentials, then Save Board to Cloud (FormRef board, picture or Markdown) and Open from Cloud (a board opens; an image goes onto the board). Agents cannot use it.
- The command palette runs the first match on Enter, and the arrow keys move through it.
- MCP: `list_background_models`, `download_background_model`, and `remove_background` takes a method and points; 35 tools.

## v0.5.2 · 2026-10-11

Regression fixes.

- Fixed: since v0.4.9 the right-click menu did not open unless an image was selected (right-clicking empty canvas or a note did nothing). Menus, the palette and shortcuts now treat a failing check as a disabled command instead of stopping.
- The clipper passes Mozilla's add-on linter with no errors; it now needs Firefox 128 or later and declares that it collects no data.

## v0.5.1 · 2026-10-11

Editing while presenting, always on bottom, clipper command. Versions now follow `v*.**.*`, so this release follows v0.4.10.

- Presenting has an Edit button: turn it on to move, resize and edit cards in front of an audience, with the panels still hidden. Turn it off to lock the board again.
- Presenting never saves the audience's zoom as the board's view; zooming while presenting used to.
- Desktop shell: Always on bottom keeps the board behind other windows. It and Always on top switch each other off.
- `./formref clipper` prints the clipper folder and pairing token; `./formref clipper --new` makes a new token.

## v0.4.10 · 2026-10-11

Browser clipper.

- FormRef Clipper, a Chrome and Firefox extension in `clipper/`: right-click an image, selected text, a link or the page and choose Save to FormRef. The toolbar button saves the page. Clips land on the board open in FormRef (or one you choose) in a free spot, keeping the page they came from.
- Pair it once: Preferences, Browser clipper, Copy, then paste into the clipper options. New token unpairs it. Web pages cannot save to FormRef.
- Images FormRef cannot fetch itself are downloaded by the browser instead.
- Fixed: link, board, file and document cards drew a huge clipped arrow that hid the address and the Double-click hint.

## v0.4.9 · 2026-10-11

Background removal.

- Remove Background (Images menu and inspector) makes a plain background transparent: anything touching the image edges in the background colour, with soft edges and a Tolerance slider. The original is kept; Restore Background brings it back, and both are one undo step.
- Works on product shots, scans, logos, sketches and studio photos. Photos whose subject blends into its surroundings, or busy backgrounds, are refused with a reason rather than cut badly; they need a segmentation model.
- A cut-out image sits on the canvas without its card.
- MCP: `remove_background`; 33 tools.
- Fixed: the toast slid sideways when its message changed.

## v0.4.8 · 2026-10-11

Desktop window modes.

- In the desktop shell, Preferences adds Window opacity (see other apps through the board) and Click-through (clicks pass to the app underneath); Ctrl+Alt+K, or Cmd+Alt+K on macOS, toggles click-through from anywhere. Always on top, fullscreen and frameless were already there.
- The desktop shell has now been built and run on Linux.
- Fixed: some icons drew far too large in Safari and the desktop shell.

## v0.4.7 · 2026-10-11

Synced notes and map cards.

- Synced Copy makes a linked copy of a note or document: edit any copy and the others follow, in one undo step. Stop Syncing unlinks one.
- Google Maps and OpenStreetMap links become map cards.
- Fixed: text typed into a note on the board was lost if you then clicked empty canvas; it now saves.

## v0.4.6 · 2026-10-11

GIF frames and document export.

- GIFs in the reference view get frame controls: pause and play (K), step (comma, full stop), a frame slider, speed and Keep frame, which adds the frame to the board.
- Export any note or document on its own as PDF, Word, Markdown or plain text from its editor.

## v0.4.5 · 2026-10-11

Video, audio and table cards.

- Video and audio files play on the board, with Play automatically (muted) and Loop in the inspector. YouTube, Vimeo, Spotify and SoundCloud links become players.
- Table cards: typed columns (text, number, currency, percent, date, checkbox), double-click to edit cells, and formulas such as =SUM(B1:B3) or =B2*1.2.
- MCP: `create_table`; 32 tools.
- The Inspector tab no longer shifts when the selection count appears.

## v0.4.4 · 2026-10-11

Present a board.

- Present (P): the board full screen with every panel hidden and nothing editable. Click a card to enlarge it, use the arrow keys to step through, Escape to close and Escape again to leave. Presenting never changes the saved board.
- Web capture now connects only to the address it checked, so a site cannot swap in a local address between the check and the download.

## v0.4.3 · 2026-10-11

Coloured labels and images from the web.

- Labels: each board has its own coloured labels. Put them on items from the inspector; rename or recolour one and every item follows; delete it and it comes off every item. Labels show along the bottom of each item and Find searches them.
- Web images: drag an image from a browser, paste an address, or use Add Images from the Web. An image is downloaded and placed; a page shows its images so you can pick. Only public addresses are fetched.
- MCP: `capture_from_web`, `define_labels`, `label_items`; 31 tools.

## v0.4.2 · 2026-10-11

Comments and templates.

- Comments: select an item to see its thread in the inspector, add a comment, resolve or reopen it, or delete it; each is one undo step. Items with open comments show a count. Agents can comment too, signed Agent.
- Templates: New from template starts a board from a moodboard, character sheet, storyboard or project plan, or from your own; Save as Template keeps any board for reuse.
- MCP: `add_comment`, `resolve_comment`, `list_templates`, `create_board_from_template`; 28 tools.

## v0.4.1 · 2026-10-11

Trash and your own shortcuts.

- Trash: deleting a board moves it to the Trash, and anything removed from a board (by you, an outside agent or the Agent panel) waits there too. Restore puts items back where they were as one undoable step or brings a board back to the list. Open it from the left panel or the palette.
- Shortcuts: click any key in the shortcut sheet (?) and press new keys. Keys the browser keeps are refused, keys already in use move over with a note, and Reset All restores the defaults. Your keys are saved and come back on the next launch.
- MCP: `list_trash` and `restore_from_trash`; 24 tools.
- The agent's Confirm card now uses the right accent colour.

## v0.4.0 · 2026-10-11

The recovery build: iStack's behaviour and menu in the Form family shell, with an embedded agent that asks before big changes.

- The agent asks first: when it wants to remove items, delete the board, or move, pack, sort, align, distribute, snap or resize 10 or more items at once, a Confirm card in the Agent panel offers Allow, Allow all (for the rest of the turn) or Decline. No answer in five minutes counts as Decline. You can turn this off under the panel.
- Agents that read images can see the whole board as a picture (`get_board_image`, 22 MCP tools).
- Notes on dark paper, such as notes an agent adds without a colour, now use light text.
- The item count beside each board in the left panel stays current.

Since v0.3.0 this release has also brought: planning documents out of the repository history, engine commands for iStack's Images and Organize menus, the rebuilt shell with collapsible panels and iStack's right-click menu, board tabs, the eraser, note fonts, slideshow speed and fade, the Agent panel on Claude Code, Codex, Cursor or Ollama, and a FormRef tab in the FormAI parity matrix.

## v0.3.4 · 2026-10-11

Board tabs, iStack's drawing and slideshow controls, and the outside-agent prompt.

- Boards open as tabs: Ctrl+N for a new tab, Alt+W to close, click to switch. The open tabs come back when FormRef starts.
- Eraser (E) removes whole strokes it passes over, as one undo step.
- Notes can use any of the bundled fonts.
- Slideshow has a seconds-per-image setting and a fade or no transition.
- The first time an outside agent is refused, FormRef asks whether to allow outside agents.
- Project harness rebuilt with eight specialists and mirrored for Codex and Cursor; new wiki pages for the engine contract, the shell and the agent.

## v0.3.3 · 2026-10-11

The interface rebuilt in the Form family layout.

- Right-click anywhere on the board for iStack's menu: File, Edit, Canvas (grid, snap grid scales, grayscale canvas, background colour, fit, reset zoom), Organize (pack, sort by aspect, filename or similarity, group), Images (flip, grayscale, pixel art, opacity, crop, rotate 90, save image as), Layer, Lock, Add Note, Draw Mode, Slideshow, Delete, plus Insert and Ask Agent.
- Shortcuts follow iStack: D draw, L lock, C crop, R rotate 90, Ctrl+P pack, Ctrl+G and Ctrl+Shift+G group and ungroup, Shift+S slideshow. Duplicate moved to Ctrl+D, link to Shift+L, connect to Shift+C, rectangle to Shift+R.
- Both side panels collapse to rails and stay collapsed after a reload.
- Every icon has one meaning; new rectangle, circle and line tools.
- Press ? for a shortcut sheet generated from the same command table as the menu.
- Agent panel (Ctrl+J): pick Claude Code, Codex, Cursor or Ollama, watch each tool call, Stop, Undo This Turn, and allow or refuse outside agents.

## v0.3.2 · 2026-10-11

Engine commands for iStack's menus and the embedded agent service.

- Engine: rotate (90 degrees about each item's centre), opacity, image flags (flip, grayscale, smooth or nearest sampling), crop and reset, and sort by filename, aspect ratio or similarity. Each is one undoable step.
- Similarity sort uses colour and layout vectors computed once from the original pixels.
- MCP: `adjust_items` for the new image commands, `sort` in `arrange_items`; 21 tools.
- Agent service: turns on Claude Code, Codex or Cursor with FormRef's MCP attached, or on Ollama, with Stop and Undo This Turn. The panel arrives with the new interface.
- Outside agents are refused until allowed, as in FormVis.
- Session route stores open board tabs for restore.

## v0.3.1 · 2026-10-11

Repository hygiene before the v0.4.0 recovery build.

- Planning, research and verification documents removed from every commit; they live only in the planning sidecar now.
- Licence notices follow the Form family layout: `NOTICE.md` at the root and licence texts under `licenses/`.
- No application behaviour changed.

## v0.1.0 · 2026-10-10

First local Form family reference workspace.

- Added a headless Rust document engine with atomic commands, hierarchical transforms, locking, layout and undo/redo.
- Added a vanilla TypeScript/Vite canvas with stable keyed views, media controls, drawing, notes, tasks, links, columns, nested boards, connectors and project management.
- Added FastAPI asset storage, atomic persistence, iStack migration, relinking and five export formats.
- Added the official SDK MCP stdio service with 14 tools, board resources and an organization prompt.
- Added repo-local formref-harness specialists, startup scripts, source-only Tauri development shell and dependency notices.
- Researched PureRef, BeeRef and Milanote using official documentation; recorded row-level implementation scope and gaps.

Rust, frontend, live HTTP, restart persistence, actual MCP and throttled browser checks passed. Native desktop compilation and Windows execution remain unverified. The verification records of that release now live in the planning sidecar; see `docs/VERIFICATION.md` and `docs/PARITY.md`.
