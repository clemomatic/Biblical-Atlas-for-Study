import { createServer } from 'vite';

const fail = message => {
  throw new Error(`Compatibilité historique invalide : ${message}`);
};

const containsValues = (values = [], required = []) =>
  required.every(value => values.includes(value));

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
    { BIBLICAL_PEOPLE, MIGRATED_PERSON_IDS },
    { HISTORICAL_PERSON_TIMELINE, TIMELINE_EVENTS },
    {
      REVIEWED_SUPERSEDED_LEGACY_EVENT_IDS,
      REVIEWED_TIMELINE_EVENTS
    },
    { BIBLICAL_PLACES }
  ] =
    await Promise.all([
      server.ssrLoadModule('/src/data/timelineEvents.ts'),
      server.ssrLoadModule('/src/data/biblicalPeople.ts'),
      server.ssrLoadModule('/src/data/historicalData.ts'),
      server.ssrLoadModule('/src/data/reviewedHistoricalEvents.ts'),
      server.ssrLoadModule('/src/data/mapData.ts')
    ]);

  if (BIBLICAL_PEOPLE.length !== MIGRATED_PERSON_IDS.length) {
    fail(
      `${MIGRATED_PERSON_IDS.length} personnes migrées attendues, ${BIBLICAL_PEOPLE.length} trouvées`
    );
  }
  if (!BIBLICAL_PEOPLE.some(person => person.id === 'event-isaac-16b1gw1')) {
    fail('la fiche migrée d’Isaac est absente');
  }
  const supersededLegacyIds = new Set([
    ...REVIEWED_SUPERSEDED_LEGACY_EVENT_IDS,
    ...HISTORICAL_PERSON_TIMELINE.supersededLegacyEventIds
  ]);
  if (
    TIMELINE_EVENTS.length !==
    EVENTS.length -
      supersededLegacyIds.size +
      HISTORICAL_PERSON_TIMELINE.events.length +
      REVIEWED_TIMELINE_EVENTS.length
  ) {
    fail(
      'la projection ne conserve pas toutes les lignes historiques non remplacées et relues'
    );
  }
  for (const legacyEventId of supersededLegacyIds) {
    if (!EVENTS.some(event => event.id === legacyEventId)) {
      fail(`la ligne legacy remplacée ${legacyEventId} a disparu des données brutes`);
    }
    const replacementWithSameId = TIMELINE_EVENTS.find(
      event => event.id === legacyEventId
    );
    if (
      replacementWithSameId &&
      !(
        replacementWithSameId.historicalPersonId === legacyEventId &&
        replacementWithSameId.historicalPersonSpanKind === 'lifespan'
      )
    ) {
      fail(`la ligne legacy remplacée ${legacyEventId} reste visible en doublon`);
    }
  }
  if (
    new Set(TIMELINE_EVENTS.map(event => event.id)).size !==
    TIMELINE_EVENTS.length
  ) {
    fail('la projection contient des identifiants dupliqués');
  }
  const a7TimelineEvents = REVIEWED_TIMELINE_EVENTS.filter(event =>
    event.sources?.some(source => source.id.includes('source-nwtsty-a7-'))
  );
  if (
    a7TimelineEvents.some(
      event =>
        !event.biblicalReferences?.length ||
        !event.sources?.length ||
        !event.notes?.includes('Datation de la source')
    )
  ) {
    fail(
      'un événement A7 a perdu ses références ou sa datation documentaire'
    );
  }
  const mapPlaceIds = new Set(BIBLICAL_PLACES.map(place => place.id));
  const mapReadyPlaceIds = new Set(
    a7TimelineEvents.flatMap(event =>
      (event.associatedLocationIds ?? []).filter(placeId =>
        mapPlaceIds.has(placeId)
      )
    )
  );
  const mapReadyEvents = a7TimelineEvents.filter(event =>
    (event.associatedLocationIds ?? []).some(placeId =>
      mapPlaceIds.has(placeId)
    )
  );
  if (mapReadyPlaceIds.size < 7 || mapReadyEvents.length < 7) {
    fail(
      `au moins 7 événements et 7 lieux cartographiques A7 attendus, ${mapReadyEvents.length} événements et ${mapReadyPlaceIds.size} lieux trouvés`
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

    if (projected.historicalPersonId === person.id) {
      if (
        projected.historicalPersonSpanKind !== 'lifespan' ||
        !projected.sources?.length ||
        !projected.notes?.includes('Durée de vie sourcée')
      ) {
        fail(`projection canonique incomplète pour ${person.id}`);
      }
    } else {
      for (const field of [
        'startRaw',
        'endRaw',
        'startYear',
        'endYear',
        'startPos',
        'endPos'
      ]) {
        if (projected[field] !== legacy[field]) {
          fail(`${field} modifié sans source canonique pour ${person.id}`);
        }
      }
    }
    if (
      !containsValues(
        projected.associatedLocationIds,
        legacy.associatedLocationIds
      ) ||
      !containsValues(projected.associatedRouteIds, legacy.associatedRouteIds) ||
      !containsValues(
        projected.associatedCharacterIds,
        legacy.associatedCharacterIds
      )
    ) {
      fail(`relation perdue pour ${person.id}`);
    }
  }

  console.log(
    `Compatibilité historique vérifiée : ${BIBLICAL_PEOPLE.length} personnes pilotes, ${EVENTS.length} lignes legacy brutes intactes, ${supersededLegacyIds.size} substitution(s) canoniques, ${HISTORICAL_PERSON_TIMELINE.events.length} projection(s) de vie ou d’activité, ${REVIEWED_TIMELINE_EVENTS.length} événements relus ajoutés, ${mapReadyPlaceIds.size} lieux A7 prêts pour la carte, aucun doublon.`
  );
} finally {
  await server.close();
}
