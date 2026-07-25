import { join } from 'node:path';
import { loadHistoricalDataset } from '../src/domain/history/contentIO.ts';
import { validateHistoricalDataset } from '../src/domain/history/contentValidation.ts';
import {
  loadKnownApplicationEntities,
  printHistoricalValidationError
} from './historical-script-utils.mjs';

const fixtureMode = process.argv.includes('--fixtures');
const contentRoot = join(
  process.cwd(),
  'content',
  ...(fixtureMode ? ['test-fixtures'] : [])
);

try {
  const dataset = await loadHistoricalDataset(contentRoot);
  const knownEntities = fixtureMode
    ? {}
    : await loadKnownApplicationEntities();
  validateHistoricalDataset(dataset, knownEntities);

  console.log(
    [
      fixtureMode ? 'Jeu fictif validé' : 'Données historiques validées',
      `${dataset.sources.length} source(s)`,
      `${dataset.people.length} personne(s) relue(s)`,
      `${dataset.events.length} événement(s) relu(s)`,
      `${dataset.claims.length} affirmation(s)`,
      `${dataset.presences.length} présence(s)`,
      `${dataset.staging.length} élément(s) en staging ignoré(s)`
    ].join(' · ')
  );
} catch (error) {
  printHistoricalValidationError(error);
  process.exitCode = 1;
}
