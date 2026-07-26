import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { generateCalculatedHistoricalClaims } from '../src/domain/history/calculatedClaims.ts';
import { loadHistoricalDataset } from '../src/domain/history/contentIO.ts';
import { validateHistoricalDataset } from '../src/domain/history/contentValidation.ts';
import {
  loadKnownApplicationEntities,
  printHistoricalValidationError
} from './historical-script-utils.mjs';

const root = process.cwd();
const contentRoot = join(root, 'content');
const generatedClaimsPath = join(
  contentRoot,
  'generated',
  'calculated-claims.json'
);
const reportPath = join(
  contentRoot,
  'generated',
  'import-reports',
  'insight-isaac-report.json'
);
const verifyOutput = process.argv.includes('--verify-output');
const serialize = value => `${JSON.stringify(value, null, 2)}\n`;

try {
  const dataset = await loadHistoricalDataset(contentRoot);
  const knownEntities = await loadKnownApplicationEntities();
  validateHistoricalDataset(dataset, knownEntities);
  const expectedClaims = generateCalculatedHistoricalClaims(
    dataset.claims,
    dataset.calculations
  );
  const sourceId = 'source-insight-isaac';
  const definitions = dataset.calculations.filter(
    definition => definition.sourceId === sourceId
  );
  const directClaims = dataset.claims.filter(claim =>
    claim.evidence.some(evidence => evidence.sourceId === sourceId)
  );
  const pilotClaims = expectedClaims.filter(claim =>
    definitions.some(definition => definition.outputClaimId === claim.id)
  );
  const report = {
    sourceId,
    reviewedDirectClaims: directClaims.length,
    calculationDefinitions: definitions.length,
    generatedClaims: pilotClaims.length,
    conflictsRequiringReview: pilotClaims.filter(claim => claim.conflict).length,
    eligibleForCertainRelations: pilotClaims.filter(
      claim => claim.eligibleForCertainRelations
    ).length,
    calculations: pilotClaims.map(claim => ({
      claimId: claim.id,
      result: claim.period.displayLabel,
      method: claim.evidence[0]?.method,
      inputClaimIds: claim.calculation.inputClaimIds,
      uncertaintyYears: claim.calculation.uncertaintyYears,
      certainty: claim.certainty,
      conflict: claim.conflict ?? null
    }))
  };

  if (verifyOutput) {
    const [storedClaims, storedReport] = await Promise.all([
      readFile(generatedClaimsPath, 'utf8'),
      readFile(reportPath, 'utf8')
    ]);
    if (storedClaims !== serialize(expectedClaims)) {
      throw new Error(
        'calculated-claims.json n’est pas reproductible ; lancez pnpm historical:generate.'
      );
    }
    if (storedReport !== serialize(report)) {
      throw new Error(
        'Le rapport Perspicace n’est pas à jour ; lancez pnpm historical:report:insight.'
      );
    }
  } else {
    await mkdir(join(contentRoot, 'generated', 'import-reports'), {
      recursive: true
    });
    await writeFile(reportPath, serialize(report), 'utf8');
  }

  console.log(
    `Perspicace · Isaac : ${directClaims.length} fait(s) direct(s), ${pilotClaims.length} calcul(s), ${report.conflictsRequiringReview} conflit(s).`
  );
} catch (error) {
  printHistoricalValidationError(error);
  process.exitCode = 1;
}
