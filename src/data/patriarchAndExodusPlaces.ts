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
  { id: 'abel_shittim', name: 'Abel-Shittim', alternateNames: ['Shittim'], coordinates: [31.86, 35.64], mapCategory: 'exodus-stage', mapLabelLevel: 'study', mapReferences: ['B3 F2'], sourceMaps: ['b3'], certainty: 'possible', coordinatePrecision: 'representative', biblicalReferences: ['Nombres 25:1', 'Nombres 33:49'] }
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
    lastVerified: '2026-07-24',
    territory: seed.territory,
    category: categoryLabel,
    mapCategory: seed.mapCategory,
    mapReferences: seed.mapReferences,
    coordinatePrecision: seed.coordinatePrecision,
    mapLabelLevel: seed.mapLabelLevel
  };
});
