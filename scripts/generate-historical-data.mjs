import {
  mkdir,
  writeFile
} from 'node:fs/promises';
import { join } from 'node:path';
import { generateDerivedHistoricalRelations } from '../src/domain/history/contentGeneration.ts';
import { buildHistoricalIndex } from '../src/domain/history/historicalIndex.ts';
import { loadHistoricalDataset } from '../src/domain/history/contentIO.ts';
import {
  validateGeneratedRelations,
  validateHistoricalDataset
} from '../src/domain/history/contentValidation.ts';
import {
  loadKnownApplicationEntities,
  printHistoricalValidationError
} from './historical-script-utils.mjs';

const contentRoot = join(process.cwd(), 'content');
const generatedDirectory = join(contentRoot, 'generated');
const relationsOutputPath = join(generatedDirectory, 'relations.json');
const indexOutputPath = join(generatedDirectory, 'historical-index.json');

try {
  const dataset = await loadHistoricalDataset(contentRoot);
  const knownEntities = await loadKnownApplicationEntities();

  // La génération s’arrête avant toute écriture si reviewed n’est pas valide.
  validateHistoricalDataset(dataset, knownEntities);
  const relations = generateDerivedHistoricalRelations(dataset);
  validateGeneratedRelations(relations, dataset, knownEntities);
  const historicalIndex = buildHistoricalIndex(dataset, relations);

  await mkdir(generatedDirectory, { recursive: true });
  await writeFile(
    relationsOutputPath,
    `${JSON.stringify(relations, null, 2)}\n`,
    'utf8'
  );
  await writeFile(
    indexOutputPath,
    `${JSON.stringify(historicalIndex, null, 2)}\n`,
    'utf8'
  );
  console.log(
    `Génération historique terminée : ${relations.length} relation(s), ${historicalIndex.lifespans.length} vie(s), ${historicalIndex.activities.length} activité(s), ${historicalIndex.events.length} événement(s), ${historicalIndex.presences.length} présence(s), staging ignoré.`
  );
} catch (error) {
  printHistoricalValidationError(error);
  process.exitCode = 1;
}
