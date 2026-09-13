# file-preview

React component for previewing any type of file from a URL.

Give it a URL; it picks the right element — image, video, audio, PDF, Office
document — and falls back to a download link for anything it can't render inline.
No runtime dependencies.

```jsx
import { FilePreview } from '@lukojewel/file-preview';
import '@lukojewel/file-preview/styles.css'; // optional

<FilePreview url={fileUrl} />;
```

## Install

```bash
npm install @lukojewel/file-preview
```

Requires React 17 or newer as a peer dependency.

**Or copy one file.** `standalone/FilePreview.jsx` is the whole component built
into a single dependency-free JSX file. Drop it into a project, optionally copy
`standalone/styles.css` beside it, and import it directly — no install, no build
config.

## Supported formats

| Kind | Extensions | Rendered with |
|---|---|---|
| `image` | jpg, jpeg, png, gif, webp, avif, bmp, svg, ico, heic, heif | `<img>` + click-to-zoom lightbox |
| `video` | mp4, webm, ogv, mov, m4v, avi, mkv, mpeg, mpg, 3gp, flv, wmv, vob | `<video controls>` |
| `audio` | mp3, wav, flac, m4a, aac, oga, ogg, opus, weba, amr, wma | `<audio controls>` |
| `pdf` | pdf | `<object>` — the browser's own PDF viewer |
| `office` | doc, docx, rtf, odt, xls, xlsx, ods, csv, ppt, pptx, odp | Google or Microsoft embed viewer |
| `text` | txt, md, log, json, xml, yml, yaml | sandboxed `<iframe>` |
| `unknown` | anything else | download link |

Query strings, fragments, uppercase extensions, `data:` URLs and relative paths
are all handled — a signed S3 URL like `.../report.pdf?X-Amz-Signature=…` is
detected as a PDF.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `url` | `string` | — | **Required.** URL of the file. |
| `kind` | `FileKind` | auto-detected | Force a category. Use when the URL has no extension. |
| `fileName` | `string` | last path segment | Display name for link fallbacks. |
| `className` | `string` | — | Added to the wrapper element. |
| `officeViewer` | `'google' \| 'microsoft' \| false` | `'google'` | Viewer for Office documents, or `false` to disable. |
| `alt` | `string` | `fileName` | Alt text for images. |
| `controls` | `boolean` | `true` | Native playback controls on audio/video. |
| `lightbox` | `boolean` | `true` | Click an image to view it full-screen. |
| `onError` | `(event) => void` | — | Called when the media element fails to load. |
| `renderFallback` | `(info: FallbackInfo) => ReactNode` | built-in link | Replace the fallback UI. |

`detectKind`, `getExtension`, `getFileName`, `getMimeType`, `isSafeUrl` and
`getOfficeViewerUrl` are exported too, if you want the detection logic without
the component.

## Two things worth knowing

**Office documents leave your origin.** Word, Excel and PowerPoint have no native
browser renderer, so those files are embedded through Google's viewer by default.
That means the file URL is sent to Google, and the file must be publicly
reachable for the viewer to fetch it. Pass `officeViewer={false}` to render a
download link instead. Images, video, audio and PDFs never touch a third party.

**Unsafe URLs are refused.** Only `http:`, `https:`, `data:`, `blob:` and
relative URLs are rendered. Anything else — `javascript:` included, with or
without control-character obfuscation — renders a neutral "cannot be displayed"
message instead of reaching the DOM. New-tab links carry
`rel="noopener noreferrer"`.

## Styling

The component renders usable markup with no CSS at all. `styles.css` is
cosmetic, namespaced under `fp-`, assumes no grid framework, and supports dark
mode. Or skip it and target the class names yourself:
`fp-root`, `fp-root--{kind}`, `fp-image`, `fp-video`, `fp-audio`, `fp-pdf`,
`fp-office`, `fp-text`, `fp-fallback`, `fp-lightbox`.

## Development

```bash
npm install
npm run verify   # typecheck + lint + test + build + standalone sync check
```

`standalone/` is generated from `src/` by `npm run build`. Don't edit it by hand
— CI fails if it has drifted.

## Licence

MIT
