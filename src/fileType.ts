import type { FileKind } from './types';

/**
 * URL schemes we are willing to place in `src` or `href`.
 *
 * `javascript:` and `vbscript:` are the reason this list is an allow-list rather
 * than a deny-list: a deny-list has to anticipate every exotic scheme, an
 * allow-list only has to name the four that are useful here.
 */
const SAFE_SCHEMES = new Set(['http', 'https', 'data', 'blob']);

/**
 * Base used only so relative URLs can be parsed by `URL`. It never reaches the
 * DOM — we always render the caller's original string.
 */
const PARSE_BASE = 'https://file-preview.invalid';

const EXTENSIONS_BY_KIND: Record<Exclude<FileKind, 'unknown'>, readonly string[]> = {
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'bmp', 'svg', 'ico', 'heic', 'heif'],
  video: ['mp4', 'webm', 'ogv', 'mov', 'm4v', 'avi', 'mkv', 'mpeg', 'mpg', '3gp', 'flv', 'wmv', 'vob'],
  audio: ['mp3', 'wav', 'flac', 'm4a', 'aac', 'oga', 'ogg', 'opus', 'weba', 'amr', 'wma'],
  pdf: ['pdf'],
  office: ['doc', 'docx', 'rtf', 'odt', 'xls', 'xlsx', 'ods', 'csv', 'ppt', 'pptx', 'odp'],
  text: ['txt', 'md', 'log', 'json', 'xml', 'yml', 'yaml'],
};

/** Extension → MIME type, for the `type` hint on `<source>` elements. */
const MIME_BY_EXTENSION: Readonly<Record<string, string>> = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  webm: 'video/webm',
  ogv: 'video/ogg',
  mov: 'video/quicktime',
  mkv: 'video/x-matroska',
  mpeg: 'video/mpeg',
  mpg: 'video/mpeg',
  '3gp': 'video/3gpp',
  avi: 'video/x-msvideo',
  flv: 'video/x-flv',
  wmv: 'video/x-ms-wmv',
  vob: 'video/mpeg',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  flac: 'audio/flac',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  oga: 'audio/ogg',
  ogg: 'audio/ogg',
  opus: 'audio/opus',
  weba: 'audio/webm',
  amr: 'audio/amr',
  wma: 'audio/x-ms-wma',
};

const KIND_BY_EXTENSION: Readonly<Record<string, FileKind>> = Object.fromEntries(
  Object.entries(EXTENSIONS_BY_KIND).flatMap(([kind, extensions]) =>
    extensions.map((extension) => [extension, kind as FileKind]),
  ),
);

/**
 * Strip characters browsers ignore when resolving a scheme.
 *
 * Browsers tolerate tabs, newlines and leading control characters inside a
 * scheme, so `java\tscript:alert(1)` navigates just like `javascript:alert(1)`.
 * Removing them before we test the scheme means our check sees what the browser
 * will see, not the decorated version.
 */
function stripIgnorableCharacters(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u0020\u007f]/g, '');
}

/** Returns the lower-cased scheme (without `:`), or `''` for a relative URL. */
function getScheme(url: string): string {
  const match = /^([a-z][a-z0-9+.-]*):/i.exec(stripIgnorableCharacters(url));
  return match ? match[1].toLowerCase() : '';
}

/**
 * Whether a URL is safe to hand to the DOM.
 *
 * Relative URLs (no scheme) are safe by construction — they cannot execute.
 */
export function isSafeUrl(url: string): boolean {
  if (typeof url !== 'string' || url.trim() === '') return false;
  const scheme = getScheme(url);
  return scheme === '' || SAFE_SCHEMES.has(scheme);
}

/** Reads the MIME type out of a `data:` URL, e.g. `data:image/png;base64,…`. */
function getDataUrlMimeType(url: string): string {
  const match = /^data:([^;,]+)/i.exec(stripIgnorableCharacters(url));
  return match ? match[1].toLowerCase() : '';
}

/**
 * Extract a file extension from a URL.
 *
 * Query strings and fragments are excluded, the result is lower-cased, and a URL
 * with no extension returns `''` rather than a fragment of the hostname. A
 * leading dot does not count as an extension, so `.gitignore` yields `''`.
 *
 * @example
 * getExtension('https://cdn.example.com/a/report.PDF?sig=abc&e=1') // 'pdf'
 * getExtension('https://example.com/files/12345')                  // ''
 */
export function getExtension(url: string): string {
  if (typeof url !== 'string' || url === '') return '';

  if (getScheme(url) === 'data') {
    const subtype = getDataUrlMimeType(url).split('/')[1] ?? '';
    // `image/svg+xml` → `svg`; `audio/x-wav` → `wav`.
    return subtype.split('+')[0].replace(/^x-/, '');
  }

  let pathname: string;
  try {
    pathname = new URL(url, PARSE_BASE).pathname;
  } catch {
    // Malformed enough that `URL` refuses it — fall back to manual trimming so a
    // caller passing something odd still gets a best-effort answer.
    pathname = url.split(/[?#]/)[0];
  }

  const lastSegment = pathname.split('/').pop() ?? '';
  const lastDot = lastSegment.lastIndexOf('.');
  if (lastDot <= 0) return '';

  return decodeURIComponent(lastSegment.slice(lastDot + 1)).toLowerCase();
}

/** Best-effort display name for a URL — the last path segment, or the host. */
export function getFileName(url: string): string {
  if (typeof url !== 'string' || url === '') return '';
  if (getScheme(url) === 'data') return `file.${getExtension(url) || 'bin'}`;

  try {
    const parsed = new URL(url, PARSE_BASE);
    const lastSegment = parsed.pathname.split('/').filter(Boolean).pop();
    return lastSegment ? decodeURIComponent(lastSegment) : parsed.hostname;
  } catch {
    return url.split(/[?#]/)[0].split('/').filter(Boolean).pop() ?? url;
  }
}

/**
 * Classify a URL into the category that decides how it is rendered.
 *
 * Returns `'unknown'` for anything unrecognised — including unsafe URLs, so a
 * `javascript:` URL can never be routed to an element that would execute it.
 */
export function detectKind(url: string): FileKind {
  if (!isSafeUrl(url)) return 'unknown';

  if (getScheme(url) === 'data') {
    const type = getDataUrlMimeType(url).split('/')[0];
    if (type === 'image' || type === 'video' || type === 'audio') return type;
    if (type === 'text') return 'text';
  }

  return KIND_BY_EXTENSION[getExtension(url)] ?? 'unknown';
}

/** MIME type for a media URL, or `undefined` when we have no reliable guess. */
export function getMimeType(url: string): string | undefined {
  if (getScheme(url) === 'data') return getDataUrlMimeType(url) || undefined;
  return MIME_BY_EXTENSION[getExtension(url)];
}
