import { BiblicalPlace, BiblicalRoute } from '../types';
import { PROMISED_LAND_PLACES } from './promisedLandPlaces';
import { PATRIARCH_AND_EXODUS_PLACES } from './patriarchAndExodusPlaces';
import { INSIGHT_PLACE_REFERENCES } from './insightReferences.generated';

/**
 * BIBLICAL PLACES DATABASE
 * Fully structured database linking biblical locations, coordinates, period of existence,
 * associated biblical events & characters, routes, and scriptures.
 */
const CORE_BIBLICAL_PLACES: BiblicalPlace[] = [
  {
    id: "jerusalem",
    name: "Jérusalem",
    alternateNames: ["Jebus", "Sion", "Salem", "Aelia Capitolina"],
    coordinates: [31.7767, 35.2345],
    startYear: -2000,
    endYear: 2050,
    periodDescription: "Fondée vers 2000 av. n. è., capitale du royaume uni puis de Juda",
    description: "Ville sainte centrale de l'histoire biblique. Capitale du royaume de David et Salomon, site du Temple de Jéhovah, lieu de la mort et résurrection de Jésus.",
    biblicalReferences: ["Genèse 14:18", "2 Samuel 5:6-9", "1 Rois 6:1", "Psaume 122", "Matthieu 21:1-11", "Actes 1:8"],
    documentaryReferences: ["Lettres d'Amarna", "Stèle de Tel Dan", "Annales de Sennachérib"],
    associatedEvents: ["Construction du Temple", "Destruction de Jérusalem par les Babyloniens", "Retour des Juifs à Jérusalem", "Reconstruction des murs", "Mort de Jésus"],
    associatedCharacters: ["David", "Salomon", "Isaïe", "Jérémie", "Ezéchias", "Jésus", "Pierre", "Paul"],
    territory: "Juda / Benjamin",
    category: "Capitale"
  },
  {
    id: "hebron",
    name: "Hébron",
    alternateNames: ["Kiriath-Arba"],
    coordinates: [31.5298, 35.0998],
    startYear: -2200,
    endYear: 2050,
    periodDescription: "Lieu de résidence des patriarches et première capitale de David",
    description: "Cité antique de Juda où Abraham acheta la grotte de Makpéla pour y enterrer Sara. Première capitale du roi David pendant 7 ans et demi.",
    biblicalReferences: ["Genèse 13:18", "Genèse 23:2", "2 Samuel 2:1-4"],
    documentaryReferences: ["Textes d'exécration égyptiens"],
    associatedEvents: ["Alliance avec Abraham", "Règne de David à Hébron"],
    associatedCharacters: ["Abraham", "Sara", "Isaac", "Jacob", "David"],
    territory: "Juda",
    category: "Ville de refuge"
  },
  {
    id: "ur",
    name: "Ur en Chaldée",
    alternateNames: ["Tell el-Muqayyar"],
    coordinates: [30.9628, 46.1031],
    startYear: -3000,
    endYear: -500,
    periodDescription: "Metropole de Basse-Mésopotamie",
    description: "Cité sumérienne et chaldéenne florissante d'où Abraham et Téra sont partis sur l'ordre divin.",
    biblicalReferences: ["Genèse 11:28", "Genèse 15:7", "Néhémie 9:7"],
    documentaryReferences: ["Ziggourat d'Ur", "Tablettes cunéiformes de la IIIe dynastie d'Ur"],
    associatedEvents: ["Départ d'Abraham d'Ur"],
    associatedCharacters: ["Abraham", "Téra", "Sara", "Lot"],
    territory: "Mésopotamie",
    category: "Cité antique"
  },
  {
    id: "haran",
    name: "Haran",
    alternateNames: ["Carrhae"],
    coordinates: [36.8647, 39.0253],
    startYear: -2500,
    endYear: 1200,
    periodDescription: "Centre caravanier de Haute-Mésopotamie",
    description: "Lieu d'étape de la famille de Téra. Jacob y vécut 20 ans chez Laban et s'y maria.",
    biblicalReferences: ["Genèse 11:31", "Genèse 28:10", "Genèse 29:4"],
    associatedEvents: ["Départ d'Abraham pour Canaan", "Jacob fuit son frère à Haran"],
    associatedCharacters: ["Téra", "Abraham", "Jacob", "Laban", "Rachel", "Léa"],
    territory: "Paddan-Aram",
    category: "Ville caravanière"
  },
  {
    id: "bethel",
    name: "Béthel",
    alternateNames: ["Louz"],
    coordinates: [31.9308, 35.2211],
    startYear: -2000,
    endYear: -100,
    periodDescription: "Lieu saint du centre de Canaan",
    description: "Où Jacob vit en songe l'échelle céleste atteignant les cieux. Plus tard, Jéroboam y installa un veau d'or.",
    biblicalReferences: ["Genèse 12:8", "Genèse 28:19", "1 Rois 12:28-29"],
    associatedEvents: ["Vision de l'échelle de Jacob", "Instauration du culte du veau d'or"],
    associatedCharacters: ["Abraham", "Jacob", "Jéroboam"],
    territory: "Ephraïm / Benjamin",
    category: "Lieu de culte"
  },
  {
    id: "beersheba",
    name: "Beer-Sheva",
    alternateNames: ["Puits du Serment"],
    coordinates: [31.2447, 34.7913],
    startYear: -2000,
    endYear: 2050,
    periodDescription: "Frontière méridionale du pays d'Israël ('de Dan à Beer-Sheva')",
    description: "Lieu d'alliance entre Abraham, Isaac et Abimélek près des puits du Negeb.",
    biblicalReferences: ["Genèse 21:31", "Genèse 26:33", "Juges 20:1"],
    associatedEvents: ["Alliance d'Abraham à Beer-Sheva"],
    associatedCharacters: ["Abraham", "Isaac", "Esaü", "Jacob"],
    territory: "Siméon / Juda",
    category: "Ville frontière"
  },
  {
    id: "shechem",
    name: "Sichem",
    alternateNames: ["Tel Balata", "Nablus"],
    coordinates: [32.2133, 35.2817],
    startYear: -2000,
    endYear: 2050,
    periodDescription: "Cité importante au cœur de la Samarie entre le mont Ébal et le mont Garizim",
    description: "Premier autel d'Abraham en Canaan. Lieu du rassemblement de Josué et capitale initiale du royaume du Nord.",
    biblicalReferences: ["Genèse 12:6", "Josué 24:1", "1 Rois 12:1"],
    associatedEvents: ["Renouvellement de l'alliance sous Josué", "Division des tribus d'Israël"],
    associatedCharacters: ["Abraham", "Jacob", "Joseph", "Josué", "Jéroboam"],
    territory: "Éphraïm",
    category: "Cité royale"
  },
  {
    id: "samaria",
    name: "Samarie",
    alternateNames: ["Shomeron", "Sébaste"],
    coordinates: [32.2764, 35.1894],
    startYear: -880,
    endYear: 200,
    periodDescription: "Capitale du royaume d'Israël (Royaume du Nord)",
    description: "Fondée par le roi Omri, fortifiée par Achab. Prise par les Assyriens en 740/739 av. n. è.",
    biblicalReferences: ["1 Rois 16:24", "2 Rois 17:6", "Actes 8:5"],
    documentaryReferences: ["Ostraca de Samarie", "Annales de Sargon II"],
    associatedEvents: ["Prise de Samarie par l'Assyrie"],
    associatedCharacters: ["Omri", "Achab", "Jézabel", "Élie", "Élisée", "Osée"],
    territory: "Israël (Nord)",
    category: "Capitale"
  },
  {
    id: "babylon",
    name: "Babylone",
    alternateNames: ["Babel", "Babil"],
    coordinates: [32.5422, 44.4211],
    startYear: -2300,
    endYear: 500,
    periodDescription: "Capitale de l'Empire néo-babylonien",
    description: "Cité de la Tour de Babel et capitale de Neboukadnetsar. Lieu de l'exil des Juifs de 607 à 537 av. n. è.",
    biblicalReferences: ["Genèse 11:9", "2 Rois 25:1-11", "Daniel 1:1-6", "Psaume 137"],
    documentaryReferences: ["Cylindre de Cyrus", "Chronique de Nabonide", "Porte d'Ishtar"],
    associatedEvents: ["Tour de Babel", "Destruction de Jérusalem par les Babyloniens", "Prise de Babylone par Cyrus"],
    associatedCharacters: ["Neboukadnetsar", "Daniel", "Cyrus", "Ézéchiel"],
    territory: "Chaldée",
    category: "Capitale impériale"
  },
  {
    id: "bethlehem",
    name: "Bethléem",
    alternateNames: ["Ephrata"],
    coordinates: [31.7054, 35.2024],
    startYear: -1800,
    endYear: 2050,
    periodDescription: "Cité de Juda, berceau de la dynastie davidique",
    description: "Lieu de sépulture de Rachel, naissance de David, et lieu de naissance prophétisé du Messie Jésus.",
    biblicalReferences: ["Genèse 35:19", "Ruth 1:19", "Michée 5:2", "Matthieu 2:1-6", "Luc 2:4-7"],
    associatedEvents: ["Naissance de Jésus"],
    associatedCharacters: ["Rachel", "Ruth", "Boaz", "David", "Jésus", "Marie", "Joseph"],
    territory: "Juda",
    category: "Bourgade biblique"
  },
  {
    id: "nazareth",
    name: "Nazareth",
    alternateNames: ["En-Nasira"],
    coordinates: [32.7019, 35.3033],
    startYear: -100,
    endYear: 2050,
    periodDescription: "Village de Basse-Galilée",
    description: "Lieu où Jésus a grandi avec Marie et Joseph avant le début de son ministère public.",
    biblicalReferences: ["Matthieu 2:23", "Luc 1:26", "Luc 4:16"],
    associatedEvents: ["Annonciation", "Enfance de Jésus"],
    associatedCharacters: ["Jésus", "Marie", "Joseph"],
    territory: "Galilée",
    category: "Village"
  },
  {
    id: "capernaum",
    name: "Capernaüm",
    alternateNames: ["Tell Hum"],
    coordinates: [32.8811, 35.5750],
    startYear: -200,
    endYear: 600,
    periodDescription: "Bourgade lacustre au bord de la mer de Galilée",
    description: "Centre du ministère de Jésus en Galilée, ville de Pierre et André, lieu de nombreux miracles.",
    biblicalReferences: ["Matthieu 4:13", "Marc 1:21", "Jean 6:59"],
    associatedEvents: ["Miracles de Jésus en Galilée"],
    associatedCharacters: ["Jésus", "Pierre", "André", "Jean", "Matthieu"],
    territory: "Galilée",
    category: "Port lacustre"
  },
  {
    id: "sinai",
    name: "Mont Sinaï / Horeb",
    alternateNames: ["Jebel Musa"],
    coordinates: [28.5394, 33.9753],
    startYear: -1600,
    endYear: 2050,
    periodDescription: "Montagne sainte de la péninsule du Sinaï",
    description: "Montagne où Dieu donna les Dix Commandements et l'Alliance de la Loi à Moïse.",
    biblicalReferences: ["Exode 19:11", "Exode 20:1-17", "1 Rois 19:8"],
    associatedEvents: ["Alliance de la Loi", "Buisson ardent"],
    associatedCharacters: ["Moïse", "Aaron", "Élie"],
    territory: "Désert du Sinaï",
    category: "Montagne sacrée"
  },
  {
    id: "damascus",
    name: "Damas",
    alternateNames: ["Dimashq"],
    coordinates: [33.5138, 36.2765],
    startYear: -2500,
    endYear: 2050,
    periodDescription: "Capitale de la Syrie / Aram",
    description: "Une des plus anciennes villes habitées. Conversion de Saul de Tarse sur la route de Damas.",
    biblicalReferences: ["Genèse 14:15", "1 Rois 11:24", "Actes 9:1-19"],
    associatedEvents: ["Conversion de Paul"],
    associatedCharacters: ["Abraham", "Éliézer", "Ben-Hadad", "Paul", "Ananie"],
    territory: "Aram / Syrie",
    category: "Capitale"
  },
  {
    id: "antioch_syria",
    name: "Antioche de Syrie",
    alternateNames: ["Antakya"],
    coordinates: [36.2021, 36.1604],
    startYear: -300,
    endYear: 2050,
    periodDescription: "Troisième métropole de l'Empire romain",
    description: "Base de départ des voyages missionnaires de Paul. C'est là que les disciples furent appelés 'chrétiens' pour la première fois.",
    biblicalReferences: ["Actes 11:26", "Actes 13:1-3", "Actes 15:35"],
    associatedEvents: ["1er Voyage missionnaire", "2e Voyage missionnaire", "3e Voyage missionnaire"],
    associatedCharacters: ["Paul", "Barnabas", "Pierre"],
    territory: "Syrie romaine",
    category: "Centre missionnaire"
  },
  {
    id: "ephesus",
    name: "Éphèse",
    alternateNames: ["Efes"],
    coordinates: [37.9486, 27.3680],
    startYear: -1000,
    endYear: 1000,
    periodDescription: "Grande métropole d'Asie Mineure",
    description: "Ville du grand temple d'Artémis. Paul y prêcha pendant près de 3 ans. Destinataire d'une des 7 lettres de la Révélation.",
    biblicalReferences: ["Actes 19:1-41", "Éphésiens 1:1", "Révélation 2:1"],
    associatedEvents: ["3e Voyage missionnaire", "Rédaction de lettres de Paul"],
    associatedCharacters: ["Paul", "Timothée", "Jean", "Aquila", "Priscille"],
    territory: "Proconsulat d'Asie",
    category: "Métropole antique"
  },
  {
    id: "corinth",
    name: "Corinthe",
    alternateNames: ["Korinthos"],
    coordinates: [37.9056, 22.8803],
    startYear: -1000,
    endYear: 2050,
    periodDescription: "Capitale commerciale de la province romaine d'Achaïe",
    description: "Centre commercial stratégique. Paul y passa 18 mois lors de son 2e voyage et y rédigea plusieurs lettres.",
    biblicalReferences: ["Actes 18:1-18", "1 Corinthiens 1:2", "2 Corinthiens 1:1"],
    associatedEvents: ["2e Voyage missionnaire", "Rédaction des lettres aux Thessaloniciens et aux Romains"],
    associatedCharacters: ["Paul", "Gallion", "Aquila", "Priscille"],
    territory: "Achaïe",
    category: "Port stratégique"
  },
  {
    id: "rome",
    name: "Rome",
    alternateNames: ["Roma"],
    coordinates: [41.9028, 12.4964],
    startYear: -753,
    endYear: 2050,
    periodDescription: "Capitale de l'Empire Romain",
    description: "Centre du monde méditerranéen antique. Paul y fut emprisonné à deux reprises et y rédigea ses lettres de captivité.",
    biblicalReferences: ["Actes 28:16", "Romains 1:7", "2 Timothée 1:17"],
    associatedEvents: ["Paul est envoyé à Rome", "Détention dans une maison louée", "Grand incendie de Rome"],
    associatedCharacters: ["Paul", "Néron", "Luc", "Timothée"],
    territory: "Italie",
    category: "Capitale impériale"
  }
];

const uniqueValues = <T>(values: T[]): T[] => Array.from(new Set(values));

const mergePlaceCorpus = (
  corePlaces: BiblicalPlace[],
  importedPlaces: BiblicalPlace[]
): BiblicalPlace[] => {
  const placesById = new Map(
    corePlaces.map(place => [place.id, place] as const)
  );

  importedPlaces.forEach(importedPlace => {
    const existingPlace = placesById.get(importedPlace.id);
    if (!existingPlace) {
      placesById.set(importedPlace.id, importedPlace);
      return;
    }

    const sourcesByKey = new Map(
      [...(existingPlace.sources || []), ...(importedPlace.sources || [])].map(
        source => [`${source.id}:${source.citation || ''}`, source]
      )
    );

    placesById.set(importedPlace.id, {
      ...importedPlace,
      ...existingPlace,
      alternateNames: uniqueValues([
        ...(existingPlace.alternateNames || []),
        ...(importedPlace.alternateNames || [])
      ]),
      biblicalReferences: uniqueValues([
        ...existingPlace.biblicalReferences,
        ...importedPlace.biblicalReferences
      ]),
      documentaryReferences: uniqueValues([
        ...(existingPlace.documentaryReferences || []),
        ...(importedPlace.documentaryReferences || [])
      ]),
      sources: Array.from(sourcesByKey.values()),
      certainty: existingPlace.certainty || importedPlace.certainty,
      notes: uniqueValues(
        [existingPlace.notes, importedPlace.notes].filter(
          (note): note is string => Boolean(note)
        )
      ).join(' '),
      mapCategory: importedPlace.mapCategory,
      mapReferences: uniqueValues([
        ...(existingPlace.mapReferences || []),
        ...(importedPlace.mapReferences || [])
      ]),
      coordinatePrecision: importedPlace.coordinatePrecision
    });
  });

  return Array.from(placesById.values());
};

export const BIBLICAL_PLACES = mergePlaceCorpus(
  CORE_BIBLICAL_PLACES,
  [...PROMISED_LAND_PLACES, ...PATRIARCH_AND_EXODUS_PLACES]
).map(place => ({
  ...place,
  encyclopediaReferences: INSIGHT_PLACE_REFERENCES[place.id] || []
}));

/**
 * Les tracés et territoires sont volontairement désactivés tant qu'un corpus
 * géographique vérifié n'est pas disponible. La carte reste centrée sur les
 * points d'intérêt documentés.
 */
export const BIBLICAL_ROUTES: BiblicalRoute[] = [];
