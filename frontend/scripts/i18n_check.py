#!/usr/bin/env python3
"""Lists the interface's English strings and reports, per language table, missing keys, unused keys and placeholder mismatches.

Run from the repo root: python3 frontend/scripts/i18n_check.py [--keys out.json] [--strict]
"""
import glob
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TABLES = ROOT / "frontend" / "src" / "lib" / "i18n" / "tables"
PARTIAL = {"es-MX", "fr-CA"}
LIT = re.compile(r"""'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`""")
CODE_BEFORE = re.compile(r"(import|from|querySelector\w*|closest|getElementById|\$<?[\w<>]*>?\(|classList\.\w+|className\s*=|dataset\.\w+\s*===?|addEventListener|setAttribute\('(?!title|aria-label|placeholder)|type:\s*|kind\s*===?|description:\s*|when:\s*|id:\s*|icon:\s*|keys:\s*\[|fetch\(|new Error\(`?\$)\s*$")


def keys() -> set[str]:
    found: set[str] = set()

    def add(s: str) -> None:
        s = s.strip()
        if not s or len(s) > 400 or not re.search(r"[A-Za-z]", s) or re.fullmatch(r"v\d+\.\d+\.\d+", s) or re.fullmatch(r"[#0-9a-fA-F ,.%x]+", s):
            return
        for tail in ("...", ":"):
            if s.endswith(tail):
                s = s[: -len(tail)].strip()
                break
        if s:
            found.add(s)

    class Page(HTMLParser):
        skip = 0

        def handle_starttag(self, tag, attrs):
            if tag in ("script", "style"):
                self.skip += 1
            for k, v in attrs:
                if k in ("title", "aria-label", "placeholder", "alt") and v:
                    add(v)

        def handle_endtag(self, tag):
            if tag in ("script", "style"):
                self.skip -= 1

        def handle_data(self, d):
            if not self.skip:
                add(re.sub(r"\s+", " ", d))

    Page().feed((ROOT / "frontend" / "index.html").read_text(encoding="utf-8"))
    for f in glob.glob(str(ROOT / "frontend" / "src" / "**" / "*.ts"), recursive=True):
        if "/lib/i18n" in f or f.endswith(("chat-markdown.ts", "icons.ts")):
            continue
        text = Path(f).read_text(encoding="utf-8")
        for m in LIT.finditer(text):
            s = next((g for g in m.groups() if g is not None), None)
            if s is None or CODE_BEFORE.search(text[max(0, m.start() - 40): m.start()]):
                continue
            if m.group(3) is not None:
                count = [0]

                def number(_):
                    count[0] += 1
                    return "{%d}" % (count[0] - 1)
                s = re.sub(r"\$\{[^}]*\}", number, s)
                if count[0] > 4:
                    continue
            s = s.replace("\\'", "'").replace('\\"', '"')
            if not re.match(r"[A-Z]", s.strip()) or re.search(r"[<>=;]|^[A-Z][a-z]+[A-Z]|\b(px|rgba?|var)\(|^[A-Z_]+$|https?://|^M\{\d\}", s):
                continue
            if " " in s.strip() or re.fullmatch(r"[A-Z][a-z]+", s.strip()):
                add(s)
    for f in glob.glob(str(ROOT / "backend" / "app" / "**" / "*.py"), recursive=True):
        text = Path(f).read_text(encoding="utf-8")
        for m in re.finditer(r"""(?:detail=|ValueError\(|RuntimeError\(|LookupError\(|EngineError\.invalid\()f?"((?:[^"\\]|\\.)*)\"""", text):
            s = re.sub(r"\{[^}]*\}", "{0}", m.group(1))
            if re.match(r"[A-Z]", s):
                add(s)
    return found


def placeholders(s: str) -> set[str]:
    return set(re.findall(r"\{\d+\}", s))


def main() -> int:
    english = keys()
    if "--keys" in sys.argv:
        Path(sys.argv[sys.argv.index("--keys") + 1]).write_text(json.dumps(sorted(english), ensure_ascii=False, indent=0), encoding="utf-8")
    print(f"{len(english)} English strings")
    failed = False
    gaps = False
    for path in sorted(TABLES.glob("*.json")):
        code = path.stem
        table = json.loads(path.read_text(encoding="utf-8"))
        missing = [] if code in PARTIAL else sorted(english - table.keys())
        unused = sorted(table.keys() - english)
        bad = sorted(k for k, v in table.items() if not isinstance(v, str) or not v.strip() or placeholders(k) != placeholders(v))
        failed |= bool(bad)
        gaps |= bool(missing)
        print(f"{code:8} {len(table):5} keys  missing {len(missing):4}  unused {len(unused):4}  placeholder or empty errors {len(bad)}")
        for k in bad[:5]:
            print(f"         bad: {k!r}")
    return 1 if failed or ("--strict" in sys.argv and gaps) else 0


if __name__ == "__main__":
    sys.exit(main())
