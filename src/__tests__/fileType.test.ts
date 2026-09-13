import { describe, expect, it } from 'vitest';
import { detectKind, getExtension, getFileName, getMimeType, isSafeUrl } from '../fileType';

describe('getExtension', () => {
  it('reads a plain extension', () => {
    expect(getExtension('https://example.com/photo.png')).toBe('png');
  });

  // The 2018 implementation used `url.split('.').pop()`, so a query string was
  // returned as part of the extension and every signed URL fell through to the
  // "not supported" branch.
  it('ignores query strings', () => {
    expect(getExtension('https://cdn.example.com/a/report.pdf?token=abc&expires=1')).toBe('pdf');
  });

  it('ignores fragments', () => {
    expect(getExtension('https://example.com/a.pdf#page=2')).toBe('pdf');
  });

  it('lower-cases the extension', () => {
    expect(getExtension('https://example.com/IMG_1234.JPG')).toBe('jpg');
  });

  it('returns empty string when the path has no extension', () => {
    expect(getExtension('https://example.com/files/12345')).toBe('');
  });

  it('does not mistake a dotted host for an extension', () => {
    expect(getExtension('https://sub.domain.example.com/files/12345')).toBe('');
  });

  it('does not treat a dotted directory as the file extension', () => {
    expect(getExtension('https://example.com/v1.2/download')).toBe('');
  });

  it('ignores a trailing slash', () => {
    expect(getExtension('https://example.com/folder/')).toBe('');
  });

  it('treats a leading dot as a hidden file, not an extension', () => {
    expect(getExtension('https://example.com/.gitignore')).toBe('');
  });

  it('handles percent-encoded names', () => {
    expect(getExtension('https://example.com/my%20report.PDF')).toBe('pdf');
  });

  it('handles relative paths', () => {
    expect(getExtension('/uploads/2026/cheque.jpeg')).toBe('jpeg');
  });

  it('derives an extension from a data URL', () => {
    expect(getExtension('data:image/png;base64,iVBORw0KGgo=')).toBe('png');
    expect(getExtension('data:image/svg+xml,%3Csvg/%3E')).toBe('svg');
  });

  it.each([[''], [null], [undefined]])('is safe for %s', (input) => {
    expect(getExtension(input as unknown as string)).toBe('');
  });
});

describe('detectKind', () => {
  it.each([
    ['https://example.com/a.jpg', 'image'],
    ['https://example.com/a.webp', 'image'],
    ['https://example.com/a.mp4', 'video'],
    ['https://example.com/a.mov', 'video'],
    ['https://example.com/a.mp3', 'audio'],
    ['https://example.com/a.flac', 'audio'],
    ['https://example.com/a.pdf', 'pdf'],
    ['https://example.com/a.docx', 'office'],
    ['https://example.com/a.xlsx', 'office'],
    ['https://example.com/a.csv', 'office'],
    ['https://example.com/a.txt', 'text'],
    ['https://example.com/a.zip', 'unknown'],
    ['https://example.com/no-extension', 'unknown'],
  ])('classifies %s as %s', (url, expected) => {
    expect(detectKind(url)).toBe(expected);
  });

  it('classifies data URLs by their MIME type', () => {
    expect(detectKind('data:image/png;base64,iVBORw0KGgo=')).toBe('image');
    expect(detectKind('data:audio/mpeg;base64,AAAA')).toBe('audio');
  });

  it('never classifies an unsafe URL as previewable', () => {
    expect(detectKind('javascript:alert(1)//a.png')).toBe('unknown');
  });
});

describe('isSafeUrl', () => {
  it.each([
    'https://example.com/a.png',
    'http://example.com/a.png',
    '//cdn.example.com/a.png',
    '/uploads/a.png',
    'uploads/a.png',
    'data:image/png;base64,iVBORw0KGgo=',
    'blob:https://example.com/1234',
  ])('accepts %s', (url) => {
    expect(isSafeUrl(url)).toBe(true);
  });

  it.each([
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
  ])('rejects %s', (url) => {
    expect(isSafeUrl(url)).toBe(false);
  });

  // Browsers strip control characters while resolving a scheme, so a check that
  // reads the raw string would pass this through as "relative".
  it('rejects schemes obfuscated with control characters', () => {
    expect(isSafeUrl('java\tscript:alert(1)')).toBe(false);
    expect(isSafeUrl('java\nscript:alert(1)')).toBe(false);
    expect(isSafeUrl(' javascript:alert(1)')).toBe(false);
  });

  it('rejects empty input', () => {
    expect(isSafeUrl('')).toBe(false);
    expect(isSafeUrl('   ')).toBe(false);
    expect(isSafeUrl(undefined as unknown as string)).toBe(false);
  });
});

describe('getFileName', () => {
  it('uses the last path segment', () => {
    expect(getFileName('https://example.com/docs/annual report.pdf')).toBe('annual report.pdf');
  });

  it('decodes percent-encoding', () => {
    expect(getFileName('https://example.com/my%20file.pdf')).toBe('my file.pdf');
  });

  it('strips the query string', () => {
    expect(getFileName('https://example.com/a/b.pdf?sig=xyz')).toBe('b.pdf');
  });

  it('falls back to the host when there is no path', () => {
    expect(getFileName('https://example.com')).toBe('example.com');
  });
});

describe('getMimeType', () => {
  it('maps known media extensions', () => {
    expect(getMimeType('https://example.com/a.mp4')).toBe('video/mp4');
    expect(getMimeType('https://example.com/a.mp3')).toBe('audio/mpeg');
  });

  // The 2018 version hard-coded `video/mp4` for every video extension, telling
  // the browser a QuickTime file was MP4.
  it('does not claim every video is mp4', () => {
    expect(getMimeType('https://example.com/a.mov')).toBe('video/quicktime');
    expect(getMimeType('https://example.com/a.webm')).toBe('video/webm');
  });

  it('returns undefined when there is no reliable guess', () => {
    expect(getMimeType('https://example.com/a.xyz')).toBeUndefined();
  });
});
