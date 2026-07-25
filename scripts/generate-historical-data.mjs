import {
  mkdir,
  writeFile
} from 'node:fs/promises';
import { join } from 'node:path';
import { generateDerivedHistoricalRelations } from '../src/domain/history/contentGeneration.ts';
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
const outputPath = join(generatedDirectory, 'relations.json');

try {
  const dataset = await loadHistoricalDataset(contentRoot);
  const knownEntities = await loadKnownApplicationEntities();

  // La génération s’arrête avant toute écriture si reviewed n’est pas valide.
  validateHistoricalDataset(dataset, knownEntities);
  const relations = generateDerivedHistoricalRelations(dataset);
  validateGeneratedRelations(relations, dataset);

  await mkdir(generatedDirectory, { recursive: true });
  await writeFile(
    outputPath,
    `${JSON.stringify(relations, null, 2)}\n`,
    'utf8'
  );
  console.log(
    `Génération historique terminée : ${relations.length} relation(s), staging ignoré.`
  );
} catch (error) {
  printHistoricalValidationError(error);
  process.exitCode = 1;
}
