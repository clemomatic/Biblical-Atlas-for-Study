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
  const [
    { EVENTS },
    { BIBLICAL_PEOPLE },
    { TIMELINE_EVENTS },
    { REVIEWED_TIMELINE_EVENTS },
    { BIBLICAL_PLACES }
  ] =
    await Promise.all([
      server.ssrLoadModule('/src/data/timelineEvents.ts'),
      server.ssrLoadModule('/src/data/biblicalPeople.ts'),
      server.ssrLoadModule('/src/data/historicalData.ts'),
      server.ssrLoadModule('/src/data/reviewedHistoricalEvents.ts'),
      server.ssrLoadModule('/src/data/mapData.ts')
    ]);

  if (BIBLICAL_PEOPLE.length !== 5) {
    fail(`5 personnes pilotes attendues, ${BIBLICAL_PEOPLE.length} trouvées`);
  }
  if (
    TIMELINE_EVENTS.length !==
    EVENTS.length + REVIEWED_TIMELINE_EVENTS.length
  ) {
    fail(
      'la projection ne conserve pas toutes les lignes historiques et relues'
    );
  }
  if (
    new Set(TIMELINE_EVENTS.map(event => event.id)).size !==
    TIMELINE_EVENTS.length
  ) {
    fail('la projection contient des identifiants dupliqués');
  }
  if (
    REVIEWED_TIMELINE_EVENTS.some(
      event =>
        !event.biblicalReferences?.length ||
        !event.sources?.length ||
        !event.notes?.includes('Datation de la source')
    )
  ) {
    fail(
      'un événement A7-B a perdu ses références ou sa datation documentaire'
    );
  }
  const mapPlaceIds = new Set(BIBLICAL_PLACES.map(place => place.id));
  const mapReadyPlaceIds = new Set(
    REVIEWED_TIMELINE_EVENTS.flatMap(event =>
      (event.associatedLocationIds ?? []).filter(placeId =>
        mapPlaceIds.has(placeId)
      )
    )
  );
  const mapReadyEvents = REVIEWED_TIMELINE_EVENTS.filter(event =>
    (event.associatedLocationIds ?? []).some(placeId =>
      mapPlaceIds.has(placeId)
    )
  );
  if (mapReadyPlaceIds.size !== 7 || mapReadyEvents.length !== 7) {
    fail(
      `7 événements et 7 lieux cartographiques A7-B attendus, ${mapReadyEvents.length} événements et ${mapReadyPlaceIds.size} lieux trouvés`
    );
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
    `Compatibilité historique vérifiée : ${BIBLICAL_PEOPLE.length} personnes pilotes, ${EVENTS.length} lignes historiques conservées, ${REVIEWED_TIMELINE_EVENTS.length} événements relus ajoutés, ${mapReadyPlaceIds.size} lieux A7-B prêts pour la carte, aucun doublon.`
  );
} finally {
  await server.close();
}
