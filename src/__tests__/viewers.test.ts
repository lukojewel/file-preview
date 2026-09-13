import { describe, expect, it } from 'vitest';
import { getOfficeViewerUrl } from '../viewers';

const SIGNED_URL =
  'https://cdn.example.com/a.docx?X-Amz-Signature=deadbeef&X-Amz-Expires=600';

describe('getOfficeViewerUrl', () => {
  it('uses the Google viewer by default', () => {
    const result = getOfficeViewerUrl('https://example.com/a.docx', 'google');
    expect(result).toBe(
      'https://docs.google.com/gview?url=https%3A%2F%2Fexample.com%2Fa.docx&embedded=true',
    );
  });

  it('always uses https', () => {
    expect(getOfficeViewerUrl('https://example.com/a.docx', 'google')).toMatch(/^https:\/\//);
    expect(getOfficeViewerUrl('https://example.com/a.docx', 'microsoft')).toMatch(/^https:\/\//);
  });

  // The 2018 version concatenated the URL unencoded, so the viewer received
  // everything up to the first `&` and treated the rest as its own parameters —
  // silently breaking every signed URL.
  it('percent-encodes the file URL so signed URLs survive intact', () => {
    const viewerUrl = getOfficeViewerUrl(SIGNED_URL, 'google');
    expect(viewerUrl).not.toBeNull();

    const params = new URL(viewerUrl as string).searchParams;
    expect(params.get('url')).toBe(SIGNED_URL);
    expect(params.has('X-Amz-Expires')).toBe(false);
  });

  it('supports the Microsoft viewer', () => {
    expect(getOfficeViewerUrl('https://example.com/a.xlsx', 'microsoft')).toBe(
      'https://view.officeapps.live.com/op/embed.aspx?src=https%3A%2F%2Fexample.com%2Fa.xlsx',
    );
  });

  it('returns null when the viewer is disabled', () => {
    expect(getOfficeViewerUrl('https://example.com/a.docx', false)).toBeNull();
  });

  it('returns null for URLs a viewer cannot fetch', () => {
    expect(getOfficeViewerUrl('/uploads/a.docx', 'google')).toBeNull();
    expect(getOfficeViewerUrl('data:application/msword;base64,AAAA', 'google')).toBeNull();
    expect(getOfficeViewerUrl('blob:https://example.com/1234', 'google')).toBeNull();
  });
});
