# Releases

Use `./formref help` for current dispatcher commands, then install/doctor/build through that dispatcher. A release must build Rust, typecheck/bundle the frontend, import/run the backend and serve the production app. Run an actual stdio MCP discovery plus a reversible board edit/readback.

Confirm portable import/export, restart persistence and the user workflows touched by the release. UI verification includes cold reload under CPU and network throttling; explicitly state when a platform or hardware check was not run. Keep implementation evidence separate from researched competitor capability.

Versions use `v` followed by three dotted integers, such as `v0.1.0`. Frontend/backend/native version metadata, git tag and deliverable names agree. Commit with author and committer `nodemode-ai` and `mackin@nodemode.ai`, retaining the existing history.

| Deliverable | Required contents |
| --- | --- |
| `formref_v0.1.0.zip` | Root `formref/`, `.git`, source, scripts, built frontend, documentation and repo-local harness |
| `formref_planning_docs_sidecar_v0.1.0.zip` | Matching sidecar folder, development plan, build notes, root hashout log, behavioral test plan and accumulated decisions |

Dependency caches, runtime user data and secret values do not ship. Inspect archive membership and run the dispatcher from a fresh extraction before hand-back. The harness itself is validated through the god-tier skill tooling; its audit/evaluation record accompanies the planning evidence.

Native OS window integration and hosted services must be checked on their actual platforms before parity can be claimed. This local release does not gain those capabilities merely from command names, schemas or repository scaffolding.
