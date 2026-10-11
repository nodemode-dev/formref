# Clipper hashout log

## Navigation

- [FormRef root](../README.md)
- [Browser clipper guide](../.docs/wiki/Clipper.md)

## v0.5.2 · Firefox add-on lint

- refers-to: `manifest.json` :: browser_specific_settings.gecko
- kind: rationale
- logged: v0.5.2 · 2026-10-11

Mozilla's `addons-linter` 10.14.0 found 0 errors and 4 warnings. Fixed two: Firefox now requires `data_collection_permissions`, declared as `none` because clips go only to the person's own FormRef; and `optional_host_permissions` needs Firefox 128, so `strict_min_version` moved from 121 to 128. Kept on purpose: `service_worker` is ignored by Firefox (Chrome reads it, Firefox reads `scripts`), and the data-collection key is ignored by Firefox 128 to 139, which is harmless. The rebuilt manifest still loaded in Chromium and every clip kind still landed.

## v0.4.10 · First build

- refers-to: `manifest.json`, `background.js` :: clip, report, installMenus; `options.html`, `options.js`, `options.css`
- kind: rationale
- logged: v0.4.10 · 2026-10-11

Plain Manifest V3 JavaScript with no build step and no dependencies, so the folder loads unpacked as it is. One manifest serves Chrome and Firefox: `background` lists both `service_worker` (Chrome) and `scripts` (Firefox 121 and later), and `browser_specific_settings` gives Firefox its id. Host permissions cover only loopback, so the extension can reach FormRef and nothing else unless the person allows `<all_urls>` from the options page for downloading images FormRef cannot fetch. `activeTab` and `scripting` read the selection with its line breaks after a menu click; when a page refuses scripts, the menu's own selection text is used. Results show as a toolbar badge (OK or !), its tooltip, and a notification.

Run (Chromium with the unpacked extension under Xvfb): the service worker loaded; the options page paired with the token and listed boards; image (FormRef refused the private address, so the browser downloaded it), `data:` image, text, link and page clips all landed with their source; a wrong token showed ! with the reason; a board chosen in the options received the next clip; no console errors. Not run: the native right-click menu (automation cannot open it, so handlers were called directly), Firefox, Safari.
