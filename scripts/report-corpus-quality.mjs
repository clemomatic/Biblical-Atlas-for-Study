import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createServer } from 'vite';
import { buildCorpusQualityReport } from '../src/domain/history/corpusQuality.ts';
import { loadHistoricalDataset } from '../src/domain/history/contentIO.ts';

const root = process.cwd();
const contentRoot = join(root, 'content');
const reportPath = join(contentRoot, 'generated', 'corpus-quality-report.json');
const verifyOutput = process.argv.includes('--verify-output');
const serialize = value => `${JSON.stringify(value, null, 2)}\n`;

const dataset = await loadHistoricalDataset(contentRoot);
const [relations, calculatedClaims, personLifeResolutions] = await Promise.all([
  readFile(join(contentRoot, 'generated', 'relations.json'), 'utf8').then(JSON.parse),
  readFile(join(contentRoot, 'generated', 'calculated-claims.json'), 'utf8').then(JSON.parse),
  readFile(join(contentRoot, 'generated', 'person-life-resolutions.json'), 'utf8').then(JSON.parse)
]);
const server = await createServer({
  appType: 'custom',
  configFile: false,
  logLevel: 'error',
  optimizeDeps: { noDiscovery: true },
  server: { middlewareMode: true }
});

try {
  const [timeline, map, study] = await Promise.all([
    server.ssrLoadModule('/src/data/timelineEvents.ts'),
    server.ssrLoadModule('/src/data/mapData.ts'),
    server.ssrLoadModule('/src/data/historicalStudyData.ts')
  ]);
  const knownEntities = {
    personIds: study.HISTORICAL_PEOPLE.map(person => person.id),
    placeIds: map.BIBLICAL_PLACES.map(place => place.id),
    eventIds: timeline.EVENTS.map(event => event.id),
    routeIds: map.BIBLICAL_ROUTES.map(route => route.id),
    territoryIds: dataset.territories.map(record => record.territory.id)
  };
  const report = buildCorpusQualityReport({
    dataset,
    knownEntities,
    generatedRelations: relations,
    storedCalculatedClaims: calculatedClaims,
    personLifeResolutions,
    applicationEvents: timeline.EVENTS,
    applicationPlaces: map.BIBLICAL_PLACES,
    migratedPersonIds: study.HISTORICAL_PEOPLE.map(person => person.id)
  });

  if (report.summary.blockingIssues > 0) {
    throw new Error(
      `Le rapport contient ${report.summary.blockingIssues} anomalie(s) bloquante(s).`
    );
  }

  const output = serialize(report);
  if (verifyOutput) {
    const stored = await readFile(reportPath, 'utf8');
    if (stored !== output) {
      throw new Error(
        'Le rapport qualit\u00e9 n\u2019est pas \u00e0 jour ; lancez pnpm quality:report.'
      );
    }
  } else {
    await mkdir(join(contentRoot, 'generated'), { recursive: true });
    await writeFile(reportPath, output, 'utf8');
  }

  console.log([
    'Qualit\u00e9 du corpus',
    `${report.summary.blockingIssues} anomalie(s) bloquante(s)`,
    `${report.summary.backlogItems} \u00e9l\u00e9ment(s) de migration ou de documentation`,
    `${report.summary.generatedRelations} relation(s) v\u00e9rifi\u00e9e(s)`
  ].join(' \u00b7 '));
} finally {
  await server.close();
}