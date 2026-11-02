import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { strToU8, zipSync } from 'fflate';

const root = fileURLToPath(new URL('..', import.meta.url));
const manifest = JSON.parse(await readFile(path.join(root, 'obsidian/manifest.json'), 'utf8'));
const source = path.join(root, 'obsidian/dist', manifest.id);
const output = path.join(root, 'obsidian/artifacts');
const archive = {};
const checksums = [];
for (const file of ['main.js', 'manifest.json', 'styles.css', 'README.md', 'THIRD-PARTY-NOTICES.txt']) {
  const data = new Uint8Array(await readFile(path.join(source, file)));
  archive[`${manifest.id}/${file}`] = data;
  checksums.push(`${createHash('sha256').update(data).digest('hex')}  ${file}`);
}
const runtime = new TextDecoder().decode(archive[`${manifest.id}/main.js`]);
const dependencies = [...runtime.matchAll(/require\(["']([^"']+)["']\)/g)].map(match => match[1]);
if (dependencies.some(dependency => !['obsidian', '@codemirror/view'].includes(dependency))) throw new Error(`Unexpected runtime dependencies: ${dependencies.join(', ')}`);
if (/\bimport\s*\(/.test(runtime)) throw new Error('The plugin must not download JavaScript chunks at runtime.');
archive[`${manifest.id}/SHA256SUMS.txt`] = strToU8(`${checksums.join('\n')}\n`);
await mkdir(output, { recursive: true });
const zip = zipSync(archive, { level: 9 });
const filename = `${manifest.id}-${manifest.version}.zip`;
await writeFile(path.join(output, filename), zip);
await writeFile(path.join(output, 'Guide-installation-Atlas-Obsidian.md'), await readFile(path.join(root, 'obsidian/README.md')));
console.log(`Created ${filename} (${Math.round(zip.length / 1024)} KiB). All dependencies are bundled except Obsidian-provided APIs and CodeMirror.`);
