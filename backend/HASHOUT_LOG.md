# Backend hashout log

## Navigation

- [FormRef root](../README.md)
- [Subsystem contract](../.docs/wiki/Engine-Contract.md)
- [Architecture](../.docs/wiki/Architecture.md)

## Contents

- [Unreleased · The window key, and the agent access fixes](#unreleased--the-window-key-and-the-agent-access-fixes)
- [Unreleased · agents sync copies the skills to .agents/skills](#unreleased--agents-sync-copies-the-skills-to-agentsskills)
- [Unreleased · agents/manifest.json says what the app offers agents](#unreleased--agentsmanifestjson-says-what-the-app-offers-agents)
- [Unreleased · A refusal tells the window who asked and what for](#unreleased--a-refusal-tells-the-window-who-asked-and-what-for)
- [Unreleased · Agent status in one call, Codex and Cursor tabs, typed socket notices](#unreleased--agent-status-in-one-call-codex-and-cursor-tabs-typed-socket-notices)
- [Unreleased · The app's own tabs use an entry named formref_tab, and agents sync checks the shared dock folder](#unreleased--the-apps-own-tabs-use-an-entry-named-formref_tab-and-agents-sync-checks-the-shared-dock-folder)
- [After v0.41.0 · One finder and one starter for the agent programs](#after-v0410--one-finder-and-one-starter-for-the-agent-programs)
- [v0.39.2 · PDF export and SVG pictures without a system library, and six smaller fixes](#v0392--pdf-export-and-svg-pictures-without-a-system-library-and-six-smaller-fixes)
- [v0.39.0 · A closed window's poll takes no job, and four smaller fixes](#v0390--a-closed-windows-poll-takes-no-job-and-four-smaller-fixes)
- [v0.38.1 · The window's scripts keep their types on Windows](#v0381--the-windows-scripts-keep-their-types-on-windows)
- [v0.38.0 · The engine frozen as the desktop app's sidecar](#v0380--the-engine-frozen-as-the-desktop-apps-sidecar)
- [v0.37.7 · Only the window's own origins reach the engine](#v0377--only-the-windows-own-origins-reach-the-engine)
- [v0.37.4 · Cross-site requests without an Origin are refused](#v0374--cross-site-requests-without-an-origin-are-refused)
- [v0.32.0 · Stack cards in picture exports](#v0320--stack-cards-in-picture-exports)
- [v0.31.0 · Collapsed groups follow their groups](#v0310--collapsed-groups-follow-their-groups)
- [v0.30.0 · Connection routes in exports](#v0300--connection-routes-in-exports)
- [v0.28.0 · Connection styles in exports](#v0280--connection-styles-in-exports)
- [v0.25.0 · Group connections](#v0250--group-connections)
- [v0.24.0 · Ratings in the SVG and phone viewer](#v0240--ratings-in-the-svg-and-phone-viewer)
- [v0.23.0 · Ratings read from pictures](#v0230--ratings-read-from-pictures)
- [v0.22.0 · Ratings in exported pictures](#v0220--ratings-in-exported-pictures)
- [v0.21.0 · Picture details](#v0210--picture-details)
- [v0.18.0 · Practice log](#v0180--practice-log)
- [v0.16.0 · Searches for all boards](#v0160--searches-for-all-boards)
- [v0.15.0 · Tags written into exported pictures](#v0150--tags-written-into-exported-pictures)
- [v0.14.0 · Keywords in picture files](#v0140--keywords-in-picture-files)
- [v0.13.0 · Tags in exports](#v0130--tags-in-exports)
- [v0.9.0 · Find Similar](#v090--find-similar)
- [v0.8.0 · Find by Color, Sort by Color](#v080--find-by-color-sort-by-color)
- [v0.7.7 · Adjustments in exports, selection to a new board](#v077--adjustments-in-exports-selection-to-a-new-board)
- [v0.7.6 · Extract Palette](#v076--extract-palette)
- [v0.7.5 · agents sync](#v075--agents-sync)
- [v0.7.4 · Phone viewer](#v074--phone-viewer)
- [v0.7.3 · PDF text and readable notes in exports](#v073--pdf-text-and-readable-notes-in-exports)
- [v0.7.2 · All pictures export](#v072--all-pictures-export)
- [v0.7.1 · BeeRef .bee boards](#v071--beeref-bee-boards)
- [v0.6.8 · PDF export and PDF pages](#v068--pdf-export-and-pdf-pages)
- [v0.6.7 · Image previews and the command line](#v067--image-previews-and-the-command-line)
- [v0.6.6 · Duplicate images](#v066--duplicate-images)
- [v0.3.2 · Embedded agent service, consent gate, similarity features, session](#v032--embedded-agent-service-consent-gate-similarity-features-session)
- [v0.3.0 · Original pixel sampling and formatted references](#v030--original-pixel-sampling-and-formatted-references)
- [v0.2.0 · Canvas settings and snapping through MCP](#v020--canvas-settings-and-snapping-through-mcp)
- [v0.1.0 · Local board service and SDK MCP](#v010--local-board-service-and-sdk-mcp)
- [boot_backend.bat](#boot_backendbat)

## Unreleased · The window key, and the agent access fixes

- refers-to: `app/core/window_key.py` (new) :: WindowKeyGuard, OPEN, BRIDGE, claim, ticket, spend; `app/core/seal.py` (new) :: effective, sign; `app/routers/window.py` (new); `app/main.py` :: app.add_middleware; `app/routers/terminal.py` :: _window_only, chat_events, attach; `app/routers/agent.py` :: save_agent_settings; `app/routers/commands.py` :: _window_only; `app/routers/cloud.py` :: from_agent; `app/routers/clip.py` :: get_token, reset_token; `app/agent/service.py` :: loopback_url, Agents.settings, save, allows, tokenless_turn, token_file, revoke, _cli; `app/agent/claude_code.py` :: issue, revoke, argv; `app/agent/chat.py` :: _run; `app/agent/runners.py` :: argv; `app/agent/terminal.py` :: Session.on_close, base_env; `app/cli.py` :: call; `formref_engine.py` :: main; `freeze_engine`; `requirements.txt`, `requirements_macos.txt`

The window key. The engine makes a random key at start and keeps it in memory. Every request that is not a GET, HEAD or OPTIONS needs it in `X-FormRef-Window-Key`, in one place (`WindowKeyGuard`, outermost), unless its path is on the open list: `/mcp` (outside agents), `/api/window/key` (the development bootstrap) and `/api/clip` (the browser extension, which keeps its own token and Origin checks). The stdio relay and the command line cannot hold the key; they reach the engine's REST routes with `X-FormRef-Client`, and the guard lets exactly the routes the MCP tools use (`BRIDGE`) through for such a caller, where the existing consent check still decides. Every other write from a caller that names itself an outside agent is refused. Reads that return a secret or a session (the clipper token, the terminal list, Claude Code and Chat state, the command long poll, cloud listings) need the key too. The terminal socket needs the key as its first message, and the Chat event stream a one-time ticket (`POST /api/window/ticket`, 30 seconds, spent once), because a browser cannot set headers on those.

How the window gets it. The desktop shell starts the engine with `FORMREF_WINDOW_KEY_STDOUT=1`; the engine then prints `formref-window-key: <key>` on its standard output before it serves, flushed, and the shell reads that pipe and sets one page global on the engine's own origin. Without the variable the engine prints nothing and `POST /api/window/key` answers once; a second try answers 409 and is reported as `second_window_claim` in the agent settings. With the variable the route does not exist. The development mode is weaker by nature: any local program that asks first gets the key.

The command line. `./formref open` and `./formref import` now send `X-FormRef-Client: outside`, so they follow the stored choice (outside agents off by default) and cannot change it. They need `PUT /api/session` besides the MCP routes, so that route is on the bridge list.

In-app agent tokens. Each Claude Code tab and each Chat run gets its own token, written to a mode 0600 file in `AgentTokens` under the data folder that the child reads as its `--mcp-config`; the token is never on a command line, not in a plain terminal's environment, and dies when the tab closes (or the run ends). A panel turn hands Claude Code its MCP configuration the same way. `FORMREF_WINDOW_KEY_STDOUT` is removed from the environment of terminals and agent children.

The stored choice is sealed. `agent.json` gains a `seal`: an HMAC-SHA256 over `outside_agents` and `claude_bin` with a random key kept in the operating system's keychain (`keyring`, service FormRef, account settings-seal). A seal that is missing or wrong while either field is loosened makes the engine act as if outside agents were off and the program path unset, and report `seal_broken`; the window's next write of those fields seals them again. With no keychain the engine runs, the stored values stand and `seal` reads `unavailable`. `keyring` is imported lazily inside a try block so a packaging miss cannot stop the engine. The first launch after this update treats an existing "outside agents on" as off until the person turns it on again.

The agent access fixes. The Ollama address check compared the start of the text, so `http://127.0.0.1.something.example` passed; it now parses the address and accepts only `http`, no user name, and `localhost` or a loopback IP address, both when it is saved and when it is read (a hand-edited file falls back to the default). Agent settings, including Confirm changes, change only with the window key. An outside caller was accepted for as long as any panel command-line turn ran; the allowance now applies only while a Codex or Cursor turn runs (their stdio relay does not receive the per-turn token, which could not be checked here), and the confirm card for that caller goes to that turn.

Not changed: `/api/clip/boards` and the clipper's pairing token, the Host, Origin and consent checks, the sockets' Origin rule.

## Unreleased · agents sync copies the skills to .agents/skills

- refers-to: `app/cli.py` :: mirror_differences, agents_sync

`.agents/skills` had fallen behind `.claude/skills` (two files differed and `references/commands.md` was missing) because `agents sync` only wrote the command reference and nothing copied the skills across. After writing the reference, `agents sync` now copies every file under `.claude/skills` whose bytes differ from the same path under `.agents/skills`, and `--check` fails when any does. Files that exist only under `.agents/skills` (`agents/openai.yaml`) are left alone and nothing is deleted. Checked on a data folder holding the catalogue a headless window published: `--check` failed with 3 files, `sync` copied 3, `--check` passed.

## Unreleased · agents/manifest.json says what the app offers agents

- refers-to: `app/agent_manifest.py` (new) :: manifest, approval_gated, mcp_section, skills_section, DOCK; `app/cli.py` :: agents_sync; `agents/manifest.json` (new, written by the sync); `tests/test_agent_manifest.py` (new)

The family spec reads one file per app, `agents/manifest.json`, so counts of tools and skills are no longer typed into documents. `agents sync` writes it and `agents sync --check` fails, naming `agents/manifest.json`, when the committed file is not what the sync would write. App name `formref` (the file name in formcompiler `apps/`). Every field is read, none typed, except the dock.

`mcp.tools` and `mcp.read_only` come from `mcp.list_tools()` on the server object, the call the server answers `tools/list` with, so the order and the read-only hint are what a client gets (47 tools, 13 read-only). Compared with a running engine's `POST /mcp` `tools/list`: same 47 names in the same order, same 13 read-only. `mcp.transports` is `stdio` when `mcp_server.py` runs the stdio transport and `http` when `main.py` mounts `streamable_http_app()`.

`mcp.approval_gated`. FormRef's gate does not ask per tool. It asks per request: the middleware in `main.py` calls `agents.review`, which asks about a `remove` command, about any of the commands in `MOVES` (transform, pack, sort, distribute, align, snap, normalize) when they touch 10 or more items, and about deleting a whole board; and `routers/commands.py` asks before a window command marked risky runs. Only while a panel turn is running and `confirm_changes` is on; otherwise the call is let through (a tokenless outside client) or refused (a risky window command). So the field names the tools that can reach the gate, not tools that always wait: the manifest module reads `mcp_server.py` as source and lists a tool when it sends a command through `command()` whose type is `remove` or a key of `MOVES`, or when it posts to `/api/commands/.../run`. Result: `arrange_items`, `snap_items`, `transform_items`, `remove_items`, `run_command`, `run_commands`. `remove_background` also contains the word remove but posts to its own route and is not listed. The one literal that is not read from the gate's data is `remove`, because `_risky` tests it inline; a test calls `_risky` with every gated type and with types that are not gated, so the two cannot drift apart unseen. No route deletes a board through an MCP tool, so the board-deletion ask reaches no tool.

`skills` are the folders of `.claude/skills` that hold a `SKILL.md`, with the sub-skills being the folders under `sub-skills/` that hold a `SUB-SKILL.md` (one skill, `formref-harness`, 8 sub-skills). `extensions` is null: nothing in the app hosts form.ext extensions (searched the frontend, backend and shell for form.ext and host API names; none).

`dock` is the one declared value (`DOCK` in `agent_manifest.py`), because it lives in the page. Today's truth: the terminal dock in `frontend/src/ui/terminal-dock.ts` and `frontend/src/styles/dock.css` sits in the bottom grid row only (`.term-dock { grid-row: 3 }`, a resize handle on its top edge, no left, right or floating placement), and its tabs are the Chat tab (`this.chatTab`, title "Chat"), terminal tabs (kind shell, titled "Terminal N") and Claude Code tabs (kind claude), written as `chat`, `terminal`, `claude`. The Agent panel on the right of the window (`data-panel-tab="agent"` beside the Inspector) is a side panel, not the dock, and is not counted. Change `DOCK` when the dock changes.

The sync's three parts are now independent. The manifest and the `.agents/skills` mirror need no window; only the command reference needs the catalogue the open window publishes. Without the catalogue the sync says so on stderr and skips only the reference (before, it stopped with an error and did nothing), and `--check` still checks the manifest and the mirror, so it can run where no window has ever been opened.

Documents compared: README line 95 and the MCP and Engine-Contract wiki pages say 47 tools, which is what the manifest holds; nothing else in the repository states a read-only, gated or skill count. Verified: formadaptor's `scripts/manifest.py check` accepts the file; `--check` exits 0; in a copy of the repository outside the tree, changing `list_boards` from read-only to write made `--check` exit 1 and name `agents/manifest.json`.

## Unreleased · A refusal tells the window who asked and what for

- refers-to: `app/agent/service.py` :: ASKED, ANSWERS, asked, Agents.refusal, Agents.refuse; `app/main.py` :: local_access; `app/routers/boards.py` :: events; `app/mcp_server.py` :: client_name, api; `tests/test_dock_engine.py` (new)
- kind: rationale
- logged: after v0.39.2, unreleased · 2026-11-19

The family is moving to one shared dock with one dialog for outside agents. That dialog names the agent and says what it asked. FormRef's `consent` event carried only `{"refusals": n}`. It now also carries `id` (new for each refusal), `agent`, `what`, `answers`, `always`, `expires` and `held`. The present window reads none of them (it listens for the event and ignores its data), so nothing it shows changes.

What each field says today, truthfully. FormRef refuses the call first and tells the window afterward, so `held` is false and `expires` is null: nothing is waiting, and the agent has to try again after the person allows outside agents. `answers` is `["deny", "always"]`: "deny" needs no call (the request was already refused) and "always" is the existing `POST /api/agent/settings {"outside_agents": true}`. There is no "once", because there is no held call to let through. `always` is `"all"`: the stored choice covers every outside agent, FormRef has nothing finer.

`agent` is the name the client announced: the MCP `clientInfo.name` over stdio, the first word of `User-Agent` over HTTP (the HTTP endpoint is stateless, so a tool call has no `initialize` to read), sent by `mcp_server.api` to the engine in a new `X-FormRef-Agent` header beside the existing `X-FormRef-Client`. The engine keeps printable characters and at most 64 of them. It is a label for the dialog only: nothing is allowed or refused by it. It is an empty string when no name was announced; the dialog owns the fallback wording, so it can be translated. `what` completes "It asked to ...": one of twelve phrases chosen from the method and path in `ASKED` (create a board, change a board, add a picture or a file, and so on), or "make a change".

`Agents.refuse` replaces the bare `agents.refusals += 1` in `main.py`; the counter rises as before.

Not changed, on purpose: the gate still refuses first. Holding the call while the window asks (and with it "Allow once", an expiry, a withdrawal event and a Blocked choice) changes what the present window does, so it waits for the dock port; the design is in the engine-prep report.

Verified on a running engine (port 33401, fresh data folder): an outside `tools/call create_board` through `/mcp` was refused as before and the event carried all eight fields with the caller's `User-Agent` word as `agent`; a stdio client that announced "Stdio Probe" was named so; a direct call with no name gave an empty `agent`; a 200 character name arrived as 64. The test was written after.

## Unreleased · Agent status in one call, Codex and Cursor tabs, typed socket notices

- refers-to: `app/agent/programs.py` (new) :: INSTALL, status, workdir, open_tab; `app/routers/terminal.py` :: AgentOpen, agent_status, agent_open, attach (typed, notice); `tests/test_agent_programs.py` (new); `tests/test_terminal_frames.py` (new)
- kind: rationale
- logged: after v0.39.2, unreleased · 2026-11-19

Three additions the shared dock needs, none of which the present window calls, so nothing it does changes.

`GET /api/agent/status` (window key required, refused for a caller that names itself an agent). One answer for the three programs: `{claude, codex, cursor}`, each `{installed, path, version, signedIn, install}`. `install` is always a command line a person can paste, never a sentence. `signedIn` is true, false or null (the engine cannot tell): for Claude Code it is true when `ANTHROPIC_API_KEY` or `CLAUDE_CODE_OAUTH_TOKEN` is set, else what `claude auth status` reports as `loggedIn`, which runs no model call; for Codex and Cursor it is null. The answer is kept for 60 seconds; `?fresh=1` looks again. Unlike `GET /api/claudecode` it does not create the work folder, and the engine never calls it by itself. `GET /api/claudecode` and `GET /api/agent/runners` are untouched because the Agent panel reads them.

`POST /api/terminal/agent {kind: "codex" | "cursor", cols, rows}` (a write, so the window key guard covers it). It starts the found program in a terminal tab of that kind, titled Codex or Cursor. The tab gets its own token: in the child's environment as `FORMREF_AGENT_TOKEN` with `FORMREF_MCP_URL` beside it, in the engine's token set until the tab closes, never on a command line and never in a plain shell tab. A missing program answers 404 with `code: "not_installed"`; any other kind 422. Restart keeps the tab and its token; close revokes it.

Why a token: FormRef's panel turns reach the engine without one for Codex and Cursor (the static `.codex/config.toml` and `.cursor/mcp.json` in the app's folder), and are admitted only while such a turn runs. A dock tab is not a turn, so without its own token every change from it would be refused as an outside agent and the window would ask about the app's own tab. The panel-turn path is not touched.

How the program presents the token. The tab starts in a folder the engine owns, `AgentTabs` in the data folder (mode 0700), never in a folder the person chose, because the engine writes two files there, both mode 0600 and both holding a placeholder in place of the token: `.codex/config.toml` with `url` and `env_http_headers = { "x-formref-inapp" = "FORMREF_AGENT_TOKEN" }` (Codex reads the header value from the named variable; it reads a project file only in a folder the person has trusted, which it asks about at first start), and `.cursor/mcp.json` with `url` and the header `${env:FORMREF_AGENT_TOKEN}`. The same two files serve every tab, since the secret is only in each child's environment. Neither real program is on this machine: the key names are from each program's documentation, and the stand-in run shows only that the token and the files are where they should be.

Typed notices on the terminal socket. The first message may now carry `"frames": "typed"` beside the key. Then terminal output stays in text frames and every notice is a binary frame holding JSON: `{"type": "hello", "id", "kind", "alive"}` first on every attach, and `{"type": "exit", ...}` when the program ends (or at once after the replay when it already has). Without the field the socket behaves as before: no hello, and the exit notice is the text frame `{"type": "exit"}` the present page compares against. The typed form exists because a text frame of output could be the same characters as the notice.

Verified on running engines (33401 with stand-in `claude`, `codex` and `cursor-agent` on PATH, 33402 and 33403 without): status with and without the programs, and without the key (403); each tab kind started, the token was in the child's `/proc` environment and absent from `ps -eo args`, a change sent with it under Ask was let through, still after Restart, and refused as an outside agent after Close; a plain shell had no token; both socket forms on a live shell, after `exit`, and on attach to an ended one. The write-route walk: 60 write operations before, 61 after, the new one refused without the key. Tests were written after.

## Unreleased · The app's own tabs use an entry named formref_tab, and agents sync checks the shared dock folder

- refers-to: `app/agent/claude_code.py` :: `issue`, `argv`, `NOTE`; `app/agent/chat.py` :: `_argv`; `app/agent/programs.py` :: the two files in `AgentTabs`; `app/agent_manifest.py` :: `DOCK`, `dock_problems`; `app/cli.py` :: `agents_sync`; `tests/test_dock_manifest.py`; `tests/test_agent_guards.py`

The MCP entry the engine writes for its own Claude Code tab, its Chat and its Codex and Cursor tabs was named `formref`, the same name a person gives the entry of an outside agent (`.mcp.json`, `.codex/config.toml`, `.cursor/mcp.json` in the app's folder). It is `formref_tab` now, with `--allowedTools mcp__formref_tab` to match, so the two cannot be mistaken in a program's own list of servers. Panel turns (`service.py`, `runners.py`) keep `formref`: they are not tabs.

`./formref agents sync` and `--check` now stop, naming the file, when a file in `frontend/src/dock` does not match that folder's `MANIFEST.json` or is not listed in it. FormRef never writes that manifest: the folder arrives whole from FormVis. `agents/manifest.json` says the dock can sit at the bottom or the right and lists the Codex and Cursor tabs.

Run on an engine from source (33421, stand-in programs): a Claude Code tab's token and a Codex tab's token each ran `create_board` through `/mcp` under Ask while the tab was open; after the tab closed the same token was refused with the text an unknown outside agent gets, and the window was asked. No route was added: the write-route walk still finds 61.

## After v0.41.0 · One finder and one starter for the agent programs

- refers-to: `app/agent/agent_lookup.py` (the family's file, version 1.0.0, copied unchanged from FormVis); `app/agent/claude_code.py` :: `OVERRIDES`, `SETTINGS`, `OTHERWISE`, `setting`, `child_env`, `located`, `said`, `cli`, `info`, `argv`, `open_tab`; `app/agent/runners.py` :: `places`, `located`, `said`, `find`; `app/agent/programs.py` :: `REPORTED`, `INSTALL`, `_claude_signed_in`, `status`, `open_tab`; `app/agent/service.py` :: `available`, `_cli`; `app/agent/chat.py` :: `_argv`, `_run`, `send`; `tests/test_agent_programs.py`

FormRef started from the Dock, the Finder or the Start menu gets the system's short PATH, so a program installed by Homebrew, npm or a version manager was reported as not installed. Claude Code had its own short list of places and a login shell question, Codex and Cursor had `runners.places`, panel turns started the program directly with the engine's PATH, and each tab and check built its own environment. All of them now go through `agent_lookup.py`: the person's setting, the override variable, the engine's PATH, the known install folders, then the person's shell PATH read once. Every start (tab, Chat, panel turn, `--version`, `auth status`) uses `agent_lookup.start_argv` and one child environment with the program's own folder first on PATH, so a node script finds the node beside it.

What changed shape, and what did not. `claude_code.cli`, `info`, `argv`, `child_env`, `open_tab`, `runners.find`, `runners.places`, `programs.status` and `programs.open_tab` keep their names. `info` and each program in `/api/agent/status` gain `finding` (`runs`, `broken`, `missing`), `how`, `looked`, `error` and `said`; the status also gains `title` and a fourth program, `antigravity` (found or not and where it looked; no tab, label or file). `installed` is true only when `--version` ran. `child_env` takes the program's path. `runners.located` and `runners.said` exist because `service.py` cannot import `claude_code` at the top (it imports `service`).

Removed, because the finder holds them: `claude_code.KEEP_ENV`, `CANDIDATES`, `SYSTEM_PATHS`, `INSTALL`, `_from_login_shell`; `runners._usable`, `_login_shell_lookup` and the folder list inside `places`; `programs._run`, `_version` and its own install lines. Where the lists differed the finder wins: Cursor is looked for as `cursor-agent` first, and `agent` counts only when its real path names Cursor.

The person's own path exists for Claude Code only (`claude_bin`, sealed as before), so `setting` answers `None` for the other three and their sentence does not mention a setting. The field is in the Agent panel, so the sentence ends "or give its path in the Agent panel". Override variables: `FORMREF_CLAUDE_BIN` as before, and `FORMREF_CODEX_BIN`, `FORMREF_CURSOR_BIN`, `FORMREF_ANTIGRAVITY_BIN` are read the same way. No setting and no interface was added.

The refusals carry the finder's sentence: the Codex and Cursor tab route (404, `not_installed`), the Claude Code tab and Chat (422), a panel turn, and the `note` of a program in `/api/agent/runners`. The dock adapter (`frontend/src/dock-adapter.ts`) was not changed: it still answers `notInstalled` for the code `not_installed` and hands the engine's message on, and it does not keep `said` per program the way FormVis's adapter does.

Run on an engine from source (port 4750, PATH `/usr/bin:/bin:/usr/sbin:/sbin`, a made-up home, a stand-in shell, stand-in programs; no real agent program was started): `/api/agent/status?fresh=1` answered `runs` for all four under known folders (`how` `folder`), again with all four only on the stand-in shell's PATH (`shell`), `broken` with the error line for a script whose interpreter is missing, and `missing` with the list of places for all four. Codex, Cursor and Claude Code tabs opened through their routes with a `#!/usr/bin/env node` stand-in and a stand-in `node` beside it: each printed its line with its own folder first on PATH. Chat started and read the stand-in's session; panel turns with the Claude Code and Codex stand-ins started the same way. Not run: Windows, macOS, a fish shell, a frozen engine, and any real Claude Code, Codex, Cursor or Antigravity.

Tests: the two fixtures in `tests/test_agent_programs.py` replaced `runners._login_shell_lookup` and `runners.places`, which are gone; they now use a stand-in shell, a made-up home and no system folders (`agent_lookup.system_folders`). The exact-fields test lists the new fields, the missing test expects four programs, and the kept-status test changes the stand-in's version line instead of replacing `programs._version`. One test was added for a known folder, the shell PATH and a program that does not start.

## v0.39.2 · PDF export and SVG pictures without a system library, and six smaller fixes

- refers-to: `app/core/pdf_draw.py` (new) :: render, svg_page, Fonts, serialized; `app/core/exports.py` :: pdf_export, png_export, svg_export; `app/core/doc_export.py` :: pdf; `app/core/media.py` :: svg_png; `app/core/pdf_pages.py` :: page_items, pdf_text; `app/core/endpoints.py` :: route, heads, path_data, polyline; `app/agent/runners.py` :: places, find; `app/agent/service.py` :: available; `app/core/templates.py` :: save_template; `app/routers/demos.py` (new) :: open_demo; `formref_engine.py` :: sweep_stale_unpacks; `freeze_engine`, `freeze_engine.bat`; `requirements.txt`, `requirements_macos.txt`

PDF export. 0.39.0 made a missing Cairo a clear message, but the macOS and Windows installers carry no Cairo, so the three PDF formats and the one-card PDF could not work there at all. `core/pdf_draw.py` draws every PDF with PDFium through pypdfium2, which the service already needed to read PDFs and whose wheels carry PDFium for every platform. Text is set in the faces `exports.font` measures with, plus fallback faces (a list of usual Linux, macOS and Windows font paths) for scripts those faces lack; each face is cut down to the characters used by fontTools and embedded. PDFium has to hold the fonts before it draws a page, so every page is drawn twice: a dry pass on a recording canvas collects the characters, the fonts are embedded, then the real pass draws. A font with CFF outlines is rewritten with TrueType outlines (`quadratic`), because that is what PDFium's font loader embeds. `svg_page` paints the part of SVG that `exports.svg_export` writes (shapes, paths, dashes, text, pictures; the export writes no gradients, clips or filters, so none are painted), page by page, so the board PDF keeps matching the SVG export instead of drifting into a second drawing path. PDFium cannot set the document information, so the title and creator are added as an incremental update after the document is saved, as Cairo had written them. PDFium is not thread-safe: one re-entrant lock covers every call, and `serialized` wraps `pdf_pages.page_items` and `pdf_text` as well, because the service runs endpoints in threads and a PDF read during an export would otherwise share PDFium with it. `doc_export.pdf` lays out with the same measure and now draws through the same module. Measured against the Cairo output on 16 files (four boards, three layouts, one note): same page counts and page sizes, mean absolute difference of the page images 0.7 to 5.4 on a 0 to 255 scale, all from glyph shapes (Cairo drew with fontconfig's sans-serif at positions measured with DejaVu; the new path draws with the face it measured). Geometry, strokes, dashes and pictures are identical. Connection labels are readable now: CairoSVG ignored `paint-order` and stroked the label's background outline over the text. Link runs are underlined as in the PNG and SVG exports. Links in the board PDF are not clickable, as before (CairoSVG treats `a` as plain text); the one-card PDF writes link annotations through `Canvas.link`, as it did with Cairo. With the three libcairo files hidden from the process the output is the same as with them present, apart from dates and ids.

SVG pictures. `media.svg_png` rasterizes a checked SVG (`store.check_svg` already refuses external references and fixes the size) with resvg-py 0.5.0, replacing CairoSVG, so the same missing-library failure is gone for pictures too, and with it the `deny_fetch` hook. Differences a person can see: filter blur and mask now render (CairoSVG ignored both), `text-anchor: middle` with a styled `tspan` is placed correctly, the serif family resolves to a different face, edges are anti-aliased slightly differently. The other resvg binding on PyPI (`resvg` 0.2.0) rendered blank images and panicked on bad input, so it was not used. A failure to decode is the same "Registered image cannot be decoded." as before.

Frozen engine. `freeze_engine` and `freeze_engine.bat` no longer collect CairoSVG and cairocffi data; they name what PyInstaller cannot see by itself: `--collect-submodules fontTools.ttLib.tables` (fontTools imports its table modules by name), `--hidden-import fontTools.subset`, `pypdfium2` and `resvg_py`. `requirements_macos.txt` had CairoSVG and no pypdfium2 although the code imports it (it was unpinned, and `backend/oc_install` installs it on a Mac); it now lists resvg-py, pypdfium2 and fonttools. The engine froze on Linux here and ran with the Cairo files hidden, with the same export sizes.

Connection routes in exports. The window now ends a connection on the sides that face each other (see the frontend log), so `endpoints.route` returns the four ends and whether the line runs top to bottom, and `heads`, `path_data` and `polyline` take `vertical`; a vertical line is the horizontal geometry with the axes swapped. `anchors` stays as a thin wrapper for callers that need only the ends. PNG, SVG and therefore PDF exports use `route`, so what is exported matches the window. Stored connections are unchanged; the ends are computed on every draw.

Codex and Cursor. `runners.find` looked on `PATH` only for both, as 0.39.0 did for Claude before its fix; a program started from the Finder, the Start menu or a desktop shortcut has a shorter `PATH` than a terminal. `places` lists where each is usually installed (npm's global folder and `NPM_CONFIG_PREFIX`, pnpm, Volta, bun, `~/.local/bin`, nvm's node versions, Cursor's versions folder, Homebrew, `/snap/bin`, Linuxbrew, `%APPDATA%\npm`, `%LOCALAPPDATA%` folders, Codex's app bundle on a Mac); if none is there, a login shell is asked (`command -v`), as the terminal dock does, with a 60 s cache and a 10 s timeout so the Agent panel's runner list cannot hang. `Agents.available` now calls `find` in a thread because of that shell call.

Templates. `save_template` takes an optional `replace_id`: an existing saved template (a built-in, or an id with no file, is refused) is overwritten under its own id, so Save as Template under a name already in use replaces instead of making a second row. The window asks first (frontend log).

Demo boards. `POST /api/demos/{demo}/open` (`routers/demos.py`) imports the demo's `board.formref` from `frontend/dist/demos/<id>/` on the server, so the window neither downloads nor uploads a 0.6 to 2.4 MB file, and puts the demo's shipped 256 px previews into the service's preview cache when they are not there yet. The previews are the service's own preview output, copied, so a first open resamples nothing at that size. The route checks the id (`[a-z0-9-]{1,40}`) and each asset id (64 hex characters) before it builds a path, and answers 404 when the folder is absent (a service without the built window); the window then falls back to the old fetch and upload.

Engine unpack folders. A one-file PyInstaller engine unpacks to `_MEI<pid in hex><suffix>` in the temp folder and removes it only when it exits cleanly; on Windows a killed or crashed engine leaves its folder, a full copy of the bundle, behind every time. `sweep_stale_unpacks` runs on a thread at start: it writes its own pid into its folder, then removes every other `_MEI` folder whose launcher pid (from the name) is gone and whose engine pid (from the file the engine wrote, when there is one) is gone too. Both checks are needed: the launcher is the process the name carries, but the engine is its child and can outlive it. Names that do not match the pattern, and old-style names, are left alone. `pid_in_use` uses `OpenProcess` and `WaitForSingleObject` on Windows (access denied counts as in use) and signal 0 elsewhere (a permission error counts as not in use, so a folder of another user's engine is only removed if the system lets this process remove it; removal errors are ignored). The sweep ran on Linux against eight prepared folders (dead launcher with and without a suffix, live launcher, dead launcher with a live engine, old-style names, a name that does not match, another directory); the two live ones and the three non-matching ones were kept.

Verified (by the agents, on Linux): the PDF and picture comparisons above, the frozen engine with Cairo hidden, the sweep, the new demo route and the preview copy. Not verified: PDF and SVG export through the frozen engine on macOS and Windows, the fonts it finds there (the fallback paths for those systems are written from their usual locations, never run), the Windows branch of `pid_in_use` and the sweep on Windows, Codex and Cursor lookup on a Mac or a PC.

## v0.39.0 · A closed window's poll takes no job, and four smaller fixes

- refers-to: `app/routers/commands.py` :: next_job, PollWatch, GONE; `app/main.py` :: add_middleware(PollWatch); `app/agent/runners.py` :: find; `app/core/exports.py` :: pdf_export; `formref_engine.py` :: watch_shell; `../build_app`

Window bridge. A command sent to the window (`POST /api/commands/{id}/run`) returned 504 when a window had closed or reloaded in the last 25 s: the closed window's long poll `GET /api/commands/next` was still waiting on the job queue, took the job, and answered nobody. `request.is_disconnected()` cannot see this here: under the `@app.middleware("http")` guard Starlette's wrapped receive never reports the disconnect (measured in a small app: False for 4 s after the client left). `PollWatch` is a pure ASGI layer outside that guard, for this one path only: it reads `receive()` until `http.disconnect` and sets an event in the scope. `next_job` waits for a job or that event; a job taken by a poll that has gone is put back on the queue. A poll that has gone no longer refreshes the "window is open" time. Reproduced with one abandoned poll, one live poll and one run: before, the live poll got nothing; after, it gets the job.

Agent panel. `runners.find("claude")` looked on `PATH` only, and an app started from the Finder has a minimal `PATH`, so the panel said Claude Code was not installed while the terminal dock, which also looks in the usual install folders and asks a login shell, found it. `find` falls back to `claude_code.info()` (imported inside the function: `claude_code` imports the service). Codex and Cursor are still found by `PATH` only.

PDF export. `import cairocffi` raises `OSError` when the system has no Cairo library (the macOS and Windows installers carry none), and the `OSError` handler answered "Local storage operation failed". `pdf_export` raises the same kind of `ValueError` that SVG pictures already do, naming Cairo. The three PDF formats still need a system Cairo there.

Frozen engine. When the desktop shell dies without stopping the engine, `watch_shell` exits the server; the onefile launcher was then left to clean up or not. It now removes its own unpacked `_MEI` folder first (the shell's part is in the desktop log). `../build_app` runs `--selfcheck` on the engine inside the finished macOS app, after the bundler has signed it, and stops the build when it fails: the check after freezing runs before signing and cannot show a signature that refuses the engine's libraries.

Verified: `pytest tests` 78 passed; the bridge reproduction above; a dialog command through the bridge answers in 0.29 s (the window's part is in the frontend log). Not verified: nothing was frozen here (PyInstaller is not installed), so the `_MEI` removal and the in-app self-check were not run.

## v0.38.1 · The window's scripts keep their types on Windows

`app/main.py` pins `.js` and `.mjs` to `text/javascript` and `.css` to `text/css` with three `mimetypes.add_type` calls after the last import. Python's `mimetypes` takes file types from the Windows registry (`HKEY_CLASSES_ROOT\.js`, value `Content Type`) over its own table, and some installers and editors set `.js` to `text/plain`. On those PCs the `FileResponse` for `frontend/dist` sent the built window's scripts as `text/plain`, WebView2 refused every module script under strict MIME checking, and the desktop window stayed blank; macOS, Linux, dev mode (Vite serves the page) and Windows PCs with the default value never showed it. The calls sit after the last import, not above the imports: a module that re-reads the registry while importing cannot undo them, and no import follows a statement (E402). They look redundant off Windows; keep them. Repro on a Windows PC: `reg add "HKCU\Software\Classes\.js" /v "Content Type" /d "text/plain" /f`, then launch the rebuilt app; restore with `/d "text/javascript"`. Checked here: with the table poisoned to `text/plain` for js, mjs and css through `mimetypes.init(files=...)`, the three calls return `text/javascript`, `text/javascript` and `text/css`; `py_compile` passes. Not yet run on a Windows PC.

## v0.38.0 · The engine frozen as the desktop app's sidecar

- refers-to: `formref_engine.py` (new) :: main, selfcheck, watch_shell; `freeze_engine`, `freeze_engine.bat` (new); `requirements_desktop.txt` (new); `app/core/config.py` :: ROOT; `app/agent/terminal.py` :: API_URL

The desktop app no longer needs `./formref serve` running beside it: the service is frozen with PyInstaller into one file, `formref-engine`, which the Tauri shell starts and stops (see `src-tauri/HASHOUT_LOG.md`). `formref_engine.py` is its entry: it listens on 127.0.0.1 at `FORMREF_PORT` (8320 when unset, the port the dev service, the CLI and outside MCP clients already use), sets `FORMREF_API_URL` to that address when the shell has not, and exits by itself when the process named by `FORMREF_PARENT_PID` is gone, so a crashed shell leaves no engine holding the port. `--selfcheck` imports the service and its main libraries, prints them as JSON and fails when one is missing or when the window or the background model is not inside the file; the freeze scripts run it right after freezing, so a missing hidden import stops the build instead of the installed app.

Frozen, `ROOT` is the PyInstaller extraction folder (`sys._MEIPASS`), where the freeze puts the built window at `frontend/dist` and the background model at `app/bundled_models`, so `main.frontend` and `models.BUNDLED` find them at the paths they use in a checkout. The Rust core is not packed into the file: it ships as its own sidecar (`formref-core`, signed with the app on macOS) and the shell passes its path in `FORMREF_ENGINE_PATH`. The terminal dock read the service address as a fixed 8320; it now reads `FORMREF_API_URL` like the agent service and the MCP server, so terminals and agents started from a packaged app on another port reach the right service.

`freeze_engine` (macOS, Linux) and `freeze_engine.bat` (Windows) need the backend venv, the built window and the built Rust core; they install `requirements_desktop.txt` (PyInstaller 6.22.3, the family pin) into the venv, freeze, and copy the engine and the core into `src-tauri/binaries/` with the host triple from `rustc -vV` (or `FORMREF_TARGET`) as Tauri's `externalBin` expects. `--add-data` uses `:` on macOS and Linux and `;` on Windows. Collected beyond what PyInstaller finds by itself: every `app`, `uvicorn` (string-loaded protocols), `mcp.server`, `mcp.shared`, `mcp.client` and `websockets` submodule plus `mcp.types` (`mcp.cli` is excluded: collecting all of `mcp` imports `mcp.cli`, which exits without `typer`, and the first Linux freeze stopped there), the data of `cairosvg` and `cairocffi`, `ptyprocess`, and on Windows all of `winpty` (its DLLs and agent executable).

Frozen, `sys.executable` is the engine itself, so the embedded agent runners, which give their MCP clients `sys.executable -m app.mcp_server`, would start a second service. The entry answers those arguments (and `mcp`) with the stdio MCP relay instead, as `python -m app.mcp_server` does in a checkout. The relay's own fallback, starting a missing service with `-m uvicorn`, is not answered: inside the app the shell has already started it.

Not built here: no freeze has run on any OS.

## v0.37.7 · Only the window's own origins reach the engine

- refers-to: `app/core/origins.py` (new) :: WINDOW_ORIGINS, allowed, loopback_host; `app/main.py` :: local_access; `app/routers/terminal.py` :: _local, attach

Family ledger FB-044 (S1), found by the FAMILY_TEST_PLAN F1 layer. `local_access` admitted any `http` or `https` Origin whose host was `localhost`, `127.0.0.1` or `::1`, whatever its port, and the terminal websocket did the same, so a page served from any other port on this computer (another app's dev server, a local preview, a downloaded page opened through one) could open a terminal (`POST /api/terminal`, then `/api/terminal/{sid}/ws`), run commands in it, and edit every board. The family standard (G2) admits an Origin only when it is one of the window's own origins or the engine's own origin, the `http` Origin whose host and port equal the request's Host.

`origins.allowed` is that rule in one place: the dev window and preview on localhost and 127.0.0.1 (5320, 5321), `tauri://localhost` and `http://tauri.localhost` (the desktop shell today loads the engine's own URL, FB-019), the engine's own origin, and the clipper's extension origin only on `/api/clip` and `/api/clip/boards`, which check the pairing token. `local_access` and the terminal websocket both call it; the websocket also keeps its loopback Host check through `loopback_host`, and a missing Origin is still a local client, as before. The comment that explained the clipper exception in `main.py` lives here now: the clipper calls from its extension origin, it may reach the clip routes, which check the pairing token, and nothing else.

Checked: the F1 layer's 44 cases pass (they failed for another local port, for the own origin under the other loopback name, and for the two Tauri origins); the dev window through the Vite proxy sends Origin `http://localhost:5320`, a listed origin. The removed `LOCAL` set and `urlparse` import in `terminal.py` had no other use.

### backend/tests · the family suite for formref
- refers-to: `tests/conftest.py` (the family block), `test_f1_guard.py`, `test_f4_versions.py`, `test_f9_release_profiles.py` (templates), `test_f3_mcp.py`, `test_f5_boot.py`, `test_terminal_socket.py`, `test_boards_and_clipper.py`; `native/formref-core/tests/board_engine.rs`

FAMILY_TEST_PLAN v0.3.0 P1: F1, F3, F5, the board engine, the board round trip, the clipper token and iStack import. Two changes to the template conftest, both specific to formref: the test client connects from `127.0.0.1` (formref also refuses non-loopback clients, and the test client's default address is `testclient`), and `FORMREF_ENGINE_PATH` survives the sandbox's clearing of `FORMREF_*` variables so a local run can point at an engine built outside the tree; CI builds it at the default path. F3 is formref's own: the HTTP endpoint calls the API at `FORMREF_API_URL` and would start an engine of its own if none answered there, so in-process it is checked for initialize, origin refusal, the tool list and an unknown method, and tool calls go through the stdio relay (`app.mcp_server`) against the booted engine: a read passes and a change is refused while outside agents are off.

The template's websocket case connects with the test client's default Host `testserver`, which the loopback Host check refuses before the Origin is read, so it passes whatever the Origin check does. `test_terminal_socket.py` connects with Host `127.0.0.1:8320`: another origin (another local port, `null`, an extension) closes 4403, and the window's origins and no Origin get past the guard to the session lookup, which closes 4404 for the unknown id. On 0.37.6 the other-port cases fail.

The Rust tests drive `session::Engine` directly: add, move, group, connect, remove (its connections go), lock, batch atomicity, undo and redo to exact states, a saved board reopening byte for byte, invalid boards refused on open, and the line protocol's ids. `test_boards_and_clipper.py` covers the service: a board after the engine restarts, undo and redo, a stale revision refused, a portable export importing as the same board, an iStack project (embedded and missing images, a group, a note, a line drawing, an unsupported record, and the import report), broken iStack files refused, and the clipper refusing a missing or wrong token, keeping its token routes from extension origins, and unpairing an old token on reset.

## v0.37.5 · Own dev ports 5320, 5321 and 8320

- refers-to: `app/main.py` :: local_access, `boot_backend`, `app/mcp_server.py`

The family agent-stack standard, section 9 (`AGENT_STACK_STANDARD.md` v0.2.0, owner decision D3, ledger FB-018, formai_dev sidecar). FormRef's dev defaults 5196 and 8196 were also formdesign's and formsculpt's. The dev window is now 5320, the preview 5321 (it shared the window's port) and the engine 8320. The guard needed no change: `local_access` admits any `localhost` or `127.0.0.1` origin whatever its port and has no list of window ports.

Moved: `frontend/vite.config.ts`, the `preview` script, `boot_backend` and `.bat`, `formref` and `formref.bat` (serve, doctor, the desktop health probe), `build_app` and `.bat`, the default API address in `app/mcp_server.py`, `app/agent/service.py`, `app/agent/terminal.py`, `app/cli.py` and `backend/.env.example`, the fallback port in `app/routers/cloud.py`, the clipper's default address (`background.js`, `options.js`, `options.html`), `.mcp.json`, `.cursor/mcp.json`, `.codex/config.toml`, the CI probe, `src-tauri/tauri.conf.json` (`devUrl`, `frontendDist`, the dev CSP) and `src-tauri/capabilities/main-window.json`, the English message `Start FormRef backend on port 8320, then reload` and its key in the 23 translation tables, README, CLAUDE.md, AGENTS.md, the wiki and both skill copies. The desktop shell still loads a fixed URL, now `http://127.0.0.1:8320`; FB-019 (its release workflow) is separate and was not touched. Earlier entries, the CHANGELOG history and lock checksums keep the old numbers on purpose.

Checked: `./formref backend` and `./formref frontend` with no environment variables bind 5320 and 8320 only. `/api/health` with `Origin: http://localhost:5320` 200, `http://localhost:5321` 200, no Origin 200, through the Vite proxy 200; `Host: evil.example`, `Origin: http://evil.example`, `Origin: null` and no Origin with `Sec-Fetch-Site: cross-site` 403. `./formref mcp` with no `FORMREF_API_URL` initializes and lists 47 tools. The dev window on `http://localhost:5320/` and the built window (service on 9145) under 4x CPU and network throttling, two shift runs and one throttle run each: layout shift 0, the only failed requests the 503s of `/api/boards` (the Rust engine is not built in this sandbox), and no 403 produced by the window. `./formref i18n check` reports 1515 keys, 21 missing and 11 unused in every table (the same in all 23, so the renamed key is found in each); the tables parse.

## v0.37.4 · Cross-site requests without an Origin are refused

- refers-to: `app/main.py` :: local_access cross-site refusal

The family agent-stack standard, rule G4 (`AGENT_STACK_STANDARD.md` v0.2.0, owner decision D4, ledger FB-035, formai_dev sidecar). `local_access` checked the Host, the client address and, when one was sent, the Origin, but a request with no Origin passed once its Host was loopback. A web page could therefore make the service answer a GET by pointing an `<img>` or a link at `http://127.0.0.1:<port>/...`: browsers send no Origin on those, and any GET route with a side effect would run. Proven on formsculpt 1.18.6, where such a GET answered 200 and its side effect ran.

Browsers label every request with `Sec-Fetch-Site`, and only a page on another site gets `cross-site`. So `local_access` now refuses a request with no Origin when that header says `cross-site` (trimmed, case-insensitive), with the same 403 and the body "Origin is not an allowed local application." A request that carries an Origin is still decided by the existing Origin rule alone, and `same-site` is kept on purpose: a dev window on `localhost:5196` loading straight from `localhost:8196` is same-site, and no outside page can be same-site with localhost. The CLI, `app/mcp_server.py` (its HTTP client sends neither header) and Claude Code's MCP client pass as before.

The browser clipper is unchanged: its requests come from a `chrome-extension://` or `moz-extension://` origin, so they carry an Origin and are decided by the clipper rule on `/api/clip` and `/api/clip/boards`, then by the pairing token. The new rule never applies to them. The one thing it adds on those two routes is that a web page cannot reach them without an Origin.

Checked against the running service (built window served from `frontend/dist`; the Rust engine is not built in this sandbox, so `/api/boards` answers 503 as before): no Origin with `cross-site` 403 (also padded `Cross-Site`); `same-site`, `same-origin`, `none`, no header at all, and `cross-site` with the allowed Origin `http://localhost:5196` 200; `Host: evil.example` and `Origin: http://evil.example` still 403. An extension Origin on `/api/clip/boards` answers 401 (the pairing token) with or without `Sec-Fetch-Site: cross-site`, so the clipper path is untouched. In Chromium, a page served from `http://127.0.0.2:9902` with an `<img>` and a clicked link pointing at `/api/health` got 403 for both, shown in the service log. The built window under 4x CPU and network throttling, two shift runs and one throttle run: layout shift 0, no 403 line produced by the window (the only failed requests are the 503s of `/api/boards`). `app/mcp_server.py` initializes and lists 47 tools; `POST /mcp` initialize with no Origin answers 200.

## v0.32.0 · Stack cards in picture exports

`core/stacks.py`: `stacked(board)` returns a deep copy, or the board itself when nothing is collapsed. In the copy, each collapsed group's visible members are replaced by:
- A card: a `column`, so `endpoints.box` gives it side anchors like the window. It sits at the members' top-left, 220 by 168, titled with the name and the count, at the members' top z.
- Up to three of the group's topmost pictures. They are copies with new ids, fitted into the card's lower area with their aspect kept, turned 0, -4 and 4 degrees, and stacked just above the card.

Connections are rewritten:
- Ends that name the group or a member move to the card.
- A connection whose ends both land on the card is dropped.

The group's title and its `collapsed_groups` entry are cleared in the copy, so no frame is drawn.

Reusing the existing renderers this way means PNG, SVG, the PDFs and the viewer need no stack code of their own. The choice is made in one place:
- `export_board(..., stacks=False)` applies `stacked` only for png, svg, the PDF forms and viewer.
- The route passes `stacks` only for those formats, so registered extension exporters keep their old call shape.

Checked by exporting a titled four-item group, with three pictures, a line to a far note, an elbow from a member to a free note and a line inside the group:
- With stacks, PNG and PDF (rendered with pdftoppm) show the card titled "Mood (4)" with fanned pictures and both outside lines meeting it. The SVG carries the card text and the 0, -4 and 4 rotations.
- Without stacks, the output is unchanged.
- Markdown still lists the group.
- The saved board keeps `collapsed_groups`.

## v0.31.0 · Collapsed groups follow their groups

`core/endpoints.py` gained two helpers that handle every per-group setting together, so a future one is added in one place:
- `remap_group_settings(settings, groups)` moves titles and `collapsed_groups` to new group ids. Board duplicate (`store.py`) and templates (`templates.py`) use it.
- `keep_group_settings(settings, items)` keeps only the groups still present. Copy or move to a new board (`extract.py`) uses it.

The old title-only calls at those three sites were replaced. Exports ignore `collapsed_groups` on purpose: a collapsed card is a window view, and an export should show the work. `mcp_server.arrange_items` accepts `collapse_group` with group_id and collapsed, without ids. Checked by duplicating a board with a collapsed group: the copy lists the copy's new group id.

## v0.30.0 · Connection routes in exports

`core/endpoints.py`:
- `heads(..., route)` aims a straight line's heads at the far end.
- `path_data` writes the SVG `d` for each route.
- `polyline` gives the raster points: corners for straight and elbow, and the sampled cubic otherwise, replacing the inline sampler in the PNG export.

In the PNG export, solid lines join with `joint="curve"`, and labels sit at the anchors' middle instead of the pulled-back ends, matching the window. Checked by exporting an elbow with an end arrow, a dashed two-headed straight line and a curve with a start arrow, then reading the SVG paths and the PNG.

## v0.28.0 · Connection styles in exports

`core/endpoints.py` gained the arrowhead geometry the window uses:
- `ARROW_GAP` 4, `ARROW_LENGTH` 12 and `ARROW_HALF` 5.
- `pointed(arrow)` gives the start and end flags.
- `anchors(source, target, arrow)` moves an arrowed item end just outside the item's side.
- `heads()` returns the line's new ends and one triangle per head, along the curve's tangent there.
- `DASHES` maps dashed to `(8, 6)` and dotted to `(0, 6)`.

How each export uses them:
- SVG writes `stroke-dasharray`, with round caps for dots, plus a filled path per head.
- PNG walks the sampled curve with `stroke_curve`: dashes as line pieces and dots as circles at each period. The heads are polygons.
- Markdown writes `<-` for start and `<->` for both; otherwise it keeps `->`.

`mcp_server.py`: `connect_items` takes `line` and `arrow`, and `style_connections` sends only the fields given. Checked by exporting a dashed arrowed line and a dotted two-headed line to a group, then reading the SVG paths and the PNG.

## v0.25.0 · Group connections

`core/endpoints.py` is the one place the service reads connection ends:
- `group_of`, `present`, `remap`: what an end names, whether it exists, and its new id after a copy.
- `box`: the visible members' bounding box, or hidden when all of them are.
- `anchors`: a group's end sits on the frame side facing the other end, 12 px out, where the cubic's flat tangent leaves it.
- `title`: "Group (first three titles)".

Users:
- PNG and SVG exports draw each connected group's frame once (SVG dashed like the window, PNG a rounded outline) before the lines; Markdown uses `title`.
- Board duplicate and template `fresh_ids` remap group ends through the group id mapping they already made.
- Trash restore and selection-to-board keep a connection when both ends are present among the kept items and their groups.
- The MCP `connect_items` description explains the `group:` form.

Probed through the API (duplicate, extract, template save and use, trash restore, SVG frame count, Markdown lines, PNG). Probe boards were deleted.

v0.26.0:
- `exports.group_frames` lists every visible group that is titled or connected, with its title. SVG, PNG and `bounds` use it, so a title above a frame at the board's top edge is not cut off.
- `endpoints.box` gives a column `side: 0`, so `anchors` puts its line end on its side.
- `remap_titles` carries titles to new group ids for board duplicate and templates; `fresh_ids` takes the template's settings for this. `kept_titles` keeps only the titles of groups that survive a selection-to-board.
- MCP `arrange_items` gains a `name_group` action, which takes `group_id` and `title` and ignores `ids`.

Checked through the API and with a probe board.

## v0.24.0 · Ratings in the SVG and phone viewer

`svg_export` sets `data-rating` on a rated picture's group, next to `data-tags`. The viewer script reads it into `g._stars` and builds a chip per level present, highest first: "5", then "N+", each with its count. The chips work one at a time, and a tap on the chosen one clears it. One `apply()` now dims by tags and by stars together, replacing the tag handler's own loop. The star in each chip is inline SVG, not a text character. The MCP `arrange_items` description lists the rating sort key.

## v0.23.0 · Ratings read from pictures

`keywords.embedded_rating` reads the first XMP packet with defusedxml, as the keyword reader does, and takes `xmp:Rating` from any `rdf:Description`, attribute first and then element. Without one it reads EXIF 0x4746 through Pillow's header-only `getexif`. `_stars` rounds and keeps 1 to 5 only, so -1 (rejected), 0 and junk give no rating. `store.import_asset` records `rating` in the asset info, and adds it to an asset first stored before ratings were read, as it does for keywords. The clipper, the CLI folder import, the MCP capture tool and the window's `placeAssets` give image items `data.rating`. Fixtures in $SC/rate: Lightroom-style attribute 3, rejected -1, "4.0", Windows field 4, and a FormRef export with 5 and a tag. Checked through the window upload (3, none, 4, 4, 5, tag kept; one undo removes all) and `./formref import`.

## v0.22.0 · Ratings in exported pictures

`xmp_write` takes a `rating` (1 to 5, anything else is treated as none) alongside the tags. When rating, `merged_packet` drops `xmp:Rating` both as an attribute on any `rdf:Description` (how Lightroom and Bridge write it) and as an element, then appends one element. Without tags it now leaves dc:subject and dc:title alone, so rating a picture never wipes the keywords another tool put in it. `fresh_packet` writes only the parts it has. `with_tags` returns the bytes untouched when there is neither tag nor rating. The `xmp` prefix is registered with ElementTree alongside x, rdf and dc. `images_export` keeps each asset's highest rating across its uses. Shared searches accept `rating` 0 to 5. Checked on the keyword fixtures: rating only on a plain JPEG (pixels identical, no keywords added), rating only on a JPEG with its own XMP keywords (kept), tags and rating together, an attribute rating replaced, WebP sidecar, PNG with compressed XMP (keywords kept, pixels identical). End to end the probe's ZIP had `xmp:Rating` 4 and 5 in the two rated pictures.

## v0.21.0 · Picture details

`core/picture_info.py` returns the stored asset record (name, mime, size, width, height, keywords) plus camera fields from EXIF. `Image.open` and `getexif` read only the header, never the pixels, so a large picture costs no decode, and any Pillow error gives no camera fields rather than a failure. The fields read are Make and Model (the make is dropped when the model already starts with it, as with "Canon EOS R6"), LensModel, DateTimeOriginal (returned as an ISO local time), FocalLength, FNumber, ExposureTime (shown as 1/n s under a second) and ISO (the first value when it is a list). Software is kept as well. Text is cut to 120 characters with NULs and runs of spaces collapsed, and numbers must be finite. SVG is skipped. Route: `GET /api/assets/{id}/details`. Checked with Pillow-made fixtures in $SC/pinfo (Canon JPEG with every field; Fujifilm PNG with a 2.5 s exposure and a list ISO), a non-image, the entity-declaring JPEG and the keyword fixtures (asset fields and keywords only), and a bad id (422).

## v0.18.0 · Practice log

`routers/practice.py` appends to `practice.json` with `store.atomic_write` and keeps the last 500 entries, so the file stays small. The server stamps `at` itself rather than trusting the window's clock. Entries without a numeric `at` are dropped on read, and an unreadable file reads as empty. Checked with curl: empty log, `pictures: 0` refused, an unknown field refused; the window wrote one entry per finished session in the probe.

## v0.16.0 · Searches for all boards

`routers/searches.py` keeps the list in `searches.json` beside `preferences.json`, written with `store.atomic_write`. They were put in the service rather than the engine because the engine owns one board at a time and its undo history; a list that belongs to no board has no history to join. The model refuses unknown fields so a board-only `similar` sample cannot slip in, and checks the same limits the engine applies to board searches (name 60 bytes, text 200, tags 12 of 60 bytes) plus 12 label names of 40 bytes. Labels are stored by name because label ids are made per board; the window maps names back to ids. A file that cannot be read gives an empty list rather than an error, so a damaged file never blocks the window.

Checked with curl (empty list, a valid save with an ampersand in the name, an empty search, duplicate names ignoring case, an id with a path in it, and a `similar` field each refused) and in the window at 4x CPU with slow network in English and German ($SC/ui/shared.cjs): saved on one board, listed and applied on another with the missing-label notice, one class change per item on apply, the board's own searches untouched, deleting from the shared list.

## v0.15.0 · Tags written into exported pictures

`core/xmp_write.py` `with_tags(data, mime, tags, title)` returns the picture bytes and an optional sidecar. JPEG: segments from SOI up to SOS are walked by their lengths (anything malformed returns None, so the file goes out untouched with a sidecar); an existing XMP APP1 is lifted out and merged; the new APP1 goes after the leading APP0/APP1 run (JFIF, EXIF), and SOS onward is copied unchanged, so the decoded pixels are identical. Packets over the 64 KiB APP1 limit fall back to a sidecar. PNG: chunks are walked to IEND; an `XML:com.adobe.xmp` iTXt is lifted out (compressed ones inflated with `decompressobj` capped at 4 MiB) and a new uncompressed one goes before the first IDAT with its CRC. Merging parses the old `x:xmpmeta` with defusedxml, removes `dc:subject` and `dc:title` from every `rdf:Description`, and appends new ones to the first; unregistered namespaces come back with ElementTree's ns0 style prefixes, which is valid XML (registering prefixes taken from files was rejected because `register_namespace` is global and could affect the SVG export). `exports.images_export` gathers tags per asset over every use in reading order and only calls the writer for tagged pictures.

`keywords.embedded_keywords` now returns XMP keywords alone when there are any; otherwise IPTC then Windows. Without this, a keyword removed on the board came back from the file's IPTC or XPKeywords on the next import.

Verified with the fixtures: a plain JPEG, a JPEG with its own XMP (rating and creator kept, old keyword replaced, one XMP APP1), a JPEG with EXIF (make kept), PNG plain and with compressed XMP (rating kept), WebP and an entity-declaring JPEG (untouched, sidecar); decoded pixels identical in every case; reading back gave exactly the written tags, including ampersand and angle brackets. End to end through `format=images` on the imported board after renaming a tag: untagged files byte-identical, the renamed tag in the JPEG, a sidecar beside the WebP, a picture used twice written once.

## v0.14.0 · Keywords in picture files

`core/keywords.py` `embedded_keywords(data)`. XMP: a regex finds the first `<x:xmpmeta ... </x:xmpmeta>` in the first 16 MiB, which covers JPEG APP1, PNG iTXt (uncompressed), WebP and TIFF without a parser per container; defusedxml parses it, so a packet with a DTD or entity is refused rather than expanded; every `rdf:li` under `dc:subject` counts, or the element's text when a writer skipped the Bag. IPTC: Pillow's `IptcImagePlugin.getiptcinfo` finds the Photoshop APP13 or TIFF IPTC block; dataset 2:25 may be one value or a list, decoded as UTF-8 with Latin-1 as the fallback (IIM 1:90 is not consulted). Windows: EXIF 0x9C9E is UTF-16-LE, semicolon separated, null terminated. Results are whitespace-collapsed, cut to 60 characters, deduplicated ignoring case, capped at 32. Any Pillow error while reading metadata yields no keywords instead of failing the upload, which was validated already.

`Store.import_asset` runs it for raster images, stores `keywords` in the asset JSON only when there are some, and adds them to an asset stored before v0.14.0 the next time the same file arrives. The upload route returns the info, so the window's `placeAssets` sets `data.tags` for images; the clipper, `./formref import` and MCP `capture_from_web` do the same server side.

Verified with fixtures built in scratch: XMP in JPEG, PNG iTXt and WebP; IPTC in a Photoshop APP13 block with UTF-8 umlauts; Windows XPKeywords; a packet declaring an entity (no keywords); a plain JPEG (none). Through the upload route, `./formref import` of the folder (all seven items tagged as expected), the clipper with a paired token, and the window at 4x CPU (four files added, tags on three, nine chips in the cloud, inspector "portrait, Ölgemälde, studio light", one undo removed all four).

## v0.13.0 · Tags in exports

`exports.item_tags(board, item)` returns the names of the board labels in `data.labels` (unknown ids skipped) then `data.tags`, once each ignoring case, so every export lists the same words as the tag cloud. `svg_export` sets `data-tags` (a JSON array) on an item's group only when it has some, so untagged boards export the same SVG as before; ElementTree escapes the quotes. `markdown_export` adds `Tags: ...` (escaped with `markdown_source`) after each item's block. `pdf_export`'s `page()` takes a caption and, on one-page-per-item pages, draws title and tags in 8 pt grey with a cairo context on the shared surface before `show_page`, shortened with an ellipsis to the width between the 36 pt margins. The viewer page's script reads the top-level groups' `data-tags`, counts them ignoring case, and builds the chip row inside the fixed header, so the existing fit code (which measures the header) already leaves room; chosen chips put `dim` (opacity 0.15) on every group lacking any of them; the row stays hidden without tags.

Verified: Markdown "Tags: Space, nasa, portrait" lines; SVG data-tags on the ten tagged groups; a 13-page one-page-per-item PDF whose text layer reads "astronaut · Space, nasa, portrait", "rocket · Space, Vehicles, NASA", "coffee"; a rendered page shows the caption in the bottom margin. The viewer at 390 by 844 with touch: nine chips, header 78 px; tapping animal dimmed 11 groups and left the cat and horse. The earlier viewer probe on a board without tags: header 34 px, fit, tap focus, pinch, pan, double tap and zoom unchanged.

## v0.9.0 · Find Similar

`core/similar.py`: `signature_of()` composites the picture on mid grey (so transparency is neutral) and takes a 64-bin RGB histogram from a 96 px copy, an 8x8 grey layout of the picture and of its mirror, and a 4x4 colour layout; `look()` caches it in the asset JSON as `look` (version 1). The existing `features` vector was not reused: its 4x4 grey layout was too coarse to tell a cropped copy from an unrelated picture of similar tone, and it has no mirror. `likeness()` = 0.4 histogram intersection + 0.35 grey-layout Pearson correlation (negative clipped to 0; the better of as-is and mirrored; two flat pictures count as alike) + 0.25 (1 minus mean RGB cell distance over the cube diagonal). Same asset scores 1.

Calibration (a scratch script, not shipped) on 32 pictures: scikit-image sample photographs (BSD) and painting references, each also brightened, darkened, cropped to 80 and 60 percent, mirrored, saved as JPEG at quality 30, shrunk, desaturated, more contrasty and greyscale. Unrelated pairs (495): median 0.38, 99th percentile 0.65, highest 0.68. Thresholds: close 0.82 (no false matches; finds mirrored, recompressed, shrunk and contrast copies, most brightness edits and 80 percent crops), related 0.7 (no false matches; also greyscale 84 percent and 60 percent crops 38 percent), loose 0.58 (4.6 percent of unrelated pairs, finds every variant). The real motorcycle left and right photographs score 0.95.

## v0.8.0 · Find by Color, Sort by Color

`core/color_find.py`: `asset_colors()` shrinks the whole original to 160 px, keeps pixels at least half opaque, quantizes to 8 colours (median cut, 2 k-means passes) and stores `[{hex, share}]` in the asset's JSON as `colors`, so each picture is worked out once. Whole picture on purpose: a crop or lasso changes what shows, not what the picture is, and caching per asset keeps a board of hundreds fast. `delta()` is CIEDE2000 (Sharma, Wu and Dalal 2005); plain Lab distance put pure red about 40 from a barn red, so no single tolerance worked for saturated colours. Checked against six of the published reference pairs to four decimals. `find_by_color()` scores a picture by the summed share of its colours within tolerance and keeps those at 0.03 or more, so a speck does not count; swatches compare their own colour. `color_order()` takes the most common colour with share of at least 0.08 and Lab chroma of at least 15 and returns its hue angle, else 360 plus the share-weighted darkness. `features.color_enrich()` writes `data.color_order` into a batch ahead of the sort only where it changed, so the sort and its data are one undo step and a relinked picture sorts by its new colours. Route `GET /boards/{id}/colors` runs in a worker thread; MCP `find_by_color` is read-only and calls it.

Verified on a board of eight generated pictures, a swatch and a note: #b42823 and #ff0000 found the red picture, the swatch and the half-red sunset (0.5); a 1 percent red patch on black did not count; #ff0000 at tolerance 10 found nothing; bad colour and tolerance 0 gave 422 with the message. The color sort placed red, orange, yellow, green, blue, violet, then grey and black, and one undo restored places and data.

## v0.7.7 · Adjustments in exports, selection to a new board

`apply_adjust()` in `core/exports.py` repeats the board's CSS arithmetic so exports match the screen: brightness multiplies, contrast scales about 127.5, saturation is the CSS `saturate()` matrix applied with `Image.convert("RGB", matrix)`, each step clamped, alpha kept. `image_source()` runs it after mask and crop and before flips and grayscale, so PNG, SVG, PDF and the phone viewer all carry it; the BeeRef export writes the original file and leaves adjustments behind, as BeeRef has no such setting.

`core/extract.py` gathers the selection plus column children (repeatedly, for nesting), copies them and the connections whose both ends are in the set onto a new board shifted to start at 80,80, with the source's background and labels but no window layout, through `store.open_import`. Moving refuses locked items and then removes the set from the source in one `remove`, which goes to the board Trash. Checked: copying two columns kept the child's parent and the connection and left the source at three items; unknown ids and an empty list were refused with their messages.

## v0.7.6 · Extract Palette

`core/palette.py`: `palette_colors()` takes the original with its lasso mask and crop (not the grayscale view), shrinks it to 240 px, keeps pixels at least half opaque, and quantizes with median cut refined by three k-means passes, so a colour is the average of its region rather than a box corner. Colours come back most common first with their share. `extract_palette()` adds them as one group of 140 px swatches in one `add` (one undo), starting 32 px below the picture and stepping down past anything already in that row. `POST /api/boards/{id}/items/{item}/palette?count=` and the MCP tool `extract_palette` (behind the outside-agent consent like every write). Checked: a picture of 50/30/20 percent flat red, blue and off-white came back exactly `#c82828` 0.5, `#1e3cb4` 0.3, `#f5f0e6` 0.2; cropped to its right half, blue 0.6 and white 0.4; two palettes in a row overlapped nothing; count 40 and a note were refused with their messages.

## v0.7.5 · agents sync

`./formref agents sync [--check]` (and `formref.bat`) runs `app.cli agents`, which reads `commands-catalogue.json` (written by `POST /api/commands/catalogue` whenever a window publishes its registry) from the data folder and writes `.claude/skills/formref-harness/references/commands.md`: one table per group, sorted by id, with default keys, a kind (changes the board, risky, window-only, or view) and the words plus parameters. Sorting and default keys keep the file stable, so it changes only when a command does; `--check` exits non-zero when the file differs. Without a catalogue it says to open the app first. Checked: `--check` failed on the missing file, sync wrote 174 commands, `--check` then passed; a personal override at publish time (Alt+H) did not leak into the file.

## v0.7.4 · Phone viewer

The phone and tablet wish was met without serving anything: the owner was asked whether to open FormRef to the home network and did not choose, so the offline page was built and network serving stays undecided. `core/viewer.py` wraps `svg_export()` in one HTML page. `svg_export()` now takes a `picture(image, item)` callback for each processed picture's href (default: full-size PNG, so SVG and PDF exports are unchanged); the viewer passes `_webp`, which shrinks each picture to twice its board size, at most 2048 px, as WebP quality 82 with alpha kept. The page script (inline, no libraries) keeps one transform on the board layer: one finger pans, two pinch about their midpoint, the wheel zooms at the pointer, a tap on a picture frames it (the picture is noted on pointerdown, because pointer capture sends later events to the stage), a double tap fits the board. Served as an attachment, so it never runs on the loopback origin.

Checked on an emulated 390 x 844 phone at 4x CPU: the board fitted under the header, a tap on a picture filled the width, a pinch tripled the size about the fingers, a drag panned, a double tap fitted again, and + zoomed by 1.5. A board whose SVG export is 5.1 MB came out at 150 KB; 120 small pictures at 60 KB.

## v0.7.3 · PDF text and readable notes in exports

`pdf_text()` in `core/pdf_pages.py` reads each page's text layer with pypdfium2 (whitespace collapsed, at most 2000 pages and 2 million characters) and caches it as `assets/text/<id>.json`; assets are content-addressed, so the cache never goes stale. `GET /api/assets/{id}/text` returns `{asset_id, pages}`, or 422 for a file that is not a PDF or an invalid ID. Checked on a two-page PDF printed from Chromium: both pages came back word for word, accents kept.

Export fix: `color()` handed `None` back because Pillow accepts `None` as "no colour", so SVG and PDF wrote note text with `fill="None"` (nothing drawn) and PNG drew its default light text on light notes. `color()` now accepts strings only, and `ink()` picks a card's own text colour or, as the board's `dark-note` rule does, `#3b3329` on paper with luminance of 110 or more and `#f5f5f5` below. `with_heading()` puts a note's or document's title above its text (a `#` heading for Markdown notes). Checked: the exported PDF's text layer now reads the note's title and body, and the PNG and PDF crops show dark ink on the yellow note.

## v0.7.2 · All pictures export

`images_export()` in `core/exports.py` walks image items with an asset in `reading_order()`, skips unresolved references and writes each asset once, uncompressed (`ZIP_STORED`, since pictures are already compressed), as `NNN title.ext` with the extension from the asset's MIME type. A board with no pictures is a 422 with a plain message. Checked: a board with four pictures, two of them the same file, gave three files whose SHA-256 equalled their asset IDs; a 120-picture board gave 120 files in order.

## v0.7.1 · BeeRef .bee boards

`core/beeref.py` writes and reads BeeRef's SQLite layout (application_id 2060242126, user_version 2, `items` plus `sqlar`). A BeeRef item maps a local pixel p to the scene as `pos + F(flip) * R(rotation) * scale * p`: Qt applies the item transform (the horizontal mirror) after rotation, so a mirrored item's stored rotation is the negative of FormRef's. FormRef's `flip_y` is written as a horizontal mirror plus a half turn. Export uses the original file, or a PNG when the image has a lasso mask, is SVG or has no known size; crop is written in source pixels and scale is the mean of the two axis scales. Import ranks z to whole numbers, turns the first line of a text item into the note heading and sizes the card so its body shows.

Checked with BeeRef 0.3.x and PyQt6 run outside the repository (GPL-3.0, never copied): BeeRef's own `SQLiteIO` loaded every exported item, and the crop corners it computed matched FormRef's at 0.000 px for plain, rotated, mirrored, flip_y with rotation, cropped, and cropped plus mirrored plus rotated images; a re-import matched at 0 px. `imports.py` routes files starting `SQLite format 3` to `import_bee`.

## v0.6.8 · PDF export and PDF pages

`pdf_export()` in `core/exports.py` reuses `svg_export()` so the PDF matches the SVG export exactly (original pixels, crops, flips, cards and connections). CairoSVG renders each page onto one shared cairocffi `PDFSurface`: a `PDFSurface` subclass overrides `_create_surface` to resize and return the shared surface, then `show_page()` ends the page. One page per item builds a board containing only that item (and what sits inside it), so neighbours never bleed onto its page; the page turns landscape when the item is wider than tall, and the view is centred with 36 pt margins. Tiles use the board at 1 px = 0.75 pt and stop at 400 pages; the single page shrinks only beyond PDF's 14400 pt limit. Video and audio cards print as cards.

`core/pdf_pages.py` renders pages with pypdfium2 (each page capped to the 64 megapixel image limit), imports them as ordinary PNG assets and adds image items in rows beside the PDF in one `add` command, so one Undo removes them. Items carry `pdf_page` and `pdf_source`.

## v0.6.7 · Image previews and the command line

`GET /api/assets/{id}/preview?edge=256|512|1024|2048` returns a Lanczos-resampled WebP (quality 88) cached as `assets/previews/{id}_{edge}.webp`, or the original response (same headers and ranges) for SVG, GIF, animated images, images already that small, other edges, and decode failures. Previews are derived data: deleting the folder only costs regeneration. A synthetic pattern of regular dots can be larger as WebP than as PNG; photographs are the usual case.

`app/cli.py` (standard library only) backs `./formref open` and `./formref import`. It talks to the running service over HTTP like the window does (no `X-FormRef-Client`, since it is the person at their own terminal), uploads files one by one through `/api/assets`, adds items in batches of 200, and writes the session so the window opens the board. The launchers pass the caller's directory in `FORMREF_CALLER_DIR` because they change into the repository first.

## v0.6.6 · Duplicate images

`GET /api/boards/{id}/duplicates?distance=4` returns groups of image item ids. `image_hash()` in `core/features.py` is a 64-bit difference hash of the original picture (9 by 8 grey, each pixel against its right neighbour), stored as hex `dhash` in the asset's JSON record beside `features`, so each picture is hashed once. Grouping compares each image with the first image of every existing group (identical asset ids or Hamming distance within `distance`), which is order-dependent for borderline pairs but linear in groups. Pictures that fail to decode are skipped.

## v0.6.2 · Chat and MCP over HTTP

- refers-to: `app/agent/chat.py` :: _run, send, adopt, publish; `app/routers/terminal.py` :: chat_events; `app/main.py` :: MCP_HTTP, lifespan; `app/mcp_server.py` :: client_token, run_commands
- kind: rationale
- logged: v0.6.2 · 2026-10-16

`chat.py` is formlit's `cmd_chat.py` with its event bus replaced by a set of asyncio queues fed through the terminal module's loop and streamed as server-sent events. The FastMCP server is mounted by inserting its routes at the front of the router (a Mount would answer at `/mcp/`), stateless with JSON responses, with `session_manager.run()` in the app lifespan. Tool calls over HTTP take the agent token from `x-formref-inapp` via `mcp.get_context().request_context.request`; stdio keeps `FORMREF_AGENT_TOKEN`. The dock's Claude Code and Chat therefore need no MCP process of their own.

## v0.6.1 · Command catalogue and the window bridge

- refers-to: `app/routers/commands.py` :: mirror, next_job, run, _need_window; `app/mcp_server.py` :: list_commands, describe_command, run_command
- kind: rationale
- logged: v0.6.1 · 2026-10-16

UI commands live in the window, so the backend keeps a mirrored catalogue and a job queue the window long-polls (25 s); a run waits up to 60 s for the window's answer. No poll for 35 s means no window, and calls get 409 instead of hanging. Window-only entries are refused to any request carrying `X-FormRef-Client`; risky entries go through `agents.confirm` only when a panel turn owns the token, otherwise they are refused, because `confirm` lets a request through when no panel queue exists. The middleware's outside-agent gate applies first, as for every write.

## v0.6.0 · Terminal sessions and the Claude Code tab

- refers-to: `app/agent/terminal.py` :: Session, open_session, restart, _pump; `app/agent/claude_code.py` :: cli, workdir, argv, open_tab, INAPP_TOKEN; `app/routers/terminal.py` :: attach, _window_only
- kind: rationale
- logged: v0.6.0 · 2026-10-16

Ported from formlit 0.45.3 (same owner, Apache-2.0). formlit attaches its Claude Code tab to an HTTP MCP endpoint; FormRef keeps its stdio SDK server and passes a per-process in-app token as `FORMREF_AGENT_TOKEN`, added to `agents.tokens` at import, so `agents.allows` passes it while the confirm path finds no panel turn and lets the person's own session act directly. The token exists only in the argv of processes the backend starts. The HTTP middleware does not run for WebSocket scopes, so `attach` checks Origin and Host itself; every REST route refuses `X-FormRef-Client`. `claude_bin`, `claude_folder`, `claude_first_message` and `outside_agents` cannot be written by a request carrying that header, since `claude_bin` names a program the backend runs. The sentinel `{"type": "exit"}` (with the space) must match the client byte for byte.

## v0.3.4 · Live consent prompt and iStack import check

- refers-to: `app/main.py` :: local_access refusal counter; `app/routers/boards.py` :: events stream `consent`; `app/core/imports.py` :: import_istack
- kind: rationale
- logged: v0.3.4 · 2026-10-11

FormVis asks the person when an outside agent first tries to edit. FormRef cannot hold an MCP call open waiting for a click, so the refusal stands and the open board's event stream emits `consent`; the page offers Allow or Not now, and the agent's next attempt succeeds once allowed. Run live: a refused rename, the dialog, Allow, and the same rename accepted.

The iStack importer was checked against iStack's own save routine in the owner's bundle (`At()`: `format`, `version` 1.1, `canvasRect`, `drawings`, `items` with `flipH`, `flipV`, `nearestNeighbor`, `cropRect`, `_imageData`, `_sourcePath`, `groupId`). A board in that format with two images (one embedded, one path-only), a note, a freehand stroke, a rectangle and an eraser stroke imported with rotation, opacity, flips, grayscale, sampling, lock and group intact; the path-only image arrived unresolved and relinkable; the eraser stroke, which in iStack subtracts raster pixels, is listed as unsupported in the import report instead of being dropped silently. `cropRect` units are taken as display pixels of the item; the bundle does not show them unambiguously, so crop on imported boards is unverified.

## v0.5.3 · Opt-in cloud storage from FormCut

- refers-to: `app/core/cloud.py` :: start, google_callback, dropbox_code, listing, download, upload, _google_folder; `app/routers/cloud.py` :: from_agent, save_board, open_file
- kind: rationale
- logged: v0.5.3 · 2026-10-11

FormCut's cloud module ported with its flows unchanged: Google's desktop PKCE flow with a redirect to this service on 127.0.0.1 and `drive.file` by default (`drive.readonly` opt-in), Dropbox's PKCE paste-code flow with no secret, tokens refreshed in the service and written with mode 0600 through the store's atomic write. FormRef has no jobs queue, so transfers run in a thread per request and are capped at the 64 MiB upload limit (one Dropbox upload call suffices). What moves is FormRef's: a board through the registered exporters (portable archive, PNG, SVG, Markdown, JSON) into a `formref` folder, and a file back through the project importer or `import_asset` plus a free spot (the clipper's placement). Two departures from FormCut: the routes refuse any request with `X-FormRef-Client`, because a connected account must not let an agent send boards off the computer, and `_google_folder` looks for an existing `formref` folder before making one, because after a reconnect the remembered id is gone and a second folder appeared in the run. A Google folder id is checked to be an id before it enters the query. Run against a local stand-in for both services that checks PKCE: sign-in, replayed callback refused, token file 0600 and never in responses, saves, listing, open as board and onto a board, Dropbox paste code, wrong code refused, an expired token refreshed, agent requests refused, disconnect.

## v0.5.3 · Background models from FormCut

- refers-to: `app/core/models.py` :: MODELS, PINNED, start_download, import_file; `app/core/segment.py` :: matte, shaped; `app/core/cutout.py` :: _model_cutout, _prompts; `app/bundled_models/u2netp.onnx`
- kind: rationale
- logged: v0.5.3 · 2026-10-11

The owner asked for FormCut's models. The registry, sources and SHA-256 pins are FormCut's; so is the inference (U2Net 320 square with ImageNet statistics, IS-Net 1024 square scaled to its maximum minus a half, FormCut's Auto rule of person when it keeps one percent of the frame at half threshold, else object, and its threshold and feather shaping). FormRef had no OpenCV, so resizing is Pillow and the arithmetic numpy; onnxruntime and numpy are the only new dependencies. SAM 2.1 is the owner's choice: FormCut runs SAM 2 Tiny for clicks and SAM 2.1 only for video, so FormRef prompts SAM 2.1's own image encoder and mask decoder from the square-zero-labs export (as FormCut's tracker decodes its seed frame) and fetches three of its six files. Points come in the image as shown, like sampling, and are mapped through crop and flip here. Downloads run in a thread with progress in `GET /api/models`; a file that misses its pin is deleted. `import` takes a file the person already has, for machines that cannot reach the hosts. Run here: U2Net small (bundled) cut astronaut, cat, coffee and horse in 0.4 to 0.7 s; Person cutout and IS-Net downloaded from GitHub and matched their pins; all four methods cut the four real photos the model-free method refuses; SAM 2.1 could not be fetched (Hugging Face blocked in this workspace), so its path was exercised only up to the refusal and the pin check on import.

## v0.4.10 · Browser clipper routes

- refers-to: `app/core/clipper.py` :: token, paired, clip, free_spot; `app/routers/clip.py`; `app/main.py` :: local_access origin rule and CORS
- kind: rationale
- logged: v0.4.10 · 2026-10-11

The service refused every non-loopback origin, which also refused the extension. The rule now admits `chrome-extension://` and `moz-extension://` origins on exactly `/api/clip` and `/api/clip/boards`, and those routes demand the pairing token (`X-FormRef-Clip-Token`, compared in constant time) from `clipper.json` in the data folder. The token routes stay behind the original rule, so only FormRef's own page can read or reset it; a web page is refused by origin before any token is looked at, and DNS rebinding is still stopped by the loopback Host check. Image clips reuse `capture` (public addresses, checked redirects) or accept a base64 `data:` image the browser downloaded itself. A clip lands on the chosen board, else the session's active board, else the first board, else a new Clippings board, in the first free slot spiralling out from the centre of the last saved view. Run: token from no origin and from FormRef's page, refused from extension and web origins; clip without or with a wrong token 401, from a web origin with the right token 403, from the extension 201; the extension origin refused on `/api/boards` and the token reset; CORS preflight allowed for the extension and refused for the web; seven malformed clips refused with reasons; reset made the old token fail.

## v0.4.9 · Background removal

- refers-to: `app/core/cutout.py` :: cut_out, change_background; `app/routers/boards.py` :: background; `app/core/exports.py` :: portable_export; `app/mcp_server.py` :: remove_background
- kind: rationale
- logged: v0.4.9 · 2026-10-11

No model is bundled: the owner has not chosen one, and Pillow alone (no numpy) can do the honest part. The background is the up to four colours that cover the image border; pixels within the tolerance of one of them and connected to the border (a breadth-first fill at 512 px) become transparent, with a full-resolution ramp for soft edges, multiplied into any existing alpha. Two guards refuse instead of guessing: a busy background (median edge strength inside the region above 8) and a subject that does not stand out (median colour distance just outside the region less than tolerance plus 24). Measured on real photos: plain-background images stopped at 108 to 189, while photos whose subject shades into its surroundings leaked and stopped at 35 to 40. The item's `asset_id` points at a new PNG and `data.cutout` keeps `original` and `tolerance`, so export, sampling and crop all use what is seen; re-running starts from the original, Restore swaps it back, and the portable archive carries the original too. A multi-image request skips unsuitable images and reports them in `skipped`. Run: product, gradient, horse and logo cut cleanly; astronaut, cat, coffee, rocket, grass and noise refused; restore, undo, lock, animated GIF and portable export checked; the MCP tool refused while outside agents were off and worked once they were allowed.

## v0.4.6 · Document export

`core/doc_export.py` exports one note or document. It reuses `reference_text.parse_text` and `layout_text`, so headings, lists, bold, italics and links match the board. Word output is a minimal WordprocessingML package written by hand (title, heading and list styles, external hyperlinks) and PDF is drawn with cairocffi, which CairoSVG already installs, with real text, document metadata and link annotations; no dependency was added. Run: a long Markdown document exported to all four; the PDF read back with pdftotext as 5 A4 pages with title metadata; the .docx parsed as XML, opened in LibreOffice and converted to PDF with headings, lists, bold, italics and a working link; the browser download names were Brief.pdf and Brief.docx.

## v0.4.5 · Media assets, byte ranges, table exports

A file only becomes `video/*` or `audio/*` when `media_signature` finds the matching container bytes (ftyp, EBML, OggS, ID3 or MPEG sync, RIFF WAVE, fLaC); otherwise it stays a download, so a renamed file is never handed to a player. Media assets are served inline with `Accept-Ranges` and single-range 206 answers (416 for an impossible range) so cards can seek. Markdown export writes table cards as Markdown tables with formulas as written; PNG and SVG draw the cells as text. MCP gains `create_table` (32 tools). Run: mp4, webm, mp3 and wav kept their types and a fake mp4 became a download; a 0-99 range returned 206 with Content-Range; an out-of-range request returned 416; the Markdown and PNG exports of a table board succeeded; `create_table` stored a formula and an unknown type was refused.

## v0.4.4 · Capture pinned to the checked address

`capture.pinned` resolves each hop once, refuses it if any answer is not global, and connects to that address with the original `Host` header and, for https, the original TLS server name through httpx's `sni_hostname` extension, so certificate checks still name the real host. That closes the DNS rebinding gap noted in v0.4.3. The client no longer reads proxy settings, because a proxy would resolve the name again. Run: a pinned page fetch and an image capture through the service against the local test site; refusals unchanged. An https fetch through the pin could not be run here (no public network, and a local TLS site would need its own trusted certificate), so the https path rests on httpx's documented extension.

## v0.4.3 · Web capture and labels

`core/capture.py` fetches on the person's behalf, so it is a server-side request on a local machine: http and https only, no credentials, and every hop (redirects are followed by hand, at most 5) must resolve to a global address, refusing loopback, private, link-local and reserved ranges. The remaining gap is DNS rebinding between the check and the connection; closing it means pinning the resolved address in the transport, recorded as future work. Images go through the existing asset import (SVG safety, 64 MiB cap); pages are parsed with the standard HTML parser for img, srcset (largest), og:image and image_src, at most 60. `FORMREF_CAPTURE_ALLOW_PRIVATE=1` exists only so the capture can be tested against a local site. MCP gains `capture_from_web`, `define_labels` and `label_items` (31 tools).

Run on 2026-10-11: loopback, 10/8, 169.254.169.254, localhost, ftp and credentialed addresses were refused; with the test flag against a local site, a page returned its og:image, img and srcset images, an image became an asset, a 404 returned 422 and a text file became a file asset. Public sites could not be reached from the build workspace (DNS refused, proxy 403), so a capture from the public web is untested here. Over MCP: capture placed an image with its source address, a page listed 4 images, labels were defined and applied, and an undefined label was refused.

## v0.4.2 · Comments and templates

Comment routes read the item under the store lock and write one `update` of `data.comments` with `expected_revision`, so a concurrent edit returns 409 instead of losing a comment. The engine merges data one level deep, so an emptied thread is written as `[]`; popping the key left the old list in place, which the first probe caught. Built-in templates are code in `core/templates.py` (moodboard, character sheet, storyboard, project plan); saved templates copy items, links, background and settings to `templates/[id].json`, and every use gets fresh item, group and link ids, with comments dropped. MCP gains `add_comment`, `resolve_comment`, `list_templates` and `create_board_from_template` (28 tools).

Run on 2026-10-11: all four built-ins created boards (5, 12, 12 and 6 items); a comment was added, resolved, reopened by undo and deleted; a blank comment returned 422; a saved template produced a board with new ids; deleting a built-in returned 422. Over MCP: list_templates, create_board_from_template, add_comment (signed Agent) and resolve_comment.

## v0.4.1 · Trash and shortcut preferences

Board delete now moves the record to `trash/boards/`. Removed items are captured in `store.mutate` by diffing the stored board with the new state whenever the command contains `remove`, so the UI, REST and every MCP client feed the same trash without a new engine command; restoring is one `batch` (add, connect) and therefore one undo step. Diffing was chosen over a Rust-side trash because the engine has no durable storage and its undo history is per session. `/api/preferences` stores only shortcut overrides, validated by pattern. MCP gains `list_trash` and `restore_from_trash` (24 tools).

Run on 2026-10-11: removing two connected notes left two items and no connection, the trash listed both names, restore brought back four items and the connection at a new revision, a second restore returned 404, undo removed them again; a deleted board vanished from the list, 404'd, restored with its items, and purge left an empty trash; an invalid shortcut returned 422. Over MCP: remove, list_trash, restore_from_trash round-tripped one note.

## v0.4.0 · Confirmation before big agent changes, board image

`main.py` holds a write from a panel turn when `Agents.review` names it risky (remove, board delete, or a move-type command over 10 ids) and waits on `Agents.confirm`. The turn generator now drains a queue fed by a pump task so the middleware can inject `confirm` events mid-stream; cleanup runs in `finally` without yielding, so a closed client no longer trips "async generator ignored GeneratorExit". The MCP client's write timeout rose to 330 s to outlast the five-minute wait. `get_board_image` renders the PNG export, shrinks it to `max_edge` and returns it as MCP image content plus the world rectangle, from new `X-FormRef-Left` and `X-FormRef-Top` headers.

Run on 2026-10-11 with real Claude Code turns: a removal was declined and the agent reported nothing changed and did not retry (12 items, revision 1 unchanged); a 12-item pack was allowed, then the agent called `get_board_image` and described the 4 by 3 grid it saw. In a throttled browser a removal showed the Confirm card, Allow let it through, and the board went from 12 to 11 items.

## v0.3.2 · Embedded agent service, consent gate, similarity features, session

- refers-to: `app/agent/service.py` :: Agents; `app/agent/runners.py` :: CLI, argv, parse; `app/routers/agent.py`; `app/main.py` :: local_access consent check; `app/mcp_server.py` :: CLIENT_TOKEN, adjust_items; `app/core/features.py`
- kind: rationale
- logged: v0.3.2 · 2026-10-11

One tool registry: the in-app agent never gets its own tool list. CLI runners (Claude Code, Codex, Cursor) reach the same official-SDK MCP server an outside client uses; the Ollama runner loads that FastMCP instance in-process and uses its `list_tools` and `call_tool`, so schemas and behaviour cannot drift. The MCP child for Claude Code is started with this backend's own interpreter (`sys.executable -m app.mcp_server`, `PYTHONPATH=backend`), because the `./formref mcp` launcher assumes `backend/venv` and a mismatch made the first live turn run with no tools.

Consent follows FormVis: a mutating request carrying `X-FormRef-Client` is refused with `outside_agents_off` unless the client is a live per-turn token, a CLI turn started from FormRef is running (Codex and Cursor start MCP from their own config, which may not pass the token on), or `outside_agents` is on in `agent.json`. Requests from the FormRef page carry no header and are unaffected. Off is the default, as in FormVis; the Phase 6 panel adds the switch.

Undo This Turn compares items, connections, settings, title and background with a snapshot taken when the turn started and steps the engine's undo until they match (at most 100 steps), so it works the same whichever runner made the changes. CLI flags were taken from the vendors' pages on 2026-10-11: Claude Code CLI reference (`-p`, `--output-format stream-json --verbose`, `--mcp-config`, `--strict-mcp-config`, `--tools ""`, `--allowedTools`, `--append-system-prompt`), Cursor headless and MCP pages (`agent -p`, `--output-format stream-json`, `--approve-mcps`), Codex non-interactive and MCP pages (`codex exec --json`; project `.codex/config.toml` only for trusted folders). Codex and Cursor event parsing is defensive because their item shapes were only partly documented and neither CLI was installed here.

Similarity features are an 80-number vector per image (4x4x4 RGB histogram plus a 4x4 grey layout) computed once from the original pixels and cached in the asset metadata. A `sort` by similarity is rewritten into one batch that writes missing features and then sorts, so it stays one undo step.

Run on 2026-10-11 against a live backend: runner detection (Claude Code found, Codex and Cursor not installed, Ollama not running), session filtering of unknown boards, similarity sort of red, blue and crimson images (red, crimson, blue) and a single undo restoring layout and removing features, a REST and an MCP mutation refused while outside agents were off and accepted after allowing, 21 tools over the official SDK client at protocol 2025-11-25, a real Claude Code turn that called `get_board` and `arrange_items` and packed the board, Undo This Turn restoring the pre-turn board exactly, and a Codex turn failing cleanly with its install note.

## v0.3.0 · Original pixel sampling and formatted references

`app/core/media.py` is the shared bounded original-image decoder for exports and sampling. It reads registered bytes only, checks the existing 64-megapixel limit and selects frame zero. Safe SVG uses the existing defusedxml check, unsafe-disabled CairoSVG and fetch-denying boundary. `app/core/sampling.py` maps normalized painted-image coordinates through the same floor/ceil crop rectangle and flips used by exports. Rotation/camera inversion belongs to the caller. Sampling returns original unpremultiplied RGBA/RGB, exact HSV degrees/percent/percent, uppercase HEX, source x/y, asset ID and unchanged board revision; item opacity and both grayscale settings are excluded.

`app/core/reference_text.py` defines the shared nonrecursive safe Markdown grammar used by formatted card exports: source-line paragraphs, h1-h3, unordered/numbered lists, strong/emphasis and absolute HTTP(S) links. Link labels exclude both brackets so unmatched nested openers cannot trigger repeated suffix scans. Raw HTML and unsupported links remain literal. Preview parsing stops after 4096 source lines and rendering stops at card geometry; full UTF-8 source remains in native JSON/portable and Markdown exports. Downloaded Markdown escapes HTML and unsafe links, preserves supported syntax and disables embedded-image syntax. PNG uses installed fonts, whose CJK glyph coverage is limited on this host; Unicode source survives unchanged. This is a supported subset rather than full CommonMark.

PNG and SVG render the supported heading sizes, bold/italic runs, list prefixes and underlined safe link labels. SVG links use only safe HTTP(S) destinations and all supplied text is XML-escaped. Swatches keep canonical color in Rust and derive display values, including alpha, without duplicate mutable color state. Exports include the color patch, name, HEX, RGB and HSV. Rounded HSV labels fit the default 180 by 150 swatch; raw sampled HSV retains full numeric precision.

The optional command-envelope `expected_revision` is a strict nonnegative integer. The store's existing lock covers revision comparison, Rust mutation and atomic persistence. A mismatch returns HTTP 409 with code `revision_conflict`; disk, revision and session history remain intact. Callers omitting the field retain the existing behavior. MCP `set_formatted_text` reads the item, preserves unrelated data fields and submits this guard, avoiding a stale merge. Frontend source drafts use the same guard.

Actual `./formref mcp` discovery returned 20 tools under protocol `2025-11-25`, including `sample_image`, `create_swatch`, `create_document` and `set_formatted_text`. Source RGB and alpha 128/0, cropped/flipped edges, SVG `#123456` and GIF frame zero passed. Sampling and explicit failures left state/history unchanged. Swatch edit/undo/redo and formatted-note undo retained prior data. All eight items and a 58,489-byte Unicode document round-tripped through portable and JSON imports; a new service reopened revision 11 with identical content and reset session history. Boolean, string and float guards returned 422; a stale integer returned 409 with equal disk bytes and state/history.

PNG exports were visually inspected for three heading sizes, lists, strong/emphasis, underlined links, literal HTML and complete swatch value rows. SVG inspection found styled text, safe links, literal HTML and zero script elements. The complete source and original registered image bytes were retained. The matching planning sidecar contains `COLOR_NOTE_SERVICE_EVIDENCE_v0.3.0.json`, including actual tool schemas, sample readbacks, hashes, restart and display observations. Python compilation passed; no dependencies, test files or source generators were added.

## v0.2.0 · Canvas settings and snapping through MCP

`configure_canvas` sends only supplied grid visibility, grid size, snap enablement and grayscale preview values through the shared Rust `settings` command. `snap_items` sends actual item IDs through the engine's `snap` command, with an optional grid override. Grid size is finite and within 4 to 512 world units. The engine determines grouped/parent snapping units and rejects the full operation when locked content would move; Python contains no second geometry implementation.

The store writes and reopens the complete engine board, and native portable and JSON snapshots carry that complete board unchanged. Typed canvas settings therefore use the existing persistence path. Canvas grayscale is a reversible view setting: original registered assets and PNG/SVG/Markdown export content remain unchanged. The existing arrangement tool now documents explicit distribute spacing as an accepted option.

Actual official SDK discovery through `./formref mcp` returned 16 tools under protocol `2025-11-25`. Settings mutation readback preserved omitted values; changing grid visibility at revision 8 and undoing at revision 9 restored the prior settings. Snap moved `(13,37)` to `(0,32)` on a 32-unit grid and undo restored it. Selecting one group member moved the complete group while preserving its `(25,25)` offset. Locked-content snapping and invalid grid settings returned true tool errors with unchanged documents/revisions. Explicit distribute gap 14 produced x positions 0, 34 and 68.

Native portable and JSON roundtrips preserved all five items, settings and geometry. A new API/MCP process reopened revision 7 with identical settings and geometry; undo history correctly reset for the new session. Enabling canvas grayscale left the PNG hash and original image bytes unchanged. Exact live tool schemas, revisions and SHA-256 observations are in the matching sidecar's `CANVAS_SERVICE_EVIDENCE.json`. Python compilation passed; no test files or additional dependencies were authored.

## v0.1.0 · Local board service and SDK MCP

The backend controls storage and export while the decoupled Rust process controls document validation, geometry and history. One persistent JSON-lines process is shared by all API requests, protected by serialized access. A restarted engine reopens saved documents; history is service-session state and is deliberately not fabricated after a restart. Failed disk persistence restores the last durable document before surfacing the original storage error.

| Module | Responsibility |
| --- | --- |
| `app/main.py` | FastAPI service, loopback client/Host/Origin checks, explicit errors, capabilities and production frontend serving |
| `app/core/config.py` | Product version, operator-controlled data path, engine binary and memory/size limits |
| `app/core/engine.py` | Persistent Rust subprocess, strict response IDs, serialized protocol and shutdown |
| `app/core/store.py` | Atomic board and asset writes, board copy/delete, SHA-256 asset deduplication, safe image registration |
| `app/core/imports.py` | Portable archive integrity checks and independently authored iStack data migration |
| `app/core/exports.py` | Real PNG/SVG composition, portable archives, JSON snapshots and standalone Markdown |
| `app/core/extensions.py` | Explicit importer/exporter/capability registration seam |
| `app/routers/boards.py` | Board actions, uploads, missing-reference relinking, download routes and SSE revisions |
| `app/models/requests.py` | Typed board creation and command envelopes |
| `app/mcp_server.py` | Official Python SDK stdio tools/resources/prompt using the same live loopback API |
| `oc_install`, `oc_install.bat` | Isolated dependency installation with macOS unpinned membership parity |
| `boot_backend`, `boot_backend.bat` | Loopback FastAPI development startup |

Uploaded names never determine a filesystem location. Assets use SHA-256 identifiers; archive assets are read by exact manifest identifiers and are never extracted. A location-only iStack file records its missing source path and renders an explicit placeholder until the user relinks it. Blob URLs do not count as portable data. Imported unsupported iStack records remain in `import_report` and in subsequent portable exports.

Images retain original bytes. PNG composition crops source pixels, applies flips and grayscale, scales with the chosen sampling mode, rotates around the item center and composites opacity. Drawings use item-local points. SVG composition embeds prepared image data and preserves vector board drawings/text. PNG output uses scale 1 when within 8192 pixels per edge and 32 megapixels; larger boards are uniformly scaled and expose the actual scale in `X-FormRef-Scale`. Animated images export their first frame. Native archives preserve their original animation bytes.

Exports use the frontend's cubic connector geometry: both control points share the endpoint midpoint x, with their respective endpoint y values. Connector labels use the midpoint baseline minus 8 world units. Empty or missing stroke points produce blank drawings; line shapes use only their first and last source points. Manual PNG/SVG observations confirmed a red cubic-quarter pixel where the former diagonal was absent, zero SVG polylines for two empty strokes, a three-point line rendered solely between its endpoints, and the label baseline at y=142 for endpoints centered at y=50 and y=250. Python compilation passed after these targeted corrections.

SVG ingestion uses defusedxml and rejects entities, declarations, active elements, event attributes, external href/src, XML base, CSS escapes and every nonlocal URL reference. CairoSVG receives bytes only, with `unsafe=False` and a URL fetcher that rejects retrieval. This module is installed independently as a server dependency, not vendored or folded into proprietary code. Its LGPL-3.0-or-later license was checked in [upstream metadata](https://github.com/Kozea/CairoSVG/blob/main/setup.cfg). CairoSVG is imported only when rasterizing an SVG asset. A missing system libCairo returns an actionable export error while PNG/JPEG and other Pillow-based workflows remain available; macOS requires `brew install cairo`, and Windows requires a compatible libCairo runtime.

The MCP process auto-starts the same API only when absent, and terminates only the child it owns. Logs go to stderr, leaving stdio protocol output clean. `FORMREF_API_URL` accepts only a loopback HTTP origin. `import_asset` accepts bounded base64 or a file beneath operator-configured `FORMREF_MCP_IMPORT_DIR`; it never reads an arbitrary client path. Tool calls preserve actual HTTP errors. A missing board yields an MCP error, not a success record.

The macOS dependency file keeps bare package names except `mcp<2`. This narrow compatibility bound preserves the v1 FastMCP API used by the build, following the SDK's [v1 documentation](https://py.sdk.modelcontextprotocol.io/v1/). `app/core/builtins.py` registers the real project importer and all five export handlers. HTTP routes dispatch through that registry, and capabilities derive their export list from registration.

Observed manual verification: Python compilation; real Rust-backed HTTP create/add and all five exports; iStack import including a missing DAM source, normalized crop/flip/half-opacity, editable drawing and note; portable roundtrip; multipart relink; SVG raster composition; script/external SVG rejection and external-Origin rejection. An official SDK client negotiated protocol `2025-11-25`, listed 14 tools, read both resource forms, fetched the organization prompt, mutated a persisted board, generated PNG and received a true missing-board tool error. No test files or test scripts were authored. Shell installers/boot scripts passed syntax checking; Windows and macOS execution is not claimed.

## boot_backend.bat

### boot_backend.bat · interpreter selection

- refers-to: boot_backend.bat :: PYTHON_BIN and uvicorn launch
- kind: rationale
- logged: v0.1.0 · 2026-10-10

The default Python executable is an absolute path to this backend's venv. FORMREF_PYTHON overrides it, matching the Unix launcher. A missing executable produces an installation instruction. Invoking the venv interpreter directly makes activation unnecessary. Every selected executable path is quoted. Windows execution remains unverified because this host has no cmd or PowerShell runtime.
