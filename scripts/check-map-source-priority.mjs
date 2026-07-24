import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const repositoryRoot = process.cwd();
const filesToScan = [
  'README.md',
  'src/data/promisedLandPlaces.ts',
  'src/data/promisedLandMapPositions.generated.ts'
];
const forbiddenPatterns = [
  /openbible/i,
  /bible geocoding/i,
  /ancientId/,
  /ancientName/,
  /modernName/
];

const scannedFiles = new Map();
for (const relativePath of filesToScan) {
  const content = await fs.readFile(path.join(repositoryRoot, relativePath), 'utf8');
  scannedFiles.set(relativePath, content);
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(content)) {
      throw new Error(
        `Référence externe interdite dans ${relativePath}: ${pattern.source}`
      );
    }
  }
}

const seedSource = scannedFiles.get('src/data/promisedLandPlaces.ts');
const seedDeclaration = seedSource.indexOf('const SEEDS:');
const seedStart = seedSource.indexOf('= [', seedDeclaration) + 2;
const seedEnd = seedSource.indexOf('\n];', seedStart) + 2;
const places = JSON.parse(seedSource.slice(seedStart, seedEnd).replace(/,\s*]$/, ']'));

const positionSource = scannedFiles.get(
  'src/data/promisedLandMapPositions.generated.ts'
);
const positionDeclaration = positionSource.indexOf(
  'export const PROMISED_LAND_MAP_POSITIONS'
);
const positionStart = positionSource.indexOf('= {', positionDeclaration) + 2;
const positionEnd = positionSource.lastIndexOf('};') + 1;
const positions = JSON.parse(positionSource.slice(positionStart, positionEnd));

if (places.length !== 294) {
  throw new Error(
    `Le corpus « Terre promise » doit contenir 294 éléments, reçu: ${places.length}.`
  );
}
if (Object.keys(positions).length !== places.length) {
  throw new Error(
    `Chaque lieu doit posséder une position générée: ${Object.keys(positions).length}/${places.length}.`
  );
}

const ids = new Set();
let insetPrimaryPositions = 0;
let representativePositions = 0;

for (const place of places) {
  if (ids.has(place.id)) {
    throw new Error(`Identifiant de lieu dupliqué: ${place.id}`);
  }
  ids.add(place.id);

  if (!place.mapReferences?.length) {
    throw new Error(`Référence cartographique manquante: ${place.id}`);
  }

  const position = positions[place.id];
  if (!position) {
    throw new Error(`Provenance de coordonnée manquante: ${place.id}`);
  }
  const [width, height] = position.sourceImageSize || [];
  const [x, y] = position.sourcePixel || [];
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    x < 0 ||
    y < 0 ||
    x > width ||
    y > height
  ) {
    throw new Error(`Position source hors image ou invalide: ${place.id}`);
  }

  if (position.sourceMapId === 'good-land-jerusalem-inset') {
    insetPrimaryPositions += 1;
  }
  if (position.coordinatePrecision === 'representative') {
    representativePositions += 1;
  }
}

if (ids.has('obi-arimathea-d10') || ids.has('obi-geba-4-d10')) {
  throw new Error('Des doublons issus des anciennes correspondances sont encore présents.');
}
if (insetPrimaryPositions !== 24) {
  throw new Error(
    `L’encart de Jérusalem doit fournir 24 positions principales, reçu: ${insetPrimaryPositions}.`
  );
}
if (representativePositions !== 25) {
  throw new Error(
    `Le corpus doit conserver 25 positions naturelles représentatives, reçu: ${representativePositions}.`
  );
}

console.log(
  `Carte vérifiée: ${places.length} éléments, ` +
    `${insetPrimaryPositions} positions issues de l’encart, ` +
    `${representativePositions} positions représentatives, 0 référence OpenBible.`
);
