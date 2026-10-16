# Backend hashout log

## Navigation

- [FormRef root](../README.md)
- [Subsystem contract](../.docs/wiki/Engine-Contract.md)
- [Architecture](../.docs/wiki/Architecture.md)

## Contents

- [v0.22.0 · Ratings in exported pictures](#v0220--ratings-in-exported-pictures)
- [v0.21.0 · Picture details](#v0210--picture-details)
- [v0.18.0 · Practice log](#v0180--practice-log)
- [v0.16.0 · Searches for all boards](#v0160--searches-for-all-boards)
- [v0.15.0 · Tags written into exported pictures](#v0150--tags-written-into-exported-pictures)
- [v0.14.0 · Keywords in picture files](#v0140--keywords-in-picture-files)
- [v0.13.0 · Tags in exports](#v0130--tags-in-exports)
- [v0.9.0 · Find Similar](#v090--find-similar)
- [v0.8.0 · Find by Color, Sort by Color](#v080--find-by-color-sort-by-color)
- [v0.7.7 · Adjustments in exports, selection to a new board](#v077--adjustments-in-exports-selection-to-a-new-board)
- [v0.7.6 · Extract Palette](#v076--extract-palette)
- [v0.7.5 · agents sync](#v075--agents-sync)
- [v0.7.4 · Phone viewer](#v074--phone-viewer)
- [v0.7.3 · PDF text and readable notes in exports](#v073--pdf-text-and-readable-notes-in-exports)
- [v0.7.2 · All pictures export](#v072--all-pictures-export)
- [v0.7.1 · BeeRef .bee boards](#v071--beeref-bee-boards)
- [v0.6.8 · PDF export and PDF pages](#v068--pdf-export-and-pdf-pages)
- [v0.6.7 · Image previews and the command line](#v067--image-previews-and-the-command-line)
- [v0.6.6 · Duplicate images](#v066--duplicate-images)
- [v0.3.2 · Embedded agent service, consent gate, similarity features, session](#v032--embedded-agent-service-consent-gate-similarity-features-session)
- [v0.3.0 · Original pixel sampling and formatted references](#v030--original-pixel-sampling-and-formatted-references)
- [v0.2.0 · Canvas settings and snapping through MCP](#v020--canvas-settings-and-snapping-through-mcp)
- [v0.1.0 · Local board service and SDK MCP](#v010--local-board-service-and-sdk-mcp)
- [boot_backend.bat](#boot_backendbat)

## v0.22.0 · Ratings in exported pictures

`xmp_write` takes a `rating` (1 to 5, anything else is treated as none) alongside the tags. When rating, `merged_packet` drops `xmp:Rating` both as an attribute on any `rdf:Description` (how Lightroom and Bridge write it) and as an element, then appends one element. Without tags it now leaves dc:subject and dc:title alone, so rating a picture never wipes the keywords another tool put in it. `fresh_packet` writes only the parts it has. `with_tags` returns the bytes untouched when there is neither tag nor rating. The `xmp` prefix is registered with ElementTree alongside x, rdf and dc. `images_export` keeps each asset's highest rating across its uses. Shared searches accept `rating` 0 to 5. Checked on the keyword fixtures: rating only on a plain JPEG (pixels identical, no keywords added), rating only on a JPEG with its own XMP keywords (kept), tags and rating together, an attribute rating replaced, WebP sidecar, PNG with compressed XMP (keywords kept, pixels identical). End to end the probe's ZIP had `xmp:Rating` 4 and 5 in the two rated pictures.

## v0.21.0 · Picture details

`core/picture_info.py` returns the stored asset record (name, mime, size, width, height, keywords) plus camera fields from EXIF. `Image.open` and `getexif` read only the header, never the pixels, so a large picture costs no decode, and any Pillow error gives no camera fields rather than a failure. The fields read are Make and Model (the make is dropped when the model already starts with it, as with "Canon EOS R6"), LensModel, DateTimeOriginal (returned as an ISO local time), FocalLength, FNumber, ExposureTime (shown as 1/n s under a second) and ISO (the first value when it is a list). Software is kept as well. Text is cut to 120 characters with NULs and runs of spaces collapsed, and numbers must be finite. SVG is skipped. Route: `GET /api/assets/{id}/details`. Checked with Pillow-made fixtures in $SC/pinfo (Canon JPEG with every field; Fujifilm PNG with a 2.5 s exposure and a list ISO), a non-image, the entity-declaring JPEG and the keyword fixtures (asset fields and keywords only), and a bad id (422).

## v0.18.0 · Practice log

`routers/practice.py` appends to `practice.json` with `store.atomic_write` and keeps the last 500 entries, so the file stays small. The server stamps `at` itself rather than trusting the window's clock. Entries without a numeric `at` are dropped on read, and an unreadable file reads as empty. Checked with curl: empty log, `pictures: 0` refused, an unknown field refused; the window wrote one entry per finished session in the probe.

## v0.16.0 · Searches for all boards

`routers/searches.py` keeps the list in `searches.json` beside `preferences.json`, written with `store.atomic_write`. They were put in the service rather than the engine because the engine owns one board at a time and its undo history; a list that belongs to no board has no history to join. The model refuses unknown fields so a board-only `similar` sample cannot slip in, and checks the same limits the engine applies to board searches (name 60 bytes, text 200, tags 12 of 60 bytes) plus 12 label names of 40 bytes. Labels are stored by name because label ids are made per board; the window maps names back to ids. A file that cannot be read gives an empty list rather than an error, so a damaged file never blocks the window.

Checked with curl (empty list, a valid save with an ampersand in the name, an empty search, duplicate names ignoring case, an id with a path in it, and a `similar` field each refused) and in the window at 4x CPU with slow network in English and German ($SC/ui/shared.cjs): saved on one board, listed and applied on another with the missing-label notice, one class change per item on apply, the board's own searches untouched, deleting from the shared list.

## v0.15.0 · Tags written into exported pictures

`core/xmp_write.py` `with_tags(data, mime, tags, title)` returns the picture bytes and an optional sidecar. JPEG: segments from SOI up to SOS are walked by their lengths (anything malformed returns None, so the file goes out untouched with a sidecar); an existing XMP APP1 is lifted out and merged; the new APP1 goes after the leading APP0/APP1 run (JFIF, EXIF), and SOS onward is copied unchanged, so the decoded pixels are identical. Packets over the 64 KiB APP1 limit fall back to a sidecar. PNG: chunks are walked to IEND; an `XML:com.adobe.xmp` iTXt is lifted out (compressed ones inflated with `decompressobj` capped at 4 MiB) and a new uncompressed one goes before the first IDAT with its CRC. Merging parses the old `x:xmpmeta` with defusedxml, removes `dc:subject` and `dc:title` from every `rdf:Description`, and appends new ones to the first; unregistered namespaces come back with ElementTree's ns0 style prefixes, which is valid XML (registering prefixes taken from files was rejected because `register_namespace` is global and could affect the SVG export). `exports.images_export` gathers tags per asset over every use in reading order and only calls the writer for tagged pictures.

`keywords.embedded_keywords` now returns XMP keywords alone when there are any; otherwise IPTC then Windows. Without this, a keyword removed on the board came back from the file's IPTC or XPKeywords on the next import.

Verified with the fixtures: a plain JPEG, a JPEG with its own XMP (rating and creator kept, old keyword replaced, one XMP APP1), a JPEG with EXIF (make kept), PNG plain and with compressed XMP (rating kept), WebP and an entity-declaring JPEG (untouched, sidecar); decoded pixels identical in every case; reading back gave exactly the written tags, including ampersand and angle brackets. End to end through `format=images` on the imported board after renaming a tag: untagged files byte-identical, the renamed tag in the JPEG, a sidecar beside the WebP, a picture used twice written once.

## v0.14.0 · Keywords in picture files

`core/keywords.py` `embedded_keywords(data)`. XMP: a regex finds the first `<x:xmpmeta ... </x:xmpmeta>` in the first 16 MiB, which covers JPEG APP1, PNG iTXt (uncompressed), WebP and TIFF without a parser per container; defusedxml parses it, so a packet with a DTD or entity is refused rather than expanded; every `rdf:li` under `dc:subject` counts, or the element's text when a writer skipped the Bag. IPTC: Pillow's `IptcImagePlugin.getiptcinfo` finds the Photoshop APP13 or TIFF IPTC block; dataset 2:25 may be one value or a list, decoded as UTF-8 with Latin-1 as the fallback (IIM 1:90 is not consulted). Windows: EXIF 0x9C9E is UTF-16-LE, semicolon separated, null terminated. Results are whitespace-collapsed, cut to 60 characters, deduplicated ignoring case, capped at 32. Any Pillow error while reading metadata yields no keywords instead of failing the upload, which was validated already.

`Store.import_asset` runs it for raster images, stores `keywords` in the asset JSON only when there are some, and adds them to an asset stored before v0.14.0 the next time the same file arrives. The upload route returns the info, so the window's `placeAssets` sets `data.tags` for images; the clipper, `./formref import` and MCP `capture_from_web` do the same server side.

Verified with fixtures built in scratch: XMP in JPEG, PNG iTXt and WebP; IPTC in a Photoshop APP13 block with UTF-8 umlauts; Windows XPKeywords; a packet declaring an entity (no keywords); a plain JPEG (none). Through the upload route, `./formref import` of the folder (all seven items tagged as expected), the clipper with a paired token, and the window at 4x CPU (four files added, tags on three, nine chips in the cloud, inspector "portrait, Ölgemälde, studio light", one undo removed all four).

## v0.13.0 · Tags in exports

`exports.item_tags(board, item)` returns the names of the board labels in `data.labels` (unknown ids skipped) then `data.tags`, once each ignoring case, so every export lists the same words as the tag cloud. `svg_export` sets `data-tags` (a JSON array) on an item's group only when it has some, so untagged boards export the same SVG as before; ElementTree escapes the quotes. `markdown_export` adds `Tags: ...` (escaped with `markdown_source`) after each item's block. `pdf_export`'s `page()` takes a caption and, on one-page-per-item pages, draws title and tags in 8 pt grey with a cairo context on the shared surface before `show_page`, shortened with an ellipsis to the width between the 36 pt margins. The viewer page's script reads the top-level groups' `data-tags`, counts them ignoring case, and builds the chip row inside the fixed header, so the existing fit code (which measures the header) already leaves room; chosen chips put `dim` (opacity 0.15) on every group lacking any of them; the row stays hidden without tags.

Verified: Markdown "Tags: Space, nasa, portrait" lines; SVG data-tags on the ten tagged groups; a 13-page one-page-per-item PDF whose text layer reads "astronaut · Space, nasa, portrait", "rocket · Space, Vehicles, NASA", "coffee"; a rendered page shows the caption in the bottom margin. The viewer at 390 by 844 with touch: nine chips, header 78 px; tapping animal dimmed 11 groups and left the cat and horse. The earlier viewer probe on a board without tags: header 34 px, fit, tap focus, pinch, pan, double tap and zoom unchanged.

## v0.9.0 · Find Similar

`core/similar.py`: `signature_of()` composites the picture on mid grey (so transparency is neutral) and takes a 64-bin RGB histogram from a 96 px copy, an 8x8 grey layout of the picture and of its mirror, and a 4x4 colour layout; `look()` caches it in the asset JSON as `look` (version 1). The existing `features` vector was not reused: its 4x4 grey layout was too coarse to tell a cropped copy from an unrelated picture of similar tone, and it has no mirror. `likeness()` = 0.4 histogram intersection + 0.35 grey-layout Pearson correlation (negative clipped to 0; the better of as-is and mirrored; two flat pictures count as alike) + 0.25 (1 minus mean RGB cell distance over the cube diagonal). Same asset scores 1.

Calibration (a scratch script, not shipped) on 32 pictures: scikit-image sample photographs (BSD) and painting references, each also brightened, darkened, cropped to 80 and 60 percent, mirrored, saved as JPEG at quality 30, shrunk, desaturated, more contrasty and greyscale. Unrelated pairs (495): median 0.38, 99th percentile 0.65, highest 0.68. Thresholds: close 0.82 (no false matches; finds mirrored, recompressed, shrunk and contrast copies, most brightness edits and 80 percent crops), related 0.7 (no false matches; also greyscale 84 percent and 60 percent crops 38 percent), loose 0.58 (4.6 percent of unrelated pairs, finds every variant). The real motorcycle left and right photographs score 0.95.

## v0.8.0 · Find by Color, Sort by Color

`core/color_find.py`: `asset_colors()` shrinks the whole original to 160 px, keeps pixels at least half opaque, quantizes to 8 colours (median cut, 2 k-means passes) and stores `[{hex, share}]` in the asset's JSON as `colors`, so each picture is worked out once. Whole picture on purpose: a crop or lasso changes what shows, not what the picture is, and caching per asset keeps a board of hundreds fast. `delta()` is CIEDE2000 (Sharma, Wu and Dalal 2005); plain Lab distance put pure red about 40 from a barn red, so no single tolerance worked for saturated colours. Checked against six of the published reference pairs to four decimals. `find_by_color()` scores a picture by the summed share of its colours within tolerance and keeps those at 0.03 or more, so a speck does not count; swatches compare their own colour. `color_order()` takes the most common colour with share of at least 0.08 and Lab chroma of at least 15 and returns its hue angle, else 360 plus the share-weighted darkness. `features.color_enrich()` writes `data.color_order` into a batch ahead of the sort only where it changed, so the sort and its data are one undo step and a relinked picture sorts by its new colours. Route `GET /boards/{id}/colors` runs in a worker thread; MCP `find_by_color` is read-only and calls it.

Verified on a board of eight generated pictures, a swatch and a note: #b42823 and #ff0000 found the red picture, the swatch and the half-red sunset (0.5); a 1 percent red patch on black did not count; #ff0000 at tolerance 10 found nothing; bad colour and tolerance 0 gave 422 with the message. The color sort placed red, orange, yellow, green, blue, violet, then grey and black, and one undo restored places and data.

## v0.7.7 · Adjustments in exports, selection to a new board

`apply_adjust()` in `core/exports.py` repeats the board's CSS arithmetic so exports match the screen: brightness multiplies, contrast scales about 127.5, saturation is the CSS `saturate()` matrix applied with `Image.convert("RGB", matrix)`, each step clamped, alpha kept. `image_source()` runs it after mask and crop and before flips and grayscale, so PNG, SVG, PDF and the phone viewer all carry it; the BeeRef export writes the original file and leaves adjustments behind, as BeeRef has no such setting.

`core/extract.py` gathers the selection plus column children (repeatedly, for nesting), copies them and the connections whose both ends are in the set onto a new board shifted to start at 80,80, with the source's background and labels but no window layout, through `store.open_import`. Moving refuses locked items and then removes the set from the source in one `remove`, which goes to the board Trash. Checked: copying two columns kept the child's parent and the connection and left the source at three items; unknown ids and an empty list were refused with their messages.

## v0.7.6 · Extract Palette

`core/palette.py`: `palette_colors()` takes the original with its lasso mask and crop (not the grayscale view), shrinks it to 240 px, keeps pixels at least half opaque, and quantizes with median cut refined by three k-means passes, so a colour is the average of its region rather than a box corner. Colours come back most common first with their share. `extract_palette()` adds them as one group of 140 px swatches in one `add` (one undo), starting 32 px below the picture and stepping down past anything already in that row. `POST /api/boards/{id}/items/{item}/palette?count=` and the MCP tool `extract_palette` (behind the outside-agent consent like every write). Checked: a picture of 50/30/20 percent flat red, blue and off-white came back exactly `#c82828` 0.5, `#1e3cb4` 0.3, `#f5f0e6` 0.2; cropped to its right half, blue 0.6 and white 0.4; two palettes in a row overlapped nothing; count 40 and a note were refused with their messages.

## v0.7.5 · agents sync

`./formref agents sync [--check]` (and `formref.bat`) runs `app.cli agents`, which reads `commands-catalogue.json` (written by `POST /api/commands/catalogue` whenever a window publishes its registry) from the data folder and writes `.claude/skills/formref-harness/references/commands.md`: one table per group, sorted by id, with default keys, a kind (changes the board, risky, window-only, or view) and the words plus parameters. Sorting and default keys keep the file stable, so it changes only when a command does; `--check` exits non-zero when the file differs. Without a catalogue it says to open the app first. Checked: `--check` failed on the missing file, sync wrote 174 commands, `--check` then passed; a personal override at publish time (Alt+H) did not leak into the file.

## v0.7.4 · Phone viewer

The phone and tablet wish was met without serving anything: the owner was asked whether to open FormRef to the home network and did not choose, so the offline page was built and network serving stays undecided. `core/viewer.py` wraps `svg_export()` in one HTML page. `svg_export()` now takes a `picture(image, item)` callback for each processed picture's href (default: full-size PNG, so SVG and PDF exports are unchanged); the viewer passes `_webp`, which shrinks each picture to twice its board size, at most 2048 px, as WebP quality 82 with alpha kept. The page script (inline, no libraries) keeps one transform on the board layer: one finger pans, two pinch about their midpoint, the wheel zooms at the pointer, a tap on a picture frames it (the picture is noted on pointerdown, because pointer capture sends later events to the stage), a double tap fits the board. Served as an attachment, so it never runs on the loopback origin.

Checked on an emulated 390 x 844 phone at 4x CPU: the board fitted under the header, a tap on a picture filled the width, a pinch tripled the size about the fingers, a drag panned, a double tap fitted again, and + zoomed by 1.5. A board whose SVG export is 5.1 MB came out at 150 KB; 120 small pictures at 60 KB.

## v0.7.3 · PDF text and readable notes in exports

`pdf_text()` in `core/pdf_pages.py` reads each page's text layer with pypdfium2 (whitespace collapsed, at most 2000 pages and 2 million characters) and caches it as `assets/text/<id>.json`; assets are content-addressed, so the cache never goes stale. `GET /api/assets/{id}/text` returns `{asset_id, pages}`, or 422 for a file that is not a PDF or an invalid ID. Checked on a two-page PDF printed from Chromium: both pages came back word for word, accents kept.

Export fix: `color()` handed `None` back because Pillow accepts `None` as "no colour", so SVG and PDF wrote note text with `fill="None"` (nothing drawn) and PNG drew its default light text on light notes. `color()` now accepts strings only, and `ink()` picks a card's own text colour or, as the board's `dark-note` rule does, `#3b3329` on paper with luminance of 110 or more and `#f5f5f5` below. `with_heading()` puts a note's or document's title above its text (a `#` heading for Markdown notes). Checked: the exported PDF's text layer now reads the note's title and body, and the PNG and PDF crops show dark ink on the yellow note.

## v0.7.2 · All pictures export

`images_export()` in `core/exports.py` walks image items with an asset in `reading_order()`, skips unresolved references and writes each asset once, uncompressed (`ZIP_STORED`, since pictures are already compressed), as `NNN title.ext` with the extension from the asset's MIME type. A board with no pictures is a 422 with a plain message. Checked: a board with four pictures, two of them the same file, gave three files whose SHA-256 equalled their asset IDs; a 120-picture board gave 120 files in order.

## v0.7.1 · BeeRef .bee boards

`core/beeref.py` writes and reads BeeRef's SQLite layout (application_id 2060242126, user_version 2, `items` plus `sqlar`). A BeeRef item maps a local pixel p to the scene as `pos + F(flip) * R(rotation) * scale * p`: Qt applies the item transform (the horizontal mirror) after rotation, so a mirrored item's stored rotation is the negative of FormRef's. FormRef's `flip_y` is written as a horizontal mirror plus a half turn. Export uses the original file, or a PNG when the image has a lasso mask, is SVG or has no known size; crop is written in source pixels and scale is the mean of the two axis scales. Import ranks z to whole numbers, turns the first line of a text item into the note heading and sizes the card so its body shows.

Checked with BeeRef 0.3.x and PyQt6 run outside the repository (GPL-3.0, never copied): BeeRef's own `SQLiteIO` loaded every exported item, and the crop corners it computed matched FormRef's at 0.000 px for plain, rotated, mirrored, flip_y with rotation, cropped, and cropped plus mirrored plus rotated images; a re-import matched at 0 px. `imports.py` routes files starting `SQLite format 3` to `import_bee`.

## v0.6.8 · PDF export and PDF pages

`pdf_export()` in `core/exports.py` reuses `svg_export()` so the PDF matches the SVG export exactly (original pixels, crops, flips, cards and connections). CairoSVG renders each page onto one shared cairocffi `PDFSurface`: a `PDFSurface` subclass overrides `_create_surface` to resize and return the shared surface, then `show_page()` ends the page. One page per item builds a board containing only that item (and what sits inside it), so neighbours never bleed onto its page; the page turns landscape when the item is wider than tall, and the view is centred with 36 pt margins. Tiles use the board at 1 px = 0.75 pt and stop at 400 pages; the single page shrinks only beyond PDF's 14400 pt limit. Video and audio cards print as cards.

`core/pdf_pages.py` renders pages with pypdfium2 (each page capped to the 64 megapixel image limit), imports them as ordinary PNG assets and adds image items in rows beside the PDF in one `add` command, so one Undo removes them. Items carry `pdf_page` and `pdf_source`.

## v0.6.7 · Image previews and the command line

`GET /api/assets/{id}/preview?edge=256|512|1024|2048` returns a Lanczos-resampled WebP (quality 88) cached as `assets/previews/{id}_{edge}.webp`, or the original response (same headers and ranges) for SVG, GIF, animated images, images already that small, other edges, and decode failures. Previews are derived data: deleting the folder only costs regeneration. A synthetic pattern of regular dots can be larger as WebP than as PNG; photographs are the usual case.

`app/cli.py` (standard library only) backs `./formref open` and `./formref import`. It talks to the running service over HTTP like the window does (no `X-FormRef-Client`, since it is the person at their own terminal), uploads files one by one through `/api/assets`, adds items in batches of 200, and writes the session so the window opens the board. The launchers pass the caller's directory in `FORMREF_CALLER_DIR` because they change into the repository first.

## v0.6.6 · Duplicate images

`GET /api/boards/{id}/duplicates?distance=4` returns groups of image item ids. `image_hash()` in `core/features.py` is a 64-bit difference hash of the original picture (9 by 8 grey, each pixel against its right neighbour), stored as hex `dhash` in the asset's JSON record beside `features`, so each picture is hashed once. Grouping compares each image with the first image of every existing group (identical asset ids or Hamming distance within `distance`), which is order-dependent for borderline pairs but linear in groups. Pictures that fail to decode are skipped.

## v0.6.2 · Chat and MCP over HTTP

- refers-to: `app/agent/chat.py` :: _run, send, adopt, publish; `app/routers/terminal.py` :: chat_events; `app/main.py` :: MCP_HTTP, lifespan; `app/mcp_server.py` :: client_token, run_commands
- kind: rationale
- logged: v0.6.2 · 2026-10-16

`chat.py` is formlit's `cmd_chat.py` with its event bus replaced by a set of asyncio queues fed through the terminal module's loop and streamed as server-sent events. The FastMCP server is mounted by inserting its routes at the front of the router (a Mount would answer at `/mcp/`), stateless with JSON responses, with `session_manager.run()` in the app lifespan. Tool calls over HTTP take the agent token from `x-formref-inapp` via `mcp.get_context().request_context.request`; stdio keeps `FORMREF_AGENT_TOKEN`. The dock's Claude Code and Chat therefore need no MCP process of their own.

## v0.6.1 · Command catalogue and the window bridge

- refers-to: `app/routers/commands.py` :: mirror, next_job, run, _need_window; `app/mcp_server.py` :: list_commands, describe_command, run_command
- kind: rationale
- logged: v0.6.1 · 2026-10-16

UI commands live in the window, so the backend keeps a mirrored catalogue and a job queue the window long-polls (25 s); a run waits up to 60 s for the window's answer. No poll for 35 s means no window, and calls get 409 instead of hanging. Window-only entries are refused to any request carrying `X-FormRef-Client`; risky entries go through `agents.confirm` only when a panel turn owns the token, otherwise they are refused, because `confirm` lets a request through when no panel queue exists. The middleware's outside-agent gate applies first, as for every write.

## v0.6.0 · Terminal sessions and the Claude Code tab

- refers-to: `app/agent/terminal.py` :: Session, open_session, restart, _pump; `app/agent/claude_code.py` :: cli, workdir, argv, open_tab, INAPP_TOKEN; `app/routers/terminal.py` :: attach, _window_only
- kind: rationale
- logged: v0.6.0 · 2026-10-16

Ported from formlit 0.45.3 (same owner, Apache-2.0). formlit attaches its Claude Code tab to an HTTP MCP endpoint; FormRef keeps its stdio SDK server and passes a per-process in-app token as `FORMREF_AGENT_TOKEN`, added to `agents.tokens` at import, so `agents.allows` passes it while the confirm path finds no panel turn and lets the person's own session act directly. The token exists only in the argv of processes the backend starts. The HTTP middleware does not run for WebSocket scopes, so `attach` checks Origin and Host itself; every REST route refuses `X-FormRef-Client`. `claude_bin`, `claude_folder`, `claude_first_message` and `outside_agents` cannot be written by a request carrying that header, since `claude_bin` names a program the backend runs. The sentinel `{"type": "exit"}` (with the space) must match the client byte for byte.

## v0.3.4 · Live consent prompt and iStack import check

- refers-to: `app/main.py` :: local_access refusal counter; `app/routers/boards.py` :: events stream `consent`; `app/core/imports.py` :: import_istack
- kind: rationale
- logged: v0.3.4 · 2026-10-11

FormVis asks the person when an outside agent first tries to edit. FormRef cannot hold an MCP call open waiting for a click, so the refusal stands and the open board's event stream emits `consent`; the page offers Allow or Not now, and the agent's next attempt succeeds once allowed. Run live: a refused rename, the dialog, Allow, and the same rename accepted.

The iStack importer was checked against iStack's own save routine in the owner's bundle (`At()`: `format`, `version` 1.1, `canvasRect`, `drawings`, `items` with `flipH`, `flipV`, `nearestNeighbor`, `cropRect`, `_imageData`, `_sourcePath`, `groupId`). A board in that format with two images (one embedded, one path-only), a note, a freehand stroke, a rectangle and an eraser stroke imported with rotation, opacity, flips, grayscale, sampling, lock and group intact; the path-only image arrived unresolved and relinkable; the eraser stroke, which in iStack subtracts raster pixels, is listed as unsupported in the import report instead of being dropped silently. `cropRect` units are taken as display pixels of the item; the bundle does not show them unambiguously, so crop on imported boards is unverified.

## v0.5.3 · Opt-in cloud storage from FormCut

- refers-to: `app/core/cloud.py` :: start, google_callback, dropbox_code, listing, download, upload, _google_folder; `app/routers/cloud.py` :: from_agent, save_board, open_file
- kind: rationale
- logged: v0.5.3 · 2026-10-11

FormCut's cloud module ported with its flows unchanged: Google's desktop PKCE flow with a redirect to this service on 127.0.0.1 and `drive.file` by default (`drive.readonly` opt-in), Dropbox's PKCE paste-code flow with no secret, tokens refreshed in the service and written with mode 0600 through the store's atomic write. FormRef has no jobs queue, so transfers run in a thread per request and are capped at the 64 MiB upload limit (one Dropbox upload call suffices). What moves is FormRef's: a board through the registered exporters (portable archive, PNG, SVG, Markdown, JSON) into a `formref` folder, and a file back through the project importer or `import_asset` plus a free spot (the clipper's placement). Two departures from FormCut: the routes refuse any request with `X-FormRef-Client`, because a connected account must not let an agent send boards off the computer, and `_google_folder` looks for an existing `formref` folder before making one, because after a reconnect the remembered id is gone and a second folder appeared in the run. A Google folder id is checked to be an id before it enters the query. Run against a local stand-in for both services that checks PKCE: sign-in, replayed callback refused, token file 0600 and never in responses, saves, listing, open as board and onto a board, Dropbox paste code, wrong code refused, an expired token refreshed, agent requests refused, disconnect.

## v0.5.3 · Background models from FormCut

- refers-to: `app/core/models.py` :: MODELS, PINNED, start_download, import_file; `app/core/segment.py` :: matte, shaped; `app/core/cutout.py` :: _model_cutout, _prompts; `app/bundled_models/u2netp.onnx`
- kind: rationale
- logged: v0.5.3 · 2026-10-11

The owner asked for FormCut's models. The registry, sources and SHA-256 pins are FormCut's; so is the inference (U2Net 320 square with ImageNet statistics, IS-Net 1024 square scaled to its maximum minus a half, FormCut's Auto rule of person when it keeps one percent of the frame at half threshold, else object, and its threshold and feather shaping). FormRef had no OpenCV, so resizing is Pillow and the arithmetic numpy; onnxruntime and numpy are the only new dependencies. SAM 2.1 is the owner's choice: FormCut runs SAM 2 Tiny for clicks and SAM 2.1 only for video, so FormRef prompts SAM 2.1's own image encoder and mask decoder from the square-zero-labs export (as FormCut's tracker decodes its seed frame) and fetches three of its six files. Points come in the image as shown, like sampling, and are mapped through crop and flip here. Downloads run in a thread with progress in `GET /api/models`; a file that misses its pin is deleted. `import` takes a file the person already has, for machines that cannot reach the hosts. Run here: U2Net small (bundled) cut astronaut, cat, coffee and horse in 0.4 to 0.7 s; Person cutout and IS-Net downloaded from GitHub and matched their pins; all four methods cut the four real photos the model-free method refuses; SAM 2.1 could not be fetched (Hugging Face blocked in this workspace), so its path was exercised only up to the refusal and the pin check on import.

## v0.4.10 · Browser clipper routes

- refers-to: `app/core/clipper.py` :: token, paired, clip, free_spot; `app/routers/clip.py`; `app/main.py` :: local_access origin rule and CORS
- kind: rationale
- logged: v0.4.10 · 2026-10-11

The service refused every non-loopback origin, which also refused the extension. The rule now admits `chrome-extension://` and `moz-extension://` origins on exactly `/api/clip` and `/api/clip/boards`, and those routes demand the pairing token (`X-FormRef-Clip-Token`, compared in constant time) from `clipper.json` in the data folder. The token routes stay behind the original rule, so only FormRef's own page can read or reset it; a web page is refused by origin before any token is looked at, and DNS rebinding is still stopped by the loopback Host check. Image clips reuse `capture` (public addresses, checked redirects) or accept a base64 `data:` image the browser downloaded itself. A clip lands on the chosen board, else the session's active board, else the first board, else a new Clippings board, in the first free slot spiralling out from the centre of the last saved view. Run: token from no origin and from FormRef's page, refused from extension and web origins; clip without or with a wrong token 401, from a web origin with the right token 403, from the extension 201; the extension origin refused on `/api/boards` and the token reset; CORS preflight allowed for the extension and refused for the web; seven malformed clips refused with reasons; reset made the old token fail.

## v0.4.9 · Background removal

- refers-to: `app/core/cutout.py` :: cut_out, change_background; `app/routers/boards.py` :: background; `app/core/exports.py` :: portable_export; `app/mcp_server.py` :: remove_background
- kind: rationale
- logged: v0.4.9 · 2026-10-11

No model is bundled: the owner has not chosen one, and Pillow alone (no numpy) can do the honest part. The background is the up to four colours that cover the image border; pixels within the tolerance of one of them and connected to the border (a breadth-first fill at 512 px) become transparent, with a full-resolution ramp for soft edges, multiplied into any existing alpha. Two guards refuse instead of guessing: a busy background (median edge strength inside the region above 8) and a subject that does not stand out (median colour distance just outside the region less than tolerance plus 24). Measured on real photos: plain-background images stopped at 108 to 189, while photos whose subject shades into its surroundings leaked and stopped at 35 to 40. The item's `asset_id` points at a new PNG and `data.cutout` keeps `original` and `tolerance`, so export, sampling and crop all use what is seen; re-running starts from the original, Restore swaps it back, and the portable archive carries the original too. A multi-image request skips unsuitable images and reports them in `skipped`. Run: product, gradient, horse and logo cut cleanly; astronaut, cat, coffee, rocket, grass and noise refused; restore, undo, lock, animated GIF and portable export checked; the MCP tool refused while outside agents were off and worked once they were allowed.

## v0.4.6 · Document export

`core/doc_export.py` exports one note or document. It reuses `reference_text.parse_text` and `layout_text`, so headings, lists, bold, italics and links match the board. Word output is a minimal WordprocessingML package written by hand (title, heading and list styles, external hyperlinks) and PDF is drawn with cairocffi, which CairoSVG already installs, with real text, document metadata and link annotations; no dependency was added. Run: a long Markdown document exported to all four; the PDF read back with pdftotext as 5 A4 pages with title metadata; the .docx parsed as XML, opened in LibreOffice and converted to PDF with headings, lists, bold, italics and a working link; the browser download names were Brief.pdf and Brief.docx.

## v0.4.5 · Media assets, byte ranges, table exports

A file only becomes `video/*` or `audio/*` when `media_signature` finds the matching container bytes (ftyp, EBML, OggS, ID3 or MPEG sync, RIFF WAVE, fLaC); otherwise it stays a download, so a renamed file is never handed to a player. Media assets are served inline with `Accept-Ranges` and single-range 206 answers (416 for an impossible range) so cards can seek. Markdown export writes table cards as Markdown tables with formulas as written; PNG and SVG draw the cells as text. MCP gains `create_table` (32 tools). Run: mp4, webm, mp3 and wav kept their types and a fake mp4 became a download; a 0-99 range returned 206 with Content-Range; an out-of-range request returned 416; the Markdown and PNG exports of a table board succeeded; `create_table` stored a formula and an unknown type was refused.

## v0.4.4 · Capture pinned to the checked address

`capture.pinned` resolves each hop once, refuses it if any answer is not global, and connects to that address with the original `Host` header and, for https, the original TLS server name through httpx's `sni_hostname` extension, so certificate checks still name the real host. That closes the DNS rebinding gap noted in v0.4.3. The client no longer reads proxy settings, because a proxy would resolve the name again. Run: a pinned page fetch and an image capture through the service against the local test site; refusals unchanged. An https fetch through the pin could not be run here (no public network, and a local TLS site would need its own trusted certificate), so the https path rests on httpx's documented extension.

## v0.4.3 · Web capture and labels

`core/capture.py` fetches on the person's behalf, so it is a server-side request on a local machine: http and https only, no credentials, and every hop (redirects are followed by hand, at most 5) must resolve to a global address, refusing loopback, private, link-local and reserved ranges. The remaining gap is DNS rebinding between the check and the connection; closing it means pinning the resolved address in the transport, recorded as future work. Images go through the existing asset import (SVG safety, 64 MiB cap); pages are parsed with the standard HTML parser for img, srcset (largest), og:image and image_src, at most 60. `FORMREF_CAPTURE_ALLOW_PRIVATE=1` exists only so the capture can be tested against a local site. MCP gains `capture_from_web`, `define_labels` and `label_items` (31 tools).

Run on 2026-10-11: loopback, 10/8, 169.254.169.254, localhost, ftp and credentialed addresses were refused; with the test flag against a local site, a page returned its og:image, img and srcset images, an image became an asset, a 404 returned 422 and a text file became a file asset. Public sites could not be reached from the build workspace (DNS refused, proxy 403), so a capture from the public web is untested here. Over MCP: capture placed an image with its source address, a page listed 4 images, labels were defined and applied, and an undefined label was refused.

## v0.4.2 · Comments and templates

Comment routes read the item under the store lock and write one `update` of `data.comments` with `expected_revision`, so a concurrent edit returns 409 instead of losing a comment. The engine merges data one level deep, so an emptied thread is written as `[]`; popping the key left the old list in place, which the first probe caught. Built-in templates are code in `core/templates.py` (moodboard, character sheet, storyboard, project plan); saved templates copy items, links, background and settings to `templates/[id].json`, and every use gets fresh item, group and link ids, with comments dropped. MCP gains `add_comment`, `resolve_comment`, `list_templates` and `create_board_from_template` (28 tools).

Run on 2026-10-11: all four built-ins created boards (5, 12, 12 and 6 items); a comment was added, resolved, reopened by undo and deleted; a blank comment returned 422; a saved template produced a board with new ids; deleting a built-in returned 422. Over MCP: list_templates, create_board_from_template, add_comment (signed Agent) and resolve_comment.

## v0.4.1 · Trash and shortcut preferences

Board delete now moves the record to `trash/boards/`. Removed items are captured in `store.mutate` by diffing the stored board with the new state whenever the command contains `remove`, so the UI, REST and every MCP client feed the same trash without a new engine command; restoring is one `batch` (add, connect) and therefore one undo step. Diffing was chosen over a Rust-side trash because the engine has no durable storage and its undo history is per session. `/api/preferences` stores only shortcut overrides, validated by pattern. MCP gains `list_trash` and `restore_from_trash` (24 tools).

Run on 2026-10-11: removing two connected notes left two items and no connection, the trash listed both names, restore brought back four items and the connection at a new revision, a second restore returned 404, undo removed them again; a deleted board vanished from the list, 404'd, restored with its items, and purge left an empty trash; an invalid shortcut returned 422. Over MCP: remove, list_trash, restore_from_trash round-tripped one note.

## v0.4.0 · Confirmation before big agent changes, board image

`main.py` holds a write from a panel turn when `Agents.review` names it risky (remove, board delete, or a move-type command over 10 ids) and waits on `Agents.confirm`. The turn generator now drains a queue fed by a pump task so the middleware can inject `confirm` events mid-stream; cleanup runs in `finally` without yielding, so a closed client no longer trips "async generator ignored GeneratorExit". The MCP client's write timeout rose to 330 s to outlast the five-minute wait. `get_board_image` renders the PNG export, shrinks it to `max_edge` and returns it as MCP image content plus the world rectangle, from new `X-FormRef-Left` and `X-FormRef-Top` headers.

Run on 2026-10-11 with real Claude Code turns: a removal was declined and the agent reported nothing changed and did not retry (12 items, revision 1 unchanged); a 12-item pack was allowed, then the agent called `get_board_image` and described the 4 by 3 grid it saw. In a throttled browser a removal showed the Confirm card, Allow let it through, and the board went from 12 to 11 items.

## v0.3.2 · Embedded agent service, consent gate, similarity features, session

- refers-to: `app/agent/service.py` :: Agents; `app/agent/runners.py` :: CLI, argv, parse; `app/routers/agent.py`; `app/main.py` :: local_access consent check; `app/mcp_server.py` :: CLIENT_TOKEN, adjust_items; `app/core/features.py`
- kind: rationale
- logged: v0.3.2 · 2026-10-11

One tool registry: the in-app agent never gets its own tool list. CLI runners (Claude Code, Codex, Cursor) reach the same official-SDK MCP server an outside client uses; the Ollama runner loads that FastMCP instance in-process and uses its `list_tools` and `call_tool`, so schemas and behaviour cannot drift. The MCP child for Claude Code is started with this backend's own interpreter (`sys.executable -m app.mcp_server`, `PYTHONPATH=backend`), because the `./formref mcp` launcher assumes `backend/venv` and a mismatch made the first live turn run with no tools.

Consent follows FormVis: a mutating request carrying `X-FormRef-Client` is refused with `outside_agents_off` unless the client is a live per-turn token, a CLI turn started from FormRef is running (Codex and Cursor start MCP from their own config, which may not pass the token on), or `outside_agents` is on in `agent.json`. Requests from the FormRef page carry no header and are unaffected. Off is the default, as in FormVis; the Phase 6 panel adds the switch.

Undo This Turn compares items, connections, settings, title and background with a snapshot taken when the turn started and steps the engine's undo until they match (at most 100 steps), so it works the same whichever runner made the changes. CLI flags were taken from the vendors' pages on 2026-10-11: Claude Code CLI reference (`-p`, `--output-format stream-json --verbose`, `--mcp-config`, `--strict-mcp-config`, `--tools ""`, `--allowedTools`, `--append-system-prompt`), Cursor headless and MCP pages (`agent -p`, `--output-format stream-json`, `--approve-mcps`), Codex non-interactive and MCP pages (`codex exec --json`; project `.codex/config.toml` only for trusted folders). Codex and Cursor event parsing is defensive because their item shapes were only partly documented and neither CLI was installed here.

Similarity features are an 80-number vector per image (4x4x4 RGB histogram plus a 4x4 grey layout) computed once from the original pixels and cached in the asset metadata. A `sort` by similarity is rewritten into one batch that writes missing features and then sorts, so it stays one undo step.

Run on 2026-10-11 against a live backend: runner detection (Claude Code found, Codex and Cursor not installed, Ollama not running), session filtering of unknown boards, similarity sort of red, blue and crimson images (red, crimson, blue) and a single undo restoring layout and removing features, a REST and an MCP mutation refused while outside agents were off and accepted after allowing, 21 tools over the official SDK client at protocol 2025-11-25, a real Claude Code turn that called `get_board` and `arrange_items` and packed the board, Undo This Turn restoring the pre-turn board exactly, and a Codex turn failing cleanly with its install note.

## v0.3.0 · Original pixel sampling and formatted references

`app/core/media.py` is the shared bounded original-image decoder for exports and sampling. It reads registered bytes only, checks the existing 64-megapixel limit and selects frame zero. Safe SVG uses the existing defusedxml check, unsafe-disabled CairoSVG and fetch-denying boundary. `app/core/sampling.py` maps normalized painted-image coordinates through the same floor/ceil crop rectangle and flips used by exports. Rotation/camera inversion belongs to the caller. Sampling returns original unpremultiplied RGBA/RGB, exact HSV degrees/percent/percent, uppercase HEX, source x/y, asset ID and unchanged board revision; item opacity and both grayscale settings are excluded.

`app/core/reference_text.py` defines the shared nonrecursive safe Markdown grammar used by formatted card exports: source-line paragraphs, h1-h3, unordered/numbered lists, strong/emphasis and absolute HTTP(S) links. Link labels exclude both brackets so unmatched nested openers cannot trigger repeated suffix scans. Raw HTML and unsupported links remain literal. Preview parsing stops after 4096 source lines and rendering stops at card geometry; full UTF-8 source remains in native JSON/portable and Markdown exports. Downloaded Markdown escapes HTML and unsafe links, preserves supported syntax and disables embedded-image syntax. PNG uses installed fonts, whose CJK glyph coverage is limited on this host; Unicode source survives unchanged. This is a supported subset rather than full CommonMark.

PNG and SVG render the supported heading sizes, bold/italic runs, list prefixes and underlined safe link labels. SVG links use only safe HTTP(S) destinations and all supplied text is XML-escaped. Swatches keep canonical color in Rust and derive display values, including alpha, without duplicate mutable color state. Exports include the color patch, name, HEX, RGB and HSV. Rounded HSV labels fit the default 180 by 150 swatch; raw sampled HSV retains full numeric precision.

The optional command-envelope `expected_revision` is a strict nonnegative integer. The store's existing lock covers revision comparison, Rust mutation and atomic persistence. A mismatch returns HTTP 409 with code `revision_conflict`; disk, revision and session history remain intact. Callers omitting the field retain the existing behavior. MCP `set_formatted_text` reads the item, preserves unrelated data fields and submits this guard, avoiding a stale merge. Frontend source drafts use the same guard.

Actual `./formref mcp` discovery returned 20 tools under protocol `2025-11-25`, including `sample_image`, `create_swatch`, `create_document` and `set_formatted_text`. Source RGB and alpha 128/0, cropped/flipped edges, SVG `#123456` and GIF frame zero passed. Sampling and explicit failures left state/history unchanged. Swatch edit/undo/redo and formatted-note undo retained prior data. All eight items and a 58,489-byte Unicode document round-tripped through portable and JSON imports; a new service reopened revision 11 with identical content and reset session history. Boolean, string and float guards returned 422; a stale integer returned 409 with equal disk bytes and state/history.

PNG exports were visually inspected for three heading sizes, lists, strong/emphasis, underlined links, literal HTML and complete swatch value rows. SVG inspection found styled text, safe links, literal HTML and zero script elements. The complete source and original registered image bytes were retained. The matching planning sidecar contains `COLOR_NOTE_SERVICE_EVIDENCE_v0.3.0.json`, including actual tool schemas, sample readbacks, hashes, restart and display observations. Python compilation passed; no dependencies, test files or source generators were added.

## v0.2.0 · Canvas settings and snapping through MCP

`configure_canvas` sends only supplied grid visibility, grid size, snap enablement and grayscale preview values through the shared Rust `settings` command. `snap_items` sends actual item IDs through the engine's `snap` command, with an optional grid override. Grid size is finite and within 4 to 512 world units. The engine determines grouped/parent snapping units and rejects the full operation when locked content would move; Python contains no second geometry implementation.

The store writes and reopens the complete engine board, and native portable and JSON snapshots carry that complete board unchanged. Typed canvas settings therefore use the existing persistence path. Canvas grayscale is a reversible view setting: original registered assets and PNG/SVG/Markdown export content remain unchanged. The existing arrangement tool now documents explicit distribute spacing as an accepted option.

Actual official SDK discovery through `./formref mcp` returned 16 tools under protocol `2025-11-25`. Settings mutation readback preserved omitted values; changing grid visibility at revision 8 and undoing at revision 9 restored the prior settings. Snap moved `(13,37)` to `(0,32)` on a 32-unit grid and undo restored it. Selecting one group member moved the complete group while preserving its `(25,25)` offset. Locked-content snapping and invalid grid settings returned true tool errors with unchanged documents/revisions. Explicit distribute gap 14 produced x positions 0, 34 and 68.

Native portable and JSON roundtrips preserved all five items, settings and geometry. A new API/MCP process reopened revision 7 with identical settings and geometry; undo history correctly reset for the new session. Enabling canvas grayscale left the PNG hash and original image bytes unchanged. Exact live tool schemas, revisions and SHA-256 observations are in the matching sidecar's `CANVAS_SERVICE_EVIDENCE.json`. Python compilation passed; no test files or additional dependencies were authored.

## v0.1.0 · Local board service and SDK MCP

The backend controls storage and export while the decoupled Rust process controls document validation, geometry and history. One persistent JSON-lines process is shared by all API requests, protected by serialized access. A restarted engine reopens saved documents; history is service-session state and is deliberately not fabricated after a restart. Failed disk persistence restores the last durable document before surfacing the original storage error.

| Module | Responsibility |
| --- | --- |
| `app/main.py` | FastAPI service, loopback client/Host/Origin checks, explicit errors, capabilities and production frontend serving |
| `app/core/config.py` | Product version, operator-controlled data path, engine binary and memory/size limits |
| `app/core/engine.py` | Persistent Rust subprocess, strict response IDs, serialized protocol and shutdown |
| `app/core/store.py` | Atomic board and asset writes, board copy/delete, SHA-256 asset deduplication, safe image registration |
| `app/core/imports.py` | Portable archive integrity checks and independently authored iStack data migration |
| `app/core/exports.py` | Real PNG/SVG composition, portable archives, JSON snapshots and standalone Markdown |
| `app/core/extensions.py` | Explicit importer/exporter/capability registration seam |
| `app/routers/boards.py` | Board actions, uploads, missing-reference relinking, download routes and SSE revisions |
| `app/models/requests.py` | Typed board creation and command envelopes |
| `app/mcp_server.py` | Official Python SDK stdio tools/resources/prompt using the same live loopback API |
| `oc_install`, `oc_install.bat` | Isolated dependency installation with macOS unpinned membership parity |
| `boot_backend`, `boot_backend.bat` | Loopback FastAPI development startup |

Uploaded names never determine a filesystem location. Assets use SHA-256 identifiers; archive assets are read by exact manifest identifiers and are never extracted. A location-only iStack file records its missing source path and renders an explicit placeholder until the user relinks it. Blob URLs do not count as portable data. Imported unsupported iStack records remain in `import_report` and in subsequent portable exports.

Images retain original bytes. PNG composition crops source pixels, applies flips and grayscale, scales with the chosen sampling mode, rotates around the item center and composites opacity. Drawings use item-local points. SVG composition embeds prepared image data and preserves vector board drawings/text. PNG output uses scale 1 when within 8192 pixels per edge and 32 megapixels; larger boards are uniformly scaled and expose the actual scale in `X-FormRef-Scale`. Animated images export their first frame. Native archives preserve their original animation bytes.

Exports use the frontend's cubic connector geometry: both control points share the endpoint midpoint x, with their respective endpoint y values. Connector labels use the midpoint baseline minus 8 world units. Empty or missing stroke points produce blank drawings; line shapes use only their first and last source points. Manual PNG/SVG observations confirmed a red cubic-quarter pixel where the former diagonal was absent, zero SVG polylines for two empty strokes, a three-point line rendered solely between its endpoints, and the label baseline at y=142 for endpoints centered at y=50 and y=250. Python compilation passed after these targeted corrections.

SVG ingestion uses defusedxml and rejects entities, declarations, active elements, event attributes, external href/src, XML base, CSS escapes and every nonlocal URL reference. CairoSVG receives bytes only, with `unsafe=False` and a URL fetcher that rejects retrieval. This module is installed independently as a server dependency, not vendored or folded into proprietary code. Its LGPL-3.0-or-later license was checked in [upstream metadata](https://github.com/Kozea/CairoSVG/blob/main/setup.cfg). CairoSVG is imported only when rasterizing an SVG asset. A missing system libCairo returns an actionable export error while PNG/JPEG and other Pillow-based workflows remain available; macOS requires `brew install cairo`, and Windows requires a compatible libCairo runtime.

The MCP process auto-starts the same API only when absent, and terminates only the child it owns. Logs go to stderr, leaving stdio protocol output clean. `FORMREF_API_URL` accepts only a loopback HTTP origin. `import_asset` accepts bounded base64 or a file beneath operator-configured `FORMREF_MCP_IMPORT_DIR`; it never reads an arbitrary client path. Tool calls preserve actual HTTP errors. A missing board yields an MCP error, not a success record.

The macOS dependency file keeps bare package names except `mcp<2`. This narrow compatibility bound preserves the v1 FastMCP API used by the build, following the SDK's [v1 documentation](https://py.sdk.modelcontextprotocol.io/v1/). `app/core/builtins.py` registers the real project importer and all five export handlers. HTTP routes dispatch through that registry, and capabilities derive their export list from registration.

Observed manual verification: Python compilation; real Rust-backed HTTP create/add and all five exports; iStack import including a missing DAM source, normalized crop/flip/half-opacity, editable drawing and note; portable roundtrip; multipart relink; SVG raster composition; script/external SVG rejection and external-Origin rejection. An official SDK client negotiated protocol `2025-11-25`, listed 14 tools, read both resource forms, fetched the organization prompt, mutated a persisted board, generated PNG and received a true missing-board tool error. No test files or test scripts were authored. Shell installers/boot scripts passed syntax checking; Windows and macOS execution is not claimed.

## boot_backend.bat

### boot_backend.bat · interpreter selection

- refers-to: boot_backend.bat :: PYTHON_BIN and uvicorn launch
- kind: rationale
- logged: v0.1.0 · 2026-10-10

The default Python executable is an absolute path to this backend's venv. FORMREF_PYTHON overrides it, matching the Unix launcher. A missing executable produces an installation instruction. Invoking the venv interpreter directly makes activation unnecessary. Every selected executable path is quoted. Windows execution remains unverified because this host has no cmd or PowerShell runtime.
