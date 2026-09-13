import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  // React stays a peer dependency — bundling it would give consumers a second
  // copy of React and break hooks.
  external: ['react', 'react-dom'],
  // Ship the stylesheet next to the bundle so `@lukojewel/file-preview/styles.css`
  // resolves; the component itself never imports it.
  publicDir: false,
  onSuccess: 'node -e "require(\'node:fs\').copyFileSync(\'src/styles.css\',\'dist/styles.css\')"',
});
