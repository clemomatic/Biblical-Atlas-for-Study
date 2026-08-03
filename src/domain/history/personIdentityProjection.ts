import type { BiblicalPerson, PersonActivityPeriod } from './types';
import type { EventData, SourceReference } from '../../types';

/**
 * Rapprochements relus entre anciennes fiches et fiches plus récentes.
 * Les homonymes bibliques ne sont jamais rapprochés par leur seul nom.
 */
export const HISTORICAL_PERSON_ID_ALIASES = new Map<string, string>([
  ['wcg-joseph', 'person-a7-joseph-pere-adoptif'],
  ['atlas-0116', 'person-a7-zacharie-pretre'],
  ['wcg-marie-mere', 'person-a7-marie-mere-jesus'],
  ['wcg-marie-bethanie', 'person-a7-marie-bethanie'],
  ['wcg-paul', 'person-wcg-paul'],
  ['wcg-petite-israelite', 'person-wcg-petite-fille-israelite'],
  ['event-samuel-8qh05i', 'samuel-vie'],
  ['person-wcg-jonathan', 'wcg-jonathan'],
  ['event-saul-z98f25', 'atlas-0087'],
  ['atlas-0147', 'event-abraham-mdcznq'],
  ['atlas-0080', 'event-adam-2peny4'],
  ['atlas-0032', 'event-asa-1yoxudp'],
  ['wcg-barnabe', 'person-wcg-barnabe'],
  ['wcg-caleb', 'person-wcg-caleb'],
  ['atlas-0189', 'event-david-iixp36'],
  ['wcg-elisabeth', 'person-a7-elisabeth'],
  ['wcg-esther', 'person-wcg-esther'],
  ['wcg-etienne', 'person-wcg-etienne'],
  ['atlas-0136', 'event-ezechias-1ne958h'],
  ['ezechiel-vie', 'person-ezechiel-a6-b'],
  ['atlas-0144', 'event-henoch-5b97vn'],
  ['atlas-0081', 'event-isaac-16b1gw1'],
  ['atlas-0106', 'event-jacob-a7o7cq'],
  ['atlas-0187', 'event-jean-le-baptiseur-dvgl2c'],
  ['atlas-0036', 'event-jesus-en-tant-qu-humain-1f4ceyz'],
  ['wcg-joad', 'person-wcg-joad'],
  ['atlas-0089', 'event-josias-woei8d'],
  ['atlas-0037', 'person-wcg-josue'],
  ['atlas-0066', 'event-manasse-1d4ld4r'],
  ['wcg-marc', 'person-wcg-marc'],
  ['wcg-marie-magdala', 'person-wcg-marie-magdala'],
  ['wcg-mefibosheth', 'person-wcg-mefibosheth'],
  ['atlas-0007', 'event-moise-p4dtf4'],
  ['wcg-nehemie', 'person-wcg-nehemie'],
  ['atlas-0079', 'event-noe-qdkz7y'],
  ['wcg-pierre', 'person-a7-pierre'],
  ['wcg-rahab', 'person-wcg-rahab'],
  ['wcg-rebecca', 'person-wcg-rebecca'],
  ['atlas-0155', 'event-sara-1xft3rw']
]);

export const canonicalizeHistoricalPersonId = (
  personId: string | undefined
): string | undefined => {
  if (!personId) return undefined;
  return HISTORICAL_PERSON_ID_ALIASES.get(personId) ?? personId;
};

const unique = <T>(values: Array<T | undefined>): T[] =>
  [...new Set(values.filter((value): value is T => value !== undefined))];

const uniqueById = <T extends { id: string }>(values: T[]): T[] =>
  [...new Map(values.map(value => [value.id, value])).values()];

const uniqueSources = (values: SourceReference[]): SourceReference[] => {
  const seen = new Set<string>();
  return values.filter(source => {
    const key = source.id || source.url || source.label;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const canonicalizeActivity = (
  activity: PersonActivityPeriod
): PersonActivityPeriod => ({
  ...activity,
  associatedPersonIds: unique(
    (activity.associatedPersonIds ?? []).map(canonicalizeHistoricalPersonId)
  )
});

const mergePeopleGroup = (
  canonicalId: string,
  people: BiblicalPerson[]
): BiblicalPerson => {
  const canonical =
    people.find(person => person.id === canonicalId) ?? people[0];
  const aliases = people.filter(person => person !== canonical);
  const notes = unique(people.map(person => person.notes));
  const latestWithLifeSpan = [...people].reverse().find(person => person.lifeSpan);
  const latestWithDescription = [...people].reverse().find(person => person.description);
  const latestWithCertainty = [...people].reverse().find(person => person.certainty);
  const lastVerified = people
    .map(person => person.lastVerified)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);

  return {
    ...canonical,
    id: canonicalId,
    certainty: latestWithCertainty?.certainty ?? canonical.certainty,
    alternateNames: unique([
      ...(canonical.alternateNames ?? []),
      ...aliases.flatMap(person => [person.name, ...(person.alternateNames ?? [])])
    ]).filter(name => name !== canonical.name),
    roles: unique(people.flatMap(person => person.roles ?? [])),
    historicalCategories: unique(
      people.flatMap(person => person.historicalCategories ?? [])
    ),
    realmIds: unique(people.flatMap(person => person.realmIds ?? [])),
    description: latestWithDescription?.description ?? canonical.description,
    lifeSpan: latestWithLifeSpan?.lifeSpan ?? canonical.lifeSpan,
    legacyEventId:
      canonical.legacyEventId ??
      aliases.find(person => person.legacyEventId)?.legacyEventId,
    lifeSpanClaimIds: unique(
      people.flatMap(person => person.lifeSpanClaimIds ?? [])
    ),
    sourceTimelineWindows: uniqueById(
      people.flatMap(person => person.sourceTimelineWindows ?? [])
    ),
    activityPeriods: uniqueById(
      people
        .flatMap(person => person.activityPeriods)
        .map(canonicalizeActivity)
    ),
    associatedEventIds: unique(
      people.flatMap(person => person.associatedEventIds ?? [])
    ),
    associatedLocationIds: unique(
      people.flatMap(person => person.associatedLocationIds ?? [])
    ),
    associatedRouteIds: unique(
      people.flatMap(person => person.associatedRouteIds ?? [])
    ),
    associatedPersonIds: unique(
      people
        .flatMap(person => person.associatedPersonIds ?? [])
        .map(canonicalizeHistoricalPersonId)
    ),
    biblicalReferences: unique(
      people.flatMap(person => person.biblicalReferences ?? [])
    ),
    documentaryReferences: unique(
      people.flatMap(person => person.documentaryReferences ?? [])
    ),
    sources: uniqueSources(people.flatMap(person => person.sources ?? [])),
    encyclopediaReferences: uniqueById(
      people.flatMap(person => person.encyclopediaReferences ?? [])
    ),
    media: uniqueById(people.flatMap(person => person.media ?? [])),
    geographicProvenance: uniqueById(
      people.flatMap(person => person.geographicProvenance ?? [])
    ),
    notes: notes.join('\n\n') || undefined,
    lastVerified
  };
};

export const mergeHistoricalPeopleForDisplay = (
  people: readonly BiblicalPerson[]
): BiblicalPerson[] => {
  const groups = new Map<string, BiblicalPerson[]>();
  people.forEach(person => {
    const canonicalId = canonicalizeHistoricalPersonId(person.id) as string;
    groups.set(canonicalId, [...(groups.get(canonicalId) ?? []), person]);
  });
  return [...groups].map(([canonicalId, group]) =>
    mergePeopleGroup(canonicalId, group)
  );
};

const mergeTimelineGroup = (
  canonicalId: string,
  events: EventData[]
): EventData => {
  const canonical =
    events.find(event => event.id === canonicalId) ??
    events.find(event => event.historicalPersonId === canonicalId) ??
    events[0];
  const authoritative =
    events.find(event => event.authoritativeRecordId && event.historicalPersonSpanKind === 'lifespan') ??
    events.find(event => event.authoritativeRecordId) ?? canonical;
  return {
    ...authoritative,
    ...canonical,
    id: canonical.id,
    text: canonical.text,
    historicalPersonId: canonicalId,
    associatedLocationIds: unique(
      events.flatMap(event => event.associatedLocationIds ?? [])
    ),
    associatedRouteIds: unique(
      events.flatMap(event => event.associatedRouteIds ?? [])
    ),
    associatedCharacterIds: unique(
      events
        .flatMap(event => event.associatedCharacterIds ?? [])
        .map(canonicalizeHistoricalPersonId)
    ),
    historicalActivityPeriods: uniqueById(
      events
        .flatMap(event => event.historicalActivityPeriods ?? [])
        .map(canonicalizeActivity)
    ),
    biblicalReferences: unique(
      events.flatMap(event => event.biblicalReferences ?? [])
    ),
    documentaryReferences: unique(
      events.flatMap(event => event.documentaryReferences ?? [])
    ),
    sources: uniqueSources(events.flatMap(event => event.sources ?? [])),
    notes: unique(events.map(event => event.notes)).join('\n\n') || undefined
  };
};

export const mergePersonTimelineEventsForDisplay = (
  events: readonly EventData[]
): EventData[] => {
  const identityGroups = new Map<string, EventData[]>();
  const passthrough: EventData[] = [];

  events.forEach(event => {
    const canonicalPersonId = canonicalizeHistoricalPersonId(
      event.historicalPersonId
    );
    const canonicalRelations = unique(
      (event.associatedCharacterIds ?? []).map(canonicalizeHistoricalPersonId)
    );
    const normalized = {
      ...event,
      historicalPersonId: canonicalPersonId,
      associatedCharacterIds: canonicalRelations
    };
    const belongsToReviewedAliasGroup =
      event.historicalPersonId &&
      (HISTORICAL_PERSON_ID_ALIASES.has(event.historicalPersonId) ||
        [...HISTORICAL_PERSON_ID_ALIASES.values()].includes(
          event.historicalPersonId
        ));

    if (
      canonicalPersonId &&
      belongsToReviewedAliasGroup
    ) {
      identityGroups.set(canonicalPersonId, [
        ...(identityGroups.get(canonicalPersonId) ?? []),
        normalized
      ]);
    } else {
      passthrough.push(normalized);
    }
  });

  return [
    ...passthrough,
    ...[...identityGroups].map(([canonicalId, group]) =>
      mergeTimelineGroup(canonicalId, group)
    )
  ];
};
