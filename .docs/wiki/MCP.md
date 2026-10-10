# MCP

The real FormRef MCP server exposes board operations through the same live store/core used by the app. The repository-local harness provides sequencing and recovery; it does not substitute for tool access.

Run the backend through `./formref dev` or production `./formref serve`, then register the absolute repository `formref` executable with argument `mcp` as a stdio server. Set the client working directory to the repository. If no local API is running, the MCP server starts its own loopback API and closes that owned process when the connection ends. `FORMREF_API_URL` changes the loopback service URL; `FORMREF_PYTHON` changes the launcher's interpreter. Original files supplied by path must stay beneath `FORMREF_MCP_IMPORT_DIR` (default `~/.formref/imports`); raw base64 is also accepted.

Once connected, discover the server. Its current tools include `list_boards`, `create_board`, `get_board`, `add_items`, `update_items`, `arrange_items`, `transform_items`, `remove_items`, `undo`, `redo`, `import_asset`, `export_board`, `search_items` and `connect_items`. Resources expose board discovery and a board by ID; the `organize_references` prompt supplies an organization workflow. Live tool schemas decide exact parameters.

To arrange a board, call `list_boards`, get the intended board, retain exact item IDs, arrange those IDs, then get the board again. Check geometry and revision rather than relying on an acknowledgment alone. Successful tool mutations persist and send board revision events to the frontend.

A timeout may follow a completed mutation. Read back before retrying; retain returned asset/item IDs to avoid duplicate imports. Reverse only confirmed operations with Undo when rollback is requested.

If calls fail, check connection status, `/api/health`, absolute command/cwd, engine availability and filesystem permissions. The default service is local and does not need a cloud credential. Rediscover missing tools; isolate a failure by calling the tool directly without the harness workflow. Report the observed error rather than claiming an installed configuration is a working connection.
