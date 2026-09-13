import type { ReactNode } from 'react';

/**
 * The broad category a file falls into, which determines how it is rendered.
 *
 * `office` covers formats no browser renders natively (Word, Excel, PowerPoint)
 * and therefore requires a third-party viewer — see `OfficeViewer`.
 */
export type FileKind =
  | 'image'
  | 'video'
  | 'audio'
  | 'pdf'
  | 'office'
  | 'text'
  | 'unknown';

/**
 * Third-party service used to render Office documents.
 *
 * Both options upload nothing, but they do require the file URL to be publicly
 * reachable, and they disclose that URL to the provider. Pass `false` to opt out
 * entirely and fall back to a download link.
 */
export type OfficeViewer = 'google' | 'microsoft' | false;

/** Details handed to `renderFallback` when a file cannot be previewed inline. */
export interface FallbackInfo {
  /** The URL as passed in, after scheme validation. */
  url: string;
  /** Detected (or overridden) file category. */
  kind: FileKind;
  /** Lower-cased extension without the dot, or `''` when none could be derived. */
  extension: string;
  /** Display name — `fileName` prop if given, otherwise derived from the URL. */
  fileName: string;
  /** Why inline preview was not possible. */
  reason: 'unsupported-format' | 'unsafe-url' | 'viewer-disabled';
}

export interface FilePreviewProps {
  /**
   * URL of the file to preview. Absolute, protocol-relative, root-relative and
   * `data:` URLs are all accepted; query strings and fragments are ignored when
   * deriving the file type.
   */
  url: string;

  /**
   * Force a category instead of deriving one from the URL. Useful when the URL
   * carries no extension (e.g. `/api/files/1234`) but the type is known.
   */
  kind?: FileKind;

  /** Display name for link fallbacks. Defaults to the last path segment. */
  fileName?: string;

  /** Class applied to the wrapper element, in addition to the built-in one. */
  className?: string;

  /**
   * Which service renders Office documents. Defaults to `'google'`.
   * PDFs never use a third-party viewer — they render natively.
   */
  officeViewer?: OfficeViewer;

  /** Alt text for images. Defaults to `fileName`. */
  alt?: string;

  /** Show native playback controls on audio/video. Defaults to `true`. */
  controls?: boolean;

  /**
   * Allow clicking an image to open it full-screen. Defaults to `true`.
   * Set to `false` to render a plain, non-interactive `<img>`.
   */
  lightbox?: boolean;

  /** Called when the underlying media element fails to load. */
  onError?: (event: unknown) => void;

  /** Replace the built-in fallback UI for files that cannot be previewed. */
  renderFallback?: (info: FallbackInfo) => ReactNode;
}
