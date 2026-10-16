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
2. Run `python3 frontend/scripts/i18n_check.py`. It lists the English strings from `index.html`, the TypeScript and backend messages, and reports what each table is missing, unused keys and placeholder mismatches; `--strict` fails while anything is missing, and `--keys FILE` writes the English list.
3. Add the translation to every full table (and to `es-MX` or `fr-CA` only when the wording differs). Use Adobe Illustrator's and the operating system's own terms in each language.
4. Check German, Russian and Finnish for overflow in toolbars and the inspector.
