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
4. Update the manual, wiki, contract and subsystem logs; keep planning files in the sidecar and parity grades tied to observed evidence. For comparison HTML, read all stylesheets of the supplied FormVis page and trace the final effective cascade: its later restyle overrides the earlier palette and typography. Match warm light/dark paper and surface tokens, Instrument Sans body/evidence, Bricolage headings, Archivo chart/tile text and JetBrains Mono uppercase headers and 11px status badges. Keep neutral transparent product cells, 9px by 12px cell padding, tinted badges with 4px by 7px padding, radius 4px, gap 6px and 11px currentColor status SVGs, plus bordered source pills and the 1180px wrapper. Preserve the reference structure: four 56-segment product lanes above four percentage tiles, then Capability, Sources, FormRef, PureRef, BeeRef and Milanote columns. Derive scores from the same displayed weighted requirements and fixed denominator; undocumented evidence is not confirmed absence. Compare the original FormVis and corrected FormRef in paired light/dark header/table screenshots at the same viewport, with actual source font bytes loaded. CDP custom-font glyph observations must establish the title, body, feature, header, status and score faces; declared family names, computed family strings and document.fonts.check alone cannot establish this. Inspect final computed colors/type/geometry and complete stacked rows at narrow width in both standalone and consolidated iframe. Preserve filter focus and row identities, prove the embedded FormRef equals its standalone counterpart and all 13 unrelated original pages remain byte-identical. Row counts or product-colored column fills cannot pass this presentation gate.
5. Apply semantic version `v` plus three dotted integers. Match frontend/backend/native metadata, release filenames and git tag. Retain real commits authored as `nodemode-ai` with `mackin@nodemode.ai`; do not rewrite uploaded history.
6. Package `formref_v[major].[minor].[patch].zip` with root folder `formref/` and `.git`, excluding dependency caches and runtime data. Package `formref_planning_docs_sidecar_v[major].[minor].[patch].zip` with its matching sidecar root and planning files.
7. Inspect archive membership and execute the root dispatcher from a freshly extracted release. Confirm source, executable setup scripts, built frontend, harness and documentation are present, and the working tree is clean before final hand-back.

## Gate

Both matching versioned ZIPs exist, the repo ZIP contains real git history, required builds/runtime checks have observable results and the status docs identify unverified or unsupported behavior.

## Hands back

Release files, version/tag, checked behavior and concise limitations.

## Owned resources

No packaged archive belongs inside this skill folder. The repository build/setup commands and release documentation are the execution surface.
