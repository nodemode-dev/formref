/** Players for video and audio cards: uploaded files, and links from the services that offer an embeddable player. */

export type MediaKind = 'video' | 'audio' | 'embed' | '';

const EMBEDS: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^https?:\/\/(?:www\.|m\.)?youtube\.com\/watch\?(?:.*&)?v=([\w-]{6,})/i, m => `https://www.youtube-nocookie.com/embed/${m[1]}`],
  [/^https?:\/\/youtu\.be\/([\w-]{6,})/i, m => `https://www.youtube-nocookie.com/embed/${m[1]}`],
  [/^https?:\/\/(?:www\.)?youtube\.com\/shorts\/([\w-]{6,})/i, m => `https://www.youtube-nocookie.com/embed/${m[1]}`],
  [/^https?:\/\/(?:www\.)?vimeo\.com\/(\d+)/i, m => `https://player.vimeo.com/video/${m[1]}`],
  [/^https?:\/\/open\.spotify\.com\/(track|album|playlist|episode|show)\/(\w+)/i, m => `https://open.spotify.com/embed/${m[1]}/${m[2]}`],
  [/^https?:\/\/(?:www\.)?soundcloud\.com\/[\w-]+\/[\w-]+/i, m => `https://w.soundcloud.com/player/?url=${encodeURIComponent(m[0])}`],
];

/** Map links: Google Maps (@lat,lon,zoom or a place) and OpenStreetMap (#map=zoom/lat/lon or mlat/mlon) become map cards. */
function mapEmbed(url: string): string | null {
  const google = url.match(/^https?:\/\/(?:www\.)?google\.[a-z.]+\/maps\/(?:place\/([^/@]+)\/)?@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(\d+(?:\.\d+)?)z/i);
  if (google) {
    const query = google[1] ? decodeURIComponent(google[1].replace(/\+/g, ' ')) : `${google[2]},${google[3]}`;
    return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&ll=${google[2]},${google[3]}&z=${Math.round(Number(google[4]))}&output=embed`;
  }
  const place = url.match(/^https?:\/\/(?:www\.)?google\.[a-z.]+\/maps\/(?:place|search)\/([^/?#]+)/i);
  if (place) return `https://maps.google.com/maps?q=${encodeURIComponent(decodeURIComponent(place[1].replace(/\+/g, ' ')))}&output=embed`;
  const hash = url.match(/^https?:\/\/(?:www\.)?openstreetmap\.org\/.*#map=(\d+)\/(-?[\d.]+)\/(-?[\d.]+)/i);
  const marker = url.match(/^https?:\/\/(?:www\.)?openstreetmap\.org\/.*[?&]mlat=(-?[\d.]+)&mlon=(-?[\d.]+)/i);
  if (hash || marker) {
    const [zoom, lat, lon] = hash ? [Number(hash[1]), Number(hash[2]), Number(hash[3])] : [15, Number(marker![1]), Number(marker![2])];
    if (![zoom, lat, lon].every(Number.isFinite) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
    const span = 360 / 2 ** zoom * 2;
    const box = [lon - span, lat - span / 2, lon + span, lat + span / 2].map(n => n.toFixed(5)).join(',');
    return `https://www.openstreetmap.org/export/embed.html?bbox=${box}&layer=mapnik&marker=${lat},${lon}`;
  }
  return null;
}

export const isMap = (url: string) => !!mapEmbed(url);

export function embedUrl(url: string): string | null {
  const map = mapEmbed(url);
  if (map) return map;
  for (const [pattern, build] of EMBEDS) {
    const match = url.match(pattern);
    if (match) return build(match);
  }
  return null;
}

export function mediaKind(kind: string, mime: unknown, assetId: string | null, url: string): MediaKind {
  if (kind === 'file' && assetId && typeof mime === 'string') {
    if (mime.startsWith('video/')) return 'video';
    if (mime.startsWith('audio/')) return 'audio';
  }
  if (kind === 'link' && embedUrl(url)) return 'embed';
  return '';
}

/** Create or patch the player in place: the element is replaced only when its type changes. */
export function paintPlayer(box: HTMLElement, kind: MediaKind, src: string, options: { loop: boolean; autoplay: boolean; title: string }) {
  const tag = kind === 'embed' ? 'iframe' : kind;
  let node = box.firstElementChild as HTMLElement | null;
  if (!kind) { if (node) box.replaceChildren(); return; }
  if (!node || node.tagName.toLowerCase() !== tag) {
    node = document.createElement(tag);
    if (node instanceof HTMLIFrameElement) {
      node.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
      node.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      node.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation allow-popups');
      node.loading = 'lazy';
    } else {
      const media = node as HTMLMediaElement;
      media.controls = true;
      media.preload = 'metadata';
      media.setAttribute('playsinline', '');
    }
    box.replaceChildren(node);
  }
  node.title = options.title;
  if (node.getAttribute('src') !== src) node.setAttribute('src', src);
  if (node instanceof HTMLMediaElement) {
    node.loop = options.loop;
    // Browsers only autoplay muted media; the person can unmute from the controls.
    if (node.autoplay !== options.autoplay) {
      node.autoplay = options.autoplay;
      node.muted = options.autoplay;
      if (options.autoplay) void node.play().catch(() => undefined);
    }
  }
}
