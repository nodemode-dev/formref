# Releases

Use `./formref help` for current dispatcher commands, then install/doctor/build through that dispatcher. A release must build Rust, typecheck/bundle the frontend, import/run the backend and serve the production app. Run an actual stdio MCP discovery plus a reversible board edit/readback.

Confirm portable import/export, restart persistence and the user workflows touched by the release. UI verification includes cold reload under CPU and network throttling; explicitly state when a platform or hardware check was not run. Keep implementation evidence separate from researched competitor capability.

Versions use `v` followed by three dotted integers, such as `v0.1.0`. Frontend/backend/native version metadata, compile branch and deliverable names agree. Commit with author and committer `nodemode-ai` and `mackin@nodemode.ai`, retaining the existing history.

**Releases.** FormRef builds nothing in this repository's CI. Since v0.38.0 the desktop shell bundles its own interface and starts its frozen engine, and `build_app` (macOS, Linux) and `build_app.bat` (Windows) freeze the engine and run `tauri build`, so formcompiler (`nodemode-ai/formcompiler`) can build it once its registry entry is enabled. After the version bump lands on main, push a branch `compile_vX.Y.Z` cut from that commit. CI runs on it, and formcompiler picks it up on its next 8-hourly watch run, or at once when its watch is run by hand. It builds macOS, Linux and Windows bundles and opens a draft release `formref-vX.Y.Z` on formcompiler's release page. Review the draft, then publish it there. CI in `.github/workflows/ci.yml` runs the checks only.

| Deliverable | Required contents |
| --- | --- |
| `formref_v0.3.0.zip` | Root `formref/`, full `.git`, source, scripts, lockfiles, font notices, documentation and repo-local harness; build outputs are regenerated with `./formref build` |
| `formref_planning_docs_sidecar_v0.3.0.zip` | Root `formref_sidecar/`, current development plan/build notes, root hashout log, behavioral TEST_PLAN, actual observation records, current standalone comparison and validated harness package |

Dependency caches, runtime user data and secret values do not ship. Inspect archive membership and run the dispatcher from a fresh extraction before hand-back. The harness itself is validated through the god-tier skill tooling; its audit/evaluation record accompanies the planning evidence.

Native OS window integration and hosted services must be checked on their actual platforms before parity can be claimed. This local release does not gain those capabilities merely from command names, schemas or repository scaffolding.
