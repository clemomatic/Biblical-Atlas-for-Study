import { createServer } from 'vite';

const fail = message => {
  throw new Error(`Compatibilité historique invalide : ${message}`);
};

const server = await createServer({
  appType: 'custom',
  configFile: false,
  logLevel: 'error',
  optimizeDeps: { noDiscovery: true },
  server: { middlewareMode: true }
});

const REQUIRED_REFERENCE_REPLACEMENTS = new Map([
  ['event-adam-2peny4', 'atlas-0080'],
  ['event-abraham-mdcznq', 'atlas-0147'],
  ['event-isaac-16b1gw1', 'atlas-0081'],
  ['event-david-iixp36', 'atlas-0189'],
  ['event-jesus-en-tant-qu-humain-1f4ceyz', 'atlas-0036'],
  ['event-jean-le-baptiseur-dvgl2c', 'atlas-0187']
]);

try {
  const [
    { EVENTS },
    { BIBLICAL_PEOPLE, MIGRATED_PERSON_IDS },
    { HISTORICAL_PERSON_TIMELINE, TIMELINE_EVENTS },
    {
      ATLAS_CHRONOLOGY_EVENTS,
      ATLAS_CHRONOLOGY_RECORDS,
      ATLAS_RECORD_BY_ID
    },
    {
      REVIEWED_SUPERSEDED_LEGACY_EVENT_IDS,
      REVIEWED_TIMELINE_EVENTS
    },
    { BIBLICAL_PLACES }
  ] = await Promise.all([
    server.ssrLoadModule('/src/data/timelineEvents.ts'),
    server.ssrLoadModule('/src/data/biblicalPeople.ts'),
    server.ssrLoadModule('/src/data/historicalData.ts'),
    server.ssrLoadModule('/src/data/atlasChronology.ts'),
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

  if (ATLAS_CHRONOLOGY_RECORDS.length !== ATLAS_CHRONOLOGY_EVENTS.length) {
    fail('une ligne retenue du référentiel n’a pas été projetée en événement');
  }

  if (TIMELINE_EVENTS.length !== ATLAS_CHRONOLOGY_EVENTS.length) {
    fail(
      `${ATLAS_CHRONOLOGY_EVENTS.length} événements du référentiel attendus, ${TIMELINE_EVENTS.length} projetés`
    );
  }

  const referenceIds = ATLAS_CHRONOLOGY_EVENTS.map(event => event.id);
  const projectedIds = TIMELINE_EVENTS.map(event => event.id);

  if (referenceIds.some((id, index) => projectedIds[index] !== id)) {
    fail('la projection finale ne suit pas exactement l’ordre du référentiel');
  }

  if (new Set(projectedIds).size !== projectedIds.length) {
    fail('la projection contient des identifiants dupliqués');
  }

  for (const [legacyId, referenceId] of REQUIRED_REFERENCE_REPLACEMENTS) {
    const legacy = EVENTS.find(event => event.id === legacyId);
    const record = ATLAS_RECORD_BY_ID.get(referenceId);
    const projected = TIMELINE_EVENTS.find(event => event.id === referenceId);

    if (!legacy) {
      fail(`la ligne legacy ${legacyId} a disparu des données brutes`);
    }

    if (!record || !projected) {
      fail(`le remplacement ${referenceId} de ${legacyId} est absent`);
    }

    if (TIMELINE_EVENTS.some(event => event.id === legacyId)) {
      fail(`la ligne legacy ${legacyId} reste visible en doublon`);
    }

    if (
      projected.text !== record.title ||
      projected.startPos !== record.start ||
      projected.endPos !== record.end
    ) {
      fail(`le remplacement ${referenceId} ne respecte pas le référentiel`);
    }

    if (!projected.sources?.length && !projected.biblicalReferences?.length) {
      fail(`le remplacement ${referenceId} n’a aucune source exploitable`);
    }
  }

  const supersededLegacyIds = new Set([
    ...REVIEWED_SUPERSEDED_LEGACY_EVENT_IDS,
    ...HISTORICAL_PERSON_TIMELINE.supersededLegacyEventIds
  ]);

  for (const legacyEventId of supersededLegacyIds) {
    if (!EVENTS.some(event => event.id === legacyEventId)) {
      fail(
        `la ligne legacy remplacée ${legacyEventId} a disparu des données brutes`
      );
    }

    if (
      TIMELINE_EVENTS.some(event => event.id === legacyEventId) &&
      !ATLAS_RECORD_BY_ID.has(legacyEventId)
    ) {
      fail(
        `la ligne legacy remplacée ${legacyEventId} reste visible sans entrée correspondante dans le référentiel`
      );
    }
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
    fail('un événement A7 a perdu ses références ou sa datation documentaire');
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
    const replacementId = REQUIRED_REFERENCE_REPLACEMENTS.get(person.id);
    const projected = replacementId
      ? TIMELINE_EVENTS.find(event => event.id === replacementId)
      : undefined;

    if (!legacy || !replacementId || !projected) {
      fail(`remplacement du personnage pilote absent pour ${person.id}`);
    }

    if (person.legacyEventId !== legacy.id) {
      fail(`legacyEventId incohérent pour ${person.id}`);
    }

    if (
      person.lifeSpan?.start?.yearMin !== legacy.startYear ||
      person.lifeSpan?.end?.yearMax !== legacy.endYear
    ) {
      fail(`la donnée legacy brute a été modifiée pour ${person.id}`);
    }
  }

  console.log(
    `Compatibilité historique vérifiée : ${EVENTS.length} lignes legacy brutes conservées, ${ATLAS_CHRONOLOGY_RECORDS.length} lignes du nouveau référentiel projetées, ${REQUIRED_REFERENCE_REPLACEMENTS.size} remplacements pilotes contrôlés, ${supersededLegacyIds.size} anciennes substitutions absentes de la frise, ${mapReadyPlaceIds.size} lieux A7 prêts pour la carte, aucun doublon.`
  );
} finally {
  await server.close();
}
