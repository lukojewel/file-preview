import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FilePreview } from '../FilePreview';

describe('FilePreview — images', () => {
  it('renders an image with the file name as alt text', () => {
    render(<FilePreview url="https://example.com/photo.png" />);

    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('src', 'https://example.com/photo.png');
    expect(image).toHaveAttribute('alt', 'photo.png');
  });

  it('prefers an explicit alt prop', () => {
    render(<FilePreview url="https://example.com/photo.png" alt="Cancelled cheque" />);
    expect(screen.getByRole('img')).toHaveAttribute('alt', 'Cancelled cheque');
  });

  it('opens and closes a lightbox', () => {
    render(<FilePreview url="https://example.com/photo.png" />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /full screen/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes the lightbox on Escape', () => {
    render(<FilePreview url="https://example.com/photo.png" />);
    fireEvent.click(screen.getByRole('button', { name: /full screen/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders a plain image when the lightbox is disabled', () => {
    render(<FilePreview url="https://example.com/photo.png" lightbox={false} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByRole('img')).toBeInTheDocument();
  });
});

describe('FilePreview — media', () => {
  it('renders a video with a source typed from its extension', () => {
    const { container } = render(<FilePreview url="https://example.com/clip.mov" />);

    const source = container.querySelector('video > source');
    expect(source).toHaveAttribute('src', 'https://example.com/clip.mov');
    expect(source).toHaveAttribute('type', 'video/quicktime');
  });

  it('renders audio with controls by default', () => {
    const { container } = render(<FilePreview url="https://example.com/song.mp3" />);

    const audio = container.querySelector('audio');
    expect(audio).toBeInTheDocument();
    expect(audio).toHaveAttribute('controls');
  });

  it('honours controls={false}', () => {
    const { container } = render(<FilePreview url="https://example.com/song.mp3" controls={false} />);
    expect(container.querySelector('audio')).not.toHaveAttribute('controls');
  });
});

describe('FilePreview — documents', () => {
  it('renders PDFs natively, without a third-party viewer', () => {
    const { container } = render(<FilePreview url="https://example.com/report.pdf" />);

    const object = container.querySelector('object');
    expect(object).toHaveAttribute('data', 'https://example.com/report.pdf');
    expect(object).toHaveAttribute('type', 'application/pdf');
    expect(container.querySelector('iframe')).not.toBeInTheDocument();
  });

  it('embeds Office documents through the configured viewer', () => {
    const { container } = render(<FilePreview url="https://example.com/deck.pptx" />);

    const iframe = container.querySelector('iframe');
    expect(iframe?.getAttribute('src')).toContain('https://docs.google.com/gview');
  });

  it('falls back to a download link when the viewer is disabled', () => {
    render(<FilePreview url="https://example.com/deck.pptx" officeViewer={false} />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://example.com/deck.pptx');
    expect(screen.queryByTitle(/preview/i)).not.toBeInTheDocument();
  });

  it('sandboxes the frame used for text files', () => {
    const { container } = render(<FilePreview url="https://example.com/notes.txt" />);
    expect(container.querySelector('iframe')).toHaveAttribute('sandbox', '');
  });
});

describe('FilePreview — fallback', () => {
  // The 2018 component tested `type == 4` twice, so the generic-file branch was
  // unreachable and every unrecognised file rendered the words
  // "File format not supported" with no way to reach the file.
  it('gives unknown formats a working download link', () => {
    render(<FilePreview url="https://example.com/archive.zip" />);

    const link = screen.getByRole('link', { name: /archive\.zip/i });
    expect(link).toHaveAttribute('href', 'https://example.com/archive.zip');
    expect(screen.getByText('ZIP')).toBeInTheDocument();
  });

  it('also falls back for URLs with no extension', () => {
    render(<FilePreview url="https://example.com/files/12345" />);
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://example.com/files/12345');
  });

  it('lets a caller replace the fallback UI', () => {
    render(
      <FilePreview
        url="https://example.com/archive.zip"
        renderFallback={(info) => <span>cannot preview {info.extension}</span>}
      />,
    );

    expect(screen.getByText(/cannot preview zip/i)).toBeInTheDocument();
  });

  it('passes the reason to renderFallback', () => {
    const renderFallback = vi.fn().mockReturnValue(null);
    render(
      <FilePreview url="https://example.com/a.docx" officeViewer={false} renderFallback={renderFallback} />,
    );

    expect(renderFallback).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'office', reason: 'viewer-disabled' }),
    );
  });
});

describe('FilePreview — security', () => {
  it('adds rel="noopener noreferrer" to every new-tab link', () => {
    render(<FilePreview url="https://example.com/archive.zip" />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('refuses to render a javascript: URL anywhere', () => {
    const { container } = render(<FilePreview url="javascript:alert(1)" />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(container.querySelector('img, video, audio, iframe, object')).toBeNull();
    expect(container.innerHTML).not.toContain('javascript:');
  });

  it('refuses an unsafe URL even when the kind is forced', () => {
    const { container } = render(<FilePreview url="javascript:alert(1)" kind="image" />);
    expect(container.querySelector('img')).toBeNull();
  });

  it('renders nothing dangerous for an empty url', () => {
    const { container } = render(<FilePreview url="" />);
    expect(container.querySelector('img, video, audio, iframe, object')).toBeNull();
  });
});

describe('FilePreview — API', () => {
  it('accepts a kind override for extensionless URLs', () => {
    render(<FilePreview url="https://example.com/api/files/9" kind="image" alt="Receipt" />);
    expect(screen.getByRole('img')).toHaveAttribute('alt', 'Receipt');
  });

  it('applies a custom className alongside the built-in one', () => {
    const { container } = render(
      <FilePreview url="https://example.com/photo.png" className="my-wrapper" />,
    );

    const root = container.firstElementChild;
    expect(root).toHaveClass('fp-root');
    expect(root).toHaveClass('fp-root--image');
    expect(root).toHaveClass('my-wrapper');
  });
});
