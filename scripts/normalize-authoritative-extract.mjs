import fs from 'node:fs/promises';
import path from 'node:path';

const [extractPath, roadsPath, nodesPath, linksPath, outputDir] = process.argv.slice(2);
if (!extractPath || !roadsPath || !nodesPath || !linksPath || !outputDir) {
  throw new Error('Usage: node scripts/normalize-authoritative-extract.mjs <extract.json> <roads.geojson> <nodes.geojson> <links.json> <output-dir>');
}

const splitPipe = value =>
  typeof value === 'string'
    ? value.split('|').map(item => item.trim()).filter(Boolean)
    : [];
const text = value => (value === null || value === undefined ? undefined : String(value).trim() || undefined);
const number = value => (typeof value === 'number' && Number.isFinite(value) ? value : undefined);
const urls = value => [...new Set((text(value)?.match(/https?:\/\/[^\s]+/g) ?? []).map(url => url.replace(/[),.;]+$/, '')))];
const withoutUrls = value => text(value)?.replace(/https?:\/\/[^\s]+/g, '').split(/\n|;/).map(item => item.trim()).filter(Boolean) ?? [];

const historicalYear = (value, era) => {
  const year = number(value);
  const normalizedEra = text(era)?.toLocaleLowerCase('fr') ?? '';
  if (!year || year === 0) return undefined;
  if (normalizedEra.includes('av. n.') || normalizedEra.includes('av. notre')) return -Math.abs(year);
  if (normalizedEra.includes('de n.') || normalizedEra.includes('notre ère')) return Math.abs(year);
  return undefined;
};

const rowsToObjects = (rows, headerRowIndex) => {
  const headers = rows[headerRowIndex].map(header => text(header));
  return rows.slice(headerRowIndex + 1)
    .filter(row => row.some(value => value !== null && value !== undefined && value !== ''))
    .map(row => Object.fromEntries(headers.map((header, index) => [header ?? `column-${index + 1}`, row[index] ?? null])));
};

const extract = JSON.parse(await fs.readFile(extractPath, 'utf8'));
const chronologyRows = rowsToObjects(extract['Chronologie globale'], 4);
const sourceRows = rowsToObjects(extract['Référentiel sources'], 3);
const itineraryRows = rowsToObjects(extract['Index itinéraires'], 3);
const stepRows = rowsToObjects(extract['Synchronisation carte'], 3);

const records = chronologyRows
  .filter(row => text(row.Statut) !== 'Non retenu')
  .map(row => {
    const startYear = historicalYear(row['Année début'], row['Ère début']);
    const endYear = historicalYear(row['Année fin'], row['Ère fin']);
    const sourceText = text(row['Références et source']) ?? '';
    return {
      id: text(row.ID),
      status: text(row.Statut),
      recordType: text(row.Type),
      category: text(row.Catégorie),
      subject: text(row.Sujet),
      title: text(row.Titre),
      placeLabel: text(row.Lieu),
      startLabel: text(row['Début affiché']),
      startYear,
      startEra: text(row['Ère début']),
      startMonth: text(row['Mois biblique début']),
      startDay: number(row['Jour début']),
      startPrecision: text(row['Précision début']),
      endLabel: text(row['Fin affichée']),
      endYear,
      endEra: text(row['Ère fin']),
      endMonth: text(row['Mois biblique fin']),
      endDay: number(row['Jour fin']),
      endPrecision: text(row['Précision fin']),
      sourceText,
      sourceUrls: urls(sourceText),
      citedReferences: withoutUrls(sourceText),
      notes: text(row.Notes),
      datingMethod: text(row['Méthode de datation']),
      normalizedMethod: text(row['Méthode normalisée']),
      confidence: text(row['Confiance normalisée']) ?? text(row.Confiance),
      positioningNotes: text(row['Positionnement / hypothèses']),
      layer: text(row.Couche),
      importance: number(row.Importance),
      scale: text(row['Échelle']),
      personId: text(row['ID personnage principal']),
      linkedPersonIds: splitPipe(row['Personnages liés']),
      startMin: number(row['Borne début min']),
      startMax: number(row['Borne début max']),
      endMin: number(row['Borne fin min']),
      endMax: number(row['Borne fin max']),
      ageAtStart: text(row['Âge principal au début']),
      relatedAgesAtStart: text(row['Âges liés au début']),
      durationYears: number(row['Durée calculée (ans)']),
      defaultVisible: text(row['Afficher par défaut']) === 'Oui',
      displayEra: text(row['Ère visuelle']),
      axisSegment: text(row['Segment d’axe']),
      zoomMin: number(row['Zoom min']) ?? 0,
      zoomMax: number(row['Zoom max']) ?? 4,
      renderMode: text(row['Mode de rendu']),
      visualGroupId: text(row['Groupe visuel']),
      visualParentId: text(row['ID parent visuel']),
      visualMemberIds: splitPipe(row['Membres du groupe']),
      shortLabel: text(row['Label court']),
      labelPriority: number(row['Priorité du label']) ?? 3,
      laneId: text(row['Voie verticale']),
      laneOrder: number(row['Ordre dans la voie']) ?? 999,
      groupingKey: text(row['Clé de regroupement']),
      clickBehavior: text(row['Comportement au clic']),
      collisionPolicy: text(row['Politique de collision']),
      minLabelWidth: number(row['Largeur minimale label (px)']) ?? 72,
      allianceIds: splitPipe(row['Alliances liées']),
      calendarContext: text(row['Contexte calendrier auto']),
      calendarMonth: text(row['Mois contextuel']),
      calendarDay: number(row['Jour contextuel']),
      calendarPrecision: text(row['Précision calendrier civil']),
      geographicKey: text(row['Clé géographique proposée']),
      mapMatchStatus: text(row['Statut correspondance carte']),
      itineraryIds: splitPipe(row['ID itinéraire']),
      itineraryStepOrder: number(row['Ordre étape']),
      mapAction: text(row['Action carte'])
    };
  });

const sources = sourceRows.map(row => ({
  id: text(row.Code),
  publication: text(row.Publication),
  section: text(row.Section),
  purpose: text(row.Utilité),
  url: text(row['Lien Bibliothèque en Ligne']),
  datingRule: text(row['Règle de datation'])
}));

const stepsByItinerary = new Map();
for (const row of stepRows) {
  const id = text(row['ID itinéraire']);
  if (!id) continue;
  const steps = stepsByItinerary.get(id) ?? [];
  steps.push({
    order: number(row['Ordre étape']) ?? steps.length + 1,
    placeOrSegment: text(row['Lieu / segment']),
    geographicKey: text(row['Clé proposée']),
    geometryType: text(row['Type géométrie']),
    summary: text(row['Résumé de l’étape']),
    biblicalReference: text(row['Référence biblique']),
    relativePosition: number(row['Position relative']),
    temporalPrecision: text(row['Précision temporelle']),
    geographicPrecision: text(row['Précision géographique']),
    mapAction: text(row['Action carte']),
    linkStatus: text(row['Statut liaison']),
    sourceUrl: text(row['Source Bibliothèque en Ligne']),
    traceNotes: text(row['Notes de tracé'])
  });
  stepsByItinerary.set(id, steps);
}

const itineraries = itineraryRows.map(row => {
  const id = text(row['ID itinéraire']);
  return {
    id,
    peopleLabel: text(row['Personnage(s)']),
    category: text(row.Catégorie),
    name: text(row.Nom),
    periodLabel: text(row.Période),
    chronologyRecordIds: splitPipe(row['Ligne(s) chronologie']),
    declaredStepCount: number(row['Nombre d’étapes']),
    regions: number(row.Régions),
    precision: text(row['Précision générale']),
    sourceUrl: text(row.Source),
    steps: (stepsByItinerary.get(id) ?? []).sort((left, right) => left.order - right.order)
  };
});

const roads = JSON.parse(await fs.readFile(roadsPath, 'utf8'));
const nodes = JSON.parse(await fs.readFile(nodesPath, 'utf8'));
const links = JSON.parse(await fs.readFile(linksPath, 'utf8'));

await fs.mkdir(outputDir, { recursive: true });
await Promise.all([
  fs.writeFile(path.join(outputDir, 'authoritative-chronology.generated.json'), `${JSON.stringify({
    schemaVersion: 1,
    authorityPolicy: 'validated-research-supersedes-matching-legacy-records',
    bookPeriodVisualPolicy: 'preserve-current-atlas-rendering',
    recordCount: records.length,
    sourceCount: sources.length,
    records,
    sources,
    itineraries
  }, null, 2)}\n`, 'utf8'),
  fs.writeFile(path.join(outputDir, 'historical-roads.generated.json'), `${JSON.stringify(roads, null, 2)}\n`, 'utf8'),
  fs.writeFile(path.join(outputDir, 'historical-road-nodes.generated.json'), `${JSON.stringify(nodes, null, 2)}\n`, 'utf8'),
  fs.writeFile(path.join(outputDir, 'historical-itinerary-links.generated.json'), `${JSON.stringify(links, null, 2)}\n`, 'utf8')
]);

console.log(`Normalized ${records.length} chronology records, ${sources.length} sources, ${itineraries.length} itineraries and ${roads.features.length} road segments.`);
