"""Phone viewer: one self-contained HTML page of a board, read-only, with touch pan and pinch zoom (researched wishlist: view boards on a phone or tablet). Nothing is served; the file is copied to the device, so FormRef's loopback-only boundary is unchanged."""
import base64
import html
import io

from .exports import svg_export

# Pictures are embedded as WebP no larger than this on the long side, or twice their size on the board, whichever is smaller; enough for a phone at full zoom without the page growing to the size of the originals.
MAX_EDGE = 2048
MAX_BYTES = 256 * 1024 * 1024


def _webp(image, item):
    shown = max(float(item.get("width") or 1), float(item.get("height") or 1)) * 2
    edge = int(max(64, min(MAX_EDGE, shown)))
    if max(image.size) > edge:
        image = image.copy()
        image.thumbnail((edge, edge))
    if image.mode not in {"RGB", "RGBA"}:
        image = image.convert("RGBA" if "A" in image.getbands() else "RGB")
    output = io.BytesIO()
    image.save(output, format="WEBP", quality=82, method=4)
    return "data:image/webp;base64," + base64.b64encode(output.getvalue()).decode("ascii")


PAGE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<meta name="color-scheme" content="dark">
<title>__TITLE__</title>
<style>
:root{--bg:#141316;--bar:#1c1b1d;--line:#2e2c33;--text:#ece9f1;--muted:#9a96a3;--accent:#f97316}
*{box-sizing:border-box}
html,body{margin:0;height:100%;background:var(--bg);color:var(--text);font:14px system-ui,-apple-system,"Segoe UI",sans-serif;overflow:hidden;overscroll-behavior:none}
header{position:fixed;top:0;left:0;right:0;z-index:2;display:flex;align-items:center;gap:12px;padding:calc(env(safe-area-inset-top) + 8px) 16px 8px;background:var(--bar);border-bottom:1px solid var(--line)}
header strong{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
header span{color:var(--muted);font-size:12px;white-space:nowrap}
#stage{position:fixed;inset:0;touch-action:none;cursor:grab}
#stage.dragging{cursor:grabbing}
#board{position:absolute;left:0;top:0;transform-origin:0 0;will-change:transform}
#board svg{display:block}
nav{position:fixed;z-index:2;right:16px;bottom:calc(env(safe-area-inset-bottom) + 16px);display:flex;gap:8px}
nav button{width:44px;height:44px;border-radius:12px;border:1px solid var(--line);background:var(--bar);color:var(--text);font:600 18px system-ui,sans-serif;display:grid;place-items:center;padding:0}
nav button:active{border-color:var(--accent)}
nav svg{width:20px;height:20px}
</style>
</head>
<body>
<header><strong>__TITLE__</strong><span>__COUNT__</span></header>
<div id="stage"><div id="board">__SVG__</div></div>
<nav>
<button type="button" id="out" aria-label="Zoom out">&#8722;</button>
<button type="button" id="in" aria-label="Zoom in">+</button>
<button type="button" id="fit" aria-label="Fit board"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button>
</nav>
<script>
(function () {
  var stage = document.getElementById('stage'), board = document.getElementById('board'), svg = board.querySelector('svg');
  var W = parseFloat(svg.getAttribute('width')), H = parseFloat(svg.getAttribute('height'));
  var view = { x: 0, y: 0, z: 1 }, pointers = new Map(), pinch = null, moved = false, lastTap = 0, pressed = null;
  function top() { return document.querySelector('header').offsetHeight; }
  function draw() { board.style.transform = 'translate(' + view.x + 'px,' + view.y + 'px) scale(' + view.z + ')'; }
  function frame(x, y, w, h) {
    var t = top(), sw = innerWidth, sh = innerHeight - t, pad = 16;
    var z = Math.min((sw - 2 * pad) / w, (sh - 2 * pad) / h, 8);
    view.z = z; view.x = (sw - w * z) / 2 - x * z; view.y = t + (sh - h * z) / 2 - y * z; draw();
  }
  function fit() { frame(0, 0, W, H); }
  function zoomAt(px, py, factor) {
    var z = Math.max(0.02, Math.min(16, view.z * factor)); factor = z / view.z;
    view.x = px - (px - view.x) * factor; view.y = py - (py - view.y) * factor; view.z = z; draw();
  }
  function pictureAt(target) {
    var node = target && target.closest ? target.closest('svg g') : null;
    return node && node !== svg && node.querySelector('image') ? node : null;
  }
  function focus(node) {
    var r = node.getBoundingClientRect();
    frame((r.left - view.x) / view.z, (r.top - view.y) / view.z, r.width / view.z, r.height / view.z);
  }
  stage.addEventListener('pointerdown', function (e) {
    // Pointer capture retargets later events to the stage, so the picture under the finger is noted here.
    if (!pointers.size) pressed = pictureAt(e.target);
    stage.setPointerCapture(e.pointerId); pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = false;
    if (pointers.size === 2) { var p = Array.from(pointers.values()); pinch = { d: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y), x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 }; }
    stage.classList.add('dragging');
  });
  stage.addEventListener('pointermove', function (e) {
    var last = pointers.get(e.pointerId); if (!last) return;
    var now = { x: e.clientX, y: e.clientY }; pointers.set(e.pointerId, now);
    if (Math.hypot(now.x - last.x, now.y - last.y) > 0) moved = moved || pointers.size > 1 || Math.abs(now.x - last.x) + Math.abs(now.y - last.y) > 2;
    if (pointers.size === 2 && pinch) {
      var p = Array.from(pointers.values()), d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y), mx = (p[0].x + p[1].x) / 2, my = (p[0].y + p[1].y) / 2;
      view.x += mx - pinch.x; view.y += my - pinch.y; zoomAt(mx, my, d / pinch.d); pinch = { d: d, x: mx, y: my };
    } else if (pointers.size === 1) { view.x += now.x - last.x; view.y += now.y - last.y; draw(); }
  });
  function end(e) {
    pointers.delete(e.pointerId); if (pointers.size < 2) pinch = null; if (!pointers.size) stage.classList.remove('dragging');
    if (e.type !== 'pointerup' || moved || pointers.size) return;
    var now = Date.now(), picture = pressed;
    if (now - lastTap < 300) { fit(); lastTap = 0; } else { lastTap = now; if (picture) setTimeout(function () { if (lastTap === now) focus(picture); }, 300); }
  }
  stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);
  stage.addEventListener('wheel', function (e) { e.preventDefault(); zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
  document.getElementById('in').addEventListener('click', function () { zoomAt(innerWidth / 2, innerHeight / 2, 1.5); });
  document.getElementById('out').addEventListener('click', function () { zoomAt(innerWidth / 2, innerHeight / 2, 1 / 1.5); });
  document.getElementById('fit').addEventListener('click', fit);
  addEventListener('resize', fit);
  fit();
})();
</script>
</body>
</html>
"""


def viewer_export(board):
    """Returns (html bytes, picture count)."""
    svg = svg_export(board, picture=_webp).decode("utf-8")
    svg = svg[svg.index("<svg"):]
    pictures = sum(1 for item in board["items"] if item["kind"] == "image" and item.get("asset_id") and not item.get("hidden"))
    count = f"{pictures} picture" + ("" if pictures == 1 else "s") + " · read-only"
    page = PAGE.replace("__TITLE__", html.escape(board.get("title") or "Board")).replace("__COUNT__", html.escape(count)).replace("__SVG__", svg)
    data = page.encode("utf-8")
    if len(data) > MAX_BYTES:
        raise ValueError("This board is too large for a single viewer page (over 256 MiB).")
    return data, pictures
