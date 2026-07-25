import {
  mkdir,
  readFile,
  writeFile
} from 'node:fs/promises';
import {
  basename,
  dirname,
  join,
  resolve
} from 'node:path';
import { loadHistoricalDataset } from '../src/domain/history/contentIO.ts';
import {
  promoteReviewedStagingEvents,
  StagingPromotionError
} from '../src/domain/history/stagingPromotion.ts';
import { validateHistoricalDataset } from '../src/domain/history/contentValidation.ts';
import {
  loadKnownApplicationEntities,
  printHistoricalValidationError
} from './historical-script-utils.mjs';

const getArgument = name => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

const contentRoot = resolve(process.cwd(), 'content');
const stagingFile = resolve(
  process.cwd(),
  getArgument('--file') ??
    'content/staging/a7-b-debut-ministere.json'
);
const writeOutputs = process.argv.includes('--write');
const verifyOutputs = process.argv.includes('--verify-output');
const outputStem = basename(stagingFile, '.json')
  .replace(/-debut-ministere$/, '');

const outputFiles = {
  events: join(contentRoot, 'reviewed', 'events', `${outputStem}-events.json`),
  claims: join(contentRoot, 'reviewed', 'claims', `${outputStem}-claims.json`),
  presences: join(
    contentRoot,
    'reviewed',
    'presences',
    `${outputStem}-presences.json`
  )
};

const serialize = value => `${JSON.stringify(value, null, 2)}\n`;

const readJsonArray = async filePath => {
  const parsed = JSON.parse(await readFile(filePath, 'utf8'));
  if (!Array.isArray(parsed)) {
    throw new TypeError(`${filePath} doit contenir un tableau JSON.`);
  }
  return parsed;
};

const verifyExistingOutput = async (filePath, expected) => {
  const actual = await readFile(filePath, 'utf8');
  if (actual.replace(/\r\n/g, '\n') !== serialize(expected)) {
    throw new Error(
      `${filePath} ne correspond pas à la promotion déterministe du staging.`
    );
  }
};

try {
  const [
    staging,
    dataset,
    knownEntities
  ] = await Promise.all([
    readJsonArray(stagingFile),
    loadHistoricalDataset(contentRoot),
    loadKnownApplicationEntities()
  ]);
  const promotion = promoteReviewedStagingEvents(staging, dataset.sources);
  const promotedEventIds = new Set(
    promotion.events.map(record => record.event.id)
  );
  const promotedClaimIds = new Set(
    promotion.claims.map(claim => claim.id)
  );
  const promotedPresenceIds = new Set(
    promotion.presences.map(presence => presence.id)
  );

  validateHistoricalDataset(
    {
      ...dataset,
      events: [
        ...dataset.events.filter(
          record => !promotedEventIds.has(record.event.id)
        ),
        ...promotion.events
      ],
      claims: [
        ...dataset.claims.filter(claim => !promotedClaimIds.has(claim.id)),
        ...promotion.claims
      ],
      presences: [
        ...dataset.presences.filter(
          presence => !promotedPresenceIds.has(presence.id)
        ),
        ...promotion.presences
      ]
    },
    knownEntities
  );

  if (writeOutputs) {
    for (const [collection, filePath] of Object.entries(outputFiles)) {
      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, serialize(promotion[collection]), 'utf8');
    }
  }

  if (verifyOutputs) {
    for (const [collection, filePath] of Object.entries(outputFiles)) {
      await verifyExistingOutput(filePath, promotion[collection]);
    }
  }

  console.log(
    [
      writeOutputs
        ? 'Promotion staging écrite'
        : verifyOutputs
          ? 'Promotion staging vérifiée'
          : 'Promotion staging prête (aucune écriture)',
      `${promotion.promotedRecordIds.length} ligne(s) relue(s)`,
      `${promotion.skippedRecordIds.length} ligne(s) non relue(s) ignorée(s)`,
      `${promotion.events.length} événement(s)`,
      `${promotion.claims.length} affirmation(s)`,
      `${promotion.presences.length} présence(s)`,
      `${promotion.unresolvedItems.length} point(s) à vérifier`
    ].join(' · ')
  );
} catch (error) {
  if (error instanceof StagingPromotionError) {
    console.error(error.message);
    error.issues.forEach(issue => {
      console.error(`- ${issue.recordId} : ${issue.message}`);
    });
  } else {
    printHistoricalValidationError(error);
  }
  process.exitCode = 1;
}
