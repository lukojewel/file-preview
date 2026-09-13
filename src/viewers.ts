import type { OfficeViewer } from './types';

/**
 * Office viewers fetch the document server-side, so they can only reach URLs
 * that are absolute and publicly resolvable. A relative or `data:` URL will
 * always fail, and we fall back to a download link rather than render a broken
 * frame.
 */
function isPubliclyFetchable(url: string): boolean {
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
export function getOfficeViewerUrl(url: string, viewer: OfficeViewer): string | null {
  if (viewer === false || !isPubliclyFetchable(url)) return null;

  const encoded = encodeURIComponent(url);

  return viewer === 'microsoft'
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encoded}`
    : `https://docs.google.com/gview?url=${encoded}&embedded=true`;
}
