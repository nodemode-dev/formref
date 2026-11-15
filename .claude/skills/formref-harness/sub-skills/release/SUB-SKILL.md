---
name: release
description: Shipping a FormRef turn. Load to bump the version, write commits with the right identity, update logs and notes, and produce the repository zip and the planning sidecar zip.
---

# Release

## Version sites

Version format is `v*.**.*`, as the owner set: the patch is one digit and the minor may grow to two. After `x.y.9` the next release is `x.(y+1).1`, never `x.y.10` (v0.4.10 broke this; the owner moved the line to v0.5.1).

Bump all of these by hand, together, to the same `x.y.z`: `frontend/package.json`, both version fields at the top of `frontend/package-lock.json`, `VERSION` in `backend/app/core/config.py`, `version` in `native/formref-core/Cargo.toml` and its own entry in `Cargo.lock`, `version` in `src-tauri/Cargo.toml` and the `formref-desktop` entry in its `Cargo.lock`, `version` in `src-tauri/tauri.conf.json`, `version` in `clipper/manifest.json`, the footer label in `frontend/index.html`, and the version badge in `README.md`. Add a `CHANGELOG.md` entry in plain language.

Interim turns of a plan are patch versions; the finished plan takes the minor version it named.

## Commits

Identity on every commit and tag: `git -c user.name=nodemode-ai -c user.email=mackin@nodemode.ai`. One commit per coherent change, subject `type(scope): summary (x.y.z)`, a body that says what changed, why, and what was run. The version bump is the last commit, after which the branch `compile_vx.y.z` is cut from it, for formcompiler (`nodemode-dev/formcompiler`) to build once the desktop shell bundles its own interface. Never amend or rebase commits the owner already has.

## Logs and notes

In the repository: the `HASHOUT_LOG.md` beside each changed area. In the planning sidecar: `BUILD_NOTES.md` (state, commits, what is verified and what is not), `DEV_PLAN.md` boxes and revision notes, the root `HASHOUT_LOG.md`, and the re-rendered parity files (parity specialist).

## Packaging

Rebuild Rust, backend import and Vite after the bump. Copy the repository, strip `frontend/node_modules`, `frontend/dist`, `native/formref-core/target`, `src-tauri/target` and every `__pycache__`, and zip it as `formref_vx.y.z.zip` with `.git` included. Zip the sidecar folder as `formref_planning_docs_sidecar_vx.y.z.zip`. Unzip the repository zip somewhere fresh and confirm a clean status, the commit count and `git describe` naming the new tag. Scan all markdown for emoji and em dashes first.

When the harness changed, copy `.claude/skills/formref-harness` over `.agents/skills/formref-harness` (Codex and Cursor read the second path, as in FormVis), run the skill validator on both, and hand back `formref-harness_vx.y.z.zip` beside the two release zips.
