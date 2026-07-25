import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const repositoryRoot = process.cwd();
const filesToScan = [
  'README.md',
  'src/data/promisedLandPlaces.ts',
  'src/data/promisedLandMapPositions.generated.ts',
  'src/data/patriarchAndExodusPlaces.ts',
  'src/data/christianExpansionPlaces.ts'
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

const complementaryMapSource = scannedFiles.get(
  'src/data/patriarchAndExodusPlaces.ts'
);
const expectedComplementaryPlaceIds = [
  'ham_genesis14',
  'rehoboth_well',
  'bozrah_edom',
  'teman_edom',
  'avith_edom',
  'mount_moriah',
  'plain_shaveh_kiriathaim',
  'valley_siddim',
  'zoar_bela',
  'gomorrah',
  'admah',
  'zeboiim',
  'euphrates_river',
  'tigris_river',
  'wadi_egypt',
  'nile_river',
  'baal_zephon',
  'massah_meribah',
  'rithmah',
  'rimmon_perez',
  'libnah_exodus',
  'rissah',
  'kehelathah',
  'mount_shepher',
  'haradah',
  'makheloth',
  'tahath',
  'terah_station',
  'mithkah',
  'hashmonah',
  'moseroth',
  'bene_jaakan',
  'abronah',
  'meribah_kadesh',
  'dibon_gad',
  'zered_wadi'
];

for (const placeId of expectedComplementaryPlaceIds) {
  if (!complementaryMapSource.includes(`id: '${placeId}'`)) {
    throw new Error(`Lieu complémentaire manquant: ${placeId}`);
  }
}

const sourcePixelCount = [
  ...complementaryMapSource.matchAll(/\bsourcePixel:/g)
].length;
if (sourcePixelCount < expectedComplementaryPlaceIds.length) {
  throw new Error(
    `Chaque nouveau lieu complémentaire doit conserver son repère dans l’image source: ${sourcePixelCount}/${expectedComplementaryPlaceIds.length}.`
  );
}

const christianExpansionSource = scannedFiles.get(
  'src/data/christianExpansionPlaces.ts'
);
const christianExpansionPlaceIds = [
  'three_taverns',
  'market_of_appius',
  'puteoli',
  'dyrrachium',
  'apollonia_illyria',
  'brundisium',
  'neapolis_macedonia',
  'philippi',
  'amphipolis',
  'thessalonica',
  'berea',
  'apollonia_macedonia',
  'nicopolis',
  'rhegium',
  'sicily',
  'syracuse',
  'adriatic_sea',
  'athens',
  'cenchreae',
  'malta',
  'crete',
  'phoenix_crete',
  'cauda',
  'fair_havens',
  'gulf_syrtis',
  'cyrene',
  'black_sea',
  'samothrace',
  'troas',
  'adramyttium',
  'assos',
  'pergamum',
  'mytilene',
  'thyatira',
  'chios',
  'sardis',
  'smyrna',
  'philadelphia_asia',
  'antioch_pisidia',
  'samos',
  'laodicea',
  'colossae',
  'lystra',
  'iconium',
  'patmos',
  'miletus',
  'cos',
  'cnidus',
  'rhodes',
  'cape_salmone',
  'patara',
  'myra',
  'attalia',
  'perga',
  'derbe',
  'tarsus',
  'seleucia_pieria',
  'salamis_cyprus',
  'cyprus',
  'paphos',
  'alexandria'
];

for (const placeId of christianExpansionPlaceIds) {
  if (!christianExpansionSource.includes(`id: '${placeId}'`)) {
    throw new Error(`Lieu de la carte B13 manquant: ${placeId}`);
  }
  if (!christianExpansionSource.includes(`${placeId}: [`)) {
    throw new Error(`Coordonnée B13 vérifiée manquante: ${placeId}`);
  }
}

if (
  !christianExpansionSource.includes(
    "url: 'https://wol.jw.org/fr/wol/d/r30/lp-f/1001070234'"
  ) ||
  !christianExpansionSource.includes('const VERIFIED_COORDINATES')
) {
  throw new Error(
    'La provenance WOL et la méthode de report de la carte B13 doivent être documentées.'
  );
}
if (
  christianExpansionSource.includes('SOURCE_GEOREFERENCE') ||
  christianExpansionSource.includes('coordinatesFromSourcePixel')
) {
  throw new Error(
    'La projection linéaire B13 ne doit pas être réintroduite : elle décalait des repères côtiers.'
  );
}

console.log(
  `Carte vérifiée: ${places.length} éléments, ` +
    `${insetPrimaryPositions} positions issues de l’encart, ` +
    `${representativePositions} positions représentatives, ` +
    `${expectedComplementaryPlaceIds.length} nouveaux repères des cartes B2/B3, ` +
    `${christianExpansionPlaceIds.length} repères de la carte B13, ` +
    '0 référence OpenBible.'
);
