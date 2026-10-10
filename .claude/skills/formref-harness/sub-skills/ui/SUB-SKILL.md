---
name: ui
description: "Builds and repairs the FormRef TypeScript canvas, controls, inspectors and themes while keeping keyed DOM and camera gestures stable. Loads for frontend behavior or visual defects."
---

# UI Specialist

## Purpose

Render engine state and preview gestures in the Form family visual system. Return visible behavior plus evidence that updates preserve mounted controls and stable geometry.

## Preconditions

Read the master shared rules, `frontend/HASHOUT_LOG.md`, `docs/CONTRACT.md` and the current frontend source. Use the installed app rather than the iStack minified bundle as the implementation surface.

## Procedure

1. Find the source owning the affected node or gesture. Trace the API client to the Rust command; keep a single engine mutation at the end of each interaction.
2. Name the exact DOM property to update, which sibling nodes stay mounted and how space is reserved. Keep item nodes keyed by ID and reuse inspector inputs; field editing must preserve focus and caret.
3. Use the family token values and spacing scale. Respect the single stacking scale, dark/light profiles and currentColor SVG icons. Apply saved theme before first paint and reveal only after required fonts and initial board are ready.
4. Preview drag/resize/rotation in the existing item node. Commit once on release, reset preview on cancellation and reconcile from engine state without deleting the live container.
5. Decode image replacements before swapping their src. Preserve natural source geometry for crop and exports; display thumbnails are not portable assets.
6. Build/typecheck with the frontend's declared npm scripts and run through `./formref dev` on frontend 5196/backend 8196. Verify the changed gesture at ordinary and extreme zoom, inspector input, keyboard path and undo. For grid work, check independent visibility/snapping, persisted settings and one common drag delta for grouped descendants. For reference playback, check visible-image order, first/last navigation, timer cancellation on close/board switch/deletion, Escape exit and editing prevention. Grayscale remains a reversible preview with original bytes/export semantics intact. For managed-image sampling, read `docs/REFERENCE_EDITING_CONTRACT.md`: verify original unpremultiplied RGBA and source coordinates through crop, flips, rotation, camera pan/zoom and the painted image rectangle, including alpha and far edges. Sampling must leave revision/history unchanged and discard stale results after board or mode changes. Create/edit swatches through Rust, reject invalid canonical colors without changes, then verify undo, persistence and actual exported color. For formatted notes/documents, verify the bounded safe Markdown subset, literal raw HTML and unsupported links, mounted source/preview, title/source save/cancel/reopen, retained caret during unrelated revisions and explicit same-document conflicts without overwriting the draft. Read back source/format after undo, portable round trip and restart; do not infer export rendering or conflict behavior from source presence.
7. Hard-reload under at least 4x CPU throttling and slow network. Observe theme/font reveal, touched controls, load failure and resizing; measure layout shifts and whether keyed nodes or focus were lost. If unavailable, state the missing evidence.

## Gate

The frontend builds, the user action reaches the engine, undo/readback agree and the affected nodes keep their identity and input focus. Report the exact throttling used and any remaining rendering limits.

## Hands back

The visible change, browser observations, source log entry and relevant manual updates.

## Owned resources

No bundled UI code. Repository frontend styles and components are the current implementation; the audited family appearance is documented in repository research and parity files.
