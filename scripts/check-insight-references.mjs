import { createServer } from 'vite';

const ONLINE = process.argv.includes('--online');
const INSIGHT_URL_PATTERN =
  /^https:\/\/wol\.jw\.org\/fr\/wol\/d\/r30\/lp-f\/120000\d{4}(?:[?#].*)?$/;
const WOL_URL_PATTERN =
  /^https:\/\/wol\.jw\.org\/fr\/wol\/d\/r30\/lp-f\/\d+(?:[?#].*)?$/;

const mapWithConcurrency = async (items, limit, worker) => {
  let nextIndex = 0;
  const runners = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (nextIndex < items.length) {
        const index = nextIndex;
        nextIndex += 1;
        await worker(items[index], index);
      }
    }
  );
  await Promise.all(runners);
};

const server = await createServer({
  root: '.',
  configFile: false,
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'silent'
});

try {
  const { EVENTS } = await server.ssrLoadModule('/src/data/timelineEvents.ts');
  const { BIBLICAL_PLACES } = await server.ssrLoadModule('/src/data/mapData.ts');
  const people = EVENTS.filter(event =>
    /^(Personnage|Roi|Proph|Fils)/.test(event.category)
  );
  const entities = [...people, ...BIBLICAL_PLACES];
  const missing = entities.filter(
    entity => !entity.encyclopediaReferences?.length
  );
  const references = entities.flatMap(
    entity => entity.encyclopediaReferences || []
  );
  const duplicateIds = references
    .map(reference => reference.id)
    .filter((id, index, all) => all.indexOf(id) !== index);
  const invalidUrls = references.filter(reference =>
    reference.work === 'insight'
      ? !INSIGHT_URL_PATTERN.test(reference.url)
      : !WOL_URL_PATTERN.test(reference.url)
  );

  if (missing.length || duplicateIds.length || invalidUrls.length) {
    throw new Error(
      JSON.stringify(
        {
          missing: missing.map(entity => entity.id),
          duplicateIds: [...new Set(duplicateIds)],
          invalidUrls: invalidUrls.map(reference => reference.url)
        },
        null,
        2
      )
    );
  }

  if (ONLINE) {
    const uniqueReferences = [
      ...new Map(references.map(reference => [reference.url, reference])).values()
    ];
    const failures = [];

    await mapWithConcurrency(uniqueReferences, 8, async reference => {
      try {
        const response = await fetch(reference.url, {
          headers: {
            'user-agent': 'Biblical-Atlas-for-Study reference checker'
          }
        });
        const text = await response.text();
        const hasExpectedPublication =
          reference.work === 'insight'
            ? text.includes('Étude perspicace des Écritures')
            : text.includes('BIBLIOTHÈQUE EN LIGNE Watchtower');

        if (!response.ok || !hasExpectedPublication) {
          failures.push({
            url: reference.url,
            status: response.status,
            expectedWork: reference.work
          });
        }
      } catch (error) {
        failures.push({
          url: reference.url,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });

    if (failures.length) {
      throw new Error(JSON.stringify({ onlineFailures: failures }, null, 2));
    }
  }

  const insightCount = references.filter(
    reference => reference.work === 'insight'
  ).length;
  const wolCount = references.length - insightCount;
  console.log(
    `Références valides : ${people.length} personnages, ` +
      `${BIBLICAL_PLACES.length} lieux, ${insightCount} liens Étude perspicace, ` +
      `${wolCount} liens WOL complémentaires${ONLINE ? ', pages accessibles' : ''}.`
  );
} finally {
  await server.close();
}
