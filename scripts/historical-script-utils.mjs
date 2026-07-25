import { createServer } from 'vite';

export async function loadKnownApplicationEntities() {
  const server = await createServer({
    appType: 'custom',
    configFile: false,
    logLevel: 'error',
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true }
  });

  try {
    const [
      { BIBLICAL_PEOPLE },
      { EVENTS },
      { BIBLICAL_PLACES, BIBLICAL_ROUTES }
    ] = await Promise.all([
      server.ssrLoadModule('/src/data/biblicalPeople.ts'),
      server.ssrLoadModule('/src/data/timelineEvents.ts'),
      server.ssrLoadModule('/src/data/mapData.ts')
    ]);

    return {
      personIds: BIBLICAL_PEOPLE.map(person => person.id),
      placeIds: BIBLICAL_PLACES.map(place => place.id),
      eventIds: EVENTS.map(event => event.id),
      routeIds: BIBLICAL_ROUTES.map(route => route.id),
      territoryIds: []
    };
  } finally {
    await server.close();
  }
}

export function printHistoricalValidationError(error) {
  if (
    error &&
    typeof error === 'object' &&
    Array.isArray(error.issues)
  ) {
    console.error(error.message);
    error.issues.forEach(issue => {
      console.error(`- ${issue.path} : ${issue.message}`);
    });
    return;
  }
  console.error(error instanceof Error ? error.message : String(error));
}
