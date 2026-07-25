import {
  BiblicalMapCategory,
  BiblicalPlace,
  CertaintyLevel,
  MapLabelLevel,
  SourceReference
} from '../types';

type SourceMapId = 'map-5' | 'b2' | 'b3';

interface DocumentaryPlaceSeed {
  id: string;
  name: string;
  alternateNames?: string[];
  coordinates: [number, number];
  mapCategory: BiblicalMapCategory;
  mapLabelLevel: MapLabelLevel;
  mapReferences: string[];
  sourceMaps: SourceMapId[];
  coordinateSourceMap?: SourceMapId;
  sourcePixel?: [number, number];
  certainty: CertaintyLevel;
  coordinatePrecision: 'site' | 'representative' | 'approximate';
  biblicalReferences?: string[];
  territory?: string;
  notes?: string;
}

const SOURCE_MAPS: Record<
  SourceMapId,
  SourceReference & { documentaryReference: string }
> = {
  'map-5': {
    id: 'wol-good-land-patriarchs',
    label: 'Le monde des patriarches',
    url: 'https://wol.jw.org/fr/wol/d/r30/lp-f/1102003104',
    citation: 'Voyez le bon pays, p. 6-7, carte 5',
    documentaryReference:
      'Voyez le bon pays, « Le monde des patriarches », p. 6-7'
  },
  b2: {
    id: 'wol-study-bible-map-b2',
    label: 'La Genèse et les voyages des patriarches',
    url: 'https://wol.jw.org/fr/wol/d/r30/lp-f/1001070222',
    citation: 'Bible d’étude, appendice B2, carte 87',
    documentaryReference:
      'Bible d’étude, appendice B2 « La Genèse et les voyages des patriarches »'
  },
  b3: {
    id: 'wol-study-bible-map-b3',
    label: 'L’Exode',
    url: 'https://wol.jw.org/fr/wol/d/r30/lp-f/1001070223',
    citation: 'Bible d’étude, appendice B3, carte 89',
    documentaryReference: 'Bible d’étude, appendice B3 « L’Exode »'
  }
};

const SOURCE_MAP_IMAGE_SIZES: Record<SourceMapId, [number, number]> = {
  'map-5': [1320, 835],
  b2: [648, 468],
  b3: [1200, 1749]
};

const CATEGORY_LABELS: Partial<Record<BiblicalMapCategory, string>> = {
  'ancient-city': 'Centre urbain antique',
  'biblical-site': 'Lieu biblique',
  'exodus-stage': 'Étape de l’Exode'
};

const SEEDS: DocumentaryPlaceSeed[] = [
  // Grands centres et repères de la carte des patriarches.
  { id: 'ur', name: 'Ur en Chaldée', alternateNames: ['Our', 'Tell el-Muqayyar'], coordinates: [30.9628, 46.1031], mapCategory: 'ancient-city', mapLabelLevel: 'major', mapReferences: ['5 H4', 'B2 H5'], sourceMaps: ['map-5', 'b2'], certainty: 'probable', coordinatePrecision: 'site', biblicalReferences: ['Genèse 11:28', 'Genèse 11:31', 'Genèse 15:7'], territory: 'Chaldée' },
  { id: 'babylon', name: 'Babylone', alternateNames: ['Babel', 'Babil'], coordinates: [32.5422, 44.4211], mapCategory: 'ancient-city', mapLabelLevel: 'major', mapReferences: ['5 G3', 'B2 G4'], sourceMaps: ['map-5', 'b2'], certainty: 'certain', coordinatePrecision: 'site', biblicalReferences: ['Genèse 10:10', 'Genèse 11:9'], territory: 'Shinéar / Babylonie' },
  { id: 'haran', name: 'Harrân', alternateNames: ['Haran', 'Carrhes'], coordinates: [36.8647, 39.0253], mapCategory: 'ancient-city', mapLabelLevel: 'regional', mapReferences: ['5 E1', 'B2 E1'], sourceMaps: ['map-5', 'b2'], certainty: 'certain', coordinatePrecision: 'site', biblicalReferences: ['Genèse 11:31', 'Genèse 12:4', 'Genèse 28:10'], territory: 'Padân-Aram' },
  { id: 'carchemish', name: 'Karkemish', alternateNames: ['Carchemish', 'Jerablus'], coordinates: [36.8295, 38.0158], mapCategory: 'ancient-city', mapLabelLevel: 'regional', mapReferences: ['5 D1', 'B2 D1'], sourceMaps: ['map-5', 'b2'], certainty: 'certain', coordinatePrecision: 'site', biblicalReferences: ['2 Chroniques 35:20', 'Jérémie 46:2'], territory: 'Haute Mésopotamie' },
  { id: 'nineveh', name: 'Ninive', alternateNames: ['Nineveh', 'Kuyunjik'], coordinates: [36.3592, 43.1521], mapCategory: 'ancient-city', mapLabelLevel: 'major', mapReferences: ['5 G1', 'B2 G2'], sourceMaps: ['map-5', 'b2'], certainty: 'certain', coordinatePrecision: 'site', biblicalReferences: ['Genèse 10:11', 'Jonas 1:2'], territory: 'Assyrie' },
  { id: 'calah', name: 'Kalah', alternateNames: ['Calah', 'Nimroud'], coordinates: [35.9681, 43.3279], mapCategory: 'ancient-city', mapLabelLevel: 'study', mapReferences: ['B2 G3'], sourceMaps: ['b2'], certainty: 'certain', coordinatePrecision: 'site', biblicalReferences: ['Genèse 10:11', 'Genèse 10:12'], territory: 'Assyrie' },
  { id: 'asshur', name: 'Assour', alternateNames: ['Asshur', 'Qal’at Sherqat'], coordinates: [35.4563, 43.2605], mapCategory: 'ancient-city', mapLabelLevel: 'study', mapReferences: ['B2 G3'], sourceMaps: ['b2'], certainty: 'certain', coordinatePrecision: 'site', biblicalReferences: ['Genèse 10:11'], territory: 'Assyrie' },
  { id: 'mari', name: 'Mari', alternateNames: ['Tell Hariri'], coordinates: [34.5519, 40.8897], mapCategory: 'ancient-city', mapLabelLevel: 'regional', mapReferences: ['B2 F3'], sourceMaps: ['b2'], certainty: 'certain', coordinatePrecision: 'site', territory: 'Mésopotamie' },
  { id: 'erech', name: 'Érek', alternateNames: ['Erech', 'Uruk', 'Warka'], coordinates: [31.3222, 45.6361], mapCategory: 'ancient-city', mapLabelLevel: 'study', mapReferences: ['B2 G5'], sourceMaps: ['b2'], certainty: 'certain', coordinatePrecision: 'site', biblicalReferences: ['Genèse 10:10'], territory: 'Shinéar' },
  { id: 'aleppo', name: 'Alep', alternateNames: ['Halab'], coordinates: [36.2021, 37.1343], mapCategory: 'ancient-city', mapLabelLevel: 'study', mapReferences: ['B2 D1'], sourceMaps: ['b2'], certainty: 'certain', coordinatePrecision: 'site', territory: 'Syrie' },
  { id: 'ebla', name: 'Ébla', alternateNames: ['Tell Mardikh'], coordinates: [35.798, 36.798], mapCategory: 'ancient-city', mapLabelLevel: 'study', mapReferences: ['B2 D1'], sourceMaps: ['b2'], certainty: 'certain', coordinatePrecision: 'site', territory: 'Syrie' },
  { id: 'hamath', name: 'Hamath', alternateNames: ['Hama'], coordinates: [35.1318, 36.7578], mapCategory: 'ancient-city', mapLabelLevel: 'regional', mapReferences: ['B2 D2'], sourceMaps: ['b2'], certainty: 'certain', coordinatePrecision: 'site', biblicalReferences: ['Nombres 13:21', 'Josué 13:5'], territory: 'Syrie' },
  { id: 'tadmor', name: 'Tadmor', alternateNames: ['Palmyre'], coordinates: [34.5504, 38.273], mapCategory: 'ancient-city', mapLabelLevel: 'study', mapReferences: ['5 D2', 'B2 E2'], sourceMaps: ['map-5', 'b2'], certainty: 'certain', coordinatePrecision: 'site', biblicalReferences: ['2 Chroniques 8:4'], territory: 'Désert de Syrie' },
  { id: 'hoba', name: 'Hoba', coordinates: [33.74, 36.54], mapCategory: 'biblical-site', mapLabelLevel: 'local', mapReferences: ['5 D3', 'B2 D3'], sourceMaps: ['map-5', 'b2'], certainty: 'possible', coordinatePrecision: 'approximate', biblicalReferences: ['Genèse 14:15'], territory: 'Nord de Damas', notes: 'Localisation indicative : l’identification précise de Hoba demeure incertaine.' },
  { id: 'sidon', name: 'Sidon', alternateNames: ['Saïda'], coordinates: [33.5633, 35.369], mapCategory: 'ancient-city', mapLabelLevel: 'regional', mapReferences: ['B2 C3'], sourceMaps: ['b2'], certainty: 'certain', coordinatePrecision: 'site', biblicalReferences: ['Genèse 10:19', 'Josué 11:8'], territory: 'Phénicie' },
  { id: 'damascus', name: 'Damas', coordinates: [33.5138, 36.2765], mapCategory: 'ancient-city', mapLabelLevel: 'major', mapReferences: ['5 C3', 'B2 D3'], sourceMaps: ['map-5', 'b2'], certainty: 'certain', coordinatePrecision: 'site', biblicalReferences: ['Genèse 14:15', 'Actes 9:2'], territory: 'Aram / Syrie' },
  { id: 'memphis', name: 'Memphis', alternateNames: ['Noph'], coordinates: [29.8492, 31.2543], mapCategory: 'ancient-city', mapLabelLevel: 'major', mapReferences: ['B2 B5', 'B3 B8'], sourceMaps: ['b2', 'b3'], certainty: 'certain', coordinatePrecision: 'site', biblicalReferences: ['Isaïe 19:13', 'Jérémie 46:14'], territory: 'Égypte' },
  { id: 'on_egypt', name: 'Ôn', alternateNames: ['Héliopolis'], coordinates: [30.129, 31.306], mapCategory: 'ancient-city', mapLabelLevel: 'study', mapReferences: ['B2 B5'], sourceMaps: ['b2'], certainty: 'certain', coordinatePrecision: 'site', biblicalReferences: ['Genèse 41:45', 'Genèse 46:20'], territory: 'Égypte' },
  { id: 'ramses', name: 'Ramsès', alternateNames: ['Raamsès', 'Pi-Ramsès'], coordinates: [30.793, 31.836], mapCategory: 'ancient-city', mapLabelLevel: 'regional', mapReferences: ['B2 B5', 'B3 C8'], sourceMaps: ['b2', 'b3'], certainty: 'probable', coordinatePrecision: 'representative', biblicalReferences: ['Exode 1:11', 'Exode 12:37', 'Nombres 33:3'], territory: 'Goshèn', notes: 'Coordonnée représentative de la région proposée pour Pi-Ramsès.' },
  { id: 'goshen', name: 'Goshèn', alternateNames: ['Goshen'], coordinates: [30.75, 31.85], mapCategory: 'biblical-site', mapLabelLevel: 'regional', mapReferences: ['5 A4', 'B2 B5', 'B3 B8'], sourceMaps: ['map-5', 'b2', 'b3'], certainty: 'probable', coordinatePrecision: 'representative', biblicalReferences: ['Genèse 45:10', 'Genèse 47:27'], territory: 'Égypte', notes: 'Point représentatif d’une région, et non d’une ville unique.' },
  { id: 'beer_lahai_roi', name: 'Béer-Lahaï-Roï', alternateNames: ['Puits de Lahaï-Roï'], coordinates: [30.74, 34.42], mapCategory: 'spring', mapLabelLevel: 'study', mapReferences: ['B2 B6'], sourceMaps: ['b2'], certainty: 'possible', coordinatePrecision: 'approximate', biblicalReferences: ['Genèse 16:14', 'Genèse 24:62', 'Genèse 25:11'], territory: 'Néguev' },
  {
    id: 'ham_genesis14',
    name: 'Ham',
    alternateNames: ['Ham de Genèse 14'],
    coordinates: [32.65, 35.8],
    mapCategory: 'biblical-site',
    mapLabelLevel: 'local',
    mapReferences: ['B2 C4'],
    sourceMaps: ['b2'],
    sourcePixel: [213, 290],
    certainty: 'possible',
    coordinatePrecision: 'approximate',
    biblicalReferences: ['Genèse 14:5'],
    territory: 'À l’est du Jourdain'
  },
  {
    id: 'rehoboth_well',
    name: 'Puits de Rehoboth',
    alternateNames: ['Rehoboth'],
    coordinates: [31, 34.55],
    mapCategory: 'spring',
    mapLabelLevel: 'study',
    mapReferences: ['B2 B5'],
    sourceMaps: ['b2'],
    sourcePixel: [164, 371],
    certainty: 'possible',
    coordinatePrecision: 'approximate',
    biblicalReferences: ['Genèse 26:22'],
    territory: 'Néguev'
  },
  {
    id: 'bozrah_edom',
    name: 'Bozra',
    alternateNames: ['Botsra'],
    coordinates: [30.734, 35.607],
    mapCategory: 'ancient-city',
    mapLabelLevel: 'study',
    mapReferences: ['B2 C5'],
    sourceMaps: ['b2'],
    sourcePixel: [204, 371],
    certainty: 'probable',
    coordinatePrecision: 'representative',
    biblicalReferences: ['Genèse 36:33'],
    territory: 'Édom'
  },
  {
    id: 'teman_edom',
    name: 'Témân',
    alternateNames: ['Téman'],
    coordinates: [30.2, 35.6],
    mapCategory: 'biblical-site',
    mapLabelLevel: 'local',
    mapReferences: ['B2 C5'],
    sourceMaps: ['b2'],
    sourcePixel: [211, 386],
    certainty: 'possible',
    coordinatePrecision: 'approximate',
    biblicalReferences: ['Genèse 36:34', 'Jérémie 49:7'],
    territory: 'Édom'
  },
  {
    id: 'avith_edom',
    name: 'Avith',
    coordinates: [29.75, 35.25],
    mapCategory: 'biblical-site',
    mapLabelLevel: 'local',
    mapReferences: ['B2 C6'],
    sourceMaps: ['b2'],
    sourcePixel: [196, 400],
    certainty: 'possible',
    coordinatePrecision: 'approximate',
    biblicalReferences: ['Genèse 36:35'],
    territory: 'Édom'
  },
  {
    id: 'mount_moriah',
    name: 'Mont Moria',
    alternateNames: ['Moriya'],
    coordinates: [31.778, 35.235],
    mapCategory: 'summit',
    mapLabelLevel: 'regional',
    mapReferences: ['B2 D5'],
    sourceMaps: ['map-5', 'b2'],
    coordinateSourceMap: 'b2',
    sourcePixel: [403, 337],
    certainty: 'probable',
    coordinatePrecision: 'representative',
    biblicalReferences: ['Genèse 22:2', '2 Chroniques 3:1'],
    territory: 'Jérusalem'
  },
  {
    id: 'plain_shaveh_kiriathaim',
    name: 'Plaine de Shavé-Kiriataïm',
    coordinates: [31.55, 35.65],
    mapCategory: 'biblical-site',
    mapLabelLevel: 'local',
    mapReferences: ['B2 E5'],
    sourceMaps: ['b2'],
    sourcePixel: [451, 380],
    certainty: 'possible',
    coordinatePrecision: 'approximate',
    biblicalReferences: ['Genèse 14:5'],
    territory: 'À l’est de la mer Salée'
  },
  {
    id: 'valley_siddim',
    name: 'Vallée de Siddim',
    coordinates: [31.2, 35.55],
    mapCategory: 'biblical-site',
    mapLabelLevel: 'study',
    mapReferences: ['B2 E6'],
    sourceMaps: ['b2'],
    sourcePixel: [431, 421],
    certainty: 'possible',
    coordinatePrecision: 'approximate',
    biblicalReferences: ['Genèse 14:3', 'Genèse 14:8'],
    territory: 'Région de la mer Salée',
    notes:
      'Point représentatif de la vallée figurée sur la carte B2 ; ses limites et son emplacement exact ne sont pas établis.'
  },
  {
    id: 'zoar_bela',
    name: 'Zoar',
    alternateNames: ['Béla'],
    coordinates: [30.92, 35.46],
    mapCategory: 'ancient-city',
    mapLabelLevel: 'regional',
    mapReferences: ['B2 E6'],
    sourceMaps: ['b2'],
    sourcePixel: [430, 432],
    certainty: 'possible',
    coordinatePrecision: 'approximate',
    biblicalReferences: ['Genèse 14:2', 'Genèse 19:22'],
    territory: 'Région de la mer Salée'
  },
  {
    id: 'gomorrah',
    name: 'Gomorrhe',
    coordinates: [31.17, 35.48],
    mapCategory: 'ancient-city',
    mapLabelLevel: 'study',
    mapReferences: ['B2 E6'],
    sourceMaps: ['b2'],
    sourcePixel: [444, 413],
    certainty: 'possible',
    coordinatePrecision: 'approximate',
    biblicalReferences: ['Genèse 14:2', 'Genèse 19:24'],
    territory: 'Région de la mer Salée',
    notes:
      'Le point d’interrogation de la carte source est conservé par un degré de certitude « possible ».'
  },
  {
    id: 'admah',
    name: 'Adma',
    coordinates: [31.35, 35.55],
    mapCategory: 'ancient-city',
    mapLabelLevel: 'local',
    mapReferences: ['B2 E6'],
    sourceMaps: ['b2'],
    sourcePixel: [444, 421],
    certainty: 'possible',
    coordinatePrecision: 'approximate',
    biblicalReferences: ['Genèse 14:2', 'Deutéronome 29:23'],
    territory: 'Région de la mer Salée',
    notes:
      'Le point d’interrogation de la carte source est conservé par un degré de certitude « possible ».'
  },
  {
    id: 'zeboiim',
    name: 'Zeboïm',
    alternateNames: ['Tseboïm'],
    coordinates: [31.42, 35.58],
    mapCategory: 'ancient-city',
    mapLabelLevel: 'local',
    mapReferences: ['B2 E6'],
    sourceMaps: ['b2'],
    sourcePixel: [444, 429],
    certainty: 'possible',
    coordinatePrecision: 'approximate',
    biblicalReferences: ['Genèse 14:2', 'Deutéronome 29:23'],
    territory: 'Région de la mer Salée',
    notes:
      'Le point d’interrogation de la carte source est conservé par un degré de certitude « possible ».'
  },
  {
    id: 'euphrates_river',
    name: 'Euphrate',
    coordinates: [34.3, 40.5],
    mapCategory: 'river',
    mapLabelLevel: 'major',
    mapReferences: ['5 E2', 'B2 E2'],
    sourceMaps: ['map-5', 'b2'],
    coordinateSourceMap: 'b2',
    sourcePixel: [420, 170],
    certainty: 'certain',
    coordinatePrecision: 'representative',
    biblicalReferences: ['Genèse 2:14', 'Genèse 15:18'],
    notes:
      'Point représentatif du cours d’eau destiné à son libellé cartographique, et non à représenter toute sa géométrie.'
  },
  {
    id: 'tigris_river',
    name: 'Hiddékel',
    alternateNames: ['Tigre'],
    coordinates: [34.8, 43.3],
    mapCategory: 'river',
    mapLabelLevel: 'major',
    mapReferences: ['5 F2', 'B2 G2'],
    sourceMaps: ['map-5', 'b2'],
    coordinateSourceMap: 'b2',
    sourcePixel: [520, 180],
    certainty: 'certain',
    coordinatePrecision: 'representative',
    biblicalReferences: ['Genèse 2:14', 'Daniel 10:4'],
    notes:
      'Point représentatif du cours d’eau destiné à son libellé cartographique, et non à représenter toute sa géométrie.'
  },
  {
    id: 'wadi_egypt',
    name: 'Oued d’Égypte',
    alternateNames: ['Torrent d’Égypte'],
    coordinates: [31, 34.3],
    mapCategory: 'wadi',
    mapLabelLevel: 'regional',
    mapReferences: ['B2 B5'],
    sourceMaps: ['b2'],
    sourcePixel: [156, 355],
    certainty: 'probable',
    coordinatePrecision: 'representative',
    biblicalReferences: ['Nombres 34:5', 'Josué 15:4']
  },
  {
    id: 'nile_river',
    name: 'Nil',
    coordinates: [30.3, 31.25],
    mapCategory: 'river',
    mapLabelLevel: 'major',
    mapReferences: ['B2 A6', 'B3 A8'],
    sourceMaps: ['b2', 'b3'],
    coordinateSourceMap: 'b2',
    sourcePixel: [34, 410],
    certainty: 'certain',
    coordinatePrecision: 'representative',
    biblicalReferences: ['Genèse 41:1', 'Exode 7:17'],
    notes:
      'Point représentatif du cours d’eau destiné à son libellé cartographique, et non à représenter toute sa géométrie.'
  },

  // Étapes et repères de la carte B3. Les points interrogatifs de la source
  // sont conservés comme localisations possibles et coordonnées approximatives.
  { id: 'succoth_exodus', name: 'Soukkot (Exode)', alternateNames: ['Succoth'], coordinates: [30.55, 32.1], mapCategory: 'exodus-stage', mapLabelLevel: 'study', mapReferences: ['B3 C8'], sourceMaps: ['b3'], certainty: 'possible', coordinatePrecision: 'approximate', biblicalReferences: ['Exode 12:37', 'Nombres 33:5'], territory: 'Égypte orientale' },
  { id: 'etham_exodus', name: 'Étham', coordinates: [30.22, 32.37], mapCategory: 'exodus-stage', mapLabelLevel: 'local', mapReferences: ['B3 C8'], sourceMaps: ['b3'], certainty: 'possible', coordinatePrecision: 'approximate', biblicalReferences: ['Exode 13:20', 'Nombres 33:6'], territory: 'Désert d’Étham' },
  { id: 'migdol_exodus', name: 'Migdol', coordinates: [30.08, 32.53], mapCategory: 'exodus-stage', mapLabelLevel: 'local', mapReferences: ['B3 C8'], sourceMaps: ['b3'], certainty: 'possible', coordinatePrecision: 'approximate', biblicalReferences: ['Exode 14:2', 'Nombres 33:7'], territory: 'Égypte orientale' },
  { id: 'pi_hahiroth', name: 'Pi-Hahiroth', coordinates: [29.98, 32.58], mapCategory: 'exodus-stage', mapLabelLevel: 'local', mapReferences: ['B3 C8'], sourceMaps: ['b3'], certainty: 'possible', coordinatePrecision: 'approximate', biblicalReferences: ['Exode 14:2', 'Nombres 33:7'], territory: 'Égypte orientale' },
  { id: 'red_sea', name: 'Mer Rouge', coordinates: [29.72, 32.65], mapCategory: 'body-of-water', mapLabelLevel: 'regional', mapReferences: ['B3 C8'], sourceMaps: ['b3'], certainty: 'unknown', coordinatePrecision: 'representative', biblicalReferences: ['Exode 14:21', 'Exode 15:4'], notes: 'Point représentatif : la carte présente plusieurs tracés possibles pour la sortie d’Égypte.' },
  { id: 'marah', name: 'Mara', alternateNames: ['Marah'], coordinates: [29.25, 32.96], mapCategory: 'exodus-stage', mapLabelLevel: 'study', mapReferences: ['B3 C8'], sourceMaps: ['b3'], certainty: 'possible', coordinatePrecision: 'approximate', biblicalReferences: ['Exode 15:23', 'Nombres 33:8'] },
  { id: 'elim', name: 'Élim', coordinates: [29.08, 33.0], mapCategory: 'exodus-stage', mapLabelLevel: 'study', mapReferences: ['B3 C8'], sourceMaps: ['b3'], certainty: 'possible', coordinatePrecision: 'approximate', biblicalReferences: ['Exode 15:27', 'Nombres 33:9'] },
  { id: 'dophkah', name: 'Dofqa', alternateNames: ['Dophkah'], coordinates: [28.93, 33.18], mapCategory: 'exodus-stage', mapLabelLevel: 'local', mapReferences: ['B3 C9'], sourceMaps: ['b3'], certainty: 'possible', coordinatePrecision: 'approximate', biblicalReferences: ['Nombres 33:12'] },
  { id: 'alush', name: 'Aloush', alternateNames: ['Alush'], coordinates: [28.78, 33.42], mapCategory: 'exodus-stage', mapLabelLevel: 'local', mapReferences: ['B3 C9'], sourceMaps: ['b3'], certainty: 'possible', coordinatePrecision: 'approximate', biblicalReferences: ['Nombres 33:13'] },
  { id: 'rephidim', name: 'Refidim', alternateNames: ['Rephidim'], coordinates: [28.72, 33.63], mapCategory: 'exodus-stage', mapLabelLevel: 'study', mapReferences: ['B3 C9'], sourceMaps: ['b3'], certainty: 'possible', coordinatePrecision: 'approximate', biblicalReferences: ['Exode 17:1', 'Nombres 33:14'] },
  { id: 'sinai', name: 'Mont Sinaï / Horeb', coordinates: [28.5394, 33.9753], mapCategory: 'summit', mapLabelLevel: 'major', mapReferences: ['B3 D10'], sourceMaps: ['b3'], certainty: 'possible', coordinatePrecision: 'representative', biblicalReferences: ['Exode 19:2', 'Nombres 10:12'], territory: 'Désert du Sinaï', notes: 'La coordonnée suit l’emplacement représentatif de la carte ; l’identification du mont reste discutée.' },
  { id: 'taberah', name: 'Tabéra', coordinates: [28.92, 34.28], mapCategory: 'exodus-stage', mapLabelLevel: 'local', mapReferences: ['B3 D9'], sourceMaps: ['b3'], certainty: 'possible', coordinatePrecision: 'approximate', biblicalReferences: ['Nombres 11:3'] },
  { id: 'kibroth_hattaavah', name: 'Kibroth-Hattaava', coordinates: [29.06, 34.43], mapCategory: 'exodus-stage', mapLabelLevel: 'local', mapReferences: ['B3 D9'], sourceMaps: ['b3'], certainty: 'possible', coordinatePrecision: 'approximate', biblicalReferences: ['Nombres 11:34', 'Nombres 33:16'] },
  { id: 'hazeroth_exodus', name: 'Hatséroth', alternateNames: ['Hazeroth'], coordinates: [29.25, 34.62], mapCategory: 'exodus-stage', mapLabelLevel: 'study', mapReferences: ['B3 D9'], sourceMaps: ['b3'], certainty: 'possible', coordinatePrecision: 'approximate', biblicalReferences: ['Nombres 11:35', 'Nombres 33:17'] },
  { id: 'kadesh_barnea', name: 'Kadèsh-Barnéa', alternateNames: ['Kadèsh', 'Aïn Qudeirat'], coordinates: [30.648, 34.425], mapCategory: 'biblical-site', mapLabelLevel: 'regional', mapReferences: ['B3 D5'], sourceMaps: ['b3'], certainty: 'probable', coordinatePrecision: 'representative', biblicalReferences: ['Nombres 13:26', 'Nombres 20:1', 'Deutéronome 1:19'] },
  { id: 'ezion_geber', name: 'Étsiôn-Guéber', alternateNames: ['Ezion-geber'], coordinates: [29.54, 34.98], mapCategory: 'biblical-site', mapLabelLevel: 'regional', mapReferences: ['B3 E8'], sourceMaps: ['b3'], certainty: 'probable', coordinatePrecision: 'representative', biblicalReferences: ['Nombres 33:35', '1 Rois 9:26'] },
  { id: 'elath', name: 'Élath', alternateNames: ['Éloth'], coordinates: [29.55, 34.95], mapCategory: 'ancient-city', mapLabelLevel: 'regional', mapReferences: ['B2 D6', 'B3 E8'], sourceMaps: ['b2', 'b3'], certainty: 'probable', coordinatePrecision: 'representative', biblicalReferences: ['Deutéronome 2:8', '1 Rois 9:26'] },
  { id: 'jotbathah', name: 'Yotbatha', alternateNames: ['Jotbathah'], coordinates: [29.78, 35.03], mapCategory: 'exodus-stage', mapLabelLevel: 'local', mapReferences: ['B3 E7'], sourceMaps: ['b3'], certainty: 'possible', coordinatePrecision: 'approximate', biblicalReferences: ['Nombres 33:33', 'Deutéronome 10:7'] },
  { id: 'hor_haggidgad', name: 'Hor-Haguidgad', alternateNames: ['Goudgoda'], coordinates: [30.08, 35.08], mapCategory: 'exodus-stage', mapLabelLevel: 'local', mapReferences: ['B3 E7'], sourceMaps: ['b3'], certainty: 'possible', coordinatePrecision: 'approximate', biblicalReferences: ['Nombres 33:32', 'Deutéronome 10:7'] },
  { id: 'mount_hor', name: 'Mont Hor', alternateNames: ['Djebel Haroun'], coordinates: [30.316, 35.407], mapCategory: 'summit', mapLabelLevel: 'regional', mapReferences: ['B3 F5'], sourceMaps: ['b3'], certainty: 'probable', coordinatePrecision: 'representative', biblicalReferences: ['Nombres 20:22', 'Nombres 33:37'] },
  { id: 'zalmonah', name: 'Tsalmona', alternateNames: ['Zalmonah'], coordinates: [30.48, 35.32], mapCategory: 'exodus-stage', mapLabelLevel: 'local', mapReferences: ['B3 F5'], sourceMaps: ['b3'], certainty: 'possible', coordinatePrecision: 'approximate', biblicalReferences: ['Nombres 33:41'] },
  { id: 'punon', name: 'Pounôn', alternateNames: ['Punon'], coordinates: [30.62, 35.5], mapCategory: 'exodus-stage', mapLabelLevel: 'study', mapReferences: ['B3 F5'], sourceMaps: ['b3'], certainty: 'probable', coordinatePrecision: 'representative', biblicalReferences: ['Nombres 33:42'] },
  { id: 'oboth', name: 'Oboth', coordinates: [30.8, 35.48], mapCategory: 'exodus-stage', mapLabelLevel: 'local', mapReferences: ['B3 F4'], sourceMaps: ['b3'], certainty: 'possible', coordinatePrecision: 'approximate', biblicalReferences: ['Nombres 21:10', 'Nombres 33:43'] },
  { id: 'iye_abarim', name: 'Iyé-Abarim', coordinates: [31.02, 35.6], mapCategory: 'exodus-stage', mapLabelLevel: 'local', mapReferences: ['B3 F4'], sourceMaps: ['b3'], certainty: 'possible', coordinatePrecision: 'approximate', biblicalReferences: ['Nombres 21:11', 'Nombres 33:44'] },
  { id: 'plains_moab', name: 'Plaines de Moab', coordinates: [31.82, 35.63], mapCategory: 'biblical-site', mapLabelLevel: 'regional', mapReferences: ['B3 F2'], sourceMaps: ['b3'], certainty: 'certain', coordinatePrecision: 'representative', biblicalReferences: ['Nombres 22:1', 'Nombres 33:48'], territory: 'Moab', notes: 'Point représentatif d’une zone géographique.' },
  { id: 'abel_shittim', name: 'Abel-Shittim', alternateNames: ['Shittim'], coordinates: [31.86, 35.64], mapCategory: 'exodus-stage', mapLabelLevel: 'study', mapReferences: ['B3 F2'], sourceMaps: ['b3'], certainty: 'possible', coordinatePrecision: 'representative', biblicalReferences: ['Nombres 25:1', 'Nombres 33:49'] },
  {
    id: 'baal_zephon',
    name: 'Baal-Zefôn',
    alternateNames: ['Baal-Zephon'],
    coordinates: [29.75, 32.4],
    mapCategory: 'exodus-stage',
    mapLabelLevel: 'study',
    mapReferences: ['B3 B8'],
    sourceMaps: ['b3'],
    sourcePixel: [270, 1157],
    certainty: 'possible',
    coordinatePrecision: 'approximate',
    biblicalReferences: ['Exode 14:2', 'Nombres 33:7'],
    territory: 'Égypte orientale'
  },
  {
    id: 'massah_meribah',
    name: 'Massa et Meriba',
    coordinates: [28.68, 33.88],
    mapCategory: 'exodus-stage',
    mapLabelLevel: 'study',
    mapReferences: ['B3 D10'],
    sourceMaps: ['b3'],
    sourcePixel: [638, 1387],
    certainty: 'possible',
    coordinatePrecision: 'approximate',
    biblicalReferences: ['Exode 17:7', 'Deutéronome 6:16'],
    territory: 'Désert du Sinaï'
  },
  {
    id: 'rithmah',
    name: 'Ritma',
    alternateNames: ['Rithmah'],
    coordinates: [29.3, 34.55],
    mapCategory: 'exodus-stage',
    mapLabelLevel: 'local',
    mapReferences: ['B3 D9'],
    sourceMaps: ['b3'],
    sourcePixel: [779, 1241],
    certainty: 'possible',
    coordinatePrecision: 'approximate',
    biblicalReferences: ['Nombres 33:18']
  },
  {
    id: 'rimmon_perez',
    name: 'Rimôn-Pérez',
    alternateNames: ['Rimmon-Pérets'],
    coordinates: [29.35, 34.75],
    mapCategory: 'exodus-stage',
    mapLabelLevel: 'local',
    mapReferences: ['B3 E8'],
    sourceMaps: ['b3'],
    sourcePixel: [818, 1204],
    certainty: 'possible',
    coordinatePrecision: 'approximate',
    biblicalReferences: ['Nombres 33:19']
  },
  {
    id: 'libnah_exodus',
    name: 'Libna (Exode)',
    coordinates: [29.66, 34.8],
    mapCategory: 'exodus-stage',
    mapLabelLevel: 'local',
    mapReferences: ['B3 E8'],
    sourceMaps: ['b3'],
    sourcePixel: [797, 1108],
    certainty: 'possible',
    coordinatePrecision: 'approximate',
    biblicalReferences: ['Nombres 33:20'],
    notes:
      'Cette étape de l’Exode est distinguée par son identifiant de la ville de Libna située en Juda.'
  },
  {
    id: 'rissah',
    name: 'Rissa',
    coordinates: [29.92, 34.82],
    mapCategory: 'exodus-stage',
    mapLabelLevel: 'local',
    mapReferences: ['B3 E7'],
    sourceMaps: ['b3'],
    sourcePixel: [806, 1051],
    certainty: 'possible',
    coordinatePrecision: 'approximate',
    biblicalReferences: ['Nombres 33:21']
  },
  {
    id: 'kehelathah',
    name: 'Kehélata',
    alternateNames: ['Kehelathah'],
    coordinates: [29.4, 34.68],
    mapCategory: 'exodus-stage',
    mapLabelLevel: 'local',
    mapReferences: ['B3 E7'],
    sourceMaps: ['b3'],
    sourcePixel: [784, 1125],
    certainty: 'possible',
    coordinatePrecision: 'approximate',
    biblicalReferences: ['Nombres 33:22']
  },
  {
    id: 'mount_shepher',
    name: 'Mont Shéfèr',
    alternateNames: ['Mont Shépher'],
    coordinates: [29.49, 34.66],
    mapCategory: 'summit',
    mapLabelLevel: 'local',
    mapReferences: ['B3 E7'],
    sourceMaps: ['b3'],
    sourcePixel: [783, 1105],
    certainty: 'possible',
    coordinatePrecision: 'approximate',
    biblicalReferences: ['Nombres 33:23']
  },
  {
    id: 'haradah',
    name: 'Harada',
    alternateNames: ['Haradah'],
    coordinates: [29.58, 34.64],
    mapCategory: 'exodus-stage',
    mapLabelLevel: 'local',
    mapReferences: ['B3 E7'],
    sourceMaps: ['b3'],
    sourcePixel: [782, 1085],
    certainty: 'possible',
    coordinatePrecision: 'approximate',
    biblicalReferences: ['Nombres 33:24']
  },
  {
    id: 'makheloth',
    name: 'Makéloth',
    alternateNames: ['Makheloth'],
    coordinates: [29.67, 34.62],
    mapCategory: 'exodus-stage',
    mapLabelLevel: 'local',
    mapReferences: ['B3 E7'],
    sourceMaps: ['b3'],
    sourcePixel: [781, 1065],
    certainty: 'possible',
    coordinatePrecision: 'approximate',
    biblicalReferences: ['Nombres 33:25']
  },
  {
    id: 'tahath',
    name: 'Taath',
    alternateNames: ['Tahath'],
    coordinates: [29.76, 34.6],
    mapCategory: 'exodus-stage',
    mapLabelLevel: 'local',
    mapReferences: ['B3 E7'],
    sourceMaps: ['b3'],
    sourcePixel: [780, 1045],
    certainty: 'possible',
    coordinatePrecision: 'approximate',
    biblicalReferences: ['Nombres 33:26']
  },
  {
    id: 'terah_station',
    name: 'Téra (étape)',
    alternateNames: ['Térah'],
    coordinates: [29.85, 34.58],
    mapCategory: 'exodus-stage',
    mapLabelLevel: 'local',
    mapReferences: ['B3 E7'],
    sourceMaps: ['b3'],
    sourcePixel: [779, 1025],
    certainty: 'possible',
    coordinatePrecision: 'approximate',
    biblicalReferences: ['Nombres 33:27'],
    notes:
      'L’identifiant distingue cette étape du personnage Téra, père d’Abraham.'
  },
  {
    id: 'mithkah',
    name: 'Mitka',
    alternateNames: ['Mithkah'],
    coordinates: [29.94, 34.56],
    mapCategory: 'exodus-stage',
    mapLabelLevel: 'local',
    mapReferences: ['B3 E7'],
    sourceMaps: ['b3'],
    sourcePixel: [777, 1005],
    certainty: 'possible',
    coordinatePrecision: 'approximate',
    biblicalReferences: ['Nombres 33:28']
  },
  {
    id: 'hashmonah',
    name: 'Hashmona',
    alternateNames: ['Hashmonah'],
    coordinates: [30.03, 34.54],
    mapCategory: 'exodus-stage',
    mapLabelLevel: 'local',
    mapReferences: ['B3 E7'],
    sourceMaps: ['b3'],
    sourcePixel: [775, 985],
    certainty: 'possible',
    coordinatePrecision: 'approximate',
    biblicalReferences: ['Nombres 33:29']
  },
  {
    id: 'moseroth',
    name: 'Mosséroth',
    alternateNames: ['Moseroth'],
    coordinates: [30.12, 34.52],
    mapCategory: 'exodus-stage',
    mapLabelLevel: 'local',
    mapReferences: ['B3 E7'],
    sourceMaps: ['b3'],
    sourcePixel: [773, 965],
    certainty: 'possible',
    coordinatePrecision: 'approximate',
    biblicalReferences: ['Nombres 33:30']
  },
  {
    id: 'bene_jaakan',
    name: 'Bené-Jaakân',
    alternateNames: ['Bene-Jaakan'],
    coordinates: [30.3, 34.6],
    mapCategory: 'exodus-stage',
    mapLabelLevel: 'local',
    mapReferences: ['B3 E6'],
    sourceMaps: ['b3'],
    sourcePixel: [787, 869],
    certainty: 'possible',
    coordinatePrecision: 'approximate',
    biblicalReferences: ['Nombres 33:31', 'Deutéronome 10:6']
  },
  {
    id: 'abronah',
    name: 'Abrona',
    alternateNames: ['Abronah'],
    coordinates: [29.65, 34.93],
    mapCategory: 'exodus-stage',
    mapLabelLevel: 'local',
    mapReferences: ['B3 E8'],
    sourceMaps: ['b3'],
    sourcePixel: [884, 1133],
    certainty: 'possible',
    coordinatePrecision: 'approximate',
    biblicalReferences: ['Nombres 33:34']
  },
  {
    id: 'meribah_kadesh',
    name: 'Meriba (près de Kadèsh)',
    coordinates: [30.57, 34.43],
    mapCategory: 'exodus-stage',
    mapLabelLevel: 'study',
    mapReferences: ['B3 D6'],
    sourceMaps: ['b3'],
    sourcePixel: [765, 940],
    certainty: 'possible',
    coordinatePrecision: 'approximate',
    biblicalReferences: ['Nombres 20:13', 'Nombres 20:24'],
    notes:
      'Ce lieu est distingué de Massa et Meriba, situé sur la carte près de Refidim.'
  },
  {
    id: 'dibon_gad',
    name: 'Dibôn-Gad',
    coordinates: [31.5, 35.8],
    mapCategory: 'exodus-stage',
    mapLabelLevel: 'study',
    mapReferences: ['B3 F4'],
    sourceMaps: ['b3'],
    sourcePixel: [1051, 667],
    certainty: 'possible',
    coordinatePrecision: 'approximate',
    biblicalReferences: ['Nombres 33:45', 'Nombres 33:46'],
    territory: 'Moab'
  },
  {
    id: 'zered_wadi',
    name: 'Oued Zéred',
    alternateNames: ['Torrent de Zéred'],
    coordinates: [30.85, 35.75],
    mapCategory: 'wadi',
    mapLabelLevel: 'regional',
    mapReferences: ['B3 F5'],
    sourceMaps: ['b3'],
    sourcePixel: [1040, 794],
    certainty: 'probable',
    coordinatePrecision: 'representative',
    biblicalReferences: ['Nombres 21:12', 'Deutéronome 2:13'],
    notes:
      'Point représentatif du cours d’eau destiné à son libellé cartographique, et non à représenter toute sa géométrie.'
  }
];

export const PATRIARCH_AND_EXODUS_PLACES: BiblicalPlace[] = SEEDS.map(seed => {
  const sources = seed.sourceMaps.map(sourceMap => SOURCE_MAPS[sourceMap]);
  const categoryLabel = CATEGORY_LABELS[seed.mapCategory] || 'Repère géographique';

  return {
    id: seed.id,
    name: seed.name,
    alternateNames: seed.alternateNames,
    coordinates: seed.coordinates,
    startYear: seed.mapCategory === 'exodus-stage' ? -1512 : undefined,
    endYear: seed.mapCategory === 'exodus-stage' ? -1472 : undefined,
    periodDescription:
      seed.mapCategory === 'exodus-stage'
        ? 'Étape rattachée à la période de l’Exode dans la chronologie actuelle'
        : undefined,
    description: `${categoryLabel} reporté sur ${sources
      .map(source => `« ${source.label} »`)
      .join(' et ')}.`,
    biblicalReferences: seed.biblicalReferences || [],
    documentaryReferences: sources.map(source => source.documentaryReference),
    sources: sources.map(
      ({ documentaryReference: _documentaryReference, ...source }) => source
    ),
    certainty: seed.certainty,
    notes:
      seed.notes ||
      (seed.coordinatePrecision === 'approximate'
        ? 'Position indicative reportée depuis la carte source ; elle ne vaut pas identification archéologique.'
        : undefined),
    lastVerified: '2026-07-25',
    territory: seed.territory,
    category: categoryLabel,
    mapCategory: seed.mapCategory,
    mapReferences: seed.mapReferences,
    coordinatePrecision: seed.coordinatePrecision,
    coordinateSource: {
      sourceId: SOURCE_MAPS[
        seed.coordinateSourceMap || seed.sourceMaps[0]
      ].id,
      sourceMapIds: seed.sourceMaps,
      mapReference: seed.mapReferences[0],
      sourcePixel: seed.sourcePixel,
      sourceImageSize: seed.sourcePixel
        ? SOURCE_MAP_IMAGE_SIZES[
            seed.coordinateSourceMap || seed.sourceMaps[0]
          ]
        : undefined,
      method:
        seed.coordinatePrecision === 'site'
          ? 'source-symbol-georeferenced'
          : 'source-feature-representative-position'
    },
    mapLabelLevel: seed.mapLabelLevel
  };
});
