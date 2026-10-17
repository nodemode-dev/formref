#!/usr/bin/env python3
"""Writes a translation review pack: one CSV per language for a native speaker, plus SUMMARY.md.

Run from the repo root: python3 frontend/scripts/i18n_review.py OUTDIR [LANG ...]

Each row holds the English string, the current translation, where the string appears in the code (so the reviewer can find it on screen), automatic checks worth a look, and empty Verdict and Better wording columns to fill in. The CSVs are UTF-8 with a byte order mark, so Excel, Numbers and Google Sheets open them with every script intact.
"""
import csv
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from i18n_check import PARTIAL, ROOT, TABLES, keys, placeholders  # noqa: E402

ENDINGS = {".": (".", "。", "।"), "…": ("…", "..."), "?": ("?", "？", ";"), ":": (":", "：")}
NO_FULL_STOP = {"th"}
SHARED_WORDS = re.compile(r"^(FormRef|BeeRef|PureRef|Milanote|PNG|SVG|PDF|JSON|ZIP|HEX|RGB|RGBA|HSV|ISO|URL|OK|MCP|Markdown|Lightroom|Bridge|Windows|A3|A4|Letter|Tabloid|Ollama|Codex|Cursor|Claude Code)\b")


def sources() -> list[tuple[str, list[str]]]:
    files = [ROOT / "frontend" / "index.html"]
    files += sorted(p for p in (ROOT / "frontend" / "src").rglob("*.ts") if "/lib/i18n" not in str(p))
    files += sorted((ROOT / "backend" / "app").rglob("*.py"))
    return [(str(p.relative_to(ROOT)), p.read_text(encoding="utf-8").splitlines()) for p in files]


def where(english: str, texts: list[tuple[str, list[str]]]) -> str:
    """Up to two file:line places, found by the longest piece of the string between placeholders."""
    piece = max(re.split(r"\{\d+\}", english), key=len).strip()
    if len(piece) < 2:
        return ""
    # A short whole string ("Group") is looked for as a literal or element text, so it does not match inside longer words.
    forms = [f"'{piece}'", f'"{piece}"', f">{piece}<", f"`{piece}`"] if piece == english and len(piece) < 25 else [piece]
    found = []
    for name, lines in texts:
        for number, line in enumerate(lines, 1):
            if any(form in line for form in forms):
                found.append(f"{name}:{number}")
                break
        if len(found) == 2:
            break
    if not found and forms != [piece]:
        return where(english + "{0}", texts)
    return " ; ".join(found)


def checks(lang: str, english: str, text: str) -> list[str]:
    notes = []
    if placeholders(english) != placeholders(text):
        notes.append("placeholders differ")
    shared = SHARED_WORDS.match(english) or english.startswith("#") or re.search(r"\b(sans-serif|serif|monospace)$", english)
    if text.strip() == english.strip() and re.search(r"[A-Za-z]{3}", english) and not shared:
        notes.append("same as English")
    if len(english) <= 40 and len(text) > 1.6 * len(english) + 4:
        notes.append("much longer, may not fit")
    for mark, accepted in ENDINGS.items():
        if english.rstrip().endswith(mark) and not (mark == "." and lang in NO_FULL_STOP) and not text.rstrip().endswith(accepted):
            notes.append(f"English ends with {mark}")
            break
    if re.fullmatch(r"[A-Z][a-z]+", english):
        notes.append("one word: check the sense where it appears")
    return notes


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__.strip().splitlines()[2])
        return 2
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    wanted = set(sys.argv[2:])
    english = sorted(keys())
    texts = sources()
    places = {key: where(key, texts) for key in english}
    summary = ["# FormRef translation review", "", f"{len(english)} English strings. One CSV per language; fill in Verdict (ok or fix) and Better wording.", "",
               "| Language | Translated | Missing | Flagged |", "| --- | --- | --- | --- |"]
    for path in sorted(TABLES.glob("*.json")):
        lang = path.stem
        if lang in PARTIAL or (wanted and lang not in wanted):
            continue
        table = json.loads(path.read_text(encoding="utf-8"))
        flagged = missing = 0
        with (out / f"{lang}.csv").open("w", encoding="utf-8-sig", newline="") as handle:
            writer = csv.writer(handle)
            writer.writerow(["English", "Translation", "Where", "Checks", "Verdict", "Better wording"])
            for key in english:
                text = table.get(key)
                notes = ["missing"] if text is None else checks(lang, key, text)
                missing += text is None
                flagged += bool(notes)
                writer.writerow([key, text or "", places[key], "; ".join(notes), "", ""])
        summary.append(f"| {lang} | {len(english) - missing} | {missing} | {flagged} |")
        print(f"{lang:8} {len(english) - missing:5} translated  {missing:4} missing  {flagged:4} flagged")
    summary += ["", "Checks are hints, not errors: \"same as English\" is often right for names and file formats, and \"one word\" asks whether a word such as Group is meant as a noun or a verb where it appears."]
    (out / "SUMMARY.md").write_text("\n".join(summary) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
