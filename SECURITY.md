# Security policy

## Supported versions

Security fixes go into the newest release. Please update before reporting, and
check whether the problem is still there.

| Version | Supported |
| --- | --- |
| 0.39.x (latest release) | Yes |
| Anything older | No |

## Reporting a vulnerability

**Do not open a public issue for a security problem.** Use GitHub's private
reporting instead: on the repository's **Security** tab, choose **Report a
vulnerability**. Include what you found, the steps to reproduce it, the version and
platform, and what an attacker could do with it.

You can expect an acknowledgement within a week. We will keep you informed while it
is fixed and credit you in the release notes, unless you would rather not be named.

## What counts

FormRef runs on your own machine, so the things that matter most are the ways
something outside it could get in:

- **The service** listens on loopback (127.0.0.1): port 8320 in development, and
  port 8320 or another free loopback port in the desktop app. Anything that makes it
  reachable from another machine, or lets a web page on another origin drive it.
- **Agents and the MCP server** (`./formref mcp` over stdio, and `/mcp` on the
  service): an agent acting before the person has allowed outside agents in the Agent
  panel, getting past the Confirm card that guards removals and moves of ten or more
  items, or reading files outside the MCP import folder.
- **The Agent panel's runners** (Claude Code, Codex, Cursor and Ollama): a runner
  given more than FormRef's own tools, or an Ollama address that is not loopback.
- **The terminal dock and the Claude Code tab**: anything other than FormRef's own
  window reaching a shell or Claude Code through them.
- **The browser clipper**: a clip accepted without the pairing token, a web page
  getting the token, or the extension reaching any route beyond its two clip routes.
- **Cloud storage** (Google Drive and Dropbox, off until the person connects): tokens
  or app credentials leaking to the browser page or to an agent, an agent moving
  files to or from the cloud, or a replayed sign-in being accepted.
- **Web capture**: fetching an address that is not public (loopback, private or
  link-local), or following a redirect to one.
- **Files and archives**: opening a picture, PDF, `.formref` archive, ZIP, iStack
  board or `.bee` board in a way that writes outside where it should, or past the
  size limits.
- **Model downloads**: a background-removal model getting past its SHA-256 check.

Bugs that need someone to already control your machine, or to run a modified build
of FormRef, are ordinary bugs: please open an issue for those.
