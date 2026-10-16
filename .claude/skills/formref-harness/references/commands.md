# FormRef command reference

Written by `./formref agents sync` from the command catalogue the FormRef window publishes; do not edit by hand. Run a command with the MCP tools `run_command` or `run_commands` (the window must be open). `window-only` commands are refused for outside agents; `risky` commands ask the person first.

197 commands.

## Canvas

| Command | Label | Keys | Kind | What it does |
| --- | --- | --- | --- | --- |
| `background` | Background Color |  | changes the board | Asks for a board background colour. |
| `fit` | Fit View | `f` | view | Fits the view to the selection, or to the whole board when nothing is selected. |
| `fit-all` | Fit Canvas to Content |  | view | Fits the view to every item on the board. |
| `flip-view-horizontal` | Flip View Horizontally | `shift+h` | window-only | Mirrors the view left to right to check a drawing with fresh eyes, as artists flip a canvas; the board, exports and other windows are unchanged. |
| `flip-view-vertical` | Flip View Vertically | `shift+v` | window-only | Mirrors the view top to bottom; the board itself is unchanged. |
| `focus` | Focus Mode | `tab` | view | Hides the side panels so only the board shows; again to bring them back. |
| `grayscale-canvas` | Grayscale Canvas |  | changes the board | Shows the whole board in grayscale to judge values; pictures and exports are unchanged. |
| `navigator` | Toggle Navigator | `m` | view | Shows or hides the navigator map in the corner. |
| `reset-zoom` | Reset Zoom | `mod+0`, `1` | view | Sets the zoom to 100 percent. |
| `toggle-grid` | Toggle Grid | `g` | changes the board | Shows or hides the background grid for this board. |
| `zoom-in` | Zoom In | `=`, `+` | view | Zooms in one step. |
| `zoom-out` | Zoom Out | `-` | view | Zooms out one step. |

## Edit

| Command | Label | Keys | Kind | What it does |
| --- | --- | --- | --- | --- |
| `apply-saved-search` | Apply Saved Search |  | window-only | Applies a saved search by name: every filter it holds is set and the board is redrawn once. Parameters: `name` (string): the saved search name; `id` (string): or its id. |
| `clear-color-find` | Clear Color Filter |  | window-only | Clears the color filter so the whole board shows again. |
| `clear-filters` | Clear All Filters |  | window-only | Clears the find text, kind, color and similar filters together. |
| `clear-tag-filter` | Clear Tag Filter |  | window-only | Clear Tag Filter (Edit). |
| `delete` | Delete Selected | `delete`, `backspace` | changes the board, risky | Removes the selected items (or the chosen connection) to the board Trash. |
| `deselect` | Deselect All | `escape` | view | Clears the selection and returns to the Select tool. |
| `duplicate` | Duplicate | `mod+d` | changes the board | Duplicates the selected unlocked items, offset slightly. |
| `duplicate-synced` | Synced Copy |  | changes the board | Makes linked copies of the selected notes and documents: editing the text of one changes all of them. |
| `edit-labels` | Edit Board Labels |  | view | Opens the board labels editor to add, rename, recolour or delete coloured labels. |
| `filter-by-tag` | Filter by Tag |  | window-only | Filter by Tag (Edit). Parameters: `tag` (string): a tag to add to or remove from the filter; `label` (string): or a label name or id. |
| `find-color` | Find by Color… |  | window-only | Dims everything on the board except pictures and swatches that contain the chosen color; the color chip beside the kind filter shows it, and choosing no color clears it. Parameters: `color` (string): #RRGGBB; leave out to open the color picker; `tolerance` (number): CIEDE2000 color difference, about 10 close, 20 default, 30 loose. |
| `find-swatch-color` | Find This Swatch Color |  | window-only | Finds the selected swatch's color in the pictures on the board. |
| `lock` | Lock Selected | `l` | changes the board | Locks the selected items against moving and editing, or unlocks them if any is locked. |
| `redo` | Redo | `mod+y`, `mod+shift+z` | changes the board | Redoes the last undone change. |
| `remove-tag` | Remove Tag From All Items |  | changes the board, risky | Remove Tag From All Items (Edit). Parameters: `tag` (string): the tag to remove from every unlocked item, any case. |
| `rename-tag` | Rename or Merge Tag |  | changes the board | Rename or Merge Tag (Edit). Parameters: `tag` (string): the tag to rename, any case; `name` (string): the new name; a name another tag has merges the two. |
| `save-search` | Save Current Search… |  | changes the board | Saves the find text, kind, color and similar picture now on screen under a name the board keeps; a search with the same name is replaced. One undo removes it. Parameters: `name` (string): name for the search; leave out to be asked; an existing search with the same name is replaced. |
| `saved-searches` | Saved Searches… |  | window-only | Opens the board's saved searches beside the item count: apply one, save the filters on screen, clear them, or delete a saved one. |
| `select-all` | Select All | `mod+a` | view | Selects every visible item on the board. |
| `undo` | Undo | `mod+z` | changes the board | Undoes the last change to the board. |
| `unsync` | Stop Syncing |  | changes the board | Unlinks the selected synced copies so they can be edited separately. |

## File

| Command | Label | Keys | Kind | What it does |
| --- | --- | --- | --- | --- |
| `close-tab` | Close Tab | `alt+w` | view | Closes the current board tab; the board stays saved and listed. |
| `copy-clip-token` | Copy Browser Clipper Token |  | changes the board, window-only | Copies the browser clipper pairing token to the clipboard. |
| `delete-board` | Delete Board |  | changes the board, risky | Moves the board to the Trash after confirming; it can be restored from there. |
| `duplicate-board` | Duplicate Board |  | changes the board | Makes a copy of the whole board and opens the copy. |
| `export` | Export… | `mod+e` | window-only | Opens the Export dialog: PNG, SVG, PDF, Markdown, JSON, BeeRef, all pictures or the phone viewer. |
| `export-all-images` | Export All Images |  | window-only | Downloads every picture on the board as its original file. |
| `export-png` | Export Canvas as PNG |  | window-only | Downloads the whole board as one PNG image. |
| `export-selected` | Export Selected |  | window-only | Downloads the selected pictures as their original files. |
| `file` | Attach File |  | changes the board, window-only | Asks for any file and adds it to the board; files that are not pictures become file cards. |
| `images` | Add Images | `mod+i` | changes the board, window-only | Asks for image files and adds them to the board at the view centre, keeping the originals. |
| `new-board` | New | `mod+n` | changes the board | Creates a new empty board and opens it in place of the current tab. |
| `new-from-template` | New from Template |  | view | Opens the template list to start a new board from a built-in or saved template. |
| `new-tab` | New Tab |  | view | Creates a new empty board in a new tab, leaving the current board open. |
| `open-file` | Open Board File | `mod+o` | changes the board, window-only | Asks for a board file (.formref, .istack, .bee or board JSON) and opens it in place of the current tab. |
| `open-file-tab` | Open in New Tab |  | changes the board, window-only | Asks for a board file (.formref, .istack, .bee or board JSON) and opens it in a new tab. |
| `open-from-cloud` | Open from Cloud… |  | changes the board, window-only | Lists boards and files in the connected Google Drive or Dropbox to open one. |
| `paste` | Paste | `mod+v` | changes the board, window-only | Pastes images, text or links from the clipboard onto the board. |
| `rename` | Rename Board |  | changes the board | Asks for a new board title and renames the board. |
| `reset-clip-token` | New Browser Clipper Token |  | changes the board, window-only | Makes a new browser clipper pairing token, which unpairs the clipper until the new one is pasted in. |
| `sample` | Create Sample Board |  | changes the board, window-only | Creates a sample board that shows the kinds of references FormRef holds. |
| `save` | Save Board (.formref) | `mod+s` | view | Downloads the board as a portable .formref file with every original asset inside. |
| `save-template` | Save as Template |  | changes the board, window-only | Saves the current board as a reusable template. |
| `save-to-cloud` | Save Board to Cloud… |  | changes the board, window-only | Saves the board to the connected Google Drive or Dropbox (off until a cloud account is connected). |
| `trash` | Open Trash |  | view | Opens the Trash: removed items of this board and deleted boards, to restore or delete forever. |

## Images

| Command | Label | Keys | Kind | What it does |
| --- | --- | --- | --- | --- |
| `adjust` | Adjust Picture |  | changes the board | Sets brightness, contrast and saturation of the selected pictures (0 to 200 percent, 100 unchanged). The original is kept; the board and PNG, SVG, PDF and phone viewer exports show the adjusted picture. Parameters: `brightness` (number): percent, 100 unchanged; `contrast` (number): percent, 100 unchanged; `saturation` (number): percent, 100 unchanged; 0 is grey. |
| `clear-lasso` | Clear Lasso |  | changes the board | Removes the lasso crop from the selected image so the whole picture shows again. |
| `clear-similar-find` | Clear Similar Filter |  | window-only | Clears the similar-pictures filter so the whole board shows again. |
| `crop` | Crop | `c` | changes the board, window-only | Starts cropping the selected image on the board: drag the handles, Enter applies, Escape cancels. |
| `crop-on-canvas` | Crop on Canvas |  | changes the board, window-only | Shows the whole picture around a crop box on the board: drag the edges, corners or the box, then Enter or double-click to crop. The image keeps its scale, so it shrinks or grows with the crop. Crop works again later to bring cropped parts back. |
| `download-cutout-model` | Download Background Model |  | view | Downloads the chosen background removal model, checked against its pinned SHA-256. |
| `drawing-grid` | Drawing Grid |  | changes the board | Lays an even grid over the selected pictures for copying proportions; the lines invert what is under them so they show on any picture. Board view only. Parameters: `divisions` (integer): squares across and down, 2 to 24; 0 removes the grid; default toggles 4. |
| `extract-palette` | Extract Palette |  | changes the board | Finds the main colours of the selected picture (its visible crop) and adds them as grouped swatch cards below it, most used first. Parameters: `count` (integer): how many colours, 2 to 16; default 6. |
| `find-similar` | Find Similar Pictures |  | window-only | Dims everything except the pictures that look like the selected one, judged by colour mix, the layout of light and dark (mirrored copies count) and the colour layout; the button beside the color chip shows the sample. Near Copies, Similar Pictures and Loosely Similar set how alike they must be. Parameters: `level` (string): close finds near copies, related (default) also edited or cropped versions, loose also pictures of a similar kind. |
| `flip-x` | Flip Horizontal |  | changes the board | Mirrors the selected images left to right. |
| `flip-y` | Flip Vertical |  | changes the board | Mirrors the selected images top to bottom. |
| `grayscale` | Toggle Grayscale |  | changes the board | Shows the selected images in grayscale, or in colour again; the originals are unchanged. |
| `import-cutout-model` | Import Background Model File |  | changes the board, window-only | Asks for a background removal model file to import. |
| `lasso-crop` | Lasso Crop |  | changes the board, window-only | Draw around the part of the selected image to keep; the rest becomes transparent on the board and in exports. Clear Lasso brings it back. |
| `opacity` | Set Opacity |  | changes the board | Asks for an opacity and applies it to the selected items. |
| `pdf-to-images` | PDF Pages to Images... |  | changes the board | Renders pages of the selected PDF into image references laid out beside it, so they can be cropped, flipped, sampled and arranged like any picture. Parameters: `first` (integer): first page, 1 based; `last` (integer): last page; 0 for the end; `dpi` (integer): resolution, default 150. |
| `pick-cutout-points` | Pick Points for Click to Select |  | changes the board, window-only | Starts picking points on the selected image for click-to-select background removal. |
| `relink` | Replace or Relink Image |  | changes the board, window-only | Asks for an image file to replace or relink the selected picture, keeping its place and size. |
| `remove-background` | Remove Background |  | changes the board | Removes the background of the selected images with the chosen model; the original is kept. |
| `reset-adjust` | Reset Adjustments |  | changes the board | Puts brightness, contrast and saturation of the selected pictures back to the original. |
| `reset-crop` | Reset Crop |  | changes the board | Removes the crop from the selected images so the whole picture shows. |
| `restore-background` | Restore Background |  | changes the board | Brings back the original of images whose background was removed. |
| `rotate` | Rotate 90 | `r` | changes the board | Rotates the selected items a quarter turn clockwise. |
| `rotate-selection` | Rotate Selection... | `alt+r` | changes the board | Turns the selected references by any angle together about the centre of the selection (keeping their arrangement), about a chosen point, or each in place. Parameters: `degrees` (number): clockwise degrees; `pivot` (string): "selection" (default, about the selection centre), "each" (every item in place), or an object {x, y} in board coordinates. |
| `sampling` | Toggle Pixel Art |  | changes the board | Switches the selected images between smooth and pixel-art (nearest neighbour) scaling. |
| `save-image` | Save Image As... |  | changes the board, window-only | Downloads the selected pictures as their original files. |
| `value-study` | Value Study |  | changes the board | Shows the selected pictures as a few flat grey values (2 is a notan) to judge light and shadow; the picture and its exports are unchanged. Parameters: `levels` (integer): number of flat grey values, 2 (notan) to 8; 0 turns it off; default toggles 3. |
| `video-clear-clip` | Clear Video In and Out |  | changes the board | Plays the whole video again. |
| `video-frame-back` | Previous Frame | `,` | window-only | Pauses the selected video and steps back one frame. |
| `video-frame-forward` | Next Frame | `.` | window-only | Pauses the selected video and steps forward one frame. |
| `video-set-in` | Set Video In Point | `alt+i` | changes the board | Marks where the selected video or audio reference starts playing; with an out point it plays (and loops) only between them. Parameters: `seconds` (number): time in seconds; the current frame when left out. |
| `video-set-out` | Set Video Out Point | `alt+o` | changes the board | Marks where the selected video or audio reference stops (or loops back to the in point). Parameters: `seconds` (number): time in seconds; the current frame when left out. |
| `video-speed` | Set Video Speed |  | changes the board | Sets the playback speed of the selected video or audio reference, kept with the board. Parameters: `rate` (number): playback speed, 1 is normal. |

## Insert

| Command | Label | Keys | Kind | What it does |
| --- | --- | --- | --- | --- |
| `add-arc` | Add Arc |  | changes the board | Illustrator tools (off by default; Preferences turns them on). Adds an arc as Illustrator's Arc tool does: a quarter curve with a chosen length, slope and open or closed type. Parameters: `width` (number): length along x, default 200; `height` (number): length along y, default 200; `slope` (number): -100 concave to 100 convex, default 50 (a quarter ellipse); `closed` (boolean): close the arc through its base corner. |
| `add-polar-grid` | Add Polar Grid |  | changes the board | Illustrator tools (off by default; Preferences turns them on). Adds a polar grid as Illustrator's Polar Grid tool does: concentric ellipses and radial dividers, each an editable path. Parameters: `width` (number); `height` (number); `rings` (integer): concentric dividers inside the outer ellipse, default 5; `spokes` (integer): radial dividers, default 5. |
| `add-polygon` | Add Polygon... |  | changes the board | Illustrator tools (off by default; Preferences turns them on). Adds a regular polygon as an editable path. Parameters: `points` (integer): number of sides. |
| `add-rect-grid` | Add Rectangular Grid |  | changes the board | Illustrator tools (off by default; Preferences turns them on). Adds a rectangular grid as Illustrator's Rectangular Grid tool does: a frame with evenly spaced horizontal and vertical dividers, each an editable path. Parameters: `width` (number); `height` (number); `rows` (integer): horizontal dividers, default 5; `columns` (integer): vertical dividers, default 5; `frame` (boolean): include the outer frame, default true. |
| `add-spiral` | Add Spiral |  | changes the board | Illustrator tools (off by default; Preferences turns them on). Adds a spiral as Illustrator's Spiral tool does, with radius, decay, segments and direction. Parameters: `radius` (number): outer radius, default 100; `decay` (number): each quarter turn as a percent of the last, default 80; `segments` (integer): quarter turns, default 10; `counterclockwise` (boolean). |
| `add-star` | Add Star... |  | changes the board | Illustrator tools (off by default; Preferences turns them on). Adds a star as an editable path. Parameters: `points` (integer): number of points; `inner` (number): inner radius as a share of the outer, default 0.5. |
| `column` | Add Column |  | changes the board | Adds a column; items dragged onto it become its children and move with it. |
| `document` | Add Document |  | changes the board | Adds a document card and opens its editor. |
| `from-web` | Add Images from the Web… |  | changes the board | Asks for a web page or image URL and adds the images found there to the board. |
| `link` | Add Link | `shift+l` | changes the board | Adds a link card; pasting a URL fills it. |
| `nested-board` | Add Nested Board |  | changes the board | Adds a card that opens another board. |
| `note` | Add Note | `n` | changes the board | Adds a note at the pointer or view centre and starts editing it. |
| `pick-color` | Sample Image Color | `i` | changes the board, window-only | Turns on the colour sampler: click an image to read its original pixel colour. |
| `swatch` | Add Color Swatch |  | changes the board | Adds a colour swatch card. |
| `table` | Add Table |  | changes the board | Adds a table card with typed columns and formulas. |
| `todo` | Add Task |  | changes the board | Adds a task card with a checkbox. |

## Inspector

| Command | Label | Keys | Kind | What it does |
| --- | --- | --- | --- | --- |
| `assign` | Assign Selected Images to NodeMode |  | changes the board, window-only | Sends the selected images to NodeMode. |
| `blend-mode` | Set Blending Mode |  | changes the board | Sets the blending mode of the selected items (images, shapes, notes, any item), as in Illustrator's Transparency panel: Multiply darkens, Screen lightens, Overlay adds contrast, Difference compares two references. Parameters: `mode` (string): how the selected items mix with what is beneath them. |
| `close-dialog` | Close Dialog |  | changes the board, window-only | Closes the open input dialog. |
| `close-overlays` | Close Dialog |  | changes the board, window-only | Closes open menus, dialogs and overlays. |
| `format-note` | Format Note as Markdown |  | changes the board | Opens the selected note in the editor set to Markdown formatting. |
| `open-source` | Open Note Editor |  | view | Opens the selected note or document in the full editor. |

## Layer

| Command | Label | Keys | Kind | What it does |
| --- | --- | --- | --- | --- |
| `back` | Send to Back | `shift+arrowdown` | changes the board | Sends the selected items to the back (stacking-locked items stay where they are). |
| `backward` | Send Backward |  | changes the board | Sends the selected items one step backward. |
| `forward` | Bring Forward |  | changes the board | Brings the selected items one step forward. |
| `front` | Bring to Front | `shift+arrowup` | changes the board | Brings the selected items to the front (stacking-locked items stay where they are). |
| `lock-stacking` | Lock Stacking Order |  | changes the board | Keeps the selected references at their place in the stack: Bring to Front, Bring Forward, Send Backward and Send to Back leave them alone, so a background stays behind. |

## Organize

| Command | Label | Keys | Kind | What it does |
| --- | --- | --- | --- | --- |
| `align` | Align |  | changes the board | Aligns the selected items by the edge or centre chosen in the inspector. |
| `copy-to-board` | Copy Selection to New Board |  | changes the board | Copies the selected items, their column children and the connections between them onto a new board, opened in a new tab; this board is unchanged. Parameters: `title` (string): title of the new board; default "<board> selection". |
| `distribute-x` | Space Horizontally |  | changes the board | Spaces the selected items evenly from left to right. |
| `distribute-y` | Space Vertically |  | changes the board | Spaces the selected items evenly from top to bottom. |
| `group` | Group Selected | `mod+g` | changes the board | Groups the selected items so they select and move together. |
| `hide-selected` | Hide Selected | `mod+3` | changes the board | Hides the selected items; they stay on the board and come back with Show All. |
| `isolate-selected` | Isolate Selected |  | changes the board | Hides everything except the selection (and the items inside selected columns) so a big board can be worked on piece by piece; Show All restores the rest. |
| `lock-drops` | Lock Against Drops |  | changes the board | Stops items dragged onto the selected columns from joining them; items already inside stay, and can still be dragged out. |
| `move-to-board` | Move Selection to New Board |  | changes the board | Moves the selected items, their column children and the connections between them onto a new board, opened in a new tab; they leave this board through the Trash, and Undo here brings them back. Parameters: `title` (string): title of the new board; default "<board> selection". |
| `normalize` | Normalize Sizes |  | changes the board | Asks for a target width, height or area and resizes the selected items to it, keeping each aspect ratio. |
| `normalize-groups` | Normalize Sizes Within Each Group |  | changes the board | Gives the items of each group the same size (the group's median height, width or area) while every group keeps its own scale. Works on the groups in the selection, or every group when nothing is selected. Parameters: `mode` (string): which size to match; default height. |
| `pack` | Pack | `mod+p` | changes the board | Packs the selection, or every unlocked top-level item when nothing is selected, into tight rows with the pack spacing. |
| `select-duplicates` | Select Duplicate Images |  | view | Selects the extra copies of every image that appears more than once on the board, the same file or a near-identical copy, leaving the first of each unselected, ready to delete. Parameters: `distance` (integer): how different two pictures may be, 0 identical to 16 loosely alike; default 4. |
| `show-all` | Show All | `mod+alt+3` | changes the board | Shows every hidden item on the board and selects them. |
| `snap` | Snap Selection to Grid |  | changes the board | Moves the selected items onto the board grid. |
| `sort-aspect` | Sort by Aspect Ratio |  | changes the board | Arranges the selection, or every unlocked top-level item, in rows ordered by aspect ratio. |
| `sort-color` | Sort by Color |  | changes the board | Arranges the selection, or every unlocked top-level item, in rainbow order of each picture's main color, with black, white and grey pictures after them from light to dark. |
| `sort-filename` | Sort by Filename |  | changes the board | Arranges the selection, or every unlocked top-level item, in rows ordered by file name. |
| `sort-similarity` | Sort by Similarity |  | changes the board | Arranges the selection, or every unlocked top-level item, so that similar-looking pictures sit together. |
| `ungroup` | Ungroup Selected | `mod+shift+g` | changes the board | Ungroups the selected groups. |
| `unlock-all` | Unlock All | `mod+alt+2` | changes the board | Unlocks every locked item on the board and selects them. |

## Path

| Command | Label | Keys | Kind | What it does |
| --- | --- | --- | --- | --- |
| `add-anchor-points` | Add Anchor Points |  | changes the board | Illustrator tools (off by default; Preferences turns them on). Adds an anchor halfway along every segment without changing the shape. |
| `average-anchors` | Average... |  | changes the board, window-only | Illustrator tools (off by default; Preferences turns them on). Moves the selected anchors to their average position, or lines them up horizontally or vertically. Parameters: `axis` (string): both moves the anchors to one point; horizontal lines them up on a horizontal line; vertical on a vertical line. |
| `convert-to-path` | Convert to Path |  | changes the board | Illustrator tools (off by default; Preferences turns them on). Turns rectangles, ellipses, lines and freehand strokes into editable anchor paths. |
| `cut-path` | Cut Path at Selected Anchor | `mod+shift+x` | changes the board, window-only | Illustrator tools (off by default; Preferences turns them on). Scissors: opens a closed path at the selected anchor, or splits an open path in two there. |
| `delete-segment` | Delete Segment |  | changes the board, window-only | Illustrator tools (off by default; Preferences turns them on). Removes the segment between two selected neighbouring anchors: a closed path opens there, an open path splits in two. |
| `gradient-fill` | Gradient Fill |  | changes the board | Illustrator tools (off by default; Preferences turns them on). Fills the selected shapes and paths with a linear or radial gradient between two colours or through several stops with their own opacity, or removes it with type none. Parameters: `type` (string); `from` (string): start colour as #RRGGBB; `to` (string): end colour as #RRGGBB; `angle` (number): linear gradient angle in degrees, 0 runs left to right; `stops` (array): 2 to 16 stops as {offset: 0-100, color: "#RRGGBB", opacity?: 0-100}; when given they replace from and to. |
| `join-paths` | Join | `mod+shift+e` | changes the board | Illustrator tools (off by default; Preferences turns them on). Closes one open path, or joins the end of the first selected open path to the start of the second. |
| `offset-path` | Offset Path... |  | changes the board | Illustrator tools (off by default; Preferences turns them on). Object > Path > Offset Path: adds a path at the given distance outside (or inside) each selected shape, with round joins. Parameters: `distance` (number): pixels outward, negative for inward. |
| `outline-stroke` | Outline Stroke |  | changes the board | Illustrator tools (off by default; Preferences turns them on). Object > Path > Outline Stroke: turns each selected stroke into a filled shape with the same outline, keeping its caps, joins and miter limit; a filled closed shape keeps its fill as a separate shape behind. Dashes are not expanded. |
| `reverse-path` | Reverse Path Direction |  | changes the board | Illustrator tools (off by default; Preferences turns them on). Reverses the order of the anchors; arrowheads and dash starts swap ends. |
| `round-corners` | Round Corners... |  | changes the board | Illustrator tools (off by default; Preferences turns them on). Live Corners on every corner point of the selected shapes and paths, as Illustrator does; rectangles, ellipses, lines and freehand strokes become editable paths first. A radius larger than fits is clamped. Parameters: `radius` (number): corner radius in pixels; `style` (string): round, inverted (inverted round) or chamfer. |
| `simplify-path` | Simplify Path |  | changes the board | Illustrator tools (off by default; Preferences turns them on). Fewer anchor points on straight-segment paths, within a tolerance. Parameters: `tolerance` (number): how far, in pixels, the simpler path may move. |
| `smooth-path` | Smooth Path |  | changes the board | Illustrator tools (off by default; Preferences turns them on). Makes every anchor a smooth point, as the Smooth tool does for a whole path. |
| `square-corners` | Square Corners |  | changes the board | Illustrator tools (off by default; Preferences turns them on). Removes corner rounding from the selected paths. |
| `stroke-options` | Set Stroke Options |  | changes the board | Illustrator tools (off by default; Preferences turns them on). Illustrator Stroke panel options for the selected shapes and paths, arrowheads on open paths, lines and freehand strokes included. Parameters: `cap` (string); `join` (string); `miter` (number); `dash` (array): dash and gap lengths, for example [8, 4]; [] for a solid line; `arrow_start` (string); `arrow_end` (string); `arrow_scale` (number): arrowhead size in percent. |

## Pathfinder

| Command | Label | Keys | Kind | What it does |
| --- | --- | --- | --- | --- |
| `pathfinder-crop` | Crop |  | changes the board | Illustrator tools (off by default; Preferences turns them on). Pathfinder Crop: Keeps only the parts of the shapes behind that fall inside the frontmost shape, and removes the frontmost shape. Curves become many short segments. |
| `pathfinder-divide` | Divide |  | changes the board | Illustrator tools (off by default; Preferences turns them on). Pathfinder Divide: Splits the selected shapes into every separate area their outlines make; each piece keeps the style of the shape on top there. Curves become many short segments. |
| `pathfinder-exclude` | Exclude |  | changes the board | Illustrator tools (off by default; Preferences turns them on). Pathfinder Exclude: Keeps the areas where an odd number of shapes overlap, removing the shared parts. The result is one path with the backmost shape's stroke and fill; curves become many short segments. |
| `pathfinder-intersect` | Intersect |  | changes the board | Illustrator tools (off by default; Preferences turns them on). Pathfinder Intersect: Keeps only the area all selected shapes share. The result is one path with the backmost shape's stroke and fill; curves become many short segments. |
| `pathfinder-merge` | Merge |  | changes the board | Illustrator tools (off by default; Preferences turns them on). Pathfinder Merge: Trims hidden parts, then joins touching pieces that share a colour and fill. Curves become many short segments. |
| `pathfinder-minus-back` | Minus Back |  | changes the board | Illustrator tools (off by default; Preferences turns them on). Pathfinder Minus Back: Cuts the shapes behind out of the frontmost shape. The result is one path with the backmost shape's stroke and fill; curves become many short segments. |
| `pathfinder-minus-front` | Minus Front |  | changes the board | Illustrator tools (off by default; Preferences turns them on). Pathfinder Minus Front: Cuts the shapes in front out of the backmost shape. The result is one path with the backmost shape's stroke and fill; curves become many short segments. |
| `pathfinder-trim` | Trim |  | changes the board | Illustrator tools (off by default; Preferences turns them on). Pathfinder Trim: Removes the hidden parts of each selected shape, keeping each visible part as its own object. Curves become many short segments. |
| `pathfinder-unite` | Unite |  | changes the board | Illustrator tools (off by default; Preferences turns them on). Pathfinder Unite: Merges the selected shapes into one outline. The result is one path with the backmost shape's stroke and fill; curves become many short segments. |

## Terminal

| Command | Label | Keys | Kind | What it does |
| --- | --- | --- | --- | --- |
| `chat` | Chat with Claude | `mod+alt+j` | window-only | Opens the Chat tab in the terminal dock: Claude answers in formatted text, working on the board through FormRef's tools, with every tool call shown. |
| `claude-code` | Claude Code | `mod+shift+j` | window-only | Starts the person's own Claude Code in a dock tab, connected to FormRef's tools. Parameters: `prompt` (string): a first message for the session. |
| `new-terminal` | New Terminal |  | window-only | Opens another login shell tab in the terminal dock. |
| `terminal` | Show Terminal | `mod+j` | window-only | Shows or hides the terminal dock under the canvas; its shells keep running while hidden. |

## Tools

| Command | Label | Keys | Kind | What it does |
| --- | --- | --- | --- | --- |
| `draw` | Draw Mode | `d` | view | Switches to freehand drawing on the board. |
| `measure` | Measure | `shift+m` | window-only | Drag on the board to measure a length in board pixels and its angle; each later measurement also shows its ratio to the first. Shift keeps lines at 45 degree steps; Esc or Measure again clears them. Nothing is saved. |
| `pencil-fidelity` | Pencil Fidelity... |  | window-only | Illustrator tools (off by default; Preferences turns them on). Sets the Pencil's fidelity from 1 (accurate, more anchors) to 5 (smooth, fewer anchors); without a value it steps to the next setting. Parameters: `fidelity` (integer): 1 follows the hand closely with more anchors, 5 is smoothest with fewest. |
| `tool-circle` | Circle Tool | `shift+o` | view | Switches to the ellipse tool for annotation circles. |
| `tool-connect` | Connect References | `shift+c` | view | Switches to the connect tool: click two items to draw a connection between them. |
| `tool-curvature` | Curvature Tool | `shift+~` | window-only | Illustrator tools (off by default; Preferences turns them on). Draws a path as Illustrator's Curvature tool does: each click places a point and the curve bends smoothly through all of them; drag while placing to move the point, double-click or Alt-click a placed point to switch it between smooth and corner, click the first point to close, Enter or Esc to finish, Backspace removes the last point. |
| `tool-direct` | Direct Selection Tool | `a` | window-only | Illustrator tools (off by default; Preferences turns them on). Shows the anchor points, handles and corner widgets of the selected shape or path: drag an anchor or handle to reshape, drag a corner widget to round every corner (Shift: only that corner), Alt-click a corner widget to switch Round, Inverted round and Chamfer, Alt-click an anchor to convert it between corner and smooth, Alt-drag a handle to break a smooth point. |
| `tool-eraser` | Eraser | `e` | view | Switches the eraser on or off; dragging over drawings removes them. |
| `tool-hand` | Pan Tool | `h` | view | Switches to the Pan tool (drag to move the view). |
| `tool-line` | Line Tool | `shift+i` | view | Switches to the line tool for annotation lines and arrows. |
| `tool-pen-path` | Pen Tool | `shift+p` | window-only | Illustrator tools (off by default; Preferences turns them on). Draws an anchor path as Illustrator's Pen does: click for a corner point, drag for a smooth point, click the first point to close the path, Enter or Esc to finish an open path, Backspace removes the last point. |
| `tool-pencil` | Pencil Tool | `shift+n` | window-only | Illustrator tools (off by default; Preferences turns them on). Draws freehand like Illustrator's Pencil: the trace becomes an editable smooth path with anchors and handles; end near the start to close it. Pencil Fidelity sets how closely it follows the hand. |
| `tool-rect` | Rectangle Tool | `shift+r` | view | Switches to the rectangle tool for annotation boxes. |
| `tool-select` | Select Tool | `v` | view | Switches to the Select tool. |

## View

| Command | Label | Keys | Kind | What it does |
| --- | --- | --- | --- | --- |
| `agent` | Open Agent |  | changes the board, window-only | Opens the agent panel on the right. |
| `commands` | Commands | `mod+k` | changes the board, window-only | Opens the command palette. |
| `compare` | Compare Pictures | `alt+c` | window-only | Shows the two selected pictures full screen to check one against the other: side by side, overlaid with an opacity slider, with a swipe divider, or as a difference where matching areas go black. Keys 1 to 4 pick the view, S swaps, Esc closes. Nothing on the board changes. Parameters: `mode` (string): side, overlay, swipe or difference. |
| `forget-window` | Forget Board Window Layout |  | changes the board, window-only | Stops this board from moving or resizing the window when it opens. |
| `help` | Keyboard Shortcuts | `?`, `shift+/` | changes the board, window-only | Opens the keyboard shortcut sheet, where shortcuts can be changed. |
| `left-dock` | Toggle Left Panel | `mod+[` | view | Shows or hides the left panel (boards and the item outline). |
| `preferences` | Preferences | `mod+,` | changes the board, window-only | Opens Preferences: theme, language, desktop window, browser clipper and cloud storage. |
| `present` | Present | `p` | view | Starts or stops presenting the board full screen. |
| `reference-focus` | Focus Image Reference |  | view | Shows the selected picture alone, full size, in the reference viewer. |
| `reference-next` | Next Reference |  | view | Shows the next picture in the reference viewer. |
| `reference-play` | Play or Pause References |  | view | Plays or pauses the reference viewer slideshow. |
| `reference-prev` | Previous Reference |  | view | Shows the previous picture in the reference viewer. |
| `reference-stop` | Exit Reference View |  | view | Closes the reference viewer. |
| `remember-window` | Save Window Layout with Board |  | changes the board, window-only | Desktop app: saves the window position, size, Always on Top and window opacity with this board, and restores them whenever the board opens. |
| `right-dock` | Toggle Right Panel | `mod+]` | view | Shows or hides the right panel (inspector and agent). |
| `slideshow` | Slideshow | `shift+s` | view | Starts or stops a slideshow of the board pictures, one at a time. |
| `smart-guides` | Smart Guides | `mod+u` | window-only | Illustrator tools (off by default; Preferences turns them on). Turns Smart Guides on or off: while moving, items snap to the edges and centres of other items and show the line they align on. |
