import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const destination = path.join(root, 'obsidian/dist/atlas-biblique');

export default defineConfig({
  define: { __ATLAS_EDITOR_ENABLED__: 'false', 'process.env.NODE_ENV': '"production"' },
  plugins: [{
    name: 'inline-sqlite-wasm',
    // Obsidian packages a single main.js. Vite's default WASM handling emits
    // an external file or treats '?inline' as JavaScript; encode it explicitly.
    async load(id:string) {
      if(!id.endsWith('/sql-wasm.wasm?inline'))return null;
      const binary=await readFile(id.slice(0,-'?inline'.length));
      const uri='data:application/wasm;base64,'+binary.toString('base64');
      return 'export default '+JSON.stringify(uri)+';';
    }
  },react(), tailwindcss(), {
    name: 'atlas-obsidian-package',
    async closeBundle() {
      await mkdir(destination, { recursive: true });
      for (const file of ['manifest.json', 'styles.css', 'README.md', 'THIRD-PARTY-NOTICES.txt']) await copyFile(path.join(root, 'obsidian', file), path.join(destination, file));
    }
  }],
  build: {
    outDir: destination, emptyOutDir: true, target: 'es2020', sourcemap: false,
    lib: { entry: path.join(root, 'obsidian/src/main.tsx'), formats: ['cjs'], fileName: () => 'main.js' },
    // The editor runs on Obsidian's CodeMirror singleton. Bundling another copy
    // would make Obsidian reject its decorations as foreign extensions.
    rollupOptions: { external: ['obsidian','@codemirror/view','@codemirror/state'], output: { exports: 'default', inlineDynamicImports: true } }
  }
});
