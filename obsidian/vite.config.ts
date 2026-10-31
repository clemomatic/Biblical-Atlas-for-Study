import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const destination = path.join(root, 'obsidian/dist/atlas-biblique');

export default defineConfig({
  define: { __ATLAS_EDITOR_ENABLED__: 'false', 'process.env.NODE_ENV': '"production"' },
  plugins: [react(), tailwindcss(), {
    name: 'atlas-obsidian-package',
    async closeBundle() {
      await mkdir(destination, { recursive: true });
      for (const file of ['manifest.json', 'styles.css', 'README.md', 'THIRD-PARTY-NOTICES.txt']) await copyFile(path.join(root, 'obsidian', file), path.join(destination, file));
    }
  }],
  build: {
    outDir: destination, emptyOutDir: true, target: 'es2020', sourcemap: false,
    lib: { entry: path.join(root, 'obsidian/src/main.tsx'), formats: ['cjs'], fileName: () => 'main.js' },
    rollupOptions: { external: ['obsidian'], output: { exports: 'default', inlineDynamicImports: true } }
  }
});
