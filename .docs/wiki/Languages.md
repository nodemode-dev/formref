# Languages

FormRef's window is available in 26 languages; English is the source text and the default. Choose one in Preferences, Language. It switches in place, without reloading, and the choice is remembered; a saved language is loaded before the window is shown, so the first frame is already translated.

| Code | Language | Code | Language |
| --- | --- | --- | --- |
| en | English | ru | Русский |
| es | Español | pl | Polski |
| es-MX | Español (México) | cs | Čeština |
| pt-BR | Português (Brasil) | hu | Magyar |
| fr | Français | uk | Українська |
| fr-CA | Français (Canada) | tr | Türkçe |
| de | Deutsch | zh-Hans | 简体中文 |
| it | Italiano | zh-Hant | 繁體中文 |
| nl | Nederlands | ja | 日本語 |
| da | Dansk | ko | 한국어 |
| fi | Suomi | id | Bahasa Indonesia |
| nb | Norsk bokmål | th | ไทย |
| sv | Svenska | vi | Tiếng Việt |

## How the tables work

- Tables live in `frontend/src/lib/i18n/tables/<code>.json`, one per language, keyed by the English text. English has no table.
- `es-MX` and `fr-CA` hold only the words that differ; everything else comes from `es` and `fr`.
- `frontend/src/lib/i18n.ts` loads a table only when it is chosen. A page translator swaps text and the `title`, `aria-label`, `placeholder` and `alt` attributes where they land, keeping the English so switching back restores it.
- User content is never translated: board and card text, tab and outline names, chat messages and the terminal are skipped. Mark any other user-owned element with `data-no-i18n`.
- A trailing `...` or `:` is set aside before lookup. Strings built in code carry `{0}` placeholders; a placeholder glued to a letter (`Image{1}`) is an English plural ending and is dropped in other languages.
- CJK and Thai use system font fallbacks set in `frontend/src/styles/shell.css`.

## Adding or changing a string

1. Write the English in the interface as usual.
2. Run `python3 frontend/scripts/i18n_check.py`. It lists the English strings from `index.html`, the TypeScript and backend messages, and reports what each table is missing, unused keys and placeholder mismatches; `--strict` fails while anything is missing, and `--keys FILE` writes the English list. Command `description:` values are English for agents and are skipped; a `description:` inside an `inputDialog(` call on the same line is shown in a dialog and is counted (v0.10.0). Strings containing `;`, `<`, `>` or `=` and nested template literals are not found, so shown text avoids them.
3. Add the translation to every full table (and to `es-MX` or `fr-CA` only when the wording differs). Use Adobe Illustrator's and the operating system's own terms in each language.
4. Check German, Russian and Finnish for overflow in toolbars and the inspector.

## Review by native speakers (v0.33.0)

`./formref i18n review <folder> [language ...]` (or `python3 frontend/scripts/i18n_review.py`) writes one CSV per language plus `SUMMARY.md`. Each CSV has the columns English, Translation, Where, Checks, Verdict and Better wording.
- Where gives up to two `file:line` places, so the reviewer can find the string on screen.
- Checks are hints for the reviewer: missing, placeholders differ, same as English, much longer (may not fit), a different final mark (period, ellipsis, question mark or colon), and one word, which asks whether a word such as Group is a noun or a verb where it appears.
- The files are UTF-8 with a byte order mark, so Excel, Numbers and Google Sheets show every script.
- Hand the CSV for one language to a reviewer; their Better wording column goes back into that language's table.

`./formref i18n apply <sheet.csv> [--lang CODE] [--dry-run]` (v0.34.0) brings a returned sheet back in.
- The language is taken from the file name (`de.csv`) unless `--lang` names it.
- Every row with Better wording filled in replaces that translation. Rows marked ok, or left empty, change nothing.
- A row is refused and listed when its English is no longer in the interface, or when its placeholders differ from the English. The exit code is then 1, though the valid rows are still written.
- `--dry-run` shows every change without writing anything.
- Sheets saved with semicolons, as some spreadsheet locales do, are read too.
- Run `./formref i18n check --strict` afterwards and commit the table as an i18n change.

`./formref i18n check [--strict]` runs the coverage check above.
