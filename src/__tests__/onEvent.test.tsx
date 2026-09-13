import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FilePreview } from '../FilePreview';

const SIGNED_URL =
  'https://cdn.example.com/kyc/cancelled-cheque-ABCDE1234F.png?X-Amz-Signature=deadbeef';

describe('onEvent — what is reported', () => {
  it('reports a render with the resolved kind and extension', () => {
    const onEvent = vi.fn();
    render(<FilePreview url="https://example.com/photo.PNG" onEvent={onEvent} />);

    expect(onEvent).toHaveBeenCalledWith({ type: 'render', kind: 'image', extension: 'png' });
  });

  it('names the viewer on Office renders', () => {
    const onEvent = vi.fn();
    render(<FilePreview url="https://example.com/deck.pptx" onEvent={onEvent} />);

    expect(onEvent).toHaveBeenCalledWith({
      type: 'render',
      kind: 'office',
      extension: 'pptx',
      viewer: 'google',
    });
  });

  it('reports a fallback with the reason', () => {
    const onEvent = vi.fn();
    render(<FilePreview url="https://example.com/archive.zip" onEvent={onEvent} />);

    expect(onEvent).toHaveBeenCalledWith({
      type: 'fallback',
      kind: 'unknown',
      extension: 'zip',
      reason: 'unsupported-format',
    });
  });

  it('distinguishes a disabled viewer from an unsupported format', () => {
    const onEvent = vi.fn();
    render(
      <FilePreview url="https://example.com/a.docx" officeViewer={false} onEvent={onEvent} />,
    );

    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'fallback', reason: 'viewer-disabled' }),
    );
  });

  it('reports a blocked URL', () => {
    const onEvent = vi.fn();
    render(<FilePreview url="javascript:alert(1)" onEvent={onEvent} />);

    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'fallback', reason: 'unsafe-url' }),
    );
  });

  it('reports lightbox open and close', () => {
    const onEvent = vi.fn();
    render(<FilePreview url="https://example.com/photo.png" onEvent={onEvent} />);
    onEvent.mockClear();

    fireEvent.click(screen.getByRole('button', { name: /full screen/i }));
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'lightbox-open', kind: 'image' }),
    );

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'lightbox-close' }));
  });

  it('reports a media error without swallowing onError', () => {
    const onEvent = vi.fn();
    const onError = vi.fn();
    const { container } = render(
      <FilePreview url="https://example.com/clip.mp4" onEvent={onEvent} onError={onError} />,
    );

    fireEvent.error(container.querySelector('video') as HTMLVideoElement);

    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', kind: 'video', extension: 'mp4' }),
    );
    expect(onError).toHaveBeenCalled();
  });
});

describe('onEvent — what is never reported', () => {
  // The URL handed to this component is routinely a signed link to a KYC
  // document, and the file name can carry a PAN or a customer id. Neither may
  // reach a host application's analytics through this callback.
  it('never includes the URL or the file name', () => {
    const onEvent = vi.fn();
    render(<FilePreview url={SIGNED_URL} onEvent={onEvent} />);

    for (const [event] of onEvent.mock.calls) {
      expect(Object.keys(event).sort()).toEqual(['extension', 'kind', 'type']);

      const serialised = JSON.stringify(event);
      expect(serialised).not.toContain('cancelled-cheque');
      expect(serialised).not.toContain('ABCDE1234F');
      expect(serialised).not.toContain('X-Amz-Signature');
      expect(serialised).not.toContain('cdn.example.com');
    }
  });

  it('holds to that for fallbacks too', () => {
    const onEvent = vi.fn();
    render(<FilePreview url="https://cdn.example.com/kyc/pan-ABCDE1234F.zip" onEvent={onEvent} />);

    const serialised = JSON.stringify(onEvent.mock.calls);
    expect(serialised).not.toContain('ABCDE1234F');
    expect(serialised).not.toContain('cdn.example.com');
  });
});

describe('onEvent — emission discipline', () => {
  it('reports once per render outcome, not once per React render', () => {
    const onEvent = vi.fn();
    const { rerender } = render(
      <FilePreview url="https://example.com/photo.png" onEvent={onEvent} />,
    );
    expect(onEvent).toHaveBeenCalledTimes(1);

    rerender(<FilePreview url="https://example.com/photo.png" onEvent={onEvent} />);
    rerender(<FilePreview url="https://example.com/photo.png" onEvent={onEvent} />);
    expect(onEvent).toHaveBeenCalledTimes(1);
  });

  // A caller passing an inline arrow gets a new function identity every render;
  // that must not be mistaken for a change worth reporting again.
  it('does not re-report when only the callback identity changes', () => {
    const spy = vi.fn();
    const { rerender } = render(
      <FilePreview url="https://example.com/photo.png" onEvent={(e) => spy(e)} />,
    );
    rerender(<FilePreview url="https://example.com/photo.png" onEvent={(e) => spy(e)} />);

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('reports again when the file actually changes', () => {
    const onEvent = vi.fn();
    const { rerender } = render(
      <FilePreview url="https://example.com/photo.png" onEvent={onEvent} />,
    );
    rerender(<FilePreview url="https://example.com/report.pdf" onEvent={onEvent} />);

    expect(onEvent).toHaveBeenCalledTimes(2);
    expect(onEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: 'render', kind: 'pdf' }),
    );
  });

  it('is entirely optional', () => {
    expect(() => render(<FilePreview url="https://example.com/photo.png" />)).not.toThrow();
  });
});
