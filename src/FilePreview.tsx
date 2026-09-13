import { useCallback, useEffect, useState } from 'react';
import { detectKind, getExtension, getFileName, getMimeType, isSafeUrl } from './fileType';
import { getOfficeViewerUrl } from './viewers';
import type { FallbackInfo, FilePreviewProps } from './types';

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
  renderFallback,
}: FilePreviewProps) {
  const [isLightboxOpen, setLightboxOpen] = useState(false);
  const closeLightbox = useCallback(() => setLightboxOpen(false), []);

  const safe = isSafeUrl(url);
  const kind = kindOverride ?? detectKind(url);
  const extension = safe ? getExtension(url) : '';
  const fileName = fileNameProp ?? (safe ? getFileName(url) : '');
  const label = alt ?? fileName;

  const renderUnpreviewable = (reason: FallbackInfo['reason']) => {
    const info: FallbackInfo = { url, kind, extension, fileName, reason };
    const content = renderFallback ? renderFallback(info) : <Fallback info={info} />;
    return <div className={classNames('fp-root', 'fp-root--fallback', className)}>{content}</div>;
  };

  // Validate before anything reaches the DOM: an unsafe scheme never becomes an
  // `src` or `href`, whatever `kind` the caller asked for.
  if (!safe) return renderUnpreviewable('unsafe-url');

  const wrapperClass = classNames('fp-root', `fp-root--${kind}`, className);

  if (kind === 'image') {
    const image = (
      <img className="fp-image" src={url} alt={label} loading="lazy" onError={onError} />
    );

    return (
      <div className={wrapperClass}>
        {lightbox ? (
          <button
            type="button"
            className="fp-image-trigger"
            onClick={() => setLightboxOpen(true)}
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
        <video className="fp-video" controls={controls} preload="metadata" onError={onError}>
          <source src={url} type={mimeType} />
          <Fallback info={{ url, kind, extension, fileName, reason: 'unsupported-format' }} />
        </video>
      </div>
    );
  }

  if (kind === 'audio') {
    return (
      <div className={wrapperClass}>
        <audio className="fp-audio" controls={controls} preload="metadata" onError={onError}>
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
    const viewerUrl = getOfficeViewerUrl(url, officeViewer);
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
