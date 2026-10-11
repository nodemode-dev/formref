# Cloud storage

FormRef can save boards to, and open files from, Google Drive and Dropbox. It is off until you connect, and it uses your own app credentials: there is no FormRef account and no FormRef server in between. The flows are FormCut's, ported unchanged.

## Connect

Open Preferences, Cloud storage.

**Google Drive.** In your Google Cloud project, create an OAuth client of type Desktop app and enable the Google Drive API. Paste the client ID and secret into FormRef and press Save, then Connect: Google's sign-in opens in a new tab and FormRef shows Connected when you finish. By default FormRef asks for `drive.file`, which lets it create files and see only the files it created. Tick Browse all of Drive to also ask for `drive.readonly`, a restricted scope Google verifies before public use; it suits your own use.

**Dropbox.** In the Dropbox App Console, create an app with scoped access (`files.content.write`, `files.content.read`, `files.metadata.read`). Paste its app key, Save, then Connect: Dropbox shows a code in the new tab; paste it into FormRef and press Finish. No secret is needed.

Disconnect forgets the sign-in; the app credentials stay until you change them.

## Use

- **Save Board to Cloud** (File menu, palette): as a FormRef board (`.formref`, which reopens with every image and note), a picture (`.png`) or Markdown, into a `formref` folder FormRef makes in your Drive or Dropbox.
- **Open from Cloud** (File menu, palette): browse your folders. A `.formref`, `.istack` or `.json` file opens as a new board; anything else is added to the open board, an image as an image card.

## Safety

- Tokens stay in the local service, in `cloud.json` in the data folder, readable only by your user account. They refresh themselves and never reach the browser page.
- Agents cannot move files to or from the cloud: the cloud routes refuse any request that carries an outside agent's header, and there are no cloud MCP tools.
- Sign-in uses PKCE (S256). A Google sign-in that is replayed, unknown or older than ten minutes is refused.
- Files from the cloud are limited to 64 MiB, like uploads, and pass through the same checks as any import.

## Testing against a stand-in

`CLOUD_GOOGLE_AUTH`, `CLOUD_GOOGLE_TOKEN`, `CLOUD_GOOGLE_API`, `CLOUD_DROPBOX_AUTH`, `CLOUD_DROPBOX_API` and `CLOUD_DROPBOX_CONTENT` point the service at other addresses, as in FormCut, so the flows can be exercised against a local stand-in.
