# Contributing to FormRef

Thank you for helping. FormRef aims to be a free, local-first reference-board editor
with study aids, and an agent that can arrange a board while you watch, and it gets
there through real use and real contributions.

## Where to start

- **Use it and report what goes wrong.** A clear bug report, with steps, the version
  and your platform, is one of the most useful things you can give.
- **Look at the open issues.** Comment on one before starting larger work, so nobody
  builds the same thing twice.
- **Translations** are welcome: FormRef ships in English and 25 more languages, with
  the tables in `frontend/src/lib/i18n/tables`, and the Languages page of the wiki
  says how they work. `./formref i18n check` finds gaps, and `./formref i18n review`
  and `apply` hand one language to a reviewer as CSV.

## Setting up

Clone the repository and run `./formref install`, then `./formref` (or
`formref.bat install` and `formref.bat` on Windows). The first builds the Rust core,
creates the service's Python environment and installs the interface's packages; the
second starts the service on 127.0.0.1:8320 and the web interface on
http://localhost:5320. `./formref help` lists every command, and the README's "Run
it from source" has the details and the requirements.

The code lives in:

| Folder | What is there |
| --- | --- |
| `native/formref-core` | the board engine (Rust): geometry, commands, layout and undo, with its own tests |
| `backend/app` | the service (Python, FastAPI): assets, boards, imports and exports, the agent, the MCP server |
| `backend/tests` | the service tests |
| `frontend/src` | the interface (TypeScript, Vite) |
| `frontend/scripts` | the translation check, review and apply scripts |
| `frontend/tests/window` | the window smoke test |
| `src-tauri` | the desktop shell (Rust, Tauri) |
| `clipper` | the browser clipper for Chrome and Firefox |
| `.docs/wiki` | the wiki's source |

## Before you open a pull request

Run the same checks CI runs:

```sh
(cd frontend && npm ci && npm audit && npm run build)
(cd native/formref-core && cargo test --locked && cargo build --release --locked)
(cd backend && pip install -r requirements.txt -r requirements-test.txt \
  && python -m compileall -q app \
  && python -m pytest tests -q -p no:cacheprovider)
python -m pytest frontend/tests/window -q -p no:cacheprovider
```

The service tests need the built board engine; the window smoke tests need `pytest`
and `playwright` with Chromium installed, and a built interface. CI also boots the
service and probes `/api/health`, checks the launcher scripts with `bash -n`, and
refuses an em dash or an emoji in tracked Markdown.

- Keep each pull request to one change, with tests for what it adds or fixes.
- Write commit subjects the way the history does, in Conventional Commits with the
  version in the summary: `feat(home): ... (0.39.0)`, `fix(review): ...`, `docs(...)`.
  Leave the version alone; a maintainer bumps it when releasing.
- Interface text goes through the translation tables: change an English string in
  place in every table, and `./formref i18n check --strict` fails while any table is
  missing one.
- Commands come from `frontend/src/app/commands.ts`: the right-click menu, the
  palette, the keys and the shortcut sheet all read it. After changing them, open
  FormRef once and run `./formref agents sync`; `./formref agents sync --check` fails
  while the agent command reference is out of date.
- Icons are inline `currentColor` SVG in `frontend/src/ui/icons.ts`, and colours,
  spacing and `z-index` come only from `frontend/src/styles/tokens.css`.
- Other vendors' product names appear only to name a file format or compatibility.
  Never copy vendor help text, icons, sample boards or presets.
- Every new dependency, binary, model, font or data file gets a row in `NOTICE.md`
  before it is used.

## Maintainers

FormRef is maintained by:

- the [nodemode-dev](https://github.com/nodemode-dev) organisation on GitHub
- [@nodemode-ai](https://github.com/nodemode-ai)
- [@gbarnai](https://github.com/gbarnai)

Reach them through issues and pull requests.

## How changes land

Only a maintainer pushes to `main`. Everyone else forks the repository and opens a pull request into `main`. A pull request merges when all five checks pass on an up-to-date branch and a maintainer has approved it after its last push.

## Releases

A release is a version, and only a maintainer makes one: after the version is bumped on
`main`, a maintainer cuts a `compile_vX.Y.Z` branch, and formcompiler
(`nodemode-dev/formcompiler`) builds every platform and publishes them together. No
push from a contributor starts a release. See the wiki's
[Releases](.docs/wiki/Releases.md) page.

## Licensing

FormRef is licensed under the Apache License 2.0 ([LICENSE](LICENSE), SPDX
`Apache-2.0`). By contributing, you agree that your contribution is licensed under the
same terms. Only add code you have the right to contribute, and name any third-party
code and its licence in the pull request.

## Patents and other people's IP

Some features are deliberately not built, or were taken out, because they come too close to someone else's patent, trademark, copyright or design. The maintainers hold that line with counsel; contributors do not decide it, and nobody here redesigns a feature on their own reading of a patent. This is engineering diligence, not legal advice.

### Features this project will not implement

The repository records none yet. The rules below apply to every contribution, and a feature the maintainers decline for patent, trademark or copyright reasons is listed here, with their written decision, before it counts as declined.

### Rules for every contribution

- Patents: do not add a feature, or a dependency that provides one, that reproduces a method you know to be patented. If you are unsure, open an issue that describes what the feature does, not which patent it resembles. Patent numbers stay out of code, commits, comments, logs and changelogs.
- Trademarks: other vendors' product and feature names appear only to name a file format or compatibility ("opens <format> files", "for use with"). No command, menu, panel, tool, preset, template, theme or agent tool takes another product's feature name, and no text says "like X" or "the way X does it". Describe what the feature does.
- Copyright: never copy another product's help, tooltip, dialog or documentation text (link to it instead); never trace or import vendor icons; never bundle vendor templates, themes, presets, brushes, swatches, LUTs, materials, sample files, sound libraries, stock media or fonts; colour-book names only when reading a person's file. Compatibility layers carry names and signatures only. Test fixtures come from this repository's own scripts.
- Other products' source: never copy another product's source code. FormRef's `.bee` support is written independently of BeeRef's, which is GPL-3.0, and `NOTICE.md` records what was read to write it.
- Licences: every new dependency, binary, model, font, profile or data file gets a row in `NOTICE.md` before it is used. GPL stays outside the distributed bundle, AGPL nowhere, LGPL dynamically linked and replaceable, MPL files unedited. CC BY credited, CC BY-SA only unmodified, CC NC and ND never. Models with gated or non-commercial terms are optional downloads, never bundled.

## Conduct

Everyone taking part follows the [code of conduct](CODE_OF_CONDUCT.md). Security
problems go through [SECURITY.md](SECURITY.md), never a public issue.
