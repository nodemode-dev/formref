# FormRef notices, licenses and provenance

Version: v0.3.1 · Reviewed: 2026-10-11

FormRef's original source and vector artwork are Apache-2.0. The repository's full license is `LICENSE`. New commits use `nodemode-ai <mackin@nodemode.ai>`.

## Reference provenance

| Input | Use | Boundary |
|---|---|---|
| User-supplied FormVis v1.66.1 | Form family layout, theme values, scripting and documentation conventions | Read-only reference; no FormVis git history transplanted |
| User-supplied iStack | Owned format interoperability, persistence and collection workflows | Independent Rust/TypeScript implementation; compiled iStack bundle not shipped |
| User-supplied FormCut v2.8.8 (Apache-2.0, the same owner) | Background model registry, SHA-256 pins, U2Net, IS-Net and SAM 2.1 inference, and the Google Drive and Dropbox sign-in and transfer flows | Ported by hand into `backend/app/core/models.py`, `segment.py` and `cloud.py`, rewritten for Pillow instead of OpenCV; no FormCut git history transplanted |

## Model weights

| File | Source | License | Shipped |
|---|---|---|---|
| `u2netp.onnx` (U2Net small, Qin et al.) | rembg release v0.0.0 (MIT redistribution of the Apache-2.0 weights), copied from FormCut's bundle | Apache-2.0 | Yes, `backend/app/bundled_models/`, 4.6 MB |
| `u2net_human_seg.onnx`, `isnet-general-use.onnx` | rembg release v0.0.0 | Apache-2.0 | No, downloaded on request and checked against its SHA-256 |
| SAM 2.1 Hiera Tiny image encoder, mask decoder and constants (Meta) | square-zero-labs/sam2.1-tiny-video-onnx on Hugging Face | Apache-2.0 | No, downloaded on request and checked against its SHA-256 |
| PureRef official handbook | Feature requirements | No source or proprietary assets included |
| BeeRef official documentation/release notes | Feature requirements | No BeeRef code copied or shipped |
| BeeRef 0.3.x (GPL-3.0) `.bee` file format | Format interoperability: `backend/app/core/beeref.py` reads and writes the documented SQLite layout | Independent implementation. To get rotation and mirroring right, BeeRef's item loading and flip routines (`update_from_data`, `do_flip`) were read for their behaviour and BeeRef was run outside the repository to load FormRef's exported files; no BeeRef code is copied, linked or shipped. This departs from the project rule to read BeeRef's documentation only and was disclosed to the owner in the v0.7.5 hand-back |
| Milanote official help center | Feature requirements | No product assets or proprietary implementation included |

## Direct dependencies

| Dependency | Pinned version | License | Use |
|---|---|---|---|
| serde | 1.0.229 core / 1.0.228 shell | MIT OR Apache-2.0 | Rust serialization |
| serde_json | 1.0.152 | MIT OR Apache-2.0 | Rust command protocol |
| TypeScript | 7.0.2 | Apache-2.0 | Build-time compiler |
| Vite | 8.3.4 | MIT | Build-time/dev server |
| pytest | 9.1.1 | MIT | Test suite in `backend/tests` and CI only (`backend/requirements-test.txt`), never shipped |
| Playwright (Python) | 1.63.0 | Apache-2.0 | Window smoke in `frontend/tests/window` and CI only, never installed in the app |
| Tauri | 2.12.3 | MIT OR Apache-2.0 | Optional desktop development shell; the `tray-icon` and `image-png` features (v0.7.2) add image 0.25.10 (MIT OR Apache-2.0), moxcms and pxfm (BSD-3-Clause OR Apache-2.0) and byteorder-lite (Unlicense OR MIT). On Linux the tray uses the system's libayatana-appindicator, loaded at run time and not shipped |
| tauri-build | 2.7.2 | MIT OR Apache-2.0 | Build-time desktop generation |
| Tauri CLI | 2.12.1 | MIT OR Apache-2.0 | Build-time desktop CLI |
| FastAPI | 0.143.0 | MIT | Local server |
| Uvicorn | 0.54.0 | BSD-3-Clause | Local ASGI server |
| python-multipart | 0.0.32 | Apache-2.0 | Local file ingestion |
| httpx | 0.28.1 | BSD-3-Clause | Local MCP/API client |
| mcp | 1.30.0 | MIT | Official v1 SDK, actual stdio transport |
| Pillow | 12.3.0 | MIT-CMU and bundled library notices | Local media processing |
| resvg-py | 0.5.0 | MIT; bundled resvg and usvg 0.48.1 Apache-2.0 OR MIT, tiny-skia 0.12.0 BSD-3-Clause, other compiled Rust crates MIT, Apache-2.0, BSD-2-Clause, Zlib or Unlicense OR MIT (listed in the wheel's CycloneDX SBOM) | Server-side rasterization of SVG pictures for exports and colour sampling; no system library |
| defusedxml | 0.7.1 | PSF-2.0 | Safe XML parsing |
| onnxruntime | 1.31.0 | MIT | Background model inference |
| numpy | 2.5.4 | BSD-3-Clause | Background model tensors |
| websockets | 15.0.1 | BSD-3-Clause | Uvicorn WebSocket support for the terminal dock |
| pypdfium2 | 5.14.0 | Apache-2.0 or BSD-3-Clause; bundled PDFium BSD-3-Clause | Server-side rendering of PDF pages into image references, and drawing the PDF exports (board and single document) |
| fontTools | 4.68.0 | MIT | Subsets the system fonts embedded in PDF exports; its wheel ships no font files |
| ptyprocess | 0.7.0 | ISC | Terminal dock pseudo-terminals on macOS and Linux |
| pywinpty | 3.0.5 | MIT | Terminal dock pseudo-terminals on Windows (ConPTY) |
| @xterm/xterm | 6.0.0 | MIT | Terminal dock rendering in the window |
| @xterm/addon-fit | 0.11.0 | MIT | Terminal dock sizing |
| polygon-clipping | 0.15.7 | MIT | Pathfinder shape modes |
| splaytree | 3.2.3 | MIT | polygon-clipping dependency |
| robust-predicates | 3.0.3 | Unlicense | polygon-clipping dependency |

The terminal dock and the Claude Code tab (`backend/app/agent/terminal.py`, `backend/app/agent/claude_code.py`, `backend/app/routers/terminal.py`, `frontend/src/ui/terminal-dock.ts`) are adapted from formlit 0.45.3, Apache-2.0, by nodemode-ai, the same owner as FormRef. So are the dock's Chat (`backend/app/agent/chat.py`, `frontend/src/ui/chat-pane.ts`) and `frontend/src/ui/chat-markdown.ts`, which is formlit's Markdown streamer unchanged. The interface translator follows formvis 1.72.8's design (same owner); the 25 translation tables were written for FormRef.

resvg-py, pypdfium2 and fontTools are installed as ordinary Python packages in the server environment, unmodified, and the desktop engine carries them unmodified; none needs a library installed on the person's computer. Pillow's wheel license also contains codec/native-library notices. Native shell compilation and distribution are not claimed by this source release; platform runtime libraries are not bundled.

The editor uses system fonts and original inline SVG icons. PDF exports embed a subset of the fonts already on the person's computer (the same faces the PNG export draws with), written into the exported file only; FormRef ships no font for them. Comparison HTMLs load the four fonts used by the supplied FormVis comparison from Google Fonts. Their original SIL Open Font License 1.1 texts are retained in `licenses/third-party/fonts/`. Font binaries are not included in the source archive. No BeeRef code, GPL or AGPL implementation is included. The optional native shell's dependency lock is included for reproducibility; it still needs platform prerequisites before it can compile.

## Demo board media

| Files | Source | License | Shipped |
|---|---|---|---|
| The pictures inside the three demo boards (`frontend/public/demos/colour/`, `value/` and `poster/`: each a `board.formref` and a `cover.webp` that is one of the board's own pictures): 38 NASA pictures and one Hubble image (the Hubble Ultra Deep Field, published by ESA/Hubble with a credit to NASA, ESA and the HUDF team) | The same WebP bytes as the copies in formdeck (`frontend/public/demos/nasa/`) and form.md (`demo/assets/media/`, `demos/views/assets/media/`), same owner; per-file titles, credit lines and source pages in `frontend/public/demos/CREDITS.md` | NASA content, not subject to copyright in the United States (NASA media guidelines) for the 38 NASA pictures; Creative Commons Attribution 4.0 International (https://creativecommons.org/licenses/by/4.0/) for the Hubble Ultra Deep Field | Yes, with the window build and the desktop engine, read by Home > Demos and Help > Demos |
| The three pictures of the "Quiet structures" starter sample (`frontend/src/ui/sample.ts`: three SVG drawings turned into PNG when the sample is created; not files in the repository) | Drawn for the sample, no outside content | Own work, Apache-2.0 | Yes, built into the window and the desktop engine, offered on Home as the starter template |

### Every picture in the demo boards

The 39 pictures, each with the boards that use it (A is `colour/`, First light: a colour board, which holds all 39; B is `value/`, Value study: light and shadow; C is `poster/`, Red planet: poster project). The three card pictures are three of these, with the same bytes: `colour/cover.webp` is The Day the Earth Smiled, `value/cover.webp` is the Apollo 17 view of the Earth, `poster/cover.webp` is the Curiosity 'Buckskin' selfie. Status as the source states it: NASA's media guidelines (https://www.nasa.gov/nasa-brand-center/images-and-media/) say NASA content is generally not subject to copyright in the United States and ask that NASA be acknowledged as the source; the credit lines below are the ones on each picture's own NASA page, read again on 15 November 2026. The NASA Image and Video Library records (images.nasa.gov) carry no credit line, only the NASA centre, so those rows are credited NASA with the centre in brackets. The Hubble Ultra Deep Field is published by ESA/Hubble under Creative Commons Attribution 4.0 International (https://esahubble.org/copyright/), which requires the full credit line to be shown; it was recorded before as public domain on the strength of its Wikimedia Commons page, which is not the original publisher's term. The file is a copy made through Wikimedia Commons (https://commons.wikimedia.org/wiki/File:Hubble_ultra_deep_field.jpg, whose source is the March 2004 NASA/STScI release 2004/07 that ESA/Hubble published as heic0406a), resized to 1400 x 1400; its tone differs slightly from the ESA/Hubble JPEG. Since 0.39.1 the board cards for it (the picture and its detail crop) carry the full credit and the ESA/Hubble link in their Text and URL fields; a board made from a demo in 0.39.0 keeps the older credit text "NASA and the European Space Agency", marked public domain, and the Commons URL, because a board made from a demo is the person's own copy. No picture was resized or re-encoded by FormRef: the boards hold the same bytes as the files named. The same list ships with the window as `frontend/public/demos/CREDITS.md`.

| Boards | File in the source repository | Record title | Credit | Source page | Licence or status |
| --- | --- | --- | --- | --- | --- |
| A, C | formdeck `img_chey.webp` | Perseverance's Selfie With 'Cheyava Falls' (PIA26344) | NASA/JPL-Caltech/MSSS | https://science.nasa.gov/photojournal/perseverances-selfie-with-cheyava-falls/ | NASA content, not subject to copyright in the United States (NASA media guidelines) |
| A, C | formdeck `img_cur.webp` | Looking Up at Mars Rover Curiosity in 'Buckskin' Selfie (PIA19808) | NASA/JPL-Caltech/MSSS | https://science.nasa.gov/photojournal/looking-up-at-mars-rover-curiosity-in-buckskin-selfie/ | NASA content, not subject to copyright in the United States (NASA media guidelines) |
| A, C | formdeck `img_moj.webp` | Curiosity Self-Portrait at 'Mojave' Site on Mount Sharp (PIA19142) | NASA/JPL-Caltech/MSSS | https://science.nasa.gov/photojournal/curiosity-self-portrait-at-mojave-site-on-mount-sharp/ | NASA content, not subject to copyright in the United States (NASA media guidelines) |
| A, C | formdeck `img_per.webp` | Perseverance's Selfie with Ingenuity (PIA24542) | NASA/JPL-Caltech/MSSS | https://science.nasa.gov/photojournal/perseverances-selfie-with-ingenuity/ | NASA content, not subject to copyright in the United States (NASA media guidelines) |
| A, B | formdeck `img_jup.webp` | Cassini Jupiter Portrait (PIA04866) | NASA/JPL/Space Science Institute | https://science.nasa.gov/photojournal/cassini-jupiter-portrait/ | NASA content, not subject to copyright in the United States (NASA media guidelines) |
| A | formdeck `img_sat.webp` | The Greatest Saturn Portrait ...Yet (PIA06193) | NASA/JPL/Space Science Institute | https://science.nasa.gov/photojournal/the-greatest-saturn-portrait-yet/ | NASA content, not subject to copyright in the United States (NASA media guidelines) |
| A | formdeck `img_smile.webp` | The Day the Earth Smiled (PIA17172) | NASA/JPL-Caltech/SSI | https://science.nasa.gov/photojournal/the-day-the-earth-smiled/ | NASA content, not subject to copyright in the United States (NASA media guidelines) |
| A | formdeck `img_udf.webp` | Hubble Ultra Deep Field (ESA/Hubble heic0406a) | NASA, ESA, and S. Beckwith (STScI) and the HUDF Team | https://esahubble.org/images/heic0406a/ | Creative Commons Attribution 4.0 International, https://creativecommons.org/licenses/by/4.0/ (stated at https://esahubble.org/copyright/); the full credit must be shown; NASA's own copy: https://science.nasa.gov/asset/hubble/hubble-ultra-deep-field-image-reveals-galaxies-galore/ |
| A | formdeck `img_dot.webp` | Solar System Portrait, Earth as Pale Blue Dot (PIA00452), Voyager 1 | NASA/JPL-Caltech | https://science.nasa.gov/photojournal/solar-system-portrait-earth-as-pale-blue-dot/ | NASA content, not subject to copyright in the United States (NASA media guidelines) |
| A | formdeck `img_rise.webp` | Earthrise, Apollo 8 (AS08-14-2383) | NASA/William Anders | https://www.nasa.gov/image-detail/moon-landing-l-7-months-10-apollo-8-earthrise-photo-as08-14-2383 | NASA content, not subject to copyright in the United States (NASA media guidelines) |
| A | formdeck `img_set.webp` | A Breathtaking Earthset from Orion (art002e021278), April 6, 2026 | NASA | https://images.nasa.gov/details/art002e021278 | NASA content, not subject to copyright in the United States (NASA media guidelines) |
| A | formdeck `img_edge.webp` | The Edge of the Night (PIA17199) | NASA/JPL-Caltech/Space Science Institute | https://science.nasa.gov/photojournal/the-edge-of-the-night/ | NASA content, not subject to copyright in the United States (NASA media guidelines) |
| A | form.md `mr-3.webp` | Mercury Project (launch of Freedom 7), 6100884, 1961-05-05 | NASA (MSFC) | https://images.nasa.gov/details/6100884 | NASA content, not subject to copyright in the United States (NASA media guidelines) |
| A, B | form.md `mr-4.webp` | Mercury Project (helicopter and Liberty Bell 7), 6116424, 1961-07-21 | NASA (MSFC) | https://images.nasa.gov/details/6116424 | NASA content, not subject to copyright in the United States (NASA media guidelines) |
| A | form.md `ma-6.webp` | Mercury Project (launch of Friendship 7), 9139490, 1962-02-20 | NASA (MSFC) | https://images.nasa.gov/details/9139490 | NASA content, not subject to copyright in the United States (NASA media guidelines) |
| A | form.md `ma-7.webp` | KSC-62pc-52 (Aurora 7 liftoff), 62PC-52, 1962-05-24 | NASA (KSC) | https://images.nasa.gov/details/62PC-52 | NASA content, not subject to copyright in the United States (NASA media guidelines) |
| A | form.md `ma-8.webp` | LIFTOFF - "SIGMA 7" - MERCURY-ATLAS (MA)-8 - CAPE, S62-06006, 1962-10-03 | NASA (JSC) | https://images.nasa.gov/details/S62-06006 | NASA content, not subject to copyright in the United States (NASA media guidelines) |
| A | form.md `ma-9.webp` | MA-9 - SPLASHDOWN, s63-09630, 1963-05-16 | NASA (JSC) | https://images.nasa.gov/details/s63-09630 | NASA content, not subject to copyright in the United States (NASA media guidelines) |
| A | form.md `gt-4.webp` | View of the Gemini-Titan 4 spacecraft launch, S65-29639, 1965-06-03 | NASA (JSC) | https://images.nasa.gov/details/S65-29639 | NASA content, not subject to copyright in the United States (NASA media guidelines) |
| A | form.md `gt-5.webp` | Launch of the Gemini 5 spacecraft from Pad 19, s65-50774, 1965-08-21 | NASA (JSC) | https://images.nasa.gov/details/s65-50774 | NASA content, not subject to copyright in the United States (NASA media guidelines) |
| A | form.md `gt-6a.webp` | View of the Gemini 6 and Gemini 7 rendezvous, S65-63171, 1965-12-15 | NASA (JSC) | https://images.nasa.gov/details/S65-63171 | NASA content, not subject to copyright in the United States (NASA media guidelines) |
| A | form.md `gt-7.webp` | Gemini-Titan (GT)-7 of GT-6 Space Photography, s65-64040, 1965-12-15 | NASA (JSC) | https://images.nasa.gov/details/s65-64040 | NASA content, not subject to copyright in the United States (NASA media guidelines) |
| A | form.md `gt-8.webp` | LIFTOFF - GEMINI-TITAN (GT)-8 - ATLAS/AGENA - CAPE, S66-24482, 1966-03-16 | NASA (JSC) | https://images.nasa.gov/details/S66-24482 | NASA content, not subject to copyright in the United States (NASA media guidelines) |
| A | form.md `gt-9a.webp` | GEMINI-TITAN (GT)-9 - EARTH-SKY - AUGMENTED TARGET DOCKING ADAPTER (ATDA), s66-37923, 1966-06-06 | NASA (JSC) | https://images.nasa.gov/details/s66-37923 | NASA content, not subject to copyright in the United States (NASA media guidelines) |
| A | form.md `gt-10.webp` | GEMINI-TITAN (GT)-10 - EARTH SKY - DOCKING - IN-SPACE, s66-46249, 1966-07-18 | NASA (JSC) | https://images.nasa.gov/details/s66-46249 | NASA content, not subject to copyright in the United States (NASA media guidelines) |
| A | form.md `gt-11.webp` | Gulf Coast from Atchafalaya Bay to Apalachicola seen from Gemini 11, s66-54563, 1966-09-14 | NASA (JSC) | https://images.nasa.gov/details/s66-54563 | NASA content, not subject to copyright in the United States (NASA media guidelines) |
| A | form.md `gt-12.webp` | Gemini 12 launch on a Titan vehicle, 9141925, 1966-11-11 | NASA (MSFC) | https://images.nasa.gov/details/9141925 | NASA content, not subject to copyright in the United States (NASA media guidelines) |
| A | form.md `ap-7.webp` | APOLLO VII - LAUNCH - KSC, S68-48662, 1968-10-11 | NASA (JSC) | https://images.nasa.gov/details/S68-48662 | NASA content, not subject to copyright in the United States (NASA media guidelines) |
| A | form.md `ap-9.webp` | Apollo 9 Mission image - Command Module, as09-24-3652, 1969-03-03 | NASA (JSC) | https://images.nasa.gov/details/as09-24-3652 | NASA content, not subject to copyright in the United States (NASA media guidelines) |
| A, B | form.md `ap-10.webp` | Apollo 10 view of the Earth, as10-34-5013, 1969-05-18 | NASA (JSC) | https://images.nasa.gov/details/as10-34-5013 | NASA content, not subject to copyright in the United States (NASA media guidelines) |
| A, B | form.md `ap-11.webp` | Saturn Apollo Program (Apollo 11 launch), 6900556, 1969-07-16 | NASA (MSFC) | https://images.nasa.gov/details/6900556 | NASA content, not subject to copyright in the United States (NASA media guidelines) |
| A | form.md `ap-12.webp` | Saturn Apollo Program (Apollo 12 liftoff), 6903391, 1969-11-14 | NASA (MSFC) | https://images.nasa.gov/details/6903391 | NASA content, not subject to copyright in the United States (NASA media guidelines) |
| A, B | form.md `ap-13.webp` | View of damaged Apollo 13 Service Module, as13-59-8501, 1970-04-17 | NASA (JSC) | https://images.nasa.gov/details/as13-59-8501 | NASA content, not subject to copyright in the United States (NASA media guidelines) |
| A | form.md `ap-14.webp` | Saturn Apollo Program (Apollo 14 launch), 7120033, 1971-01-31 | NASA (MSFC) | https://images.nasa.gov/details/7120033 | NASA content, not subject to copyright in the United States (NASA media guidelines) |
| A, B | form.md `ap-15.webp` | View of Mount Hadley as photographed by Apollo 15, as15-87-11849, 1971-07-31 | NASA (JSC) | https://images.nasa.gov/details/as15-87-11849 | NASA content, not subject to copyright in the United States (NASA media guidelines) |
| A | form.md `ap-16.webp` | INFLIGHT - APOLLO 16 (LM LAUNCH), S72-35613, 1972-04-23 | NASA (JSC) | https://images.nasa.gov/details/S72-35613 | NASA content, not subject to copyright in the United States (NASA media guidelines) |
| A, B | form.md `ap-17.webp` | View of the Earth seen by the Apollo 17 crew, as17-148-22727, 1972-12-07 | NASA (JSC) | https://images.nasa.gov/details/as17-148-22727 | NASA content, not subject to copyright in the United States (NASA media guidelines) |
| A, B | form.md `apollo-11-bootprint.webp` | Apollo 11 Mission image, Astronaut bootprint on the lunar surface, as11-40-5877, 1969-07-20 | NASA (JSC) | https://images.nasa.gov/details/as11-40-5877 | NASA content, not subject to copyright in the United States (NASA media guidelines) |
| A | form.md `apollo-11-saturn-v.webp` | Saturn Apollo Program, 8909250, 1969-07-16 | NASA (MSFC) | https://images.nasa.gov/details/8909250 | NASA content, not subject to copyright in the United States (NASA media guidelines) |

The boards' other content (notes, tables, swatches, shapes) is own work, Apache-2.0, like the rest of FormRef. No NASA insignia or logotype is shown.

## License texts and lockfiles

`licenses/third-party/` retains installed dependency license texts and a package metadata inventory. Frontend and Rust lockfiles identify exact transitive versions. Native core notices live under `native/licenses/`.

## Font notices

| Font | Role in the parity pages | Copyright source | License |
| --- | --- | --- | --- |
| Archivo | charts and percentage tiles | [The Archivo Project Authors](https://github.com/Omnibus-Type/Archivo) | [OFL-1.1](licenses/third-party/fonts/archivo/OFL.txt) |
| Bricolage Grotesque | headings | [The Bricolage Grotesque Project Authors](https://github.com/ateliertriay/bricolage) | [OFL-1.1](licenses/third-party/fonts/bricolagegrotesque/OFL.txt) |
| Instrument Sans | body text | [The Instrument Sans Project Authors](https://github.com/Instrument/instrument-sans) | [OFL-1.1](licenses/third-party/fonts/instrumentsans/OFL.txt) |
| JetBrains Mono | table headers, badges, source tags | [The JetBrains Mono Project Authors](https://github.com/JetBrains/JetBrainsMono) | [OFL-1.1](licenses/third-party/fonts/jetbrainsmono/OFL.txt) |

OFL-1.1 applies to the font software, not to FormRef's own code or documents. The fonts are served by Google Fonts and are not bundled.

## Trademarks

PureRef, Milanote, BeeRef and Illustrator are trademarks of their respective owners (Illustrator of Adobe in the United States and/or other countries). FormRef is not affiliated with or endorsed by any of them. They are named only to identify file formats FormRef reads or writes and, in "Reference provenance" above, the public documentation that was studied; FormRef's tools, menus and preferences carry their own names (the optional drawing tools are "Vector tools").
