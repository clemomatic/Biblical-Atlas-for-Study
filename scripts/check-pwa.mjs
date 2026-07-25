import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const distDirectory = path.join(process.cwd(), 'dist');
const requiredFiles = [
  'index.html',
  'manifest.webmanifest',
  'sw.js',
  'favicon.ico',
  'favicon.svg',
  'apple-touch-icon-180x180.png',
  'pwa-192x192.png',
  'pwa-512x512.png',
  'maskable-icon-512x512.png'
];

const distFiles = await fs.readdir(distDirectory);
for (const requiredFile of requiredFiles) {
  if (!distFiles.includes(requiredFile)) {
    throw new Error(`Fichier PWA manquant dans dist : ${requiredFile}`);
  }
}
if (
  !distFiles.some(file => file.startsWith('workbox-') && file.endsWith('.js'))
) {
  throw new Error('Bundle Workbox manquant dans dist.');
}

const manifest = JSON.parse(
  await fs.readFile(path.join(distDirectory, 'manifest.webmanifest'), 'utf8')
);
const iconSizes = new Set(manifest.icons?.map(icon => icon.sizes));
const hasMaskableIcon = manifest.icons?.some(
  icon => icon.sizes === '512x512' && icon.purpose === 'maskable'
);

if (
  manifest.lang !== 'fr' ||
  manifest.display !== 'standalone' ||
  manifest.start_url !== '/' ||
  !iconSizes.has('192x192') ||
  !iconSizes.has('512x512') ||
  !hasMaskableIcon
) {
  throw new Error('Le manifeste PWA ne respecte pas les critères d’installation.');
}

const html = await fs.readFile(path.join(distDirectory, 'index.html'), 'utf8');
if (
  !html.includes('rel="manifest"') ||
  !html.includes('apple-touch-icon-180x180.png') ||
  !html.includes('name="theme-color"')
) {
  throw new Error('Les métadonnées PWA ne sont pas injectées dans index.html.');
}

console.log(
  'PWA vérifiée : manifeste français, service worker et icônes installables présents.'
);
