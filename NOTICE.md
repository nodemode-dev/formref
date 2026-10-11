# FormRef notices, licenses and provenance

Version: v0.3.1 · Reviewed: 2026-10-11

FormRef's original source and vector artwork are Apache-2.0. The repository's full license is `LICENSE`. New commits use `nodemode-ai <mackin@nodemode.ai>`.

## Reference provenance

| Input | Use | Boundary |
|---|---|---|
| User-supplied FormVis v1.66.1 | Form family layout, theme values, scripting and documentation conventions | Read-only reference; no FormVis git history transplanted |
| User-supplied iStack | Owned format interoperability, persistence and collection workflows | Independent Rust/TypeScript implementation; compiled iStack bundle not shipped |
| PureRef official handbook | Feature requirements | No source or proprietary assets included |
| BeeRef official documentation/release notes | Feature requirements | No BeeRef code opened, downloaded, copied or shipped |
| Milanote official help center | Feature requirements | No product assets or proprietary implementation included |

## Direct dependencies

| Dependency | Pinned version | License | Use |
|---|---|---|---|
| serde | 1.0.229 core / 1.0.228 shell | MIT OR Apache-2.0 | Rust serialization |
| serde_json | 1.0.152 | MIT OR Apache-2.0 | Rust command protocol |
| TypeScript | 7.0.2 | Apache-2.0 | Build-time compiler |
| Vite | 8.3.4 | MIT | Build-time/dev server |
| Tauri | 2.12.3 | MIT OR Apache-2.0 | Optional desktop development shell |
| tauri-build | 2.7.2 | MIT OR Apache-2.0 | Build-time desktop generation |
| Tauri CLI | 2.12.1 | MIT OR Apache-2.0 | Build-time desktop CLI |
| FastAPI | 0.143.0 | MIT | Local server |
| Uvicorn | 0.54.0 | BSD-3-Clause | Local ASGI server |
| python-multipart | 0.0.32 | Apache-2.0 | Local file ingestion |
| httpx | 0.28.1 | BSD-3-Clause | Local MCP/API client |
| mcp | 1.30.0 | MIT | Official v1 SDK, actual stdio transport |
| Pillow | 12.3.0 | MIT-CMU and bundled library notices | Local media processing |
| CairoSVG | 2.9.1 | LGPL-3.0-or-later | Separate server-side Python dependency for SVG rasterization |
| defusedxml | 0.7.1 | PSF-2.0 | Safe XML parsing |

CairoSVG is installed as an ordinary replaceable Python package in the server environment, unmodified. It is not statically linked into the Rust core or a proprietary desktop bundle. Its license and source URL are retained in the notices. Pillow's wheel license also contains codec/native-library notices. Native shell compilation and distribution are not claimed by this source release; platform runtime libraries are not bundled.

The editor uses system fonts and original inline SVG icons. Comparison HTMLs load the four fonts used by the supplied FormVis comparison from Google Fonts. Their original SIL Open Font License 1.1 texts are retained in `licenses/third-party/fonts/`. Font binaries are not included in the source archive. No BeeRef code, GPL or AGPL implementation is included. The optional native shell's dependency lock is included for reproducibility; it still needs platform prerequisites before it can compile.

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
