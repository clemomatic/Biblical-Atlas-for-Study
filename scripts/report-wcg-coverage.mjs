import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadHistoricalDataset } from '../src/domain/history/contentIO.ts';
import { resolveAllPersonLifeClaims } from '../src/domain/history/personClaimResolution.ts';

const ROOT = process.cwd();
const verifyOnly = process.argv.includes('--verify-output');
const SOURCE_PREFIX = 'source-wcg-timeline-part-';

const dataset = await loadHistoricalDataset(join(ROOT, 'content'));
const relations = JSON.parse(
  await readFile(join(ROOT, 'content', 'generated', 'relations.json'), 'utf8')
);
const storedResolutions = JSON.parse(
  await readFile(
    join(ROOT, 'content', 'generated', 'person-life-resolutions.json'),
    'utf8'
  )
);
const wcgSources = dataset.sources
  .filter(source => source.id.startsWith(SOURCE_PREFIX))
  .sort((left, right) => left.id.localeCompare(right.id));
const wcgClaims = dataset.claims.filter(claim =>
  claim.evidence.some(evidence => evidence.sourceId.startsWith(SOURCE_PREFIX))
);
const wcgClaimIds = new Set(wcgClaims.map(claim => claim.id));
const wcgPeopleIds = new Set(
  wcgClaims
    .filter(claim => claim.subject.entityType === 'person')
    .map(claim => claim.subject.entityId)
);
const wcgPeople = dataset.people
  .map(record => record.person)
  .filter(person => wcgPeopleIds.has(person.id))
  .sort((left, right) => left.name.localeCompare(right.name));
const recomputedResolutions = resolveAllPersonLifeClaims(
  dataset.claims.filter(claim => claim.predicate === 'lifespan')
).filter(resolution => wcgPeopleIds.has(resolution.personId));

const stableJson = value => `${JSON.stringify(value, null, 2)}\n`;
if (stableJson(recomputedResolutions) !== stableJson(storedResolutions)) {
  throw new Error(
    'Les résolutions de durée de vie ne correspondent pas aux affirmations relues. Relancer historical:build:wcg.'
  );
}

if (wcgSources.length !== 3) {
  throw new Error(`Trois sources WCG sont attendues, ${wcgSources.length} trouvée(s).`);
}

const partStats = [1, 2, 3].map(part => {
  const sourceId = `${SOURCE_PREFIX}${part}`;
  const staging = dataset.staging.filter(record =>
    record.sourceHints?.includes(sourceId)
  );
  const payloads = staging.map(record => record.payload);
  return {
    part,
    source: wcgSources.find(source => source.id === sourceId),
    stagingCount: staging.length,
    individualRows: payloads.filter(
      payload => payload?.recordKind === 'individual-lifespan'
    ).length,
    collectiveRows: payloads.filter(
      payload => payload?.recordKind === 'collective-context'
    ).length,
    collectivePeople: new Set(
      payloads
        .filter(payload => payload?.recordKind === 'collective-context')
        .flatMap(payload => payload.personIds ?? [])
    ).size,
    eventRows: payloads.filter(
      payload => payload?.recordKind === 'historical-event'
    ).length,
    reviewedClaimCount: wcgClaims.filter(claim =>
      claim.evidence.some(evidence => evidence.sourceId === sourceId)
    ).length
  };
});

const full = wcgPeople.filter(person => person.lifeSpanClaimIds?.some(
  claimId => wcgClaimIds.has(claimId)
));
const partial = wcgPeople.filter(person =>
  person.sourceTimelineWindows?.some(window =>
    window.sourceId.startsWith(SOURCE_PREFIX)
  ) && !person.lifeSpanClaimIds?.some(claimId => wcgClaimIds.has(claimId))
);
const insufficient = partial.filter(person => !person.lifeSpan);
const legacyMigrated = wcgPeople.filter(person => person.legacyEventId);
const divergences = storedResolutions.filter(
  resolution => resolution.status === 'divergent'
);
const selectedOnDivergence = divergences.filter(
  resolution => resolution.selectedClaimId
);
if (selectedOnDivergence.length > 0) {
  throw new Error('Une divergence de dates ne doit jamais sélectionner automatiquement une valeur.');
}

const contextClaimIds = new Set(
  wcgClaims
    .filter(claim => claim.predicate === 'timeline-context')
    .map(claim => claim.id)
);
const unsafeRelations = relations.filter(relation =>
  relation.supportingClaimIds.some(claimId => contextClaimIds.has(claimId))
);
if (unsafeRelations.length > 0) {
  throw new Error(
    `${unsafeRelations.length} relation(s) utilisent à tort une fenêtre collective.`
  );
}

const normalizedNames = new Map();
const normalize = value =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
dataset.people.forEach(record => {
  const key = normalize(record.person.name);
  normalizedNames.set(key, [
    ...(normalizedNames.get(key) ?? []),
    record.person
  ]);
});
const duplicateCandidates = [...normalizedNames.values()]
  .filter(people => people.length > 1 && people.some(person => wcgPeopleIds.has(person.id)))
  .map(people => people.map(person => `${person.name} (${person.id})`).join(' / '))
  .sort();

const wcgRelations = relations.filter(relation =>
  relation.supportingClaimIds.some(claimId => wcgClaimIds.has(claimId))
);
const lifespanRelations = wcgRelations.filter(
  relation => relation.relationLevel === 'lifespan-overlap'
);

const reportDate = wcgSources.map(source => source.accessedAt).sort().at(-1);
const coverage = `# Couverture — frises de « Marche courageusement avec Dieu »

Généré le ${reportDate} à partir du corpus relu.

## Périmètre

Seules les données factuelles courtes des trois frises sont conservées : noms, bornes chronologiques, degré d’approximation, catégories et évènements. Aucune illustration ni texte explicatif de la publication n’est copié.

| Frise | Staging | Vies individuelles | Barres collectives | Personnes dans les barres collectives | Évènements | Claims relus |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
${partStats.map(stat => `| Partie ${stat.part} | ${stat.stagingCount} | ${stat.individualRows} | ${stat.collectiveRows} | ${stat.collectivePeople} | ${stat.eventRows} | ${stat.reviewedClaimCount} |`).join('\n')}

## Résultat

- ${wcgPeople.length} personnes canoniques concernées ;
- ${full.length} personnes avec une durée de vie individuelle sourcée ;
- ${partial.length} personnes conservées seulement dans une fenêtre collective ;
- ${dataset.events.filter(record => record.sourceIds.some(id => id.startsWith(SOURCE_PREFIX))).length} évènements relus ;
- ${lifespanRelations.length} relations de contemporanéité calculées à partir des durées individuelles ;
- ${divergences.length} divergence de dates détectée ;
- 0 relation calculée depuis une barre collective.

## Sources

${wcgSources.map(source => `- [${source.title}](${source.url}) — ${source.pageOrSection}, consulté le ${source.accessedAt}.`).join('\n')}

## Règles de prudence appliquées

- Une astérisque reste une approximation au niveau de la borne concernée.
- Une barre collective produit un claim \`timeline-context\`, jamais un claim \`lifespan\`.
- Une borne « après » est affichée comme ouverte, mais le moteur de contemporanéité la borne prudemment à la dernière date où la personne est attestée vivante.
- Les affirmations multi-sources restent séparées. En cas de contradiction, aucune valeur n’est sélectionnée automatiquement.
- Les évènements déjà présents ne sont remplacés que lorsque leur intitulé historique correspond explicitement ; les autres restent distincts.
`;

const migration = `# Migration des personnages — frises WCG

## Synthèse

| État | Nombre | Définition |
| --- | ---: | --- |
| Entièrement migrés | ${full.length} | Une entité \`BiblicalPerson\` stable et une durée de vie individuelle sourcée sont disponibles. |
| Partiellement migrés | ${partial.length} | L’entité existe, mais la source ne donne qu’une fenêtre collective. |
| Sans période individuelle suffisante | ${insufficient.length} | Aucune naissance ou mort individuelle ne peut être déduite sans inventer. |
| Anciens IDs conservés | ${legacyMigrated.length} | Le \`legacyEventId\` reste relié à la nouvelle entité. |
| Divergences de dates | ${divergences.length} | Les claims incompatibles sont conservés sans sélection automatique. |

## Personnages entièrement migrés

${full.map(person => `- ${person.name} — ${person.lifeSpan?.displayLabel ?? 'période à résoudre'}${person.legacyEventId ? ` — ID historique conservé : \`${person.legacyEventId}\`` : ''}`).join('\n')}

## Personnages partiellement migrés

${partial.map(person => `- ${person.name} — ${person.sourceTimelineWindows?.map(window => window.span.displayLabel).join(' ; ') ?? 'fenêtre collective'} — aucune durée de vie individuelle déduite.`).join('\n')}

## Doublons potentiels à surveiller

${duplicateCandidates.length > 0 ? duplicateCandidates.map(value => `- ${value}`).join('\n') : '- Aucun nom normalisé dupliqué dans le corpus concerné.'}

Ces lignes sont des candidats de contrôle, pas des fusions automatiques. Les homonymes comme Joseph, Marie ou Zacharie doivent rester distincts selon leur contexte.

## Divergences

${divergences.length > 0 ? divergences.map(resolution => `- ${resolution.personId} : ${resolution.divergentClaimPairs.map(pair => pair.join(' ↔ ')).join(', ')}`).join('\n') : '- Aucune divergence détectée dans ce lot.'}
`;

const outputs = [
  ['docs/historical-wcg-coverage.md', coverage],
  ['docs/historical-person-migration-report.md', migration]
];

for (const [relativePath, content] of outputs) {
  const path = join(ROOT, relativePath);
  if (verifyOnly) {
    const existing = await readFile(path, 'utf8');
    if (existing !== content) {
      throw new Error(`${relativePath} n’est pas à jour.`);
    }
  } else {
    await writeFile(path, content, 'utf8');
  }
}

console.log(
  `WCG vérifié : ${wcgPeople.length} personnes, ${full.length} vies individuelles, ${partial.length} fenêtres collectives, ${wcgRelations.length} relations dérivées et ${divergences.length} divergence.`
);
