import math, sys

def squircle(cx, cy, size, n=3.0, pts=90):
    e = 0.30*size; h = size/2
    corners = [(cx+h-e, cy-h+e, 0), (cx+h-e, cy+h-e, 90), (cx-h+e, cy+h-e, 180), (cx-h+e, cy-h+e, 270)]
    out=[]
    for (ox, oy, start) in corners:
        for i in range(pts+1):
            t = math.radians(start - 90 + 90*i/pts)
            c, s_ = math.cos(t), math.sin(t)
            out.append(f"{ox+e*math.copysign(abs(c)**(2/n),c):.2f},{oy+e*math.copysign(abs(s_)**(2/n),s_):.2f}")
    return "M"+" L".join(out)+" Z"

def svg(mode="mac", P=""):
    T = 824 if mode=="mac" else 1024
    k = 1.0 if mode=="mac" else 1.08
    tile = squircle(512,512,T)
    W, H = 400*k, 330*k             # print size
    bd = 22*k; R = 30*k             # white border, corner radius
    cx, cy = 512, 512 + 8*k
    def card(dx, dy, ang, inner, fill_border="url(#%spaper)" % P, extra=""):
        x, y = -W/2, -H/2
        ix, iy, iw, ih = x+bd, y+bd, W-2*bd, H-2*bd
        s = (f'<g transform="translate({cx+dx*k:.1f} {cy+dy*k:.1f}) rotate({ang})">'
             f'<rect x="{x:.1f}" y="{y:.1f}" width="{W:.1f}" height="{H:.1f}" rx="{R:.1f}" fill="#000" filter="url(#{P}cardshadow)"/>'
             f'<rect x="{x:.1f}" y="{y:.1f}" width="{W:.1f}" height="{H:.1f}" rx="{R:.1f}" fill="{fill_border}"/>')
        s += inner(ix, iy, iw, ih) + extra + '</g>'
        return s
    def scene(grad_id, sun=True):
        def f(ix, iy, iw, ih):
            r = 12*k
            clip = f'{P}c{grad_id}'
            m1 = (f"M{ix:.1f},{iy+ih:.1f} L{ix+iw*0.30:.1f},{iy+ih*0.48:.1f} L{ix+iw*0.46:.1f},{iy+ih*0.66:.1f} "
                  f"L{ix+iw*0.66:.1f},{iy+ih*0.36:.1f} L{ix+iw:.1f},{iy+ih*0.80:.1f} L{ix+iw:.1f},{iy+ih:.1f} Z")
            m2 = (f"M{ix:.1f},{iy+ih:.1f} L{ix:.1f},{iy+ih*0.80:.1f} L{ix+iw*0.22:.1f},{iy+ih*0.66:.1f} "
                  f"L{ix+iw*0.52:.1f},{iy+ih*0.86:.1f} L{ix+iw:.1f},{iy+ih*0.70:.1f} L{ix+iw:.1f},{iy+ih:.1f} Z")
            s = (f'<clipPath id="{clip}"><rect x="{ix:.1f}" y="{iy:.1f}" width="{iw:.1f}" height="{ih:.1f}" rx="{r:.1f}"/></clipPath>'
                 f'<g clip-path="url(#{clip})"><rect x="{ix:.1f}" y="{iy:.1f}" width="{iw:.1f}" height="{ih:.1f}" fill="url(#{P}{grad_id})"/>')
            if sun: s += f'<circle cx="{ix+iw*0.74:.1f}" cy="{iy+ih*0.28:.1f}" r="{ih*0.13:.1f}" fill="#FFF3DC"/><circle cx="{ix+iw*0.74:.1f}" cy="{iy+ih*0.28:.1f}" r="{ih*0.22:.1f}" fill="#FFF3DC" fill-opacity=".18"/>'
            s += (f'<path d="{m1}" fill="#2A1640" fill-opacity=".55" stroke-linejoin="round"/>'
                  f'<path d="{m2}" fill="#160B24" fill-opacity=".70"/>'
                  f'<rect x="{ix:.1f}" y="{iy:.1f}" width="{iw:.1f}" height="{ih*0.5:.1f}" fill="url(#{P}gloss)"/></g>')
            return s
        return f
    blank = lambda ix, iy, iw, ih: f'<rect x="{ix:.1f}" y="{iy:.1f}" width="{iw:.1f}" height="{ih:.1f}" rx="{12*k:.1f}" fill="#CFC9D6"/>'
    g=[f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
<defs>
 <linearGradient id="{P}bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#24212B"/><stop offset="1" stop-color="#0B0A0E"/></linearGradient>
 <radialGradient id="{P}bloom" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FF4F7A" stop-opacity="0.26"/><stop offset="0.25" stop-color="#C255D9" stop-opacity="0.15"/><stop offset="0.5" stop-color="#9A5CFF" stop-opacity="0.07"/><stop offset="1" stop-color="#9A5CFF" stop-opacity="0"/></radialGradient>
 <linearGradient id="{P}rim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.22"/><stop offset="0.3" stop-color="#fff" stop-opacity="0.04"/><stop offset="1" stop-color="#fff" stop-opacity="0.08"/></linearGradient>
 <linearGradient id="{P}paper" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FDFCFA"/><stop offset="1" stop-color="#DEDAD3"/></linearGradient>
 <linearGradient id="{P}paper2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#C9C4CF"/><stop offset="1" stop-color="#8F8A98"/></linearGradient>
 <linearGradient id="{P}front" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#3A7BFF"/><stop offset="0.32" stop-color="#9A5CFF"/><stop offset="0.64" stop-color="#FF4F7A"/><stop offset="1" stop-color="#FFAE2B"/></linearGradient>
 <linearGradient id="{P}mid" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#2C4FB8"/><stop offset="0.6" stop-color="#7A45D9"/><stop offset="1" stop-color="#C14C9C"/></linearGradient>
 <linearGradient id="{P}gloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
 <filter id="{P}tileshadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="12" stdDeviation="14" flood-color="#000" flood-opacity="0.5"/></filter>
 <filter id="{P}cardshadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="{14*k:.1f}" stdDeviation="{18*k:.1f}" flood-color="#000" flood-opacity="0.55"/></filter>
 <clipPath id="{P}tclip"><path d="{tile}"/></clipPath>
</defs>''']
    if mode=="mac": g.append(f'<path d="{tile}" fill="#000" filter="url(#{P}tileshadow)"/>')
    g.append(f'<path d="{tile}" fill="url(#{P}bg)"/>')
    g.append(f'<g clip-path="url(#{P}tclip)"><rect width="1024" height="1024" fill="url(#{P}bloom)"/></g>')
    g.append(f'<g transform="translate(512 512) scale(1.12) translate({-(512-8*k):.1f} {-(512-18.5*k):.1f})">')
    g.append(card(-48, -70, -13, blank, fill_border=f"url(#{P}paper2)"))
    g.append(card(40, -38, 9, scene('mid', sun=False)))
    tw, th = 150*k, 46*k
    tape = (f'<g transform="translate(0 {-H/2:.1f}) rotate(-6)">'
            f'<rect x="{-tw/2:.1f}" y="{-th/2:.1f}" width="{tw:.1f}" height="{th:.1f}" rx="{5*k:.1f}" fill="#000" fill-opacity=".18" transform="translate(0 {4*k:.1f})"/>'
            f'<rect x="{-tw/2:.1f}" y="{-th/2:.1f}" width="{tw:.1f}" height="{th:.1f}" rx="{5*k:.1f}" fill="#FFE2B8" fill-opacity=".62"/>'
            f'<rect x="{-tw/2:.1f}" y="{-th/2:.1f}" width="{tw:.1f}" height="{th*0.42:.1f}" rx="{5*k:.1f}" fill="#fff" fill-opacity=".30"/></g>')
    g.append(card(-8, 44, -3, scene('front'), extra=tape))
    g.append('</g>')
    g.append(f'<path d="{tile}" fill="none" stroke="url(#{P}rim)" stroke-width="{3*(T/824):.1f}" clip-path="url(#{P}tclip)"/>')
    g.append('</svg>')
    return "\n".join(g)

if __name__=="__main__":
    open(sys.argv[2],"w").write(svg(sys.argv[1]))
