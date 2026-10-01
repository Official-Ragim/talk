import { build } from 'vite';

// Commit this bundle so GitHub Pages can serve the source without a build step.
await build({
  configFile: false,
  publicDir: false,
  build: {
    outDir: 'vendor',
    emptyOutDir: false,
    minify: true,
    license: { fileName: 'LICENSES.txt' },
    lib: { entry: 'scripts/transport.mjs', formats: ['es'], fileName: () => 'trystero.js' },
  },
});
