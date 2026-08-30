import { createServer } from 'vite';

const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom'
});

try {
  const data = await server.ssrLoadModule('/src/data/historicalData.ts');
  const focused = await server.ssrLoadModule(
    '/src/domain/history/focusedTimeline.ts'
  );
  const chronology = await server.ssrLoadModule(
    '/src/domain/history/eventChronology.ts'
  );
  const temporal = await server.ssrLoadModule('/src/domain/history/temporal.ts');
  const errors = [];
  let modelCount = 0;
  let markerCount = 0;

  for (const event of data.TIMELINE_EVENTS) {
    try {
      const span = focused.eventDataToTemporalSpan(event);
      if (span) temporal.validateTemporalSpan(span);
    } catch (error) {
      errors.push(`${event.id} (${event.text}) : ${error.message}`);
    }
  }

  for (const person of data.DISPLAY_HISTORICAL_PEOPLE) {
    const model = focused.buildFocusedTimeline({
      person,
      people: data.DISPLAY_HISTORICAL_PEOPLE,
      events: data.TIMELINE_EVENTS
    });
    if (!model) continue;
    modelCount += 1;
    markerCount += model.markers.length;

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
        if (calculation.outsideKnownLife) {
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

  if (errors.length > 0) {
    throw new Error(
      `Validation de la frise focalisée échouée (${errors.length}) :\n${errors.join('\n')}`
    );
  }

  console.log(
    `Frise focalisée validée : ${modelCount} modèles et ${markerCount} repères cohérents.`
  );
} finally {
  await server.close();
}
