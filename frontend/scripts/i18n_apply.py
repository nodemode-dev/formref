#!/usr/bin/env python3
"""Takes a reviewed sheet from i18n_review.py back into its language table.

Run from the repo root: python3 frontend/scripts/i18n_apply.py SHEET.csv [--lang CODE] [--dry-run]

The language comes from the file name (de.csv) unless --lang names it. Every row whose Better wording is filled in replaces that string's translation. A row is refused, and reported, when its English is no longer in the interface, when its placeholders ({0}, {1}) differ from the English, or when its wording is only spaces. Rows marked ok, or left empty, change nothing. --dry-run reports what would change and writes nothing. Spreadsheets that saved the sheet with semicolons instead of commas are read too.
"""
import csv
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from i18n_check import TABLES, keys, placeholders  # noqa: E402


def rows(path: Path) -> list[dict]:
    text = path.read_text(encoding="utf-8-sig")
    dialect = csv.Sniffer().sniff(text.splitlines()[0], delimiters=",;\t")
    return list(csv.DictReader(text.splitlines(keepends=True), dialect=dialect))


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        print("Usage: i18n_apply.py SHEET.csv [--lang CODE] [--dry-run]")
        return 2
    sheet = Path(args[0])
    lang = sys.argv[sys.argv.index("--lang") + 1] if "--lang" in sys.argv else sheet.stem
    dry = "--dry-run" in sys.argv
    table_path = TABLES / f"{lang}.json"
    if not table_path.exists() or lang == "en":
        print(f"No translation table for {lang!r}; name the language with --lang.")
        return 2
    table = json.loads(table_path.read_text(encoding="utf-8"))
    english = keys()
    changed, same, refused, approved = [], 0, [], 0
    for number, row in enumerate(rows(sheet), 2):
        key = (row.get("English") or "").strip()
        better = (row.get("Better wording") or "").strip()
        if not key:
            continue
        if not better:
            approved += (row.get("Verdict") or "").strip().lower() == "ok"
            continue
        if key not in english:
            refused.append((number, key, "no longer in the interface"))
        elif placeholders(key) != placeholders(better):
            refused.append((number, key, "placeholders differ from the English"))
        elif table.get(key) == better:
            same += 1
        else:
            changed.append((key, table.get(key, ""), better))
            table[key] = better
    for key, old, new in changed:
        print(f"change  {key!r}\n   from {old!r}\n     to {new!r}")
    for number, key, reason in refused:
        print(f"refused row {number}: {key!r} ({reason})")
    print(f"{lang}: {len(changed)} changed, {same} already so, {approved} marked ok, {len(refused)} refused" + (" (dry run, nothing written)" if dry else ""))
    if changed and not dry:
        # Same layout as the other tables: one-space indent, scripts kept as written, no trailing newline.
        table_path.write_text(json.dumps(table, indent=1, ensure_ascii=False), encoding="utf-8")
    return 1 if refused else 0


if __name__ == "__main__":
    sys.exit(main())
