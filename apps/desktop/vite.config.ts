import react from '@vitejs/plugin-react';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';

export default defineConfig({
  root: path.join(__dirname),
  plugins: [
    react(),
    tailwindcss(),
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          build: {
            rollupOptions: {
              external: ['exiftool-vendored', 'heic-convert', 'libheif-js'],
            },
          },
        },
      },
      {
        entry: 'electron/preload.ts',
        onstart(args) {
          args.reload();
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    // @canvas-studio/ui-react is consumed via a local `file:` dependency; npm
    // installs its own devDependencies for file: deps (unlike registry deps),
    // which pulls in a second copy of react/react-dom under its nested
    // node_modules. Force both to resolve to this app's single copy so two
    // React instances never end up mounted in the same tree.
    dedupe: ['react', 'react-dom'],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
