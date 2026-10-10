import re
from urllib.parse import urlsplit

INLINE = re.compile(r"\[([^\[\]\n]+)\]\(([^)\s]+)\)|\*\*([^*\n]+)\*\*|__([^_\n]+)__|\*([^*\n]+)\*|_([^_\n]+)_")


def safe_link(value):
    if not re.match(r"^https?://", value, re.I) or "\\" in value:
        return False
    try:
        parsed = urlsplit(value)
        return bool(parsed.hostname) and parsed.scheme.lower() in {"http", "https"} and (parsed.port is None or 0 <= parsed.port <= 65535)
    except ValueError:
        return False


def run(text, strong=False, emphasis=False, href=None):
    value = {"text": text, "strong": strong, "emphasis": emphasis}
    if href is not None:
        value["href"] = href
    return value


def inline_runs(source):
    runs = []
    offset = 0
    for match in INLINE.finditer(source):
        if match.start() > offset:
            runs.append(run(source[offset:match.start()]))
        label, destination, stars, underscores, emphasis_stars, emphasis_underscores = match.groups()
        if label is not None:
            runs.append(run(label, href=destination) if safe_link(destination) else run(match.group()))
        elif stars is not None or underscores is not None:
            runs.append(run(stars if stars is not None else underscores, strong=True))
        else:
            runs.append(run(emphasis_stars if emphasis_stars is not None else emphasis_underscores, emphasis=True))
        offset = match.end()
    if offset < len(source) or not runs:
        runs.append(run(source[offset:]))
    return runs


def parse_text(source, text_format="plain"):
    for index, line in enumerate(source.replace("\r\n", "\n").replace("\r", "\n").split("\n")):
        if index >= 4096:
            return
        block = {"kind": "paragraph", "runs": [run(line)]}
        if text_format == "markdown":
            heading = re.match(r"^(#{1,3}) (.*)$", line)
            unordered = re.match(r"^[-*] (.*)$", line)
            ordered = re.match(r"^(\d+)\. (.*)$", line)
            if heading:
                block.update(kind="heading", level=len(heading[1]))
                line = heading[2]
            elif unordered or ordered:
                block.update(kind="list", ordered=bool(ordered), prefix=ordered[1] + ". " if ordered else "• ")
                line = ordered[2] if ordered else unordered[1]
            block["runs"] = inline_runs(line)
        yield block


def layout_text(blocks, base_size, max_width, max_height, measure):
    y = 0.0
    for block in blocks:
        size = base_size * ({1: 1.6, 2: 1.35, 3: 1.15}.get(block.get("level"), 1))
        line_height = size * 1.45
        if y + line_height > max_height:
            return
        source_runs = ([run(block["prefix"])] if block.get("prefix") else []) + block["runs"]
        current = []
        width = 0.0
        for source_run in source_runs:
            styled = dict(source_run)
            styled["strong"] = styled["strong"] or block["kind"] == "heading"
            for token in re.findall(r"\s+|\S+", styled["text"]):
                while token:
                    token_width = measure(token, size, styled)
                    if current and width + token_width > max_width:
                        yield {"y": y, "size": size, "runs": current}
                        y += line_height
                        if y + line_height > max_height:
                            return
                        current, width = [], 0.0
                        if token.isspace():
                            break
                    count = len(token)
                    if token_width > max_width:
                        low, high = 1, len(token)
                        while low < high:
                            middle = (low + high + 1) // 2
                            if measure(token[:middle], size, styled) <= max_width:
                                low = middle
                            else:
                                high = middle - 1
                        count = low
                    part = token[:count]
                    part_width = measure(part, size, styled)
                    current.append({**styled, "text": part, "x": width, "width": part_width})
                    width += part_width
                    token = token[count:]
        yield {"y": y, "size": size, "runs": current}
        y += line_height


def markdown_source(source, text_format):
    escaped = source.replace("<", "&lt;").replace(">", "&gt;")
    if text_format != "markdown":
        return re.sub(r"([\\`*_{}\[\]()#+.!|>-])", r"\\\1", escaped)
    escaped = re.sub(r"!\[", r"\\![", escaped)
    return re.sub(r"\[([^\[\]\n]+)\]\(([^)\s]+)\)", lambda match: match.group() if safe_link(match[2]) else "\\[" + match[1] + "\\](" + match[2] + ")", escaped)
