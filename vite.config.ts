import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const localEditorPlugin = (root: string): Plugin => ({
  name: 'atlas-local-staging-editor',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use('/__atlas-editor/staging', (request, response, next) => {
      if (request.method !== 'POST') {
        if (request.method === 'GET') {
          response.setHeader('Content-Type', 'application/json');
          response.end(JSON.stringify({ enabled: true }));
          return;
        }
        next();
        return;
      }

      let body = '';
      request.setEncoding('utf8');
      request.on('data', chunk => {
        body += chunk;
        if (body.length > 2_000_000) request.destroy();
      });
      request.on('end', async () => {
        try {
          const batch = JSON.parse(body) as {
            id?: string;
            workflowStatus?: string;
            humanReviewStatus?: string;
          };
          if (
            !batch.id ||
            !/^[a-z0-9][a-z0-9-]{2,120}$/i.test(batch.id) ||
            batch.workflowStatus !== 'staging' ||
            batch.humanReviewStatus !== 'pending'
          ) {
            throw new Error('Lot staging invalide ou déclaré relu.');
          }

          const allowedDirectory = path.resolve(root, 'content', 'staging', 'editor');
          const target = path.resolve(allowedDirectory, `${batch.id}.json`);
          if (!target.startsWith(`${allowedDirectory}${path.sep}`)) {
            throw new Error('Chemin staging refusé.');
          }
          await fs.mkdir(allowedDirectory, { recursive: true });
          const temporary = `${target}.${process.pid}.tmp`;
          await fs.writeFile(temporary, `${JSON.stringify(batch, null, 2)}\n`, {
            encoding: 'utf8',
            flag: 'wx'
          });
          await fs.rename(temporary, target);
          response.statusCode = 201;
          response.setHeader('Content-Type', 'application/json');
          response.end(
            JSON.stringify({
              path: path.relative(root, target).replaceAll(path.sep, '/')
            })
          );
        } catch (error) {
          response.statusCode = 400;
          response.setHeader('Content-Type', 'application/json');
          response.end(
            JSON.stringify({
              error:
                error instanceof Error
                  ? error.message
                  : 'Écriture staging impossible.'
            })
          );
        }
      });
    });
  }
});

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const editorEnabled =
    command === 'serve' &&
    (env.VITE_ENABLE_EDITOR === 'true' || mode === 'e2e');

  return {
  define: {
    __ATLAS_EDITOR_ENABLED__: JSON.stringify(editorEnabled)
  },
  plugins: [
    ...(editorEnabled ? [localEditorPlugin(process.cwd())] : []),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: [
        'favicon.ico',
        'favicon.svg',
        'apple-touch-icon-180x180.png'
      ],
      manifest: {
        id: '/',
        name: 'Atlas biblique interactif',
        short_name: 'Atlas biblique',
        description:
          'Étudiez les personnages, les événements et les lieux bibliques dans une frise chronologique et une carte interactives.',
        lang: 'fr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#f1f5f9',
        theme_color: '#0f172a',
        categories: ['education', 'reference'],
        prefer_related_applications: false,
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png'
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        shortcuts: [
          {
            name: 'Ouvrir la frise',
            short_name: 'Frise',
            url: '/?view=timeline',
            icons: [
              {
                src: 'pwa-192x192.png',
                sizes: '192x192',
                type: 'image/png'
              }
            ]
          },
          {
            name: 'Ouvrir la carte',
            short_name: 'Carte',
            url: '/?view=map',
            icons: [
              {
                src: 'pwa-192x192.png',
                sizes: '192x192',
                type: 'image/png'
              }
            ]
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        // Le corpus A7 et ses index déterministes dépassent légèrement la
        // limite Workbox de 2 Mio avant compression (environ 300 Kio gzip).
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: 'index.html',
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern:
              /^https:\/\/[a-d]\.basemaps\.cartocdn\.com\/light_all\/.*\.png$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'atlas-carto-tiles',
              cacheableResponse: {
                statuses: [0, 200]
              },
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 14
              }
            }
          },
          {
            urlPattern:
              /^https:\/\/tiles\.stadiamaps\.com\/tiles\/stamen_terrain_background\/.*\.png$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'atlas-relief-tiles',
              cacheableResponse: {
                statuses: [0, 200]
              },
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 14
              }
            }
          },
          {
            urlPattern:
              /^https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/leaflet\/.*\.(?:png|svg)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'atlas-leaflet-assets',
              cacheableResponse: {
                statuses: [0, 200]
              },
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url))
    }
  },
  server: {
    hmr: env.DISABLE_HMR !== 'true',
    watch: env.DISABLE_HMR === 'true' ? null : {}
  }
  };
});
