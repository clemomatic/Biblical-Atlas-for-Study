import {
  BiblicalMapCategory,
  BiblicalPlace,
  CertaintyLevel,
  MapLabelLevel,
  SourceReference
} from '../types';

interface ChristianExpansionPlaceSeed {
  id: string;
  name: string;
  alternateNames?: string[];
  sourcePixel: [number, number];
  mapCategory: BiblicalMapCategory;
  mapLabelLevel: MapLabelLevel;
  featureType: string;
  certainty?: CertaintyLevel;
  biblicalReferences?: string[];
  territory?: string;
  notes?: string;
}

const SOURCE: SourceReference = {
  id: 'wol-study-bible-map-b13',
  label: 'Expansion du christianisme',
  url: 'https://wol.jw.org/fr/wol/d/r30/lp-f/1001070234',
  citation: 'Bible d’étude, appendice B13'
};

const DOCUMENTARY_REFERENCE =
  'Bible d’étude, appendice B13 « Expansion du christianisme »';
const SOURCE_IMAGE_SIZE: [number, number] = [1800, 1300];

/**
 * Transformation linéaire ajustée sur les repères Rome, Corinthe, Éphèse,
 * Sidon, Tyr, Damas et Jérusalem déjà présents dans l’atlas. Les coordonnées
 * obtenues reproduisent donc la position graphique de la carte B13, sans
 * recourir à un service de géocodage externe.
 */
const SOURCE_GEOREFERENCE = {
  longitudePerPixel: 0.015867828283806604,
  longitudeOrigin: 10.84093248082679,
  latitudePerPixel: -0.012749079879622725,
  latitudeOrigin: 46.024083273922976
};

const coordinatesFromSourcePixel = (
  sourcePixel: [number, number]
): [number, number] => {
  const [x, y] = sourcePixel;
  return [
    Number(
      (
        SOURCE_GEOREFERENCE.latitudeOrigin +
        SOURCE_GEOREFERENCE.latitudePerPixel * y
      ).toFixed(4)
    ),
    Number(
      (
        SOURCE_GEOREFERENCE.longitudeOrigin +
        SOURCE_GEOREFERENCE.longitudePerPixel * x
      ).toFixed(4)
    )
  ];
};

const SEEDS: ChristianExpansionPlaceSeed[] = [
  { id: 'three_taverns', name: 'Trois-Auberges', alternateNames: ['Tres Tabernae'], sourcePixel: [128, 338], mapCategory: 'ancient-city', mapLabelLevel: 'study', featureType: 'Relais de la voie Appienne', biblicalReferences: ['Actes 28:15'], territory: 'Italie' },
  { id: 'market_of_appius', name: 'Marché-d’Appius', alternateNames: ['Forum d’Appius', 'Forum Appii'], sourcePixel: [139, 356], mapCategory: 'ancient-city', mapLabelLevel: 'study', featureType: 'Relais de la voie Appienne', biblicalReferences: ['Actes 28:15'], territory: 'Italie' },
  { id: 'puteoli', name: 'Puteoli', alternateNames: ['Pouzzoles', 'Puzzoles'], sourcePixel: [201, 411], mapCategory: 'ancient-city', mapLabelLevel: 'regional', featureType: 'Ville portuaire', biblicalReferences: ['Actes 28:13'], territory: 'Italie' },
  { id: 'dyrrachium', name: 'Dyrrachium', alternateNames: ['Dyrrachion'], sourcePixel: [542, 359], mapCategory: 'ancient-city', mapLabelLevel: 'study', featureType: 'Ville portuaire', territory: 'Illyrie' },
  { id: 'apollonia_illyria', name: 'Apollonia (Illyrie)', sourcePixel: [543, 416], mapCategory: 'ancient-city', mapLabelLevel: 'local', featureType: 'Ville antique', territory: 'Illyrie' },
  { id: 'brundisium', name: 'Brundisium', alternateNames: ['Brindes'], sourcePixel: [445, 421], mapCategory: 'ancient-city', mapLabelLevel: 'study', featureType: 'Ville portuaire', territory: 'Italie' },
  { id: 'neapolis_macedonia', name: 'Néapolis', alternateNames: ['Néapolis de Macédoine'], sourcePixel: [839, 379], mapCategory: 'ancient-city', mapLabelLevel: 'study', featureType: 'Ville portuaire', biblicalReferences: ['Actes 16:11'], territory: 'Macédoine' },
  { id: 'philippi', name: 'Philippes', alternateNames: ['Philippi'], sourcePixel: [842, 395], mapCategory: 'ancient-city', mapLabelLevel: 'regional', featureType: 'Ville antique', biblicalReferences: ['Actes 16:12', 'Philippiens 1:1'], territory: 'Macédoine' },
  { id: 'amphipolis', name: 'Amphipolis', sourcePixel: [774, 398], mapCategory: 'ancient-city', mapLabelLevel: 'study', featureType: 'Ville antique', biblicalReferences: ['Actes 17:1'], territory: 'Macédoine' },
  { id: 'thessalonica', name: 'Thessalonique', alternateNames: ['Thessalonica'], sourcePixel: [727, 415], mapCategory: 'ancient-city', mapLabelLevel: 'regional', featureType: 'Ville antique', biblicalReferences: ['Actes 17:1', '1 Thessaloniciens 1:1'], territory: 'Macédoine' },
  { id: 'berea', name: 'Bérée', alternateNames: ['Béroia'], sourcePixel: [720, 438], mapCategory: 'ancient-city', mapLabelLevel: 'regional', featureType: 'Ville antique', biblicalReferences: ['Actes 17:10', 'Actes 17:13'], territory: 'Macédoine' },
  { id: 'apollonia_macedonia', name: 'Apollonia (Macédoine)', sourcePixel: [770, 438], mapCategory: 'ancient-city', mapLabelLevel: 'local', featureType: 'Ville antique', biblicalReferences: ['Actes 17:1'], territory: 'Macédoine' },
  { id: 'nicopolis', name: 'Nicopolis', alternateNames: ['Nicopolis d’Épire'], sourcePixel: [623, 552], mapCategory: 'ancient-city', mapLabelLevel: 'study', featureType: 'Ville antique', biblicalReferences: ['Tite 3:12'], territory: 'Grèce' },
  { id: 'rhegium', name: 'Rhegium', alternateNames: ['Régium'], sourcePixel: [305, 631], mapCategory: 'ancient-city', mapLabelLevel: 'study', featureType: 'Ville portuaire', biblicalReferences: ['Actes 28:13'], territory: 'Italie' },
  { id: 'sicily', name: 'Sicile', sourcePixel: [180, 642], mapCategory: 'biblical-site', mapLabelLevel: 'regional', featureType: 'Île', biblicalReferences: ['Actes 28:12'], territory: 'Méditerranée centrale' },
  { id: 'syracuse', name: 'Syracuse', sourcePixel: [283, 710], mapCategory: 'ancient-city', mapLabelLevel: 'regional', featureType: 'Ville portuaire', biblicalReferences: ['Actes 28:12'], territory: 'Sicile' },
  { id: 'adriatic_sea', name: 'Mer d’Adria', alternateNames: ['Adria', 'Mer Adriatique'], sourcePixel: [450, 677], mapCategory: 'body-of-water', mapLabelLevel: 'regional', featureType: 'Étendue d’eau', biblicalReferences: ['Actes 27:27'], certainty: 'certain' },
  { id: 'athens', name: 'Athènes', sourcePixel: [796, 620], mapCategory: 'ancient-city', mapLabelLevel: 'major', featureType: 'Ville antique', biblicalReferences: ['Actes 17:15', 'Actes 17:22'], territory: 'Achaïe' },
  { id: 'cenchreae', name: 'Cenchrées', alternateNames: ['Kenchrées'], sourcePixel: [777, 650], mapCategory: 'ancient-city', mapLabelLevel: 'study', featureType: 'Ville portuaire', biblicalReferences: ['Actes 18:18', 'Romains 16:1'], territory: 'Achaïe' },
  { id: 'malta', name: 'Malte', sourcePixel: [224, 802], mapCategory: 'biblical-site', mapLabelLevel: 'regional', featureType: 'Île', biblicalReferences: ['Actes 28:1'], territory: 'Méditerranée centrale' },
  { id: 'crete', name: 'Crète', sourcePixel: [817, 842], mapCategory: 'biblical-site', mapLabelLevel: 'regional', featureType: 'Île', biblicalReferences: ['Actes 27:7', 'Tite 1:5'], territory: 'Méditerranée orientale' },
  { id: 'phoenix_crete', name: 'Phénix', alternateNames: ['Phoenix de Crète'], sourcePixel: [830, 851], mapCategory: 'ancient-city', mapLabelLevel: 'study', featureType: 'Port', biblicalReferences: ['Actes 27:12'], territory: 'Crète' },
  { id: 'cauda', name: 'Cauda', alternateNames: ['Clauda'], sourcePixel: [823, 878], mapCategory: 'biblical-site', mapLabelLevel: 'local', featureType: 'Île', biblicalReferences: ['Actes 27:16'], territory: 'Au sud de la Crète' },
  { id: 'fair_havens', name: 'Beaux-Ports', alternateNames: ['Beaux Ports'], sourcePixel: [881, 871], mapCategory: 'biblical-site', mapLabelLevel: 'study', featureType: 'Mouillage', biblicalReferences: ['Actes 27:8'], territory: 'Crète' },
  { id: 'gulf_syrtis', name: 'Syrte', alternateNames: ['Grande Syrte'], sourcePixel: [430, 1095], mapCategory: 'body-of-water', mapLabelLevel: 'regional', featureType: 'Golfe', biblicalReferences: ['Actes 27:17'], certainty: 'certain' },
  { id: 'cyrene', name: 'Cyrène', sourcePixel: [692, 1033], mapCategory: 'ancient-city', mapLabelLevel: 'regional', featureType: 'Ville antique', biblicalReferences: ['Actes 2:10', 'Actes 11:20', 'Actes 13:1'], territory: 'Libye' },
  { id: 'black_sea', name: 'Mer Noire', sourcePixel: [1195, 303], mapCategory: 'body-of-water', mapLabelLevel: 'major', featureType: 'Étendue d’eau', certainty: 'certain' },
  { id: 'samothrace', name: 'Samothrace', sourcePixel: [934, 430], mapCategory: 'biblical-site', mapLabelLevel: 'study', featureType: 'Île', biblicalReferences: ['Actes 16:11'], territory: 'Mer Égée' },
  { id: 'troas', name: 'Troas', alternateNames: ['Alexandrie de Troade'], sourcePixel: [968, 496], mapCategory: 'ancient-city', mapLabelLevel: 'regional', featureType: 'Ville portuaire', biblicalReferences: ['Actes 16:8', 'Actes 20:5'], territory: 'Asie Mineure' },
  { id: 'adramyttium', name: 'Adramytium', alternateNames: ['Adramyttium'], sourcePixel: [1000, 509], mapCategory: 'ancient-city', mapLabelLevel: 'study', featureType: 'Ville portuaire', biblicalReferences: ['Actes 27:2'], territory: 'Mysie' },
  { id: 'assos', name: 'Assos', sourcePixel: [981, 526], mapCategory: 'ancient-city', mapLabelLevel: 'study', featureType: 'Ville portuaire', biblicalReferences: ['Actes 20:13'], territory: 'Mysie' },
  { id: 'pergamum', name: 'Pergame', alternateNames: ['Pergamum'], sourcePixel: [1030, 545], mapCategory: 'ancient-city', mapLabelLevel: 'regional', featureType: 'Ville mentionnée dans la Révélation', biblicalReferences: ['Révélation 2:12'], territory: 'Asie' },
  { id: 'mytilene', name: 'Mytilène', sourcePixel: [986, 556], mapCategory: 'ancient-city', mapLabelLevel: 'study', featureType: 'Ville portuaire', biblicalReferences: ['Actes 20:14'], territory: 'Lesbos' },
  { id: 'thyatira', name: 'Thyatire', alternateNames: ['Thyatira'], sourcePixel: [1072, 562], mapCategory: 'ancient-city', mapLabelLevel: 'regional', featureType: 'Ville mentionnée dans la Révélation', biblicalReferences: ['Actes 16:14', 'Révélation 2:18'], territory: 'Asie' },
  { id: 'chios', name: 'Chio', alternateNames: ['Chios'], sourcePixel: [1028, 598], mapCategory: 'biblical-site', mapLabelLevel: 'study', featureType: 'Île', biblicalReferences: ['Actes 20:15'], territory: 'Mer Égée' },
  { id: 'sardis', name: 'Sardes', sourcePixel: [1084, 597], mapCategory: 'ancient-city', mapLabelLevel: 'regional', featureType: 'Ville mentionnée dans la Révélation', biblicalReferences: ['Révélation 3:1'], territory: 'Asie' },
  { id: 'smyrna', name: 'Smyrne', alternateNames: ['Izmir'], sourcePixel: [1028, 624], mapCategory: 'ancient-city', mapLabelLevel: 'regional', featureType: 'Ville mentionnée dans la Révélation', biblicalReferences: ['Révélation 2:8'], territory: 'Asie' },
  { id: 'philadelphia_asia', name: 'Philadelphie', alternateNames: ['Philadelphie d’Asie'], sourcePixel: [1117, 611], mapCategory: 'ancient-city', mapLabelLevel: 'regional', featureType: 'Ville mentionnée dans la Révélation', biblicalReferences: ['Révélation 3:7'], territory: 'Asie' },
  { id: 'antioch_pisidia', name: 'Antioche de Pisidie', sourcePixel: [1278, 616], mapCategory: 'ancient-city', mapLabelLevel: 'regional', featureType: 'Ville antique', biblicalReferences: ['Actes 13:14', 'Actes 14:19'], territory: 'Pisidie' },
  { id: 'samos', name: 'Samos', sourcePixel: [1005, 645], mapCategory: 'biblical-site', mapLabelLevel: 'study', featureType: 'Île', biblicalReferences: ['Actes 20:15'], territory: 'Mer Égée' },
  { id: 'laodicea', name: 'Laodicée', sourcePixel: [1152, 650], mapCategory: 'ancient-city', mapLabelLevel: 'regional', featureType: 'Ville mentionnée dans la Révélation', biblicalReferences: ['Colossiens 4:13', 'Révélation 3:14'], territory: 'Asie' },
  { id: 'colossae', name: 'Colosses', sourcePixel: [1161, 671], mapCategory: 'ancient-city', mapLabelLevel: 'regional', featureType: 'Ville antique', biblicalReferences: ['Colossiens 1:2'], territory: 'Asie' },
  { id: 'lystra', name: 'Lystre', sourcePixel: [1307, 665], mapCategory: 'ancient-city', mapLabelLevel: 'regional', featureType: 'Ville antique', biblicalReferences: ['Actes 14:6', 'Actes 16:1'], territory: 'Lycaonie' },
  { id: 'iconium', name: 'Iconium', sourcePixel: [1366, 638], mapCategory: 'ancient-city', mapLabelLevel: 'regional', featureType: 'Ville antique', biblicalReferences: ['Actes 14:1', 'Actes 16:2'], territory: 'Lycaonie' },
  { id: 'patmos', name: 'Patmos', sourcePixel: [1036, 689], mapCategory: 'biblical-site', mapLabelLevel: 'regional', featureType: 'Île', biblicalReferences: ['Révélation 1:9'], territory: 'Mer Égée' },
  { id: 'miletus', name: 'Milet', alternateNames: ['Miletus'], sourcePixel: [1036, 677], mapCategory: 'ancient-city', mapLabelLevel: 'regional', featureType: 'Ville portuaire', biblicalReferences: ['Actes 20:15', 'Actes 20:17'], territory: 'Asie' },
  { id: 'cos', name: 'Cos', alternateNames: ['Kos'], sourcePixel: [1050, 712], mapCategory: 'biblical-site', mapLabelLevel: 'study', featureType: 'Île', biblicalReferences: ['Actes 21:1'], territory: 'Mer Égée' },
  { id: 'cnidus', name: 'Cnide', alternateNames: ['Cnidus'], sourcePixel: [1042, 739], mapCategory: 'ancient-city', mapLabelLevel: 'study', featureType: 'Ville portuaire', biblicalReferences: ['Actes 27:7'], territory: 'Asie Mineure' },
  { id: 'rhodes', name: 'Rhodes', sourcePixel: [1080, 767], mapCategory: 'biblical-site', mapLabelLevel: 'regional', featureType: 'Île', biblicalReferences: ['Actes 21:1'], territory: 'Méditerranée orientale' },
  { id: 'cape_salmone', name: 'Cap Salmoné', alternateNames: ['Salmone'], sourcePixel: [989, 855], mapCategory: 'biblical-site', mapLabelLevel: 'study', featureType: 'Cap', biblicalReferences: ['Actes 27:7'], territory: 'Crète' },
  { id: 'patara', name: 'Patara', sourcePixel: [1138, 767], mapCategory: 'ancient-city', mapLabelLevel: 'study', featureType: 'Ville portuaire', biblicalReferences: ['Actes 21:1'], territory: 'Lycie' },
  { id: 'myra', name: 'Myre', alternateNames: ['Myra'], sourcePixel: [1204, 775], mapCategory: 'ancient-city', mapLabelLevel: 'regional', featureType: 'Ville portuaire', biblicalReferences: ['Actes 27:5'], territory: 'Lycie' },
  { id: 'attalia', name: 'Attaleia', alternateNames: ['Attalia'], sourcePixel: [1254, 714], mapCategory: 'ancient-city', mapLabelLevel: 'study', featureType: 'Ville portuaire', biblicalReferences: ['Actes 14:25'], territory: 'Pamphylie' },
  { id: 'perga', name: 'Pergé', alternateNames: ['Perge'], sourcePixel: [1287, 714], mapCategory: 'ancient-city', mapLabelLevel: 'regional', featureType: 'Ville antique', biblicalReferences: ['Actes 13:13', 'Actes 14:25'], territory: 'Pamphylie' },
  { id: 'derbe', name: 'Derbé', sourcePixel: [1389, 700], mapCategory: 'ancient-city', mapLabelLevel: 'regional', featureType: 'Ville antique', biblicalReferences: ['Actes 14:6', 'Actes 16:1'], territory: 'Lycaonie' },
  { id: 'tarsus', name: 'Tarse', sourcePixel: [1495, 718], mapCategory: 'ancient-city', mapLabelLevel: 'regional', featureType: 'Ville antique', biblicalReferences: ['Actes 9:11', 'Actes 21:39'], territory: 'Cilicie' },
  { id: 'seleucia_pieria', name: 'Séleucie', alternateNames: ['Séleucie de Piérie'], sourcePixel: [1536, 778], mapCategory: 'ancient-city', mapLabelLevel: 'study', featureType: 'Ville portuaire', biblicalReferences: ['Actes 13:4'], territory: 'Syrie' },
  { id: 'salamis_cyprus', name: 'Salamine', alternateNames: ['Salamine de Chypre'], sourcePixel: [1453, 888], mapCategory: 'ancient-city', mapLabelLevel: 'regional', featureType: 'Ville portuaire', biblicalReferences: ['Actes 13:5'], territory: 'Chypre' },
  { id: 'cyprus', name: 'Chypre', sourcePixel: [1415, 862], mapCategory: 'biblical-site', mapLabelLevel: 'regional', featureType: 'Île', biblicalReferences: ['Actes 4:36', 'Actes 13:4'], territory: 'Méditerranée orientale' },
  { id: 'paphos', name: 'Paphos', sourcePixel: [1363, 888], mapCategory: 'ancient-city', mapLabelLevel: 'regional', featureType: 'Ville portuaire', biblicalReferences: ['Actes 13:6', 'Actes 13:13'], territory: 'Chypre' },
  { id: 'alexandria', name: 'Alexandrie', alternateNames: ['Alexandrie d’Égypte'], sourcePixel: [1202, 1155], mapCategory: 'ancient-city', mapLabelLevel: 'major', featureType: 'Ville portuaire', biblicalReferences: ['Actes 18:24', 'Actes 27:6'], territory: 'Égypte' }
];

export const CHRISTIAN_EXPANSION_PLACES: BiblicalPlace[] = SEEDS.map(seed => {
  const coordinates = coordinatesFromSourcePixel(seed.sourcePixel);
  const isPointSymbol = seed.mapCategory === 'ancient-city';

  return {
    id: seed.id,
    name: seed.name,
    alternateNames: seed.alternateNames,
    coordinates,
    description: `${seed.featureType} reporté sur « Expansion du christianisme » (B13).`,
    biblicalReferences: seed.biblicalReferences || [],
    documentaryReferences: [DOCUMENTARY_REFERENCE],
    sources: [SOURCE],
    certainty: seed.certainty || 'probable',
    notes:
      seed.notes ||
      'Position reportée depuis la carte générale B13 ; elle doit être comprise à l’échelle de cette carte.',
    lastVerified: '2026-07-25',
    territory: seed.territory,
    category: seed.featureType,
    mapCategory: seed.mapCategory,
    mapReferences: [`B13 · ${seed.name}`],
    coordinatePrecision: 'representative',
    coordinateSource: {
      sourceId: SOURCE.id,
      sourceMapIds: ['b13'],
      mapReference: `B13 · ${seed.name}`,
      sourcePixel: seed.sourcePixel,
      sourceImageSize: SOURCE_IMAGE_SIZE,
      method: isPointSymbol
        ? 'source-symbol-georeferenced'
        : 'source-feature-representative-position'
    },
    mapLabelLevel: seed.mapLabelLevel
  };
});
