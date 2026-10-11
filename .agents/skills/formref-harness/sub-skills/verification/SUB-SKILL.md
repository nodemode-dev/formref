---
name: verification
description: How FormRef work is proven. Load before handing back any UI, agent or service change, for the throttled Chromium procedure, layout-shift capture, live service checks and what may be claimed afterwards.
---

# Verification

"Looks fine" is not a result. State one of: verified under throttling, verified without throttling and why, or not verified.

## Service

Boot on a scratch data folder so real boards are never touched: `FORMREF_DATA_DIR=[scratch] backend/venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8196` from `backend/`, after `npm run build` in `frontend/` (the service serves `frontend/dist`). Check `GET /api/health`. Drive REST with a small script; read results back with `GET /api/boards/[id]`.

## Browser

Chromium through Playwright, launched with `--no-proxy-server` for loopback. Before navigation add a layout-shift observer that records each entry's value and source nodes. Throttle through CDP: `Emulation.setCPUThrottlingRate` 4 and `Network.emulateNetworkConditions` at 150 ms latency, 400 kbit/s down. Wait for `load` and for `#save-status` to read `Saved locally` (the board event stream never goes idle, so do not wait for network idle). Then exercise every path the change touched and read the shifts at the moment of change, not only at the end.

Expected: zero shifts on cold load and reload, including with docks collapsed and several tabs; the only shift during an agent turn is the board content the agent was asked to move. Any other shift names its source node; fix it before hand-back.

## MCP

Use the official SDK client over stdio (`StdioServerParameters` with this backend's interpreter and `-m app.mcp_server`), list tools, call one mutating tool, and read the board back over REST.

## Recording

Commit bodies state what ran and what did not. Untested runners or platforms are named as untested, never implied.
