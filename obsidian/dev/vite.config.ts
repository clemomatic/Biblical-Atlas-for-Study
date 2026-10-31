import { defineConfig } from 'vite';
export default defineConfig({ cacheDir: 'node_modules/.vite-obsidian', server: { host: '127.0.0.1', port: 4273, strictPort: true }, optimizeDeps: { entries: ['obsidian/dev/index.html'], include: ['yaml'] } });
