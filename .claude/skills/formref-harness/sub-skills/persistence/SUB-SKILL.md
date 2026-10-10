---
name: persistence
description: "Maintains FormRef durable boards, asset imports, iStack migration and portable or rendered exports. Loads for save/open, missing-media recovery and export accuracy."
---

# Persistence Specialist

## Purpose

Keep board state and original assets durable and portable. Return a checked save/open or export result, with asset losses and unsupported records visible.

## Preconditions

Read the master shared rules, `backend/HASHOUT_LOG.md` and `docs/CONTRACT.md`. Inspect the current store, import and export services before changing files; server state is authoritative while the service runs.

## Procedure

1. Locate the registered board and assets through API identifiers. Distinguish a JSON state snapshot from a fully portable package with embedded assets.
2. Keep disk writes atomic and outside the repository. Use registered asset IDs rather than accepting arbitrary paths. Validate archive paths, size/count bounds and manifests before extraction.
3. For an iStack board, check `format: istack` and the original version. Preserve numeric ID mapping, center rotation, group membership, notes and drawing records. Normalize crop from displayed pixels by the item's original width and height.
4. Decode embedded `_imageData` through the asset pipeline. If only `_sourcePath` is present, retain it as missing-media metadata until the user relinks actual files. Transient blob URLs cannot reconstruct an asset. Report imported, missing and unsupported counts.
5. Build import as one engine transaction, then read the board back. A partially completed upload may leave a registered asset; do not create duplicate items when retrying.
6. Export from original asset bytes and engine geometry, including crop/flip/rotation/opacity. Rendered PNG/SVG, board Markdown and portable package each have different limits; document the ones the current exporter actually supports.
7. Round-trip a portable package into a new board, reopen after a service restart and compare item count, geometry, connections and original asset bytes. Exercise a location-only iStack record to confirm its missing source remains recoverable.

## Gate

The saved board survives restart, the portable import retains original assets and transforms, missing sources remain visible and exports are opened and inspected. An HTTP 200 alone does not verify a usable file.

## Hands back

The migration/persistence change, item/asset evidence, explicit export limits and relevant documentation updates.

## Owned resources

No bundled sample projects or asset payloads. The live schema is repository `docs/CONTRACT.md`; source decisions are in the backend log.
