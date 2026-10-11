# Browser clipper

The FormRef Clipper is a browser extension in the repository's `clipper/` folder. It saves what you right-click on any web page to the FormRef running on your computer: an image, selected text (as a note with the page address), a link, or the page itself. The toolbar button saves the page.

## Install

1. Start FormRef (`./formref` or `./formref serve`).
2. Chrome, Edge, Brave or Arc: open the extensions page, turn on Developer mode, choose Load unpacked and pick the `clipper` folder.
3. Firefox 121 or later: open `about:debugging`, This Firefox, Load Temporary Add-on, and pick `clipper/manifest.json`. A temporary add-on lasts until Firefox closes; a signed build is not provided.
4. In FormRef, open Preferences, Browser clipper, and press Copy. Or run `./formref clipper` (`formref.bat clipper` on Windows), which prints the folder and the token; `--new` makes a new token.
5. In the clipper's options page, paste the token and press Save and connect. It lists your boards when the pairing works.

## Where clips go

By default a clip lands on the board open in FormRef, near the middle of your last view, in a free spot so it never covers anything. The options page can send clips to a chosen board instead. Images keep the page they came from (`url`), and every clip records `data.clip.source` and the time.

## Images that FormRef cannot fetch

FormRef first fetches the image itself, with the same checks as web capture (public addresses only, every redirect checked). If that fails, because the site needs you to be signed in or blocks unknown clients, the clipper downloads the image in your browser and sends the bytes. For images on other sites than the page, tick "Download images in the browser" in the options; the browser asks you to allow it.

## Safety

- A clip must carry the pairing token. FormRef shows the token only to its own page; a web page asking for it is refused, and a web page cannot send a clip because its origin is refused before the token is even read.
- The extension's origin may reach only the two clip routes (`POST /api/clip` and `GET /api/clip/boards`); every other route refuses it.
- New token in Preferences unpairs the clipper at once.
- FormRef still listens on loopback only, so nothing outside your computer can reach it.

## Not covered

Safari needs the extension converted with Xcode; that build is not included. The native right-click menu cannot be driven by automation, so the clip handlers were checked by calling them in the loaded extension, not by clicking the menu.
