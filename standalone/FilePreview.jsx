/*
 * FilePreview — the whole component in one file, with no dependencies beyond
 * React itself. Generated from src/; do not edit directly.
 *
 * Requires React 17+ (the automatic JSX runtime). Copy this file into your
 * project, optionally copy styles.css beside it, then:
 *
 *   import { FilePreview } from './FilePreview';
 *
 *   <FilePreview url={fileUrl} />
 *
 * Source, tests and licence: https://github.com/lukojewel/file-preview
 */
import { useCallback, useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// src/fileType.ts
// ---------------------------------------------------------------------------

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
const EXTENSIONS_BY_KIND = {
    image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'bmp', 'svg', 'ico', 'heic', 'heif'],
    video: ['mp4', 'webm', 'ogv', 'mov', 'm4v', 'avi', 'mkv', 'mpeg', 'mpg', '3gp', 'flv', 'wmv', 'vob'],
    audio: ['mp3', 'wav', 'flac', 'm4a', 'aac', 'oga', 'ogg', 'opus', 'weba', 'amr', 'wma'],
    pdf: ['pdf'],
    office: ['doc', 'docx', 'rtf', 'odt', 'xls', 'xlsx', 'ods', 'csv', 'ppt', 'pptx', 'odp'],
    text: ['txt', 'md', 'log', 'json', 'xml', 'yml', 'yaml'],
};
/** Extension → MIME type, for the `type` hint on `<source>` elements. */
const MIME_BY_EXTENSION = {
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
const KIND_BY_EXTENSION = Object.fromEntries(Object.entries(EXTENSIONS_BY_KIND).flatMap(([kind, extensions]) => extensions.map((extension) => [extension, kind])));
/**
 * Strip characters browsers ignore when resolving a scheme.
 *
 * Browsers tolerate tabs, newlines and leading control characters inside a
 * scheme, so `java\tscript:alert(1)` navigates just like `javascript:alert(1)`.
 * Removing them before we test the scheme means our check sees what the browser
 * will see, not the decorated version.
 */
function stripIgnorableCharacters(value) {
    // eslint-disable-next-line no-control-regex
    return value.replace(/[\u0000-\u0020\u007f]/g, '');
}
/** Returns the lower-cased scheme (without `:`), or `''` for a relative URL. */
function getScheme(url) {
    const match = /^([a-z][a-z0-9+.-]*):/i.exec(stripIgnorableCharacters(url));
    return match ? match[1].toLowerCase() : '';
}
/**
 * Whether a URL is safe to hand to the DOM.
 *
 * Relative URLs (no scheme) are safe by construction — they cannot execute.
 */
export function isSafeUrl(url) {
    if (typeof url !== 'string' || url.trim() === '')
        return false;
    const scheme = getScheme(url);
    return scheme === '' || SAFE_SCHEMES.has(scheme);
}
/** Reads the MIME type out of a `data:` URL, e.g. `data:image/png;base64,…`. */
function getDataUrlMimeType(url) {
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
export function getExtension(url) {
    if (typeof url !== 'string' || url === '')
        return '';
    if (getScheme(url) === 'data') {
        const subtype = getDataUrlMimeType(url).split('/')[1] ?? '';
        // `image/svg+xml` → `svg`; `audio/x-wav` → `wav`.
        return subtype.split('+')[0].replace(/^x-/, '');
    }
    let pathname;
    try {
        pathname = new URL(url, PARSE_BASE).pathname;
    }
    catch {
        // Malformed enough that `URL` refuses it — fall back to manual trimming so a
        // caller passing something odd still gets a best-effort answer.
        pathname = url.split(/[?#]/)[0];
    }
    const lastSegment = pathname.split('/').pop() ?? '';
    const lastDot = lastSegment.lastIndexOf('.');
    if (lastDot <= 0)
        return '';
    return decodeURIComponent(lastSegment.slice(lastDot + 1)).toLowerCase();
}
/** Best-effort display name for a URL — the last path segment, or the host. */
export function getFileName(url) {
    if (typeof url !== 'string' || url === '')
        return '';
    if (getScheme(url) === 'data')
        return `file.${getExtension(url) || 'bin'}`;
    try {
        const parsed = new URL(url, PARSE_BASE);
        const lastSegment = parsed.pathname.split('/').filter(Boolean).pop();
        return lastSegment ? decodeURIComponent(lastSegment) : parsed.hostname;
    }
    catch {
        return url.split(/[?#]/)[0].split('/').filter(Boolean).pop() ?? url;
    }
}
/**
 * Classify a URL into the category that decides how it is rendered.
 *
 * Returns `'unknown'` for anything unrecognised — including unsafe URLs, so a
 * `javascript:` URL can never be routed to an element that would execute it.
 */
export function detectKind(url) {
    if (!isSafeUrl(url))
        return 'unknown';
    if (getScheme(url) === 'data') {
        const type = getDataUrlMimeType(url).split('/')[0];
        if (type === 'image' || type === 'video' || type === 'audio')
            return type;
        if (type === 'text')
            return 'text';
    }
    return KIND_BY_EXTENSION[getExtension(url)] ?? 'unknown';
}
/** MIME type for a media URL, or `undefined` when we have no reliable guess. */
export function getMimeType(url) {
    if (getScheme(url) === 'data')
        return getDataUrlMimeType(url) || undefined;
    return MIME_BY_EXTENSION[getExtension(url)];
}

// ---------------------------------------------------------------------------
// src/viewers.ts
// ---------------------------------------------------------------------------

/**
 * Office viewers fetch the document server-side, so they can only reach URLs
 * that are absolute and publicly resolvable. A relative or `data:` URL will
 * always fail, and we fall back to a download link rather than render a broken
 * frame.
 */
function isPubliclyFetchable(url) {
    return /^https?:\/\//i.test(url.trim());
}
/**
 * Build the embed URL for an Office document.
 *
 * The file URL is percent-encoded before being used as a query parameter —
 * without this, a signed URL (`?X-Amz-Signature=…&X-Amz-Expires=…`) is truncated
 * at its first `&` and the viewer receives an unusable fragment.
 *
 * Returns `null` when no viewer can serve the URL, which the caller renders as a
 * download link.
 */
export function getOfficeViewerUrl(url, viewer) {
    if (viewer === false || !isPubliclyFetchable(url))
        return null;
    const encoded = encodeURIComponent(url);
    return viewer === 'microsoft'
        ? `https://view.officeapps.live.com/op/embed.aspx?src=${encoded}`
        : `https://docs.google.com/gview?url=${encoded}&embedded=true`;
}

// ---------------------------------------------------------------------------
// src/FilePreview.tsx
// ---------------------------------------------------------------------------

function classNames(...values) {
    return values.filter(Boolean).join(' ');
}
/** Generic document glyph, inlined so the package ships no icon font. */
function FileIcon() {
    return (<svg className="fp-fallback__icon" viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M14 2H6.5A1.5 1.5 0 0 0 5 3.5v17A1.5 1.5 0 0 0 6.5 22h11a1.5 1.5 0 0 0 1.5-1.5V7z"/>
      <path d="M14 2v5h5"/>
    </svg>);
}
/** Link shown whenever a file cannot be rendered inline. */
function Fallback({ info }) {
    const { url, extension, fileName, reason } = info;
    if (reason === 'unsafe-url') {
        return (<p className="fp-fallback fp-fallback--blocked" role="note">
        <FileIcon />
        <span className="fp-fallback__label">This file cannot be displayed.</span>
      </p>);
    }
    return (<a className="fp-fallback" href={url} target="_blank" 
    // `noopener` denies the opened page access to `window.opener`, which it
    // could otherwise use to navigate this tab elsewhere (reverse tabnabbing).
    rel="noopener noreferrer" download={fileName || undefined}>
      <FileIcon />
      <span className="fp-fallback__label">{fileName || 'Download file'}</span>
      {extension ? <span className="fp-fallback__ext">{extension.toUpperCase()}</span> : null}
    </a>);
}
/** Full-screen image overlay, dismissed with Escape or a click. */
function Lightbox({ url, alt, onClose }) {
    useEffect(() => {
        function handleKeyDown(event) {
            if (event.key === 'Escape')
                onClose();
        }
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);
    return (<div className="fp-lightbox" role="dialog" aria-modal="true" aria-label={alt} onClick={onClose}>
      <button type="button" className="fp-lightbox__close" aria-label="Close" onClick={onClose}>
        ×
      </button>
      <img className="fp-lightbox__image" src={url} alt={alt}/>
    </div>);
}
/**
 * Render a preview for a file URL, choosing the element that suits its type.
 *
 * Images, video, audio and PDFs render with native browser elements — no
 * third-party service sees the URL. Office documents have no native renderer, so
 * they are embedded through a viewer (`officeViewer`, default Google) which does
 * receive the URL; pass `officeViewer={false}` to opt out.
 *
 * @example
 * <FilePreview url="https://cdn.example.com/report.pdf" />
 * <FilePreview url={signedUrl} kind="image" alt="Cancelled cheque" />
 */
export function FilePreview({ url, kind: kindOverride, fileName: fileNameProp, className, officeViewer = 'google', alt, controls = true, lightbox = true, onError, onEvent, renderFallback, }) {
    const [isLightboxOpen, setLightboxOpen] = useState(false);
    const safe = isSafeUrl(url);
    const kind = kindOverride ?? detectKind(url);
    const extension = safe ? getExtension(url) : '';
    const fileName = fileNameProp ?? (safe ? getFileName(url) : '');
    const label = alt ?? fileName;
    const viewerUrl = safe && kind === 'office' ? getOfficeViewerUrl(url, officeViewer) : null;
    // Resolved before rendering so the outcome can be reported from an effect, and
    // so every "cannot preview" path leaves through one place.
    const fallbackReason = !safe
        ? 'unsafe-url'
        : kind === 'office' && !viewerUrl
            ? 'viewer-disabled'
            : kind === 'unknown'
                ? 'unsupported-format'
                : null;
    // Held in a ref so an inline arrow function from the caller does not make the
    // reporting effect re-run on every render.
    const onEventRef = useRef(onEvent);
    useEffect(() => {
        onEventRef.current = onEvent;
    });
    const emit = useCallback((event) => {
        onEventRef.current?.(event);
    }, []);
    useEffect(() => {
        if (fallbackReason) {
            emit({ type: 'fallback', kind, extension, reason: fallbackReason });
            return;
        }
        emit({
            type: 'render',
            kind,
            extension,
            ...(kind === 'office' && officeViewer !== false ? { viewer: officeViewer } : {}),
        });
    }, [emit, kind, extension, fallbackReason, officeViewer]);
    const openLightbox = useCallback(() => {
        setLightboxOpen(true);
        emit({ type: 'lightbox-open', kind, extension });
    }, [emit, kind, extension]);
    const closeLightbox = useCallback(() => {
        setLightboxOpen(false);
        emit({ type: 'lightbox-close', kind, extension });
    }, [emit, kind, extension]);
    const handleError = useCallback((event) => {
        emit({ type: 'error', kind, extension });
        onError?.(event);
    }, [emit, kind, extension, onError]);
    const renderUnpreviewable = (reason) => {
        const info = { url, kind, extension, fileName, reason };
        const content = renderFallback ? renderFallback(info) : <Fallback info={info}/>;
        return <div className={classNames('fp-root', 'fp-root--fallback', className)}>{content}</div>;
    };
    // Validation happens before anything reaches the DOM: an unsafe scheme never
    // becomes an `src` or `href`, whatever `kind` the caller asked for.
    if (fallbackReason)
        return renderUnpreviewable(fallbackReason);
    const wrapperClass = classNames('fp-root', `fp-root--${kind}`, className);
    if (kind === 'image') {
        const image = (<img className="fp-image" src={url} alt={label} loading="lazy" onError={handleError}/>);
        return (<div className={wrapperClass}>
        {lightbox ? (<button type="button" className="fp-image-trigger" onClick={openLightbox} aria-label={label ? `View ${label} full screen` : 'View image full screen'}>
            {image}
          </button>) : (image)}
        {isLightboxOpen ? <Lightbox url={url} alt={label} onClose={closeLightbox}/> : null}
      </div>);
    }
    if (kind === 'video') {
        const mimeType = getMimeType(url);
        return (<div className={wrapperClass}>
        {/* `preload="metadata"` fetches only enough to show duration and a poster
                frame, rather than pulling the whole file on mount. */}
        <video className="fp-video" controls={controls} preload="metadata" onError={handleError}>
          <source src={url} type={mimeType}/>
          <Fallback info={{ url, kind, extension, fileName, reason: 'unsupported-format' }}/>
        </video>
      </div>);
    }
    if (kind === 'audio') {
        return (<div className={wrapperClass}>
        <audio className="fp-audio" controls={controls} preload="metadata" onError={handleError}>
          <source src={url} type={getMimeType(url)}/>
          <Fallback info={{ url, kind, extension, fileName, reason: 'unsupported-format' }}/>
        </audio>
      </div>);
    }
    if (kind === 'pdf') {
        return (<div className={wrapperClass}>
        {/* Browsers render PDFs natively, so no third-party viewer is involved
                and the URL is never disclosed. Children render when they cannot. */}
        <object className="fp-pdf" data={url} type="application/pdf" aria-label={label}>
          <Fallback info={{ url, kind, extension, fileName, reason: 'unsupported-format' }}/>
        </object>
      </div>);
    }
    if (kind === 'office') {
        // `fallbackReason` already returned for a missing viewer; this repeats the
        // check so the invariant is enforced by the type system rather than assumed.
        if (!viewerUrl)
            return renderUnpreviewable('viewer-disabled');
        return (<div className={wrapperClass}>
        <iframe className="fp-office" src={viewerUrl} title={label || 'Document preview'}/>
      </div>);
    }
    if (kind === 'text') {
        return (<div className={wrapperClass}>
        {/* `sandbox` with no permissions: the frame renders, but cannot run
                scripts or reach this page, in case the URL serves something richer
                than the extension advertised. */}
        <iframe className="fp-text" src={url} title={label || 'File preview'} sandbox=""/>
      </div>);
    }
    return renderUnpreviewable('unsupported-format');
}
