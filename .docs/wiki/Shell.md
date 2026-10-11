# Shell

The FormRef window follows the Form family layout: a top bar with board tabs, a left dock (boards, layers, tools), the canvas, and a right dock (inspector, agent). Both docks collapse to a narrow rail with the chevron on their edge or with Ctrl+[ and Ctrl+], and stay collapsed after a reload.

## One command table

Every action lives once in `frontend/src/app/commands.ts` with its label, icon and keys. The right-click menu, the command palette (Ctrl+K), keyboard handling and the shortcut sheet (?) all read that table, so a key shown in the menu is the key that works. Icons come from `frontend/src/ui/icons.ts`; asking for an unknown icon name fails the build rather than drawing a blank.

## Right-click menu

Right-click the canvas or a selection for iStack's menu in iStack's order: File, Edit, Canvas, Organize, Images, Layer, Lock, Add Note, Draw Mode, Slideshow, Delete, then FormRef's Insert and Ask Agent. Menus open in the overlay layer and close on Escape or an outside click.

## Board tabs

Several boards stay open as tabs. Ctrl+N opens a new tab, Alt+W closes the active one (browsers reserve Ctrl+T and Ctrl+W). The open tabs and the active tab are saved through `/api/session` and restored on the next launch.

## Keys

| Area | Keys |
| --- | --- |
| File | Ctrl+N new tab, Ctrl+O open board file, Alt+W close tab, Ctrl+I add images, Ctrl+V paste, Ctrl+S save .formref, Ctrl+E export |
| Edit | Ctrl+Z undo, Ctrl+Y or Ctrl+Shift+Z redo, Ctrl+A select all, Escape deselect, Ctrl+D duplicate, Delete remove |
| Tools | V select, H pan, D draw, E eraser, Shift+R rectangle, Shift+O circle, Shift+I line, Shift+C connect |
| Insert | N note, I task, Shift+L link |
| Canvas | G grid, F fit, Ctrl+0 or 1 reset zoom, = and - zoom, M navigator, Tab focus mode |
| Organize | Ctrl+P pack, Ctrl+G group, Ctrl+Shift+G ungroup |
| Images | C crop, R rotate 90, L lock |
| Layer | Shift+Up front, Shift+Down back |
| View | Shift+S slideshow, Ctrl+J agent, Ctrl+K commands, ? shortcut sheet, Ctrl+, preferences |

These are the defaults. Press ? for the current list: click any shortcut there and press new keys to change it. If another command already used those keys, they move to the one you are changing and the sheet says so. Keys the browser keeps (Ctrl+T, Ctrl+W, Ctrl+Q, Ctrl+R, Ctrl+L, F5 and others) and Space (pan) cannot be taken. Changes are saved in the data folder and come back on the next launch; Reset All returns every key to its default.

## Comments

Select one item and the inspector shows its comment thread. Write in the box and press Comment (or Ctrl+Enter). Each comment shows who wrote it (You, or Agent for anything an agent added) and when, with buttons to resolve or reopen it and to delete it. Every change is one undo step. Items with open comments carry an orange count in their top corner. Locked items cannot take new comments until unlocked.

## Templates

New from template (left panel or the palette) starts a board from a starter (moodboard, character sheet, storyboard, project plan) or from one of your own. Save as Template keeps the current board's items, links and canvas settings, without comments; images stay linked to the same files. Your templates can be deleted from the same dialog.

## Trash

Deleted boards and anything removed from a board go to the Trash (left panel, or Open Trash in the palette). Restore puts removed items back where they were as one undoable step, or brings a deleted board back into the board list. Delete removes one entry for good, and Empty Trash (click twice) removes everything. Each board keeps its last 100 removals.

## Drawing

Draw Mode paints strokes with the chosen colour and width. The eraser removes whole strokes it passes over, and one drag is one undo step. Notes can use any of the bundled note fonts from the inspector.

## Slideshow

Shift+S presents the selected images, or every image, in board order. Preferences set the transition (fade or none) and the seconds per image; the next image is decoded before it is shown, so nothing flashes.

## Stability rules

The shell is hidden until the saved theme, dock state and fonts are applied, then shown in one step, so a cold load does not shift. All stacking uses the z tokens in `frontend/src/styles/`.
