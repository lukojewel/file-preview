/**
 * The standalone build is a deliverable in its own right — people copy that one
 * file into a project instead of installing the package. Testing it here means a
 * broken generator fails CI rather than shipping a file that looks fine and
 * doesn't render.
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
// @ts-expect-error — generated JSX, deliberately untyped.
import { FilePreview, detectKind } from '../../standalone/FilePreview.jsx';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(here, '../../standalone/FilePreview.jsx'), 'utf8');

describe('standalone build', () => {
  it('renders the same markup as the package entry point', () => {
    render(<FilePreview url="https://example.com/photo.png" alt="Cheque" />);
    expect(screen.getByRole('img')).toHaveAttribute('alt', 'Cheque');
  });

  it('exports the detection helpers too', () => {
    expect(detectKind('https://example.com/a.pdf?sig=1')).toBe('pdf');
  });

  it('still refuses unsafe URLs', () => {
    const { container } = render(<FilePreview url="javascript:alert(1)" />);
    expect(container.innerHTML).not.toContain('javascript:');
  });

  it('imports nothing but React', () => {
    const imports = [...source.matchAll(/^\s*import\s.*?from\s+["']([^"']+)["']/gm)].map(
      (match) => match[1],
    );
    expect(imports.filter((name) => name !== 'react')).toEqual([]);
  });
});
