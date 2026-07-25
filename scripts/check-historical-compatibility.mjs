import { createServer } from 'vite';

const fail = message => {
  throw new Error(`Compatibilité historique invalide : ${message}`);
};

const sameValues = (left = [], right = []) =>
  JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());

const server = await createServer({
  appType: 'custom',
  configFile: false,
  logLevel: 'error',
  optimizeDeps: { noDiscovery: true },
  server: { middlewareMode: true }
});

try {
  const [{ EVENTS }, { BIBLICAL_PEOPLE }, { TIMELINE_EVENTS }] =
    await Promise.all([
      server.ssrLoadModule('/src/data/timelineEvents.ts'),
      server.ssrLoadModule('/src/data/biblicalPeople.ts'),
      server.ssrLoadModule('/src/data/historicalData.ts')
    ]);

  if (BIBLICAL_PEOPLE.length !== 3) {
    fail(`3 personnes pilotes attendues, ${BIBLICAL_PEOPLE.length} trouvées`);
  }
  if (TIMELINE_EVENTS.length !== EVENTS.length) {
    fail('la projection a modifié le nombre de lignes de la frise');
  }
  if (
    new Set(TIMELINE_EVENTS.map(event => event.id)).size !==
    TIMELINE_EVENTS.length
  ) {
    fail('la projection contient des identifiants dupliqués');
  }

  for (const person of BIBLICAL_PEOPLE) {
    const legacy = EVENTS.find(event => event.id === person.id);
    const projected = TIMELINE_EVENTS.find(event => event.id === person.id);
    if (!legacy || !projected) {
      fail(`projection absente pour ${person.id}`);
    }
    if (person.legacyEventId !== legacy.id) {
      fail(`legacyEventId incohérent pour ${person.id}`);
    }
    if (
      person.lifeSpan?.start?.yearMin !== legacy.startYear ||
      person.lifeSpan?.end?.yearMax !== legacy.endYear
    ) {
      fail(`période modifiée pour ${person.id}`);
    }

    for (const field of [
      'startRaw',
      'endRaw',
      'startYear',
      'endYear',
      'startPos',
      'endPos'
    ]) {
      if (projected[field] !== legacy[field]) {
        fail(`${field} modifié pour ${person.id}`);
      }
    }
    if (
      !sameValues(
        projected.associatedLocationIds,
        legacy.associatedLocationIds
      ) ||
      !sameValues(projected.associatedRouteIds, legacy.associatedRouteIds) ||
      !sameValues(
        projected.associatedCharacterIds,
        legacy.associatedCharacterIds
      )
    ) {
      fail(`relation perdue pour ${person.id}`);
    }
  }

  console.log(
    `Compatibilité historique vérifiée : ${BIBLICAL_PEOPLE.length} personnes pilotes, ${TIMELINE_EVENTS.length} lignes de frise, aucun doublon.`
  );
} finally {
  await server.close();
}
