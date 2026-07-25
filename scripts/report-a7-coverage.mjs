import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const reportsRoot = join(
  process.cwd(),
  'content',
  'generated',
  'import-reports'
);
const relationsPath = join(
  process.cwd(),
  'content',
  'generated',
  'relations.json'
);
const coveragePath = join(reportsRoot, 'a7-coverage.json');
const coverage = JSON.parse(await readFile(coveragePath, 'utf8'));
const relations = JSON.parse(await readFile(relationsPath, 'utf8'));

const relationBelongsTo = (relation, code) => {
  const eventPrefixes =
    code === 'a7-b'
      ? ['event-a7b-', 'event-a7-b-']
      : [`event-${code}-`];
  const claimPrefixes = eventPrefixes.map(prefix => `claim-${prefix}`);
  return (
    (relation.eventIds ?? []).some(eventId =>
      eventPrefixes.some(prefix => eventId.startsWith(prefix))
    ) ||
    relation.supportingClaimIds.some(claimId =>
      claimPrefixes.some(prefix => claimId.startsWith(prefix))
    )
  );
};

coverage.appendices = coverage.appendices.map(appendix => {
  const code = appendix.sourceId.replace('source-nwtsty-', '');
  return {
    ...appendix,
    counts: {
      ...appendix.counts,
      derivedRelations: relations.filter(relation =>
        relationBelongsTo(relation, code)
      ).length
    }
  };
});
coverage.totals = {
  ...coverage.totals,
  claims: coverage.appendices.reduce(
    (total, appendix) =>
      total + appendix.counts.claims,
    0
  ),
  presences: coverage.appendices.reduce(
    (total, appendix) => total + appendix.counts.presences,
    0
  ),
  derivedRelations: relations.filter(relation =>
    coverage.appendices.some(appendix =>
      relationBelongsTo(
        relation,
        appendix.sourceId.replace('source-nwtsty-', '')
      )
    )
  ).length,
  unresolvedItems: coverage.appendices.reduce(
    (total, appendix) => total + appendix.counts.unresolvedItems,
    0
  )
};

await writeFile(
  coveragePath,
  `${JSON.stringify(coverage, null, 2)}\n`,
  'utf8'
);

console.log(
  `Rapport A7 : ${coverage.totals.events} événements, ` +
    `${coverage.totals.presences} présences, ` +
    `${coverage.totals.derivedRelations} relations dérivées, ` +
    `${coverage.totals.unresolvedItems} point(s) conservé(s) à vérifier.`
);
