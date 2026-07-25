import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createServer } from 'vite';

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
  'rome',
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
  'corinth',
  'cenchreae',
  'malta',
  'crete',
  'phoenix_crete',
  'cauda',
  'fair_havens',
  'gulf_syrtis',
  'cyrene',
  'carte-mermediterranee-b8',
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
  'ephesus',
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
  'antioch_syria',
  'salamis_cyprus',
  'cyprus',
  'paphos',
  'sidon',
  'damascus',
  'obi-tyre',
  'obi-ptolemais',
  'caesarea',
  'obi-aphek-2',
  'carte-pella-f6',
  'joppa',
  'obi-ashdod',
  'jerusalem',
  'obi-lod',
  'obi-gaza',
  'alexandria'
];

const christianExpansionSeedStart =
  christianExpansionSource.indexOf(
    'const SEEDS: ChristianExpansionPlaceSeed[]'
  );
const christianExpansionSeedEnd =
  christianExpansionSource.indexOf('\n];', christianExpansionSeedStart) + 3;
const christianExpansionSeedSource = christianExpansionSource.slice(
  christianExpansionSeedStart,
  christianExpansionSeedEnd
);
const christianExpansionSeedIds = [
  ...christianExpansionSeedSource.matchAll(/\bid: '([^']+)'/g)
].map(match => match[1]);
const christianExpansionSeedIdSet = new Set(christianExpansionSeedIds);

if (
  christianExpansionSeedIds.length !== christianExpansionSeedIdSet.size
) {
  const duplicateIds = christianExpansionSeedIds.filter(
    (placeId, index) =>
      christianExpansionSeedIds.indexOf(placeId) !== index
  );
  throw new Error(
    `Identifiant B13 dupliqué: ${[...new Set(duplicateIds)].join(', ')}`
  );
}

const unexpectedChristianExpansionIds = christianExpansionSeedIds.filter(
  placeId => !christianExpansionPlaceIds.includes(placeId)
);
if (
  christianExpansionSeedIds.length !== christianExpansionPlaceIds.length ||
  unexpectedChristianExpansionIds.length
) {
  throw new Error(
    `Le manifeste B13 et les seeds divergent: ` +
      `${christianExpansionSeedIds.length}/${christianExpansionPlaceIds.length}` +
      (unexpectedChristianExpansionIds.length
        ? `; IDs inattendus: ${unexpectedChristianExpansionIds.join(', ')}`
        : '')
  );
}

for (const placeId of christianExpansionPlaceIds) {
  if (!christianExpansionSeedIdSet.has(placeId)) {
    throw new Error(`Lieu de la carte B13 manquant: ${placeId}`);
  }
  if (
    !christianExpansionSource.includes(`${placeId}: [`) &&
    !christianExpansionSource.includes(`'${placeId}': [`)
  ) {
    throw new Error(`Coordonnée B13 vérifiée manquante: ${placeId}`);
  }
}

const christianExpansionSourcePixelCount = [
  ...christianExpansionSeedSource.matchAll(/\bsourcePixel:/g)
].length;
if (
  christianExpansionSourcePixelCount !== christianExpansionPlaceIds.length
) {
  throw new Error(
    `Chaque point d’intérêt B13 doit conserver son repère source: ` +
      `${christianExpansionSourcePixelCount}/${christianExpansionPlaceIds.length}.`
  );
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

const viteServer = await createServer({
  root: '.',
  configFile: false,
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'silent'
});

try {
  const { BIBLICAL_PLACES } = await viteServer.ssrLoadModule(
    '/src/data/mapData.ts'
  );
  const { B13_EXCLUDED_NON_POINT_FEATURES } =
    await viteServer.ssrLoadModule(
      '/src/data/christianExpansionPlaces.ts'
  );
  const mergedPlaceIds = BIBLICAL_PLACES.map(place => place.id);
  const duplicateMergedPlaceIds = mergedPlaceIds.filter(
    (placeId, index) => mergedPlaceIds.indexOf(placeId) !== index
  );

  if (duplicateMergedPlaceIds.length) {
    throw new Error(
      `Identifiants de lieux fusionnés dupliqués: ` +
        `${[...new Set(duplicateMergedPlaceIds)].join(', ')}`
    );
  }

  const missingMergedB13Places = christianExpansionPlaceIds.filter(
    placeId => {
      const place = BIBLICAL_PLACES.find(candidate => candidate.id === placeId);
      return (
        !place ||
        !place.mapReferences?.some(reference =>
          reference.startsWith('B13 ·')
        ) ||
        !place.sources?.some(
          source => source.id === 'wol-study-bible-map-b13'
        )
      );
    }
  );
  if (missingMergedB13Places.length) {
    throw new Error(
      `Lieux B13 absents ou privés de leur provenance après fusion: ` +
        `${missingMergedB13Places.join(', ')}`
    );
  }

  const excludedFeatureIds = B13_EXCLUDED_NON_POINT_FEATURES.map(
    feature => feature.id
  );
  if (
    excludedFeatureIds.length !== 27 ||
    new Set(excludedFeatureIds).size !== excludedFeatureIds.length
  ) {
    throw new Error(
      'Les 27 routes et territoires B13 exclus doivent conserver un ID stable unique.'
    );
  }

  const expectedMajorPlaceIds = [
    'rome',
    'athens',
    'corinth',
    'ephesus',
    'antioch_syria',
    'damascus',
    'jerusalem',
    'alexandria'
  ];
  const incorrectlyRankedMajorPlaces = expectedMajorPlaceIds.filter(
    placeId =>
      BIBLICAL_PLACES.find(place => place.id === placeId)?.mapLabelLevel !==
      'major'
  );
  if (incorrectlyRankedMajorPlaces.length) {
    throw new Error(
      `Villes majeures B13 mal hiérarchisées: ` +
        `${incorrectlyRankedMajorPlaces.join(', ')}`
    );
  }
} finally {
  await viteServer.close();
}

console.log(
  `Carte vérifiée: ${places.length} éléments, ` +
    `${insetPrimaryPositions} positions issues de l’encart, ` +
    `${representativePositions} positions représentatives, ` +
    `${expectedComplementaryPlaceIds.length} nouveaux repères des cartes B2/B3, ` +
    `${christianExpansionPlaceIds.length} repères de la carte B13, ` +
    '27 éléments non ponctuels inventoriés, ' +
    '0 référence OpenBible.'
);
