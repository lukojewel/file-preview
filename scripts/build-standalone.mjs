/**
 * Generate `standalone/FilePreview.jsx` — the whole component as one
 * dependency-free JSX file, for dropping into a project by copy-paste rather
 * than installing the package.
 *
 * This strips types with the TypeScript compiler and concatenates the results,
 * rather than bundling. esbuild would produce a smaller file but discards every
 * comment, and the comments are most of the point here: this file exists to be
 * read and adapted, not just executed.
 *
 * Generated, never hand-edited: `npm run build` rewrites it, and
 * `node scripts/build-standalone.mjs --check` fails if it has drifted from
 * `src/`, which is what CI runs.
 */
import ts from 'typescript';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_FILE = resolve(ROOT, 'standalone/FilePreview.jsx');
const OUT_CSS = resolve(ROOT, 'standalone/styles.css');

/** Concatenation order matters: definitions must precede their use. */
const SOURCES = ['src/fileType.ts', 'src/viewers.ts', 'src/FilePreview.tsx'];

const BANNER = `/*
 * FilePreview — the whole component in one file, with no dependencies beyond
 * React itself. Generated from src/; do not edit directly.
 *
 * Requires React 17+ (the automatic JSX runtime). Copy this file into your
 * project, optionally copy styles.css beside it, then:
 *
 *   import { FilePreview } from './FilePreview';
 *
 *   <FilePreview url={fileUrl} />
 *
 * Source, tests and licence: https://github.com/lukojewel/file-preview
 */
import { useCallback, useEffect, useState } from 'react';
`;

/** Drop imports of sibling modules — after concatenation they are all local. */
function stripLocalImports(code) {
  return code.replace(/^import\s[^;]*?from\s+["'](?:\.\.?\/)[^"']*["'];?\s*$/gm, '');
}

/** Drop the React import; the banner hoists a single one to the top. */
function stripReactImport(code) {
  return code.replace(/^import\s[^;]*?from\s+["']react["'];?\s*$/gm, '');
}

async function transpile(relativePath) {
  const source = await readFile(resolve(ROOT, relativePath), 'utf8');

  const { outputText } = ts.transpileModule(source, {
    fileName: relativePath,
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
      // `Preserve` leaves JSX untouched so the consumer's own toolchain compiles
      // it, and `removeComments: false` is the whole reason for using tsc here.
      jsx: ts.JsxEmit.Preserve,
      removeComments: false,
    },
  });

  const body = stripReactImport(stripLocalImports(outputText)).trim();
  return `// ---------------------------------------------------------------------------\n// ${relativePath}\n// ---------------------------------------------------------------------------\n\n${body}\n`;
}

async function generate() {
  const parts = await Promise.all(SOURCES.map(transpile));
  return `${BANNER}\n${parts.join('\n')}`;
}

const isCheck = process.argv.includes('--check');
const generated = await generate();
const css = await readFile(resolve(ROOT, 'src/styles.css'), 'utf8');

if (isCheck) {
  if (!existsSync(OUT_FILE)) {
    console.error('standalone/FilePreview.jsx is missing — run `npm run build`.');
    process.exit(1);
  }

  const [currentJsx, currentCss] = await Promise.all([
    readFile(OUT_FILE, 'utf8'),
    readFile(OUT_CSS, 'utf8').catch(() => ''),
  ]);

  if (currentJsx !== generated || currentCss !== css) {
    console.error('standalone/ is out of date with src/ — run `npm run build` and commit.');
    process.exit(1);
  }

  console.log('standalone/ is in sync with src/');
} else {
  await mkdir(dirname(OUT_FILE), { recursive: true });
  await Promise.all([writeFile(OUT_FILE, generated), writeFile(OUT_CSS, css)]);
  console.log('wrote standalone/FilePreview.jsx + standalone/styles.css');
}
