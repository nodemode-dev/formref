---
name: release
description: "Installs, checks, documents and packages a FormRef release with its real git history and planning sidecar. Loads for build failures, release preparation and versioned hand-back."
---

# Release Specialist

## Purpose

Produce a reviewable release with accurate runtime claims, synchronized documentation and intact git history.

## Preconditions

Read the master shared rules, planning sidecar `DEV_PLAN.md` and `BUILD_NOTES.md`, `README.md`, `docs/CONTRACT.md` and root command implementation. Do not infer installer or desktop support from an unrun source file.

## Procedure

1. Use `./formref install`, `./formref doctor`, `./formref build` and the documented dev/serve commands from the repository. Inspect command help first when continuing an older version.
2. Verify the Rust engine builds, the frontend typechecks and bundles, the backend imports, and the built app serves through FastAPI. Connect an actual MCP client and run discovery plus one reversible board mutation/readback.
3. Verify the changed user workflows and exports. For UI changes use the throttled cold-load gate from the UI specialist; record missing hardware/platform checks explicitly.
4. Update the manual, wiki, contract and subsystem logs. Keep planning files in the sidecar unless the existing project deliberately tracks them. Separate implemented, partial and missing parity with evidence. Inspect an existing Form family comparison before editing parity HTML. Every compared product needs its own visible percentage tile and product-colored capability rows/cells with Full, Partial and None symbols; show undocumented evidence separately from confirmed absence. Derive each score from the displayed weighted rows and disclose its denominator. Verify the standalone page and the consolidated iframe at normal and narrow widths, inspect actual computed colors and tile values, and confirm unrelated embedded comparisons remain unchanged. Counting rows alone does not verify presentation.
5. Apply semantic version `v` plus three dotted integers. Match frontend/backend/native metadata, release filenames and git tag. Retain real commits authored as `nodemode-ai` with `mackin@nodemode.ai`; do not rewrite uploaded history.
6. Package `formref_v[major].[minor].[patch].zip` with root folder `formref/` and `.git`, excluding dependency caches and runtime data. Package `formref_planning_docs_sidecar_v[major].[minor].[patch].zip` with its matching sidecar root and planning files.
7. Inspect archive membership and execute the root dispatcher from a freshly extracted release. Confirm source, executable setup scripts, built frontend, harness and documentation are present, and the working tree is clean before final hand-back.

## Gate

Both matching versioned ZIPs exist, the repo ZIP contains real git history, required builds/runtime checks have observable results and the status docs identify unverified or unsupported behavior.

## Hands back

Release files, version/tag, checked behavior and concise limitations.

## Owned resources

No packaged archive belongs inside this skill folder. The repository build/setup commands and release documentation are the execution surface.
