import { createServer } from 'vite';

const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom'
});

try {
  const data = await server.ssrLoadModule('/src/data/historicalData.ts');
  const authoritative = await server.ssrLoadModule(
    '/src/data/authoritativeChronology.ts'
  );
  const focused = await server.ssrLoadModule(
    '/src/domain/history/focusedTimeline.ts'
  );
  const chronology = await server.ssrLoadModule(
    '/src/domain/history/eventChronology.ts'
  );
  const identity = await server.ssrLoadModule(
    '/src/domain/history/personIdentityProjection.ts'
  );
  const temporal = await server.ssrLoadModule('/src/domain/history/temporal.ts');
  const errors = [];
  let modelCount = 0;
  let markerCount = 0;
  let representedRecordCount = 0;
  let omittedAnchorCount = 0;

  const canonicalPersonId = personId =>
    identity.canonicalizeHistoricalPersonId(personId) ?? personId;
  const normalized = value =>
    (value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('fr')
      .replace(/[’']/g, ' ')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  const datedRecords = authoritative.AUTHORITATIVE_CHRONOLOGY_RECORDS.filter(
    record => record.startYear !== undefined && record.startYear !== 0
  );
  const recordsById = new Map(
    authoritative.AUTHORITATIVE_CHRONOLOGY_RECORDS.map(record => [
      record.id,
      record
    ])
  );
  const peopleById = new Map(
    data.DISPLAY_HISTORICAL_PEOPLE.map(person => [
      canonicalPersonId(person.id),
      person
    ])
  );
  const eventsByAuthoritativeRecordId = new Map();
  const activitiesByAuthoritativeRecordId = new Map();

  data.TIMELINE_EVENTS.forEach(event => {
    if (event.authoritativeRecordId) {
      eventsByAuthoritativeRecordId.set(event.authoritativeRecordId, event);
    }
  });
  data.DISPLAY_HISTORICAL_PEOPLE.forEach(person => {
    person.activityPeriods.forEach(activity => {
      activitiesByAuthoritativeRecordId.set(activity.id, activity);
    });
  });

  const boundaryContainsYear = (boundary, year) =>
    Boolean(
      boundary &&
        (boundary.yearMin === year || boundary.yearMax === year)
    );
  const spanMatchesRecord = (span, record) => {
    if (!span || !boundaryContainsYear(span.start, record.startYear)) {
      return false;
    }
    if (record.endYear !== undefined && record.endYear !== 0) {
      return boundaryContainsYear(span.end, record.endYear);
    }
    return span.end === undefined;
  };
  const isDeliberatelyUnprojected = record => {
    const note = normalized([record.notes, record.positioningNotes].filter(Boolean).join(' '));
    return (
      normalized(record.category) === 'periode collective' ||
      note.includes('uniquement de repere de tri') ||
      note.includes('seulement de repere de tri')
    );
  };

  for (const record of datedRecords) {
    if (authoritative.isAuthoritativePersonBaseRecord(record)) {
      const personId = canonicalPersonId(record.personId ?? record.id);
      const person = peopleById.get(personId);
      if (!person) {
        errors.push(
          `${record.id} (${record.title}) : personne absente de la frise.`
        );
      } else if (!spanMatchesRecord(person.lifeSpan, record)) {
        errors.push(
          `${record.id} (${record.title}) : durée de vie différente du tableau.`
        );
      } else {
        representedRecordCount += 1;
      }
      continue;
    }

    const activity = activitiesByAuthoritativeRecordId.get(record.id);
    if (activity) {
      if (!spanMatchesRecord(activity.span, record)) {
        errors.push(
          `${record.id} (${record.title}) : période d’activité différente du tableau.`
        );
      } else {
        representedRecordCount += 1;
      }
      continue;
    }

    const event = eventsByAuthoritativeRecordId.get(record.id);
    if (event) {
      const span = focused.eventDataToTemporalSpan(event);
      if (!spanMatchesRecord(span, record)) {
        errors.push(
          `${record.id} (${record.title}) : période d’événement différente du tableau.`
        );
      } else {
        representedRecordCount += 1;
      }
      continue;
    }

    if (isDeliberatelyUnprojected(record)) {
      omittedAnchorCount += 1;
      continue;
    }

    errors.push(
      `${record.id} (${record.title}) : ligne datée du tableau non représentée.`
    );
  }

  const eventIds = new Set();
  for (const event of data.TIMELINE_EVENTS) {
    if (eventIds.has(event.id)) {
      errors.push(`${event.id} (${event.text}) : identifiant d’événement dupliqué.`);
    }
    eventIds.add(event.id);

    try {
      const span = focused.eventDataToTemporalSpan(event);
      if (span) temporal.validateTemporalSpan(span);
    } catch (error) {
      errors.push(`${event.id} (${event.text}) : ${error.message}`);
    }
  }

  const relationshipKeys = new Set();
  const reciprocalPairs = new Set(
    authoritative.AUTHORITATIVE_PERSON_RELATIONSHIPS.map(relationship => {
      const sourceId = canonicalPersonId(relationship.sourcePersonId);
      const targetId = canonicalPersonId(relationship.targetPersonId);
      return `${sourceId}|${targetId}`;
    })
  );

  for (const relationship of authoritative.AUTHORITATIVE_PERSON_RELATIONSHIPS) {
    const sourceId = canonicalPersonId(relationship.sourcePersonId);
    const targetId = canonicalPersonId(relationship.targetPersonId);
    const relationshipKey = `${sourceId}|${targetId}|${relationship.kind}`;
    if (relationshipKeys.has(relationshipKey)) {
      errors.push(`${relationship.id} : relation familiale dupliquée.`);
    }
    relationshipKeys.add(relationshipKey);

    const source = peopleById.get(sourceId);
    const target = peopleById.get(targetId);
    if (!source || !target) {
      errors.push(
        `${relationship.id} : personne source ou cible absente après rapprochement des identités.`
      );
      continue;
    }
    if (sourceId === targetId) {
      errors.push(`${relationship.id} : relation familiale vers soi-même.`);
    }
    relationship.supportingRecordIds.forEach(recordId => {
      if (!recordsById.has(recordId)) {
        errors.push(
          `${relationship.id} : ligne justificative ${recordId} absente du tableau.`
        );
      }
    });
    const associatedIds = new Set(
      (source.associatedPersonIds ?? []).map(canonicalPersonId)
    );
    if (!associatedIds.has(targetId)) {
      errors.push(
        `${relationship.id} : ${source.name} ne référence pas ${target.name}.`
      );
    }
    if (!reciprocalPairs.has(`${targetId}|${sourceId}`)) {
      errors.push(`${relationship.id} : relation réciproque absente.`);
    }

    if (
      (relationship.kind === 'son' || relationship.kind === 'daughter') &&
      source.lifeSpan &&
      target.lifeSpan
    ) {
      const parentLife = temporal.getTemporalInterval(source.lifeSpan, {
        includeUncertainty: false
      });
      const childBirth = target.lifeSpan.start
        ? temporal.getTemporalInterval(
            {
              start: target.lifeSpan.start,
              displayLabel: target.lifeSpan.displayLabel
            },
            { includeUncertainty: false }
          )
        : { unknown: true };
      const childBirthYear = childBirth.yearMin ?? childBirth.yearMax;
      if (
        childBirthYear !== undefined &&
        ((parentLife.yearMin !== undefined &&
          childBirthYear < parentLife.yearMin) ||
          (parentLife.yearMax !== undefined &&
            childBirthYear > parentLife.yearMax))
      ) {
        errors.push(
          `${relationship.id} : naissance de ${target.name} hors de la vie connue de ${source.name}.`
        );
      }
    }
  }

  for (const person of data.DISPLAY_HISTORICAL_PEOPLE) {
    const personId = canonicalPersonId(person.id);
    if (
      (person.associatedPersonIds ?? [])
        .map(canonicalPersonId)
        .includes(personId)
    ) {
      errors.push(`${person.id} (${person.name}) : relation vers soi-même.`);
    }

    const model = focused.buildFocusedTimeline({
      person,
      people: data.DISPLAY_HISTORICAL_PEOPLE,
      events: data.TIMELINE_EVENTS,
      relationships: authoritative.AUTHORITATIVE_PERSON_RELATIONSHIPS
    });
    if (!model) continue;
    modelCount += 1;
    markerCount += model.markers.length;

    const laneIds = model.people.map(lane =>
      canonicalPersonId(lane.person.id)
    );
    if (new Set(laneIds).size !== laneIds.length) {
      errors.push(`${person.id} (${person.name}) : personne affichée en double.`);
    }

    model.markers.forEach((marker, index) => {
      const duplicate = model.markers
        .slice(0, index)
        .find(previous =>
          focused.focusedTimelineEventsDescribeSameEvent(
            previous.event,
            marker.event
          )
        );
      if (duplicate) {
        errors.push(
          `${person.id} (${person.name}) : repères équivalents ${duplicate.event.id} et ${marker.event.id}.`
        );
      }
    });

    for (const marker of model.markers) {
      const eventStart = Math.min(
        marker.event.startPos,
        marker.event.endPos
      );
      const eventEnd = Math.max(marker.event.startPos, marker.event.endPos);
      if (
        eventEnd < model.anchorSpan.start ||
        eventStart > model.anchorSpan.end
      ) {
        errors.push(
          `${person.id} (${person.name}) : ${marker.event.id} est hors de la période du personnage.`
        );
      }

      if (!person.lifeSpan) continue;
      try {
        const eventPeriod = focused.eventDataToTemporalSpan(marker.event);
        if (!eventPeriod) continue;
        const calculation = chronology.calculatePersonAtEvent(
          person,
          eventPeriod
        );
        if (
          calculation.outsideKnownLife &&
          !model.anchorSpan.openStart &&
          !model.anchorSpan.openEnd
        ) {
          errors.push(
            `${person.id} (${person.name}) : un âge serait calculé hors de la vie pour ${marker.event.id}.`
          );
        }
      } catch (error) {
        errors.push(
          `${person.id} (${person.name}) / ${marker.event.id} : ${error.message}`
        );
      }
    }
  }

  const noeId = canonicalPersonId('atlas-0079');
  const semId = canonicalPersonId('atlas-0105');
  const noe = peopleById.get(noeId);
  const noeModel = noe
    ? focused.buildFocusedTimeline({
        person: noe,
        people: data.DISPLAY_HISTORICAL_PEOPLE,
        events: data.TIMELINE_EVENTS,
        relationships: authoritative.AUTHORITATIVE_PERSON_RELATIONSHIPS
      })
    : null;
  const semLane = noeModel?.people.find(
    lane => canonicalPersonId(lane.person.id) === semId
  );
  if (!semLane || semLane.relationshipLabel !== 'fils') {
    errors.push('Noé : Sem doit être affiché comme fils contemporain.');
  }

  const flood = eventsByAuthoritativeRecordId.get('atlas-0073');
  const floodParticipants = new Set(
    (flood?.associatedCharacterIds ?? []).map(canonicalPersonId)
  );
  ['atlas-0079', 'atlas-0146', 'atlas-0105', 'genese-cham'].forEach(
    personId => {
      if (!floodParticipants.has(canonicalPersonId(personId))) {
        errors.push(
          `Déluge : le participant ${personId} est absent de l’événement.`
        );
      }
    }
  );
  const floodMarker = noeModel?.markers.find(
    marker => marker.event.authoritativeRecordId === 'atlas-0073'
  );
  if (!floodMarker) {
    errors.push('Noé : le Déluge doit rester visible parmi les repères.');
  } else if (
    !semLane ||
    floodMarker.position < semLane.span.start ||
    floodMarker.position > semLane.span.end
  ) {
    errors.push('Noé : la ligne de Sem doit traverser le repère du Déluge.');
  }

  const abrahamId = canonicalPersonId('atlas-0147');
  const abraham = peopleById.get(abrahamId);
  const abrahamModel = abraham
    ? focused.buildFocusedTimeline({
        person: abraham,
        people: data.DISPLAY_HISTORICAL_PEOPLE,
        events: data.TIMELINE_EVENTS,
        relationships: authoritative.AUTHORITATIVE_PERSON_RELATIONSHIPS
      })
    : null;
  const semWithAbraham = abrahamModel?.people.find(
    lane => canonicalPersonId(lane.person.id) === semId
  );
  if (
    !semWithAbraham ||
    semWithAbraham.relationshipLabel !== 'ancêtre · 9 gén.'
  ) {
    errors.push(
      'Abraham : Sem doit être affiché comme ancêtre contemporain à neuf générations.'
    );
  } else {
    const sharedStart = Math.max(
      abrahamModel.anchorSpan.start,
      semWithAbraham.span.start
    );
    const sharedEnd = Math.min(
      abrahamModel.anchorSpan.end,
      semWithAbraham.span.end
    );
    if (sharedEnd - sharedStart !== 150) {
      errors.push(
        'Abraham : la période de contemporanéité avec Sem doit être de 150 ans.'
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Validation de la frise focalisée échouée (${errors.length}) :\n${errors.join('\n')}`
    );
  }

  console.log(
    `Frise focalisée validée : ${modelCount} modèles, ${markerCount} repères, ${authoritative.AUTHORITATIVE_PERSON_RELATIONSHIPS.length} relations et ${representedRecordCount} lignes datées concordantes (${omittedAnchorCount} ancres volontairement non projetées).`
  );
} finally {
  await server.close();
}
