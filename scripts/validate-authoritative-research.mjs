import fs from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const readJson = async relativePath =>
  JSON.parse(await fs.readFile(new URL(relativePath, root), 'utf8'));

const chronology = await readJson('src/data/generated/authoritative-chronology.generated.json');
const roads = await readJson('src/data/generated/historical-roads.generated.json');
const nodes = await readJson('src/data/generated/historical-road-nodes.generated.json');
const links = await readJson('src/data/generated/historical-itinerary-links.generated.json');

const errors = [];
const check = (condition, message) => {
  if (!condition) errors.push(message);
};
const duplicates = values =>
  [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];

check(chronology.authorityPolicy === 'validated-research-supersedes-matching-legacy-records', 'La politique de priorité du corpus est absente ou incorrecte.');
check(chronology.bookPeriodVisualPolicy === 'preserve-current-atlas-rendering', 'L’exception visuelle des périodes de livres bibliques doit être conservée.');
check(chronology.recordCount === chronology.records.length, 'Le nombre déclaré de fiches chronologiques est incohérent.');
check(duplicates(chronology.records.map(record => record.id)).length === 0, 'Des identifiants chronologiques sont dupliqués.');

chronology.records.forEach(record => {
  check(Boolean(record.id && record.title), `Fiche incomplète : ${record.id ?? '(sans ID)'}.`);
  check(record.status === 'Documenté', `La fiche ${record.id} n’est pas marquée Documenté.`);
  check(record.startYear !== 0 && record.endYear !== 0, `La fiche ${record.id} utilise l’année zéro.`);
  check(record.zoomMin >= 0 && record.zoomMax <= 4 && record.zoomMin <= record.zoomMax, `Plage de zoom invalide pour ${record.id}.`);
  check(record.sourceUrls.length > 0, `La fiche ${record.id} ne conserve aucune URL source.`);
  if (record.startYear !== undefined && record.endYear !== undefined) {
    check(record.startYear <= record.endYear, `Période inversée pour ${record.id}.`);
  }
});

check(duplicates(chronology.sources.map(source => source.id)).length === 0, 'Des sources du classeur ont un code dupliqué.');
chronology.sources.forEach(source => {
  check(Boolean(source.id && source.publication && source.url), `Source incomplète : ${source.id ?? '(sans ID)'}.`);
});

const roadIds = roads.features.map(feature => feature.properties.road_segment_id);
const roadIdSet = new Set(roadIds);
check(duplicates(roadIds).length === 0, 'Des segments routiers ont un ID dupliqué.');
roads.features.forEach(feature => {
  const { properties, geometry } = feature;
  check(geometry.type === 'LineString' && geometry.coordinates.length >= 2, `Géométrie routière invalide : ${properties.road_segment_id}.`);
  check(['high', 'probable', 'hypothetical'].includes(properties.certainty), `Certitude routière invalide : ${properties.road_segment_id}.`);
  check(properties.period_start !== 0 && properties.period_end !== 0 && properties.period_start <= properties.period_end, `Période routière invalide : ${properties.road_segment_id}.`);
  check(Boolean(properties.source_url), `Source routière absente : ${properties.road_segment_id}.`);
  geometry.coordinates.forEach(([longitude, latitude]) => {
    check(Number.isFinite(longitude) && longitude >= -180 && longitude <= 180, `Longitude invalide : ${properties.road_segment_id}.`);
    check(Number.isFinite(latitude) && latitude >= -90 && latitude <= 90, `Latitude invalide : ${properties.road_segment_id}.`);
  });
});

const nodeIds = nodes.features.map(feature => feature.properties.node_id);
check(duplicates(nodeIds).length === 0, 'Des nœuds routiers ont un ID dupliqué.');
nodes.features.forEach(feature => {
  const [longitude, latitude] = feature.geometry.coordinates;
  check(Number.isFinite(longitude) && Number.isFinite(latitude), `Coordonnée de nœud invalide : ${feature.properties.node_id}.`);
});

let linkedSegmentReferences = 0;
Object.values(links.itineraries).forEach(itinerary => {
  itinerary.legs.forEach(leg => {
    leg.road_segments.forEach(segment => {
      linkedSegmentReferences += 1;
      check(roadIdSet.has(segment.segment_id), `Segment inconnu ${segment.segment_id} dans ${itinerary.itinerary_id}.`);
      check(segment.direction === 'forward' || segment.direction === 'reverse', `Direction invalide pour ${segment.segment_id}.`);
    });
  });
});

if (errors.length > 0) {
  console.error(`Validation du corpus autoritatif échouée (${errors.length} erreur(s)) :`);
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}

console.log('Corpus autoritatif valide.');
console.log(`- ${chronology.records.length} fiches chronologiques documentées`);
console.log(`- ${chronology.sources.length} entrées de source`);
console.log(`- ${chronology.itineraries.length} itinéraires décrits (${Object.keys(links.itineraries).length} reliés au réseau)`);
console.log(`- ${roads.features.length} segments et ${nodes.features.length} nœuds routiers`);
console.log(`- ${linkedSegmentReferences} références de segments dans les itinéraires`);
