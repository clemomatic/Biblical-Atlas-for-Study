import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadHistoricalDataset } from '../src/domain/history/contentIO.ts';

const root = process.cwd();
const dataset = await loadHistoricalDataset(join(root, 'content'));
const relations = JSON.parse(
  await readFile(join(root, 'content', 'generated', 'relations.json'), 'utf8')
);

const a6People = dataset.people.filter(record =>
  record.sourceIds.some(sourceId => sourceId.startsWith('source-nwt-a6-'))
);
const kings = a6People.filter(record =>
  record.person.roles?.some(role => role === 'king' || role === 'queen')
);
const prophets = a6People.filter(record =>
  record.person.roles?.includes('prophet')
);
const activities = a6People.flatMap(record => record.person.activityPeriods);
const reigns = activities.filter(activity => activity.type === 'reign');
const ministries = activities.filter(
  activity => activity.phase === 'prophetic-ministry'
);
const a6Events = dataset.events.filter(record =>
  record.sourceIds.includes('source-nwt-a6-b')
);
const a6Relations = relations.filter(relation =>
  relation.generatedFromIds.some(id => id.includes('a6'))
);
const prophetDuringReign = relations.filter(
  relation => relation.relationLevel === 'prophet-during-reign'
);
const simultaneousReigns = relations.filter(
  relation => relation.relationLevel === 'simultaneous-reigns'
);
const documentedInteractions = relations.filter(
  relation =>
    relation.relationLevel === 'documented-interaction' &&
    relation.supportingClaimIds.some(id =>
      id.startsWith('claim-interaction-')
    )
);

const requiredPhases = [
  'co-reign',
  'disputed-reign',
  'limited-reign',
  'fully-established-reign',
  'prophetic-ministry'
];
const missingPhases = requiredPhases.filter(
  phase => !activities.some(activity => activity.phase === phase)
);
const reignsWithoutBoundaryClaims = reigns.filter(activity => {
  const predicates = (activity.supportingClaimIds ?? []).flatMap(claimId => {
    const claim = dataset.claims.find(candidate => candidate.id === claimId);
    return claim ? [claim.predicate] : [];
  });
  return !predicates.includes('reign-start') || !predicates.includes('reign-end');
});
const exactPropheticBars = ministries.filter(
  activity => activity.certainty === 'certain'
);

if (
  missingPhases.length ||
  reignsWithoutBoundaryClaims.length ||
  exactPropheticBars.length
) {
  throw new Error(
    [
      missingPhases.length
        ? `phases absentes : ${missingPhases.join(', ')}`
        : '',
      reignsWithoutBoundaryClaims.length
        ? `${reignsWithoutBoundaryClaims.length} règnes sans claims de début/fin`
        : '',
      exactPropheticBars.length
        ? `${exactPropheticBars.length} barres prophétiques marquées certaines`
        : ''
    ]
      .filter(Boolean)
      .join(' ; ')
  );
}

const bySource = ['source-nwt-a6-a', 'source-nwt-a6-b'].map(sourceId => {
  const sourcePeople = a6People.filter(record =>
    record.sourceIds.includes(sourceId)
  );
  return {
    sourceId,
    people: sourcePeople.length,
    kings: sourcePeople.filter(record =>
      record.person.roles?.some(role => role === 'king' || role === 'queen')
    ).length,
    prophets: sourcePeople.filter(record =>
      record.person.roles?.includes('prophet')
    ).length,
    activities: sourcePeople.reduce(
      (total, record) => total + record.person.activityPeriods.length,
      0
    )
  };
});

const reportDate = dataset.sources
  .filter(source => source.id === 'source-nwt-a6-a' || source.id === 'source-nwt-a6-b')
  .map(source => source.accessedAt)
  .filter(Boolean)
  .sort()
  .at(-1);
const report = `# Rapport de cohérence chronologique — appendices A6

Généré le ${reportDate ?? 'date non précisée'} à partir du corpus \`reviewed\` et des relations déterministes.

## Couverture

| Source | Personnes | Rois ou reine | Prophètes | Phases d’activité |
| --- | ---: | ---: | ---: | ---: |
${bySource
  .map(
    row =>
      `| ${row.sourceId === 'source-nwt-a6-a' ? 'A6-A' : 'A6-B'} | ${row.people} | ${row.kings} | ${row.prophets} | ${row.activities} |`
  )
  .join('\n')}

- ${kings.length} souverains distincts ;
- ${prophets.length} prophètes distincts ;
- ${reigns.length} phases de règne ;
- ${ministries.length} périodes de ministère prophétique ;
- ${a6Events.length} événements politiques ;
- ${dataset.territories.length} royaumes temporels, sans géométrie inventée ;
- ${dataset.presences.filter(item => item.id.startsWith('presence-joram')).length} présence royale explicitement documentée.

## Relations calculées

- ${prophetDuringReign.length} relations « prophète actif pendant un règne » ;
- ${simultaneousReigns.length} relations entre règnes simultanés ;
- ${documentedInteractions.length} interactions directement documentées par un passage biblique ;
- ${a6Relations.length} relations dont au moins une activité d’entrée appartient au lot A6.

Les contemporanéités et chevauchements ne sont jamais affichés comme des rencontres. Une interaction documentée provient exclusivement d’un claim direct relu.

## Cas complexes vérifiés

- Omri et Tibni : phases de règne disputé séparées ;
- Joachaz et Joas : phases de corègne séparées ;
- Zacharie et Osée : début de règne dans un sens limité séparé du règne pleinement établi ;
- ministères prophétiques : bornes graphiques conservées comme possibles et approximatives ;
- capitales : associations administratives distinctes des épisodes de présence ;
- Juda et Israël : périodes temporelles conservées sans inventer de polygones.

## Limites documentaires

Les barres des prophètes sont des lectures prudentes d’un graphique et non des dates annuelles exactes. Les anciennes lignes de frise sont conservées pour compatibilité ; le nouveau modèle A6 porte les phases et la traçabilité. Aucune présence continue dans une capitale n’est déduite du seul titre de roi. Une période chevauchée ne prouve ni une rencontre ni une présence dans le même lieu.
`;

const reportPath = join(root, 'docs', 'historical-a6-chronology-report.md');
if (process.argv.includes('--verify-output')) {
  const existingReport = await readFile(reportPath, 'utf8');
  if (existingReport !== report) {
    throw new Error(
      'Le rapport A6 versionné est obsolète. Exécutez historical:report:a6.'
    );
  }
} else {
  await writeFile(reportPath, report, 'utf8');
}
console.log(
  `Rapport A6 : ${kings.length} souverains, ${prophets.length} prophètes, ${prophetDuringReign.length} chevauchements roi-prophète, ${simultaneousReigns.length} règnes simultanés.`
);
