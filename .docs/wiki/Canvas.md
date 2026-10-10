# Canvas

Collect images, notes and planning content on an infinite board, then select items to move, resize, rotate or edit them. Use relationships for connections, columns for organization, tasks for completion state and board cards for local board navigation.

| Action | Default input |
| --- | --- |
| Pan | Space + drag or middle-button drag |
| Zoom about pointer | Wheel |
| Marquee | Drag an empty board region |
| Undo | Ctrl/Cmd+Z |
| Redo | Ctrl/Cmd+Shift+Z |
| Export | Ctrl/Cmd+S |
| Import | I |
| Remove selection | Delete |
| Group/ungroup | G / Shift+G |
| Duplicate selection | D |
| Fit content | F |
| Reset zoom | 1 |

Image geometry supports crop, flips, rotation, opacity and grayscale. Preserve original image bytes while arranging; a display thumbnail is not an export source. The inspector changes selected properties through the same engine commands used by agents.

Align, distribute, pack and normalize operate on engine-selected IDs. Locked content is protected from mutating layout commands; unlock intentionally before rearranging it. A group transform operates about shared bounds, and a completed user operation should produce one undo step.

The current manual and toolbar are authoritative for offered controls; keyboard shortcuts reserved by a browser may behave differently from a native desktop shell. Rendering/gesture checks and any unfinished controls are recorded in the release's verification notes.
