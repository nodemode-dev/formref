---
name: parity
description: The FormRef tab in the consolidated FormAI parity matrix. Load after any build turn to re-grade rows and re-render the tab, or when asked about FormRef's parity against PureRef, Milanote and BeeRef.
---

# Parity

The FormRef tab is rendered, never hand-edited. Its data and renderer live in the planning sidecar, not the repository.

| File (sidecar) | Holds |
| --- | --- |
| `parity_rows.json` | 62 rows: PureRef, Milanote and BeeRef grades with sources, FormRef grade and note, `probed`, `target`, plus `version`, `build`, `dek`, `method_code`, `changes`, `imp_done`, `imp_ch`, `engine`, `merit`, `facts` |
| `parity_render.py` | takes the FormDAM tab out of the consolidated HTML as the template, swaps in FormRef data and prose, writes `FormRef-Parity_[version].html` and the updated consolidated file |
| `PARITY.md` | the research view and source notes |

## Every build turn

1. For each row the turn changed, set `formref` to the grade and a one-line note naming the files, and `probed` true only if it was run (engine, REST, MCP, agent or browser).
2. Set `version`, `build`, `dek` and `method_code`; prepend this edition to `changes` and the closed items to `imp_done`.
3. Run `python3 -I parity_render.py [consolidated.html] parity_rows.json [out_dir]`.
4. Open both files in a browser, light and dark, and at phone width; confirm the score line and no console errors. The renderer refuses to leave FormDAM or Immich text in the tab and keeps the other entries byte for byte.

## Grading rules

Full means reachable from the interface through to the engine. Partial means narrower than the references or not reachable from the interface. Rows no reference documents (iStack menu, iStack import, session restore, agent, MCP) are shown but not scored. Reference grades come only from fetched vendor pages, recorded in the row sources; BeeRef is graded from its site, README and release notes, never its code.
