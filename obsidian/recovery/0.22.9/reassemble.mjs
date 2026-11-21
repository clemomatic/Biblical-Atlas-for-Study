#!/usr/bin/env node
/**
 * Reassemble the exact archived JW Study Desk 0.22.9 assets.
 * No network, no Obsidian vault access, no original user data.
 *
 *   node reassemble.mjs --verify
 *   node reassemble.mjs --extract
 *
 * The readable JS is a formatter output from the shipped compiled bundle,
 * NOT a recovered TypeScript source tree.
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';

const directory = dirname(fileURLToPath(import.meta.url));
const files = [
  {
    folder: 'source-b64',
    prefix: 'part-',
    expectedParts: 30,
    expectedHash: '076aff9f6db09393a1b390009f466fe2d5cb217cc5f3b4175e0751576d371d64',
    decompress: true,
    output: 'main.recovered.js',
  },
  {
    folder: 'zip-b64',
    prefix: 'part-',
    expectedParts: 30,
    expectedHash: 'd8fea56c79809c6f39368d89c17adab785bf7a7f2c47803e54a81b0b2bb0fb6b',
    decompress: false,
    output: 'JW-Study-Desk-0.22.9-original.zip',
  },
];

function decodeParts(config) {
  const dir = join(directory, config.folder);
  if (!existsSync(dir)) throw new Error('Dossier absent : ' + config.folder);
  const names = readdirSync(dir).filter(name => /^part-\d{2}\.b64$/.test(name)).sort();
  if (names.length !== config.expectedParts) {
    throw new Error('Parties manquantes : ' + config.folder + ' (attendu ' + config.expectedParts + ', trouvé ' + names.length + ')');
  }
  const encoded = names.map((name, index) => {
    if (name !== 'part-' + String(index + 1).padStart(2, '0') + '.b64') {
      throw new Error('Partie incorrecte : ' + name);
    }
    const value = readFileSync(join(dir, name), 'utf8').trim();
    if (!value || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) throw new Error('Base64 invalide : ' + name);
    return value;
  }).join('');
  const data = Buffer.from(encoded, 'base64');
  const bytes = config.decompress ? gunzipSync(data) : data;
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (sha256 !== config.expectedHash) {
    throw new Error('Empreinte incompatible pour ' + config.output + ' : ' + sha256);
  }
  return bytes;
}

export function validateReleaseParts({ extract = false } = {}) {
  const results = [];
  for (const config of files) {
    if (!existsSync(join(directory, config.folder))) {
      results.push({ output: config.output, status: 'absent' });
      continue;
    }
    const bytes = decodeParts(config);
    if (extract) writeFileSync(join(directory, config.output), bytes);
    results.push({ output: config.output, status: 'verified', bytes: bytes.length, sha256: config.expectedHash });
  }
  return results;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const extract = process.argv.includes('--extract');
  const results = validateReleaseParts({ extract });
  for (const row of results) console.log(row.status.toUpperCase(), row.output, row.bytes ?? '');
  if (results.some(row => row.status !== 'verified')) process.exitCode = 1;
}
