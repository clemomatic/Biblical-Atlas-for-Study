import { BiblicalRoute, SourceReference } from '../types';
import { createEventId } from '../utils/stableIds';

const MAP_5_SOURCE: SourceReference = {
  id: 'wol-good-land-patriarchs',
  label: 'Le monde des patriarches',
  url: 'https://wol.jw.org/fr/wol/d/r30/lp-f/1102003104',
  citation: 'Voyez le bon pays, p. 6-7, carte 5'
};

const B2_SOURCE: SourceReference = {
  id: 'wol-study-bible-map-b2',
  label: 'La Genèse et les voyages des patriarches',
  url: 'https://wol.jw.org/fr/wol/d/r30/lp-f/1001070222',
  citation: 'Bible d’étude, appendice B2, carte 87'
};

const B3_SOURCE: SourceReference = {
  id: 'wol-study-bible-map-b3',
  label: 'L’Exode',
  url: 'https://wol.jw.org/fr/wol/d/r30/lp-f/1001070223',
  citation: 'Bible d’étude, appendice B3, carte 89'
};

const point = (
  stepNumber: number,
  placeId: string,
  name: string,
  coordinates: [number, number],
  description?: string
) => ({ stepNumber, placeId, name, coordinates, description });

const abrahamEventId = createEventId(
  'Abraham',
  '-2017-01-01 00:00:00',
  'Personnage'
);
const isaacEventId = createEventId(
  'Isaac',
  '-1917-01-01 00:00:00',
  'Personnage'
);
const jacobEventId = createEventId(
  'Jacob',
  '-1857-01-01 00:00:00',
  'Personnage'
);
const exodusEventId = createEventId(
  'Sortie d’Égypte',
  '-1512-01-01 00:00:00',
  'Événements marquants'
);

export const PATRIARCH_AND_EXODUS_ROUTES: BiblicalRoute[] = [
  {
    id: 'route_abraham_ur_canaan',
    name: 'Abraham : d’Ur à Canaan',
    description:
      'Tracé d’étude d’Ur à Harrân, puis vers Damas, Sichem et Béthel. Les segments entre les repères suivent la carte source et ne prétendent pas restituer chaque étape.',
    color: '#e11d48',
    routeCategory: 'patriarch-abraham',
    startYear: -2017,
    endYear: -1842,
    biblicalReferences: ['Genèse 11:31', 'Genèse 12:4-8'],
    documentaryReferences: [
      'Voyez le bon pays, carte 5',
      'Bible d’étude, appendice B2'
    ],
    sources: [MAP_5_SOURCE, B2_SOURCE],
    certainty: 'probable',
    notes:
      'Itinéraire schématique : les lignes relient des repères cartographiques et non une trace archéologique continue.',
    lastVerified: '2026-07-24',
    associatedEventIds: [abrahamEventId],
    associatedCharacters: ['Abraham', 'Sara', 'Téra', 'Lot'],
    points: [
      point(1, 'ur', 'Ur en Chaldée', [30.9628, 46.1031], 'Point de départ'),
      point(2, 'babylon', 'Babylone', [32.5422, 44.4211], 'Corridor de Basse-Mésopotamie'),
      point(3, 'mari', 'Mari', [34.5519, 40.8897], 'Corridor de l’Euphrate'),
      point(4, 'carchemish', 'Karkemish', [36.8295, 38.0158]),
      point(5, 'haran', 'Harrân', [36.8647, 39.0253], 'Étape de la famille de Téra'),
      point(6, 'carchemish', 'Karkemish', [36.8295, 38.0158]),
      point(7, 'damascus', 'Damas', [33.5138, 36.2765]),
      point(8, 'shechem', 'Sichem', [32.2133, 35.2817]),
      point(9, 'bethel', 'Béthel', [31.9308, 35.2211])
    ]
  },
  {
    id: 'route_abraham_canaan_egypt',
    name: 'Abraham : Canaan, Égypte et Néguev',
    description:
      'Pérégrinations schématiques entre Béthel, l’Égypte, Guérar, Bersabée, Hébron et la région de Moria.',
    color: '#e11d48',
    routeCategory: 'patriarch-abraham',
    startYear: -2017,
    endYear: -1842,
    biblicalReferences: ['Genèse 12:8-20', 'Genèse 13:1-4', 'Genèse 20:1', 'Genèse 22:2'],
    documentaryReferences: ['Voyez le bon pays, carte 5'],
    sources: [MAP_5_SOURCE],
    certainty: 'probable',
    notes: 'Le tracé est une lecture de la carte documentaire, pas une chronologie exhaustive.',
    lastVerified: '2026-07-24',
    associatedEventIds: [abrahamEventId],
    associatedCharacters: ['Abraham', 'Sara', 'Lot'],
    points: [
      point(1, 'bethel', 'Béthel', [31.9308, 35.2211]),
      point(2, 'beersheba', 'Bersabée', [31.2447, 34.7913]),
      point(3, 'goshen', 'Goshèn', [30.75, 31.85], 'Séjour en Égypte'),
      point(4, 'beersheba', 'Bersabée', [31.2447, 34.7913]),
      point(5, 'hebron', 'Hébron', [31.5298, 35.0998]),
      point(6, 'jerusalem', 'Moria / Jérusalem', [31.7767, 35.2345]),
      point(7, 'hebron', 'Hébron', [31.5298, 35.0998])
    ]
  },
  {
    id: 'route_abraham_dan_hoba',
    name: 'Abraham : vers Dan et Hoba',
    description:
      'Trajet schématique depuis Hébron vers Dan puis Hoba, au nord de Damas.',
    color: '#be123c',
    routeCategory: 'patriarch-abraham',
    startYear: -2017,
    endYear: -1842,
    biblicalReferences: ['Genèse 14:13-16'],
    documentaryReferences: ['Voyez le bon pays, carte 5'],
    sources: [MAP_5_SOURCE],
    certainty: 'possible',
    notes: 'Hoba est placée de manière indicative, conformément à la prudence de la carte.',
    lastVerified: '2026-07-24',
    associatedEventIds: [abrahamEventId],
    associatedCharacters: ['Abraham', 'Lot'],
    points: [
      point(1, 'hebron', 'Hébron', [31.5298, 35.0998]),
      point(2, 'shechem', 'Sichem', [32.2133, 35.2817]),
      point(3, 'dan', 'Dan', [33.249, 35.652]),
      point(4, 'hoba', 'Hoba', [33.74, 36.54])
    ]
  },
  {
    id: 'route_isaac_south',
    name: 'Voyages d’Isaac',
    description:
      'Tracé d’étude des déplacements d’Isaac dans le sud de Canaan, entre le puits de Béer-Lahaï-Roï, Guérar, Bersabée et Hébron.',
    color: '#7e22ce',
    routeCategory: 'patriarch-isaac',
    startYear: -1917,
    endYear: -1737,
    biblicalReferences: ['Genèse 24:62', 'Genèse 26:1-33', 'Genèse 35:27'],
    documentaryReferences: ['Voyez le bon pays, carte 5'],
    sources: [MAP_5_SOURCE],
    certainty: 'probable',
    notes: 'Tracé schématique reporté de la carte source.',
    lastVerified: '2026-07-24',
    associatedEventIds: [isaacEventId],
    associatedCharacters: ['Isaac', 'Rébecca'],
    points: [
      point(1, 'beer_lahai_roi', 'Béer-Lahaï-Roï', [30.74, 34.42]),
      point(2, 'obi-gerar', 'Guérar', [31.3821, 34.6065]),
      point(3, 'beersheba', 'Bersabée', [31.2447, 34.7913]),
      point(4, 'hebron', 'Hébron', [31.5298, 35.0998])
    ]
  },
  {
    id: 'route_jacob_haran_return',
    name: 'Jacob : Harrân et retour en Canaan',
    description:
      'Parcours schématique de Bersabée à Harrân, puis retour par Penouel, Soukkot, Sichem, Béthel et Hébron.',
    color: '#059669',
    routeCategory: 'patriarch-jacob',
    startYear: -1857,
    endYear: -1710,
    biblicalReferences: ['Genèse 28:10', 'Genèse 31:17-21', 'Genèse 32:30', 'Genèse 33:17-20', 'Genèse 35:27'],
    documentaryReferences: ['Voyez le bon pays, carte 5'],
    sources: [MAP_5_SOURCE],
    certainty: 'probable',
    notes: 'Tracé schématique reporté de la carte source.',
    lastVerified: '2026-07-24',
    associatedEventIds: [jacobEventId],
    associatedCharacters: ['Jacob', 'Rachel', 'Léa'],
    points: [
      point(1, 'beersheba', 'Bersabée', [31.2447, 34.7913]),
      point(2, 'bethel', 'Béthel', [31.9308, 35.2211]),
      point(3, 'damascus', 'Région de Damas', [33.5138, 36.2765]),
      point(4, 'carchemish', 'Karkemish', [36.8295, 38.0158]),
      point(5, 'haran', 'Harrân', [36.8647, 39.0253]),
      point(6, 'mahanaim', 'Mahanaïm', [32.18575, 35.68667]),
      point(7, 'penuel', 'Penouel', [32.187016, 35.69211]),
      point(8, 'obi-succoth-1', 'Soukkot', [32.1966, 35.62118]),
      point(9, 'shechem', 'Sichem', [32.2133, 35.2817]),
      point(10, 'bethel', 'Béthel', [31.9308, 35.2211]),
      point(11, 'hebron', 'Hébron', [31.5298, 35.0998])
    ]
  },
  {
    id: 'route_jacob_to_egypt',
    name: 'Jacob : de Canaan en Égypte',
    description:
      'Trajet schématique d’Hébron et Bersabée vers la région de Goshèn.',
    color: '#047857',
    routeCategory: 'patriarch-jacob',
    startYear: -1727,
    endYear: -1710,
    biblicalReferences: ['Genèse 46:1-7', 'Genèse 47:27-28'],
    documentaryReferences: ['Voyez le bon pays, carte 5'],
    sources: [MAP_5_SOURCE],
    certainty: 'probable',
    notes: 'Tracé schématique reporté de la carte source.',
    lastVerified: '2026-07-24',
    associatedEventIds: [jacobEventId],
    associatedCharacters: ['Jacob', 'Joseph'],
    points: [
      point(1, 'hebron', 'Hébron', [31.5298, 35.0998]),
      point(2, 'beersheba', 'Bersabée', [31.2447, 34.7913]),
      point(3, 'goshen', 'Goshèn', [30.75, 31.85])
    ]
  },
  {
    id: 'ancient_road_fertile_crescent',
    name: 'Route ancienne du Croissant fertile',
    description:
      'Grand corridor terrestre schématique reliant la Basse-Mésopotamie à la Haute-Mésopotamie par l’Euphrate.',
    color: '#9a5b3f',
    routeCategory: 'ancient-road',
    biblicalReferences: [],
    documentaryReferences: ['Bible d’étude, appendice B2, routes de l’époque'],
    sources: [B2_SOURCE],
    certainty: 'probable',
    notes: 'Corridor cartographique général ; il ne représente ni une route unique ni un tracé topographique exact.',
    lastVerified: '2026-07-24',
    points: [
      point(1, 'ur', 'Ur', [30.9628, 46.1031]),
      point(2, 'erech', 'Érek', [31.3222, 45.6361]),
      point(3, 'babylon', 'Babylone', [32.5422, 44.4211]),
      point(4, 'mari', 'Mari', [34.5519, 40.8897]),
      point(5, 'carchemish', 'Karkemish', [36.8295, 38.0158]),
      point(6, 'haran', 'Harrân', [36.8647, 39.0253])
    ]
  },
  {
    id: 'ancient_road_levant_coast',
    name: 'Route ancienne du littoral levantin',
    description:
      'Corridor schématique de l’Égypte vers Gaza, Megiddo, la Phénicie et la Syrie.',
    color: '#9a5b3f',
    routeCategory: 'ancient-road',
    biblicalReferences: [],
    documentaryReferences: ['Bible d’étude, appendice B2, routes de l’époque'],
    sources: [B2_SOURCE],
    certainty: 'probable',
    notes: 'Corridor cartographique général reporté de la carte B2.',
    lastVerified: '2026-07-24',
    points: [
      point(1, 'memphis', 'Memphis', [29.8492, 31.2543]),
      point(2, 'ramses', 'Ramsès', [30.793, 31.836]),
      point(3, 'obi-gaza', 'Gaza', [31.504, 34.4644]),
      point(4, 'megiddo', 'Megiddo', [32.585278, 35.184444]),
      point(5, 'sidon', 'Sidon', [33.5633, 35.369]),
      point(6, 'hamath', 'Hamath', [35.1318, 36.7578])
    ]
  },
  {
    id: 'ancient_road_kings',
    name: 'Route du Roi',
    description:
      'Axe ancien schématique montant d’Élath à travers Édom et Moab vers Damas.',
    color: '#8b5e3c',
    routeCategory: 'ancient-road',
    biblicalReferences: ['Nombres 20:17', 'Nombres 21:22'],
    documentaryReferences: [
      'Bible d’étude, appendice B2',
      'Bible d’étude, appendice B3'
    ],
    sources: [B2_SOURCE, B3_SOURCE],
    certainty: 'probable',
    notes: 'Le tracé suit le corridor général représenté sur les cartes B2 et B3.',
    lastVerified: '2026-07-24',
    points: [
      point(1, 'elath', 'Élath', [29.55, 34.95]),
      point(2, 'mount_hor', 'Région du mont Hor', [30.316, 35.407]),
      point(3, 'obi-aroer-1', 'Aroèr', [31.4708, 35.819389]),
      point(4, 'obi-dibon-1', 'Dibôn', [31.502236, 35.776574]),
      point(5, 'obi-heshbon', 'Hèshbôn', [31.800811, 35.809062]),
      point(6, 'damascus', 'Damas', [33.5138, 36.2765])
    ]
  },
  {
    id: 'ancient_road_central_ridge',
    name: 'Route ancienne des hautes terres de Canaan',
    description:
      'Axe intérieur schématique reliant Bersabée, Hébron, Jérusalem, Béthel et Sichem.',
    color: '#a16242',
    routeCategory: 'ancient-road',
    biblicalReferences: [],
    documentaryReferences: ['Bible d’étude, appendice B2, routes de l’époque'],
    sources: [B2_SOURCE],
    certainty: 'probable',
    notes: 'Corridor cartographique général reporté de la carte B2.',
    lastVerified: '2026-07-24',
    points: [
      point(1, 'beersheba', 'Bersabée', [31.2447, 34.7913]),
      point(2, 'hebron', 'Hébron', [31.5298, 35.0998]),
      point(3, 'jerusalem', 'Jérusalem', [31.7767, 35.2345]),
      point(4, 'bethel', 'Béthel', [31.9308, 35.2211]),
      point(5, 'shechem', 'Sichem', [32.2133, 35.2817])
    ]
  },
  {
    id: 'route_exodus',
    name: 'Itinéraire possible de l’Exode',
    description:
      'Tracé d’étude depuis Ramsès vers la mer Rouge, le Sinaï, Kadèsh-Barnéa, Étsiôn-Guéber, le territoire d’Édom et les plaines de Moab.',
    color: '#dc2626',
    routeCategory: 'exodus',
    startYear: -1512,
    endYear: -1472,
    biblicalReferences: ['Exode 12:37 - 19:2', 'Nombres 10:11 - 22:1', 'Nombres 33:1-49'],
    documentaryReferences: ['Bible d’étude, appendice B3 « L’Exode »'],
    sources: [B3_SOURCE],
    certainty: 'possible',
    notes:
      'La source intitule explicitement ce tracé « Itinéraire possible de l’Exode ». Les étapes marquées d’un point d’interrogation restent approximatives.',
    lastVerified: '2026-07-24',
    associatedEventIds: [exodusEventId],
    associatedCharacters: ['Moïse', 'Aaron'],
    points: [
      point(1, 'ramses', 'Ramsès', [30.793, 31.836], 'Départ d’Égypte'),
      point(2, 'succoth_exodus', 'Soukkot', [30.55, 32.1]),
      point(3, 'etham_exodus', 'Étham', [30.22, 32.37]),
      point(4, 'migdol_exodus', 'Migdol', [30.08, 32.53]),
      point(5, 'pi_hahiroth', 'Pi-Hahiroth', [29.98, 32.58]),
      point(6, 'red_sea', 'Traversée de la mer Rouge', [29.72, 32.65]),
      point(7, 'marah', 'Mara', [29.25, 32.96]),
      point(8, 'elim', 'Élim', [29.08, 33.0]),
      point(9, 'dophkah', 'Dofqa', [28.93, 33.18]),
      point(10, 'alush', 'Aloush', [28.78, 33.42]),
      point(11, 'rephidim', 'Refidim', [28.72, 33.63]),
      point(12, 'sinai', 'Mont Sinaï / Horeb', [28.5394, 33.9753], 'Don de la Loi'),
      point(13, 'taberah', 'Tabéra', [28.92, 34.28]),
      point(14, 'kibroth_hattaavah', 'Kibroth-Hattaava', [29.06, 34.43]),
      point(15, 'hazeroth_exodus', 'Hatséroth', [29.25, 34.62]),
      point(16, 'kadesh_barnea', 'Kadèsh-Barnéa', [30.648, 34.425]),
      point(17, 'ezion_geber', 'Étsiôn-Guéber', [29.54, 34.98]),
      point(18, 'jotbathah', 'Yotbatha', [29.78, 35.03]),
      point(19, 'hor_haggidgad', 'Hor-Haguidgad', [30.08, 35.08]),
      point(20, 'mount_hor', 'Mont Hor', [30.316, 35.407]),
      point(21, 'zalmonah', 'Tsalmona', [30.48, 35.32]),
      point(22, 'punon', 'Pounôn', [30.62, 35.5]),
      point(23, 'oboth', 'Oboth', [30.8, 35.48]),
      point(24, 'iye_abarim', 'Iyé-Abarim', [31.02, 35.6]),
      point(25, 'obi-aroer-1', 'Aroèr', [31.4708, 35.819389]),
      point(26, 'obi-dibon-1', 'Dibôn-Gad', [31.502236, 35.776574]),
      point(27, 'obi-almon-diblathaim', 'Almôn-Diblataïm', [31.638727, 35.826578]),
      point(28, 'obi-heshbon', 'Hèshbôn', [31.800811, 35.809062]),
      point(29, 'abel_shittim', 'Abel-Shittim', [31.86, 35.64]),
      point(30, 'plains_moab', 'Plaines de Moab', [31.82, 35.63])
    ]
  }
];
