# Backend hashout log

## Navigation

- [FormRef root](../README.md)
- [Subsystem contract](../.docs/wiki/Engine-Contract.md)
- [Architecture](../.docs/wiki/Architecture.md)

## Contents

- [v0.3.2 · Embedded agent service, consent gate, similarity features, session](#v032--embedded-agent-service-consent-gate-similarity-features-session)
- [v0.3.0 · Original pixel sampling and formatted references](#v030--original-pixel-sampling-and-formatted-references)
- [v0.2.0 · Canvas settings and snapping through MCP](#v020--canvas-settings-and-snapping-through-mcp)
- [v0.1.0 · Local board service and SDK MCP](#v010--local-board-service-and-sdk-mcp)
- [boot_backend.bat](#boot_backendbat)

## v0.3.4 · Live consent prompt and iStack import check

- refers-to: `app/main.py` :: local_access refusal counter; `app/routers/boards.py` :: events stream `consent`; `app/core/imports.py` :: import_istack
- kind: rationale
- logged: v0.3.4 · 2026-10-11

FormVis asks the person when an outside agent first tries to edit. FormRef cannot hold an MCP call open waiting for a click, so the refusal stands and the open board's event stream emits `consent`; the page offers Allow or Not now, and the agent's next attempt succeeds once allowed. Run live: a refused rename, the dialog, Allow, and the same rename accepted.

The iStack importer was checked against iStack's own save routine in the owner's bundle (`At()`: `format`, `version` 1.1, `canvasRect`, `drawings`, `items` with `flipH`, `flipV`, `nearestNeighbor`, `cropRect`, `_imageData`, `_sourcePath`, `groupId`). A board in that format with two images (one embedded, one path-only), a note, a freehand stroke, a rectangle and an eraser stroke imported with rotation, opacity, flips, grayscale, sampling, lock and group intact; the path-only image arrived unresolved and relinkable; the eraser stroke, which in iStack subtracts raster pixels, is listed as unsupported in the import report instead of being dropped silently. `cropRect` units are taken as display pixels of the item; the bundle does not show them unambiguously, so crop on imported boards is unverified.

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
