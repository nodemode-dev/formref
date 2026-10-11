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

export function embedUrl(url: string): string | null {
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
