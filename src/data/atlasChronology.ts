import type { EventData, TimelineDisplayLevel } from '../types';
import { createCategoryId } from '../utils/stableIds';
import type {
  AtlasChronologyRecord,
  AtlasLane,
  AtlasVisualGroup
} from './atlasChronologyModel';
import { ATLAS_CHRONOLOGY_CHUNK_1 } from './atlasChronology.chunk1';
import { ATLAS_CHRONOLOGY_CHUNK_2 } from './atlasChronology.chunk2';
import { ATLAS_CHRONOLOGY_CHUNK_3 } from './atlasChronology.chunk3';
import { ATLAS_CHRONOLOGY_CHUNK_4 } from './atlasChronology.chunk4';

export type {
  AtlasAxisSegment,
  AtlasChronologyRecord,
  AtlasLane,
  AtlasVisualGroup
} from './atlasChronologyModel';

const ALL_RECORDS: readonly AtlasChronologyRecord[] = [
  ...ATLAS_CHRONOLOGY_CHUNK_1,
  ...ATLAS_CHRONOLOGY_CHUNK_2,
  ...ATLAS_CHRONOLOGY_CHUNK_3,
  ...ATLAS_CHRONOLOGY_CHUNK_4
];

export const ATLAS_LANES: readonly AtlasLane[] = [{"order":0,"name":"Introduction hors échelle","count":4,"renderMode":"Sous-élément de fiche introductive","rule":"Conserver l’ordre ; les voies vides peuvent se réduire mais jamais se réordonner."},{"order":10,"name":"Arrière-plan, puissances","count":7,"renderMode":"Bande d’arrière-plan","rule":"Conserver l’ordre ; les voies vides peuvent se réduire mais jamais se réordonner."},{"order":100,"name":"Personnages principaux","count":10,"renderMode":"Barre de vie","rule":"Conserver l’ordre ; les voies vides peuvent se réduire mais jamais se réordonner."},{"order":110,"name":"Personnages secondaires","count":72,"renderMode":"Barre de vie","rule":"Conserver l’ordre ; les voies vides peuvent se réduire mais jamais se réordonner."},{"order":200,"name":"Royaume uni et transition","count":4,"renderMode":"Segment de voie spécialisée","rule":"Conserver l’ordre ; les voies vides peuvent se réduire mais jamais se réordonner."},{"order":210,"name":"Royaume de Juda","count":17,"renderMode":"Segment de voie spécialisée","rule":"Conserver l’ordre ; les voies vides peuvent se réduire mais jamais se réordonner."},{"order":220,"name":"Royaume d’Israël","count":20,"renderMode":"Segment de voie spécialisée","rule":"Conserver l’ordre ; les voies vides peuvent se réduire mais jamais se réordonner."},{"order":225,"name":"Pouvoirs politiques","count":3,"renderMode":"Segment superposé sur vie","rule":"Conserver l’ordre ; les voies vides peuvent se réduire mais jamais se réordonner."},{"order":230,"name":"Roi du Nord","count":6,"renderMode":"Barre de période","rule":"Conserver l’ordre ; les voies vides peuvent se réduire mais jamais se réordonner."},{"order":240,"name":"Roi du Sud","count":1,"renderMode":"Barre de période","rule":"Conserver l’ordre ; les voies vides peuvent se réduire mais jamais se réordonner."},{"order":300,"name":"Juges","count":9,"renderMode":"Sous-événement de fiche","rule":"Conserver l’ordre ; les voies vides peuvent se réduire mais jamais se réordonner."},{"order":310,"name":"Prophètes","count":17,"renderMode":"Segment de voie spécialisée","rule":"Conserver l’ordre ; les voies vides peuvent se réduire mais jamais se réordonner."},{"order":400,"name":"Événements","count":117,"renderMode":"Marqueur regroupable","rule":"Conserver l’ordre ; les voies vides peuvent se réduire mais jamais se réordonner."},{"order":500,"name":"Sanctuaire et Arche","count":8,"renderMode":"Sous-événement de fiche","rule":"Conserver l’ordre ; les voies vides peuvent se réduire mais jamais se réordonner."},{"order":600,"name":"Voyages et déplacements","count":10,"renderMode":"Barre de voyage","rule":"Conserver l’ordre ; les voies vides peuvent se réduire mais jamais se réordonner."},{"order":700,"name":"Livres bibliques","count":99,"renderMode":"Ruban repliable","rule":"Conserver l’ordre ; les voies vides peuvent se réduire mais jamais se réordonner."},{"order":800,"name":"Intervalle comprimé","count":1,"renderMode":"Zone d’axe comprimée","rule":"Conserver l’ordre ; les voies vides peuvent se réduire mais jamais se réordonner."},{"order":901,"name":"Séquence future","count":1,"renderMode":"Carte de séquence future","rule":"Conserver l’ordre ; les voies vides peuvent se réduire mais jamais se réordonner."},{"order":902,"name":"Séquence future","count":1,"renderMode":"Carte de séquence future","rule":"Conserver l’ordre ; les voies vides peuvent se réduire mais jamais se réordonner."},{"order":903,"name":"Séquence future","count":1,"renderMode":"Carte de séquence future","rule":"Conserver l’ordre ; les voies vides peuvent se réduire mais jamais se réordonner."},{"order":904,"name":"Séquence future","count":1,"renderMode":"Carte de séquence future","rule":"Conserver l’ordre ; les voies vides peuvent se réduire mais jamais se réordonner."}];

export const ATLAS_VISUAL_GROUPS: readonly AtlasVisualGroup[] = [{"id":"ANTEDILUVIENS","label":"Patriarches antédiluviens","memberCount":17,"summaryZoom":1,"expandedZoom":2,"summaryMode":"Groupe virtuel puis vies","reason":"Éviter un bloc de longues vies presque parallèles.","memberIds":["atlas-0080","bm-creation-adam","atlas-0063","atlas-0104","atlas-0119","genese-kenan","genese-mahalalel","genese-jared","atlas-0144","atlas-0057","atlas-0133","bm-mort-adam","atlas-0079","atlas-0118","atlas-0146","atlas-0105","genese-cham"],"existingSummaryId":null},{"id":"AUTRES","label":"Autres éléments","memberCount":5,"summaryZoom":3,"expandedZoom":4,"summaryMode":"Détails à la demande","reason":"Conserver les éléments atypiques sans encombrer les vues générales.","memberIds":["atlas-0188","samuel-circuit","samuel-enfance-rama","atlas-0160","samuel-rama"],"existingSummaryId":null},{"id":"CONGREGATION_I_SIECLE","label":"Congrégation du Ier siècle","memberCount":37,"summaryZoom":1,"expandedZoom":2,"summaryMode":"Groupe puis individus","reason":"Limiter la densité exceptionnelle des années 30 à 100.","memberIds":["atlas-0055","atlas-0056","atlas-0182","wcg-barnabe","wcg-etienne","atlas-0049","wcg-paul","wcg-marc","bm-bapteme-jesus-29","it-jean-ministere-29","it-pierre-rencontre-29","timothee-vie","bm-apotres-sermon-31","wcg-pentecote-33","bm-mort-jesus","bm-resurrection-jesus","bm-resurrection-lazare","wcg-gentils-36","atlas-0175","it-barnabe-paul-36","wcg-matthieu-41","atlas-0177","atlas-0181","atlas-0183","atlas-0180","atlas-0179","it-paul-secours-46","it-marc-voyage-47","atlas-0178","atlas-0186","timothee-responsabilites-61-64","atlas-0184","bm-revolte-juive-66","wcg-jerusalem-70","atlas-0185","wcg-fin-bible-98","bm-mort-jean-100"],"existingSummaryId":null},{"id":"EMPIRES","label":"Puissances et empires","memberCount":32,"summaryZoom":0,"expandedZoom":4,"summaryMode":"Arrière-plan","reason":"Les puissances donnent le contexte sans consommer de voie verticale.","memberIds":["wcg-egypte-1600","wcg-assyrie-874","wcg-babylone-625","wcg-medo-perse-539","atlas-0050","atlas-0022","atlas-0051","atlas-0052","atlas-0053","wcg-esther","wcg-temple-515","atlas-0054","it-esther-vasti-493","it-esther-reine-489","wcg-nehemie","it-esther-haman-484","it-nehemie-rapport-456","it-nehemie-autorisation-455","atlas-0048","atlas-0025","wcg-grece-332","atlas-0027","atlas-0028","atlas-0026","atlas-0029","atlas-0008","atlas-0116","wcg-elisabeth","wcg-rome-63","atlas-0023","power-anglo-american-1914","atlas-0024"],"existingSummaryId":null},{"id":"EXIL_RETOUR","label":"Exil et rétablissement","memberCount":40,"summaryZoom":1,"expandedZoom":2,"summaryMode":"Groupes et événements","reason":"Mettre l’accent sur 607, 539, 537, 515 et 455.","memberIds":["atlas-0074","it-ezechias-maladie-732","atlas-0066","atlas-0075","it-manasse-regne-716","atlas-0089","atlas-0071","ezechiel-regne-josias","it-josias-recherche-651","it-josias-purification-647","atlas-0122","ezechiel-naissance","ezechiel-vie","atlas-0076","ezechiel-houlda","wcg-daniel-groupe","atlas-0100","atlas-0093","ezechiel-habacuc","ezechiel-carchemish-625","atlas-0142","ezechiel-joachim-rebellion-618","atlas-0143","atlas-0062","atlas-0141","atlas-0151","ezechiel-exil-617","ezechiel-ministere","ezechiel-appel-613","ezechiel-vision-temple-612","ezechiel-peches-611","ezechiel-femme-siege-609","ezechiel-sedecias-rebellion-609","desolation-juda-607","atlas-0153","ezechiel-abdias","ezechiel-confirmation-607","ezechiel-vision-temple-593","ezechiel-egypte-591","atlas-0047"],"existingSummaryId":"wcg-daniel-groupe"},{"id":"EXODE_CONQUETE","label":"Exode et conquête","memberCount":8,"summaryZoom":1,"expandedZoom":2,"summaryMode":"Personnages et jalons","reason":"Montrer Moïse, Josué et les événements structurants avant les détails.","memberIds":["atlas-0132","atlas-0131","wcg-rahab","atlas-0014","it-rahab-espions-1473","it-rahab-sauvee-1473","it-caleb-hebron-1467","bm-conquete-canaan-1467"],"existingSummaryId":"wcg-shifra-groupe"},{"id":"FAMILLE_JACOB","label":"Famille de Jacob","memberCount":12,"summaryZoom":1,"expandedZoom":3,"summaryMode":"Groupe familial puis individus","reason":"Les douze enfants ne doivent pas former douze voies au faible zoom.","memberIds":["atlas-0061","atlas-0121","atlas-0148","atlas-0135","atlas-0156","atlas-0161","atlas-0164","atlas-0162","atlas-0165","atlas-0166","atlas-0159","atlas-0168"],"existingSummaryId":null},{"id":"FUTUR_PROPHETIQUE","label":"Séquence prophétique future","memberCount":4,"summaryZoom":0,"expandedZoom":4,"summaryMode":"Séquence ordinale","reason":"L’ordre est connu mais les distances temporelles ne le sont pas.","memberIds":["future-armageddon-kings-end","future-gog-coalition-attack","future-great-tribulation-start","future-anointed-gathered"],"existingSummaryId":null},{"id":"INTRO_CREATION","label":"Avant l’histoire humaine","memberCount":3,"summaryZoom":0,"expandedZoom":4,"summaryMode":"Carte fixe","reason":"Ne jamais étirer l’axe jusqu’aux milliards d’années.","memberIds":["genese-univers","genese-terre","genese-jours-creation"],"existingSummaryId":null},{"id":"ISRAEL","label":"Royaume d’Israël","memberCount":20,"summaryZoom":1,"expandedZoom":2,"summaryMode":"Voie politique contiguë","reason":"Les règnes sont des segments successifs dans une voie fixe.","memberIds":["atlas-0091","atlas-0097","atlas-0090","atlas-0098","atlas-0095","atlas-0101","atlas-0094","atlas-0092","atlas-0096","atlas-0140","atlas-0113","atlas-0115","atlas-0128","atlas-0114","atlas-0110","atlas-0127","atlas-0117","atlas-0130","atlas-0138","atlas-0149"],"existingSummaryId":null},{"id":"JESUS_ENTOURAGE","label":"Jésus et son entourage","memberCount":9,"summaryZoom":1,"expandedZoom":2,"summaryMode":"Groupe puis vies","reason":"Jésus reste visible au zoom global ; son entourage apparaît ensuite.","memberIds":["wcg-joseph","wcg-marie-mere","wcg-marie-bethanie","wcg-jean-apotre","wcg-marie-magdala","wcg-pierre","atlas-0187","atlas-0036","atlas-0077"],"existingSummaryId":null},{"id":"JUDA","label":"Royaume de Juda","memberCount":11,"summaryZoom":1,"expandedZoom":2,"summaryMode":"Voie politique contiguë","reason":"Les règnes sont des segments successifs dans une voie fixe.","memberIds":["atlas-0039","atlas-0040","atlas-0126","atlas-0152","atlas-0072","atlas-0070","atlas-0067","atlas-0125","atlas-0086","atlas-0150","atlas-0157"],"existingSummaryId":null},{"id":"JUGES","label":"Époque des juges","memberCount":20,"summaryZoom":1,"expandedZoom":2,"summaryMode":"Groupe extensible","reason":"La période collective remplace les juges individuels au zoom faible.","memberIds":["wcg-juges-groupe","samuel-naissance","samuel-vie","it-jephte-juge","wcg-jonathan","it-samson-juge","samuel-juge","samuel-appel","samuel-fratrie","samuel-prophete","it-gideon-juge","it-deborah-juge","samuel-mizpa","it-ruth-bethleem","samuel-presentation-silo","samuel-onction-david","fille-jephthe-service","samuel-fils-juges","it-ruth-moab","samuel-visites-parents"],"existingSummaryId":"wcg-juges-groupe"},{"id":"LIVRES_EVANGILES_ACTES","label":"Évangiles et Actes","memberCount":8,"summaryZoom":2,"expandedZoom":4,"summaryMode":"Ruban regroupé puis livres","reason":"Conserver la frise du Ier siècle lisible.","memberIds":["book-period-42","book-period-40","book-period-41","book-period-44","book-writing-40","book-writing-42","it-marc-evangile-60-65","book-writing-44"],"existingSummaryId":null},{"id":"LIVRES_GENERALES","label":"Lettres générales","memberCount":4,"summaryZoom":2,"expandedZoom":4,"summaryMode":"Ruban regroupé puis livres","reason":"Développer seulement sur demande.","memberIds":["book-writing-60","bm-jacques-avant-62","book-writing-61","book-writing-65"],"existingSummaryId":null},{"id":"LIVRES_HISTORIQUES","label":"Livres historiques","memberCount":27,"summaryZoom":2,"expandedZoom":4,"summaryMode":"Ruban regroupé puis livres","reason":"Regrouper par période ou date de rédaction avant le zoom d’étude.","memberIds":["book-period-06","book-writing-06","atlas-0006","atlas-0031","book-writing-07","book-writing-08","book-writing-09","atlas-0033","atlas-0068","book-writing-10","atlas-0060","atlas-0005","atlas-0030","book-writing-11","book-writing-12","atlas-0009","atlas-0038","book-writing-17","book-writing-13","book-writing-14","book-writing-15","atlas-0010","book-writing-16","bm-lettres-rome-60-61","it-pierre-lettres-62-64","it-jean-ecrits-98","book-period-08"],"existingSummaryId":null},{"id":"LIVRES_JEAN","label":"Écrits de Jean","memberCount":6,"summaryZoom":2,"expandedZoom":4,"summaryMode":"Ruban regroupé puis livres","reason":"Regrouper les écrits datés vers 96-98.","memberIds":["book-period-43","bm-revelation-96","book-writing-62","book-writing-63","book-writing-64","book-writing-43"],"existingSummaryId":null},{"id":"LIVRES_PAUL","label":"Lettres de Paul","memberCount":14,"summaryZoom":2,"expandedZoom":4,"summaryMode":"Ruban regroupé puis livres","reason":"Regrouper les nombreuses lettres autour de 50 à 65.","memberIds":["atlas-0044","atlas-0043","atlas-0045","atlas-0041","atlas-0042","atlas-0015","atlas-0017","book-writing-50","atlas-0020","atlas-0016","atlas-0018","atlas-0021","atlas-0019","atlas-0174"],"existingSummaryId":null},{"id":"LIVRES_PENTATEUQUE","label":"Pentateuque","memberCount":10,"summaryZoom":2,"expandedZoom":4,"summaryMode":"Ruban regroupé puis livres","reason":"Les livres ne doivent jamais occuper la frise principale en permanence.","memberIds":["atlas-0004","atlas-0107","book-writing-01","book-writing-02","book-writing-03","book-period-03","atlas-0035","book-writing-05","book-writing-04","atlas-0099"],"existingSummaryId":null},{"id":"LIVRES_POETIQUES","label":"Livres poétiques","memberCount":6,"summaryZoom":2,"expandedZoom":4,"summaryMode":"Ruban regroupé puis livres","reason":"Afficher les titres individuels uniquement au zoom d’étude.","memberIds":["atlas-0059","book-writing-18","bm-chant-salomon-1020","book-writing-21","book-writing-20","book-writing-19"],"existingSummaryId":null},{"id":"LIVRES_PROPHETIQUES","label":"Livres prophétiques","memberCount":25,"summaryZoom":2,"expandedZoom":4,"summaryMode":"Ruban regroupé puis livres","reason":"Éviter les amas de rédaction aux mêmes années.","memberIds":["book-writing-32","book-writing-29","book-writing-30","book-period-28","atlas-0123","book-period-33","book-writing-28","book-writing-23","book-writing-33","book-writing-36","atlas-0108","book-writing-34","book-writing-35","atlas-0083","atlas-0137","book-writing-31","book-writing-25","book-writing-26","book-writing-24","book-writing-27","book-writing-37","book-period-37","book-period-38","book-writing-38","book-writing-39"],"existingSummaryId":null},{"id":"PATRIARCHES","label":"Patriarches et familles","memberCount":26,"summaryZoom":1,"expandedZoom":2,"summaryMode":"Groupe puis vies principales","reason":"Faire apparaître Abraham, Sara, Isaac et Jacob à l’échelle de l’époque.","memberIds":["atlas-0147","bm-naissance-abraham","atlas-0155","atlas-0102","genese-ismael","atlas-0081","wcg-rebecca","it-isaac-mariage-1878","atlas-0106","genese-esau","atlas-0078","genese-mariages-jacob","genese-dina","atlas-0167","atlas-0169","atlas-0170","it-joseph-pharaon-1737","it-famine-egypte-1730","atlas-0103","wcg-shifra-groupe","atlas-0082","atlas-0007","atlas-0037","it-moise-madian-1553","wcg-caleb","atlas-0163"],"existingSummaryId":null},{"id":"POSTDELUGE","label":"Lignée après le Déluge","memberCount":10,"summaryZoom":1,"expandedZoom":3,"summaryMode":"Groupe virtuel puis vies","reason":"La généalogie reste accessible sans saturer la vue générale.","memberIds":["atlas-0073","atlas-0120","atlas-0134","atlas-0058","atlas-0154","atlas-0145","genese-reou","genese-seroug","genese-nahor","atlas-0158"],"existingSummaryId":null},{"id":"PROPHETES_ROYAUMES","label":"Prophètes des royaumes","memberCount":7,"summaryZoom":1,"expandedZoom":2,"summaryMode":"Voie prophétique","reason":"Les prophètes apparaissent en regard des règnes contemporains.","memberIds":["atlas-0084","atlas-0069","atlas-0124","atlas-0139","atlas-0065","atlas-0109","atlas-0085"],"existingSummaryId":"wcg-elie-veuve"},{"id":"ROIS_RIVAUX","label":"Roi du Nord et roi du Sud","memberCount":12,"summaryZoom":0,"expandedZoom":1,"summaryMode":"Bandes et événements","reason":"Montrer les grandes phases, puis les détails au zoom supérieur.","memberIds":["north-south-gap-2c-1870","king-south-britain-1870","time-end-organized-1870","king-north-germany-1871","north-south-ww1-1914","king-north-nazi-1933","king-north-ussr-1945","north-south-nato-1949","north-ussr-collapse-1991","king-north-russia-emerges-1991","north-russia-ban-2017","north-identification-2018"],"existingSummaryId":null},{"id":"ROYAUME_UNI","label":"Royaume uni","memberCount":21,"summaryZoom":1,"expandedZoom":2,"summaryMode":"Voie politique et personnages","reason":"Séparer Saül, David et Salomon sans multiplier les lignes.","memberIds":["atlas-0087","samuel-onction-saul","atlas-0111","atlas-0189","wcg-abigail-nathan","wcg-mefibosheth","it-david-roi-1077","samuel-mort","atlas-0129","bm-alliance-david-1070","atlas-0088","bm-couronnement-salomon-1037","atlas-0034","wcg-temple-1027","wcg-joad","atlas-0032","atlas-0046","wcg-elie-veuve","atlas-0112","wcg-petite-israelite","atlas-0136"],"existingSummaryId":null},{"id":"SANCTUAIRE","label":"Sanctuaire et Arche","memberCount":8,"summaryZoom":2,"expandedZoom":3,"summaryMode":"Voie spécialisée","reason":"Les déplacements de l’Arche et du tabernacle sont des détails contextuels.","memberIds":["femmes-service-silo","arche-philistins","arche-kiriath-20-ans","arche-capture-silo","samuel-service-silo","tabernacle-fin-silo","tabernacle-gabaon","tabernacle-nob"],"existingSummaryId":null},{"id":"VOYAGES_PAUL","label":"Voyages de Paul","memberCount":7,"summaryZoom":2,"expandedZoom":3,"summaryMode":"Voie de parcours","reason":"Les voyages restent liés à la carte et non à la vue globale.","memberIds":["atlas-0013","atlas-0012","atlas-0011","atlas-0176","atlas-0171","atlas-0172","atlas-0173"],"existingSummaryId":null}];

const FUZZY_PATTERN = /vers|avant|après|environ|approxim|probable|incertain/i;

const layerColor = (layer: string): string => {
  switch (layer) {
    case 'Personnages':
      return '#2563eb';
    case 'Règnes':
      return '#e11d48';
    case 'Prophètes':
    case 'Ministère chrétien':
      return '#7c3aed';
    case 'Juges':
      return '#b45309';
    case 'Voyages':
      return '#059669';
    case 'Sanctuaire':
      return '#0f766e';
    case 'Livres bibliques':
      return '#4f46e5';
    case 'Puissances mondiales':
      return '#64748b';
    case 'Alliances':
      return '#9a3412';
    case 'Repères scientifiques':
      return '#334155';
    default:
      return '#a855f7';
  }
};

const timelineLevelFor = (record: AtlasChronologyRecord): TimelineDisplayLevel =>
  record.zoomMin <= 0 ? 'overview' : record.zoomMin <= 2 ? 'study' : 'detail';

const calendarYearFromAxisPosition = (
  value: number,
  segment: AtlasChronologyRecord['segment']
): number => {
  if (segment === 'INTRO_HORS_ECHELLE' || value >= 0) return value;
  return value - 1;
};

const splitRouteIds = (value?: string): string[] | undefined => {
  const values = value
    ?.split('|')
    .map(item => item.trim())
    .filter(Boolean);
  return values?.length ? values : undefined;
};

const toEvent = (record: AtlasChronologyRecord): EventData => {
  const markerLike =
    record.renderMode === 'Marqueur regroupable' ||
    record.renderMode.includes('Carte') ||
    record.segment === 'FUTUR_RELATIF';
  const isPoint = markerLike || record.start === record.end;
  const fuzzyStart =
    FUZZY_PATTERN.test(record.startLabel ?? '') ||
    record.certainty === 'possible' ||
    record.certainty === 'unknown';
  const fuzzyEnd =
    FUZZY_PATTERN.test(record.endLabel ?? '') ||
    record.certainty === 'possible' ||
    record.certainty === 'unknown';

  return {
    id: record.id,
    text: record.title,
    categoryId: createCategoryId(record.categoryName),
    category: record.categoryName,
    startRaw: record.startLabel ?? record.displayDateLabel,
    endRaw: record.endLabel ?? record.startLabel ?? record.displayDateLabel,
    startYear: calendarYearFromAxisPosition(record.start, record.segment),
    endYear: calendarYearFromAxisPosition(record.end, record.segment),
    startPos: record.start,
    endPos: record.end,
    isPoint,
    fuzzyStart,
    fuzzyEnd,
    description: record.description,
    notes: record.notes,
    certainty: record.certainty,
    timelineLevel: timelineLevelFor(record),
    defaultColor: layerColor(record.layer),
    biblicalReferences: record.biblicalReferences,
    documentaryReferences: record.documentaryReferences,
    sources: record.sources,
    associatedRouteIds: splitRouteIds(record.routeId),
    associatedCharacterIds: record.linkedPersonIds
  };
};

export const ATLAS_CHRONOLOGY_RECORDS = ALL_RECORDS.filter(
  record => record.status !== 'Non retenu'
);

export const ATLAS_CHRONOLOGY_EVENTS: EventData[] =
  ATLAS_CHRONOLOGY_RECORDS.map(toEvent);

export const ATLAS_RENDER_BY_ID = new Map(
  ATLAS_CHRONOLOGY_RECORDS.map(record => [record.id, record] as const)
);

export const ATLAS_GROUP_BY_ID = new Map(
  ATLAS_VISUAL_GROUPS.map(group => [group.id, group] as const)
);

export const ATLAS_RECORD_BY_ID = new Map(
  ATLAS_CHRONOLOGY_RECORDS.map(record => [record.id, record] as const)
);
