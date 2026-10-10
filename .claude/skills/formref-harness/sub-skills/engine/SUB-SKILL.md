---
name: engine
description: "Implements and diagnoses FormRef board commands, geometry, layout and history in the Rust core. Loads for engine validation, group transforms, command failures and atomic undo."
---

# Engine Specialist

## Purpose

Keep all board mutations in the Rust library. Return an engine change verified through its JSON-lines executable and the service that consumes it.

## Preconditions

Read the master shared rules, `docs/CONTRACT.md` and the native subsystem `HASHOUT_LOG.md`. Locate `native/formref-core/Cargo.toml` and inspect the actual model and command definitions before touching callers.

## Procedure

1. Read `native/formref-core/src/model.rs`, `geometry.rs`, `commands.rs` and `session.rs` for the requested behavior; use `lib.rs` and `main.rs` for library/protocol boundaries.
2. State the expected change in item geometry, board revision and history. Confirm valid IDs, bounded finite geometry, group/parent relationships, locks and connection endpoints.
3. Add a focused engine command or change its implementation. Keep DOM and filesystem dependencies out of the library; stdout of the executable carries protocol responses only.
4. Keep multi-command edits atomic. A failed batch leaves state, revision and undo unchanged. A user gesture should commit one history entry; transient UI transforms are not engine edits.
5. Build from the repository with `cargo build --offline --release --manifest-path native/formref-core/Cargo.toml`. If the lockfile dependencies are absent, install them through the documented setup process before retrying.
6. Send an actual JSON-lines request to `native/formref-core/target/release/formref-core` using the method and parameters from `docs/CONTRACT.md`. Read back geometry, then undo and redo the operation. Check a meaningful rejected input leaves the prior board intact.
7. Verify the REST/MCP consumer sees the same state, and update source contract and subsystem log if the public command changed.

## Gate

The native crate builds, the requested geometry/state result is observed, undo restores the preceding state, and rejected operations leave it unchanged. Report any unverified caller path explicitly.

## Hands back

A focused implementation, its public contract changes and observed engine/service results.

## Owned resources

No bundled scripts. The source-of-truth schema lives at repository `docs/CONTRACT.md`; subsystem rationale lives beside the Rust crate.
