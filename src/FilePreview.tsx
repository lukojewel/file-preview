import { useCallback, useEffect, useRef, useState } from 'react';
import { detectKind, getExtension, getFileName, getMimeType, isSafeUrl } from './fileType';
import { getOfficeViewerUrl } from './viewers';
import type { FallbackInfo, FilePreviewEvent, FilePreviewProps } from './types';

function classNames(...values: (string | undefined | false)[]): string {
  return values.filter(Boolean).join(' ');
}

/** Generic document glyph, inlined so the package ships no icon font. */
function FileIcon() {
  return (
    <svg
      className="fp-fallback__icon"
      viewBox="0 0 24 24"
      width="40"
      height="40"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M14 2H6.5A1.5 1.5 0 0 0 5 3.5v17A1.5 1.5 0 0 0 6.5 22h11a1.5 1.5 0 0 0 1.5-1.5V7z" />
      <path d="M14 2v5h5" />
    </svg>
  );
}

/** Link shown whenever a file cannot be rendered inline. */
function Fallback({ info }: { info: FallbackInfo }) {
  const { url, extension, fileName, reason } = info;

  if (reason === 'unsafe-url') {
    return (
      <p className="fp-fallback fp-fallback--blocked" role="note">
        <FileIcon />
        <span className="fp-fallback__label">This file cannot be displayed.</span>
      </p>
    );
  }

  return (
    <a
      className="fp-fallback"
      href={url}
      target="_blank"
      // `noopener` denies the opened page access to `window.opener`, which it
      // could otherwise use to navigate this tab elsewhere (reverse tabnabbing).
      rel="noopener noreferrer"
      download={fileName || undefined}
    >
      <FileIcon />
      <span className="fp-fallback__label">{fileName || 'Download file'}</span>
      {extension ? <span className="fp-fallback__ext">{extension.toUpperCase()}</span> : null}
    </a>
  );
}

/** Full-screen image overlay, dismissed with Escape or a click. */
function Lightbox({ url, alt, onClose }: { url: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fp-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={onClose}
    >
      <button type="button" className="fp-lightbox__close" aria-label="Close" onClick={onClose}>
        ×
      </button>
      <img className="fp-lightbox__image" src={url} alt={alt} />
    </div>
  );
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
export function FilePreview({
  url,
  kind: kindOverride,
  fileName: fileNameProp,
  className,
  officeViewer = 'google',
  alt,
  controls = true,
  lightbox = true,
  onError,
  onEvent,
  renderFallback,
}: FilePreviewProps) {
  const [isLightboxOpen, setLightboxOpen] = useState(false);

  const safe = isSafeUrl(url);
  const kind = kindOverride ?? detectKind(url);
  const extension = safe ? getExtension(url) : '';
  const fileName = fileNameProp ?? (safe ? getFileName(url) : '');
  const label = alt ?? fileName;

  const viewerUrl = safe && kind === 'office' ? getOfficeViewerUrl(url, officeViewer) : null;

  // Resolved before rendering so the outcome can be reported from an effect, and
  // so every "cannot preview" path leaves through one place.
  const fallbackReason: FallbackInfo['reason'] | null = !safe
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

  const emit = useCallback((event: FilePreviewEvent) => {
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

  const handleError = useCallback(
    (event: unknown) => {
      emit({ type: 'error', kind, extension });
      onError?.(event);
    },
    [emit, kind, extension, onError],
  );

  const renderUnpreviewable = (reason: FallbackInfo['reason']) => {
    const info: FallbackInfo = { url, kind, extension, fileName, reason };
    const content = renderFallback ? renderFallback(info) : <Fallback info={info} />;
    return <div className={classNames('fp-root', 'fp-root--fallback', className)}>{content}</div>;
  };

  // Validation happens before anything reaches the DOM: an unsafe scheme never
  // becomes an `src` or `href`, whatever `kind` the caller asked for.
  if (fallbackReason) return renderUnpreviewable(fallbackReason);

  const wrapperClass = classNames('fp-root', `fp-root--${kind}`, className);

  if (kind === 'image') {
    const image = (
      <img className="fp-image" src={url} alt={label} loading="lazy" onError={handleError} />
    );

    return (
      <div className={wrapperClass}>
        {lightbox ? (
          <button
            type="button"
            className="fp-image-trigger"
            onClick={openLightbox}
            aria-label={label ? `View ${label} full screen` : 'View image full screen'}
          >
            {image}
          </button>
        ) : (
          image
        )}
        {isLightboxOpen ? <Lightbox url={url} alt={label} onClose={closeLightbox} /> : null}
      </div>
    );
  }

  if (kind === 'video') {
    const mimeType = getMimeType(url);
    return (
      <div className={wrapperClass}>
        {/* `preload="metadata"` fetches only enough to show duration and a poster
            frame, rather than pulling the whole file on mount. */}
        <video className="fp-video" controls={controls} preload="metadata" onError={handleError}>
          <source src={url} type={mimeType} />
          <Fallback info={{ url, kind, extension, fileName, reason: 'unsupported-format' }} />
        </video>
      </div>
    );
  }

  if (kind === 'audio') {
    return (
      <div className={wrapperClass}>
        <audio className="fp-audio" controls={controls} preload="metadata" onError={handleError}>
          <source src={url} type={getMimeType(url)} />
          <Fallback info={{ url, kind, extension, fileName, reason: 'unsupported-format' }} />
        </audio>
      </div>
    );
  }

  if (kind === 'pdf') {
    return (
      <div className={wrapperClass}>
        {/* Browsers render PDFs natively, so no third-party viewer is involved
            and the URL is never disclosed. Children render when they cannot. */}
        <object className="fp-pdf" data={url} type="application/pdf" aria-label={label}>
          <Fallback info={{ url, kind, extension, fileName, reason: 'unsupported-format' }} />
        </object>
      </div>
    );
  }

  if (kind === 'office') {
    // `fallbackReason` already returned for a missing viewer; this repeats the
    // check so the invariant is enforced by the type system rather than assumed.
    if (!viewerUrl) return renderUnpreviewable('viewer-disabled');

    return (
      <div className={wrapperClass}>
        <iframe className="fp-office" src={viewerUrl} title={label || 'Document preview'} />
      </div>
    );
  }

  if (kind === 'text') {
    return (
      <div className={wrapperClass}>
        {/* `sandbox` with no permissions: the frame renders, but cannot run
            scripts or reach this page, in case the URL serves something richer
            than the extension advertised. */}
        <iframe className="fp-text" src={url} title={label || 'File preview'} sandbox="" />
      </div>
    );
  }

  return renderUnpreviewable('unsupported-format');
}
