---
name: mcp
description: "Operates FormRef boards through the actual local MCP server and diagnoses connection, tool-schema and partial-workflow failures. Loads for agent-driven board editing and MCP integration."
---

# MCP Specialist

## Purpose

Turn the connected FormRef server into reliable board operations. Use sequential workflows with readback after mutation; the skill provides ordering and recovery, while the MCP server provides access and validation.

## Preconditions

Read the master shared rules. Start the app with `./formref dev` or its documented production serve command. Connect the client to `./formref mcp` as a stdio server from the absolute repository path. Discover its current tools/resources/prompts before using the workflows below.

## Workflow: organize an existing board

Trigger: "Arrange these references in FormRef."

1. Call `list_boards`, choose the intended board from the user's context and retain its ID. Call `get_board` with that board_id; identify exact item IDs and locked items.
2. Call `arrange_items` with the board_id and unlocked IDs from the readback. Choose the requested layout and explicit gap using the live tool schema. When requested, call `configure_canvas` with only the desired grid visibility, grid size, snap-enabled or grayscale settings, or `snap_items` with the known item IDs and optional grid size. Discover those tool schemas before supplying parameters; settings are board mutations with their own undo steps. Leave locked items intact; unlock only when the user requested it.
3. Call `get_board` again. Confirm item geometry and revision changed as requested. If the result is wrong, use `undo` once for each confirmed mutation and read back the restored state.

Result: the intended board is arranged in the app, persisted and undoable.

## Workflow: create a reference collection

Trigger: "Make a FormRef board from these images and notes."

1. Call `create_board` with the requested title and retain the returned board ID. For actual source files, call `import_asset` and keep the returned registered asset IDs. Supply raw base64 or a file beneath `FORMREF_MCP_IMPORT_DIR` (default `~/.formref/imports`); do not pass an arbitrary filesystem path.
2. Call `add_items` with the board_id, original content and registered asset IDs; obtain exact item IDs from the result or `get_board`. Call `connect_items` only when the user requested a relationship.
3. Arrange through `arrange_items` and read content/geometry back with `get_board`. For requested original-image colors or formatted content, read `docs/REFERENCE_EDITING_CONTRACT.md` and discover `sample_image`, `create_swatch`, `create_document` and `set_formatted_text` from the actual SDK connection before using their schemas. Supply the known board/image IDs and normalized coordinates to `sample_image`; verify asset ID, source pixel coordinates, original RGBA/HEX and unchanged board revision/history. Sampling itself has nothing to undo. Create a requested swatch from the returned canonical color with `create_swatch`, then edit through `update_items`; create a document with `create_document` or change existing source/format with `set_formatted_text`. After each mutation, read the same board through MCP and HTTP/UI, confirm canonical color or exact title/text/format and one undoable shared revision, then verify persistence and requested exports. Preserve existing document data; on a stale-save conflict, read back current source instead of retrying an overwrite. Call `export_board` only for an export the user requested and verify the resulting file is available. A source declaration or successful tool response alone cannot pass this workflow.

Result: a real persisted collection with linked assets, visible content and a known undo sequence.

## Workflow: recover an incomplete edit

Trigger: "The FormRef agent edit failed halfway."

1. Call `get_board` on the known board and inspect the current revision/content. Compare against the last successful result; do not assume a timeout means no mutation occurred.
2. Identify which steps completed and which registered assets/items already exist. Retry only missing work using those returned IDs, or undo confirmed mutations in reverse order when the user requested rollback.
3. Read back the final board and name any remaining state the user must resolve.

Result: no duplicate imports, no repeated successful edits and an accurate report of surviving changes.

## Error handling

- Server absent: check the client's MCP connection status and run `./formref doctor`. Confirm backend `/api/health` on 127.0.0.1:8196 and the absolute stdio command/cwd. Configuration text alone is not a connected server.
- Authentication or access denied: the default local server needs no cloud login. Inspect the actual loopback origin, data-folder permissions and any client policy the error names. Do not request, fabricate or print credentials for a local configuration problem.
- Missing tool or rejected parameter: rediscover `tools/list` and use the exposed schema. Source names are case sensitive; do not repeatedly retry a guessed name.
- Partial completion: read the board, retain completed IDs and revision, then resume or reverse confirmed steps. Every successful operation may already be persisted.
- Isolation: call the failing tool directly without this workflow. A direct failure is a server/tool issue; changing skill prose does not fix it.

## Gate

Actual stdio discovery succeeds, the requested tool calls execute against the live store and subsequent `get_board` proves persisted state. Source-only inspection must be reported as source-only; never claim a client is connected without a real call.

## Hands back

Confirmed board IDs/revisions, completed calls, output files when requested and explicit recovery status.

## Owned resources

No bundled connector or credential file. The repository MCP implementation, tool descriptions and `docs/CONTRACT.md` are authoritative; the repository quick-start documents connection commands.
