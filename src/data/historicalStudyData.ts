import historicalIndexJson from '../../content/generated/historical-index.json';
import personLifeResolutionsJson from '../../content/generated/person-life-resolutions.json';
import relationsJson from '../../content/generated/relations.json';
import sourceCatalogJson from '../../content/sources/source-catalog.json';
import type {
  DerivedHistoricalRelation,
  HistoricalClaim,
  ReviewedEventRecord,
  ReviewedPersonRecord,
  ReviewedPlaceRecord,
  ReviewedRouteRecord,
  ReviewedTerritoryRecord,
  SourceCatalogEntry
} from '../domain/history/contentTypes';
import type { PersonLifeResolution } from '../domain/history/personClaimResolution';
import type { HistoricalIndexBundle } from '../domain/history/historicalIndex';
import {
  createHistoricalSnapshotCatalog,
  mergeReviewedPeople
} from '../domain/history/historicalSnapshot';
import { BIBLICAL_PEOPLE } from './biblicalPeople';
import { BIBLICAL_PLACES } from './mapData';

const flattenJsonModules = <T>(
  modules: Record<string, unknown>
): T[] =>
  Object.entries(modules)
    .sort(([left], [right]) => left.localeCompare(right))
    .flatMap(([, value]) => (Array.isArray(value) ? (value as T[]) : []));

const reviewedPeople = flattenJsonModules<ReviewedPersonRecord>(
  import.meta.glob('../../content/reviewed/people/**/*.json', {
    eager: true,
    import: 'default'
  })
);
const reviewedEvents = flattenJsonModules<ReviewedEventRecord>(
  import.meta.glob('../../content/reviewed/events/**/*.json', {
    eager: true,
    import: 'default'
  })
);
const reviewedPlaces = flattenJsonModules<ReviewedPlaceRecord>(
  import.meta.glob('../../content/reviewed/places/**/*.json', {
    eager: true,
    import: 'default'
  })
);
const reviewedClaims = flattenJsonModules<HistoricalClaim>(
  import.meta.glob('../../content/reviewed/claims/**/*.json', {
    eager: true,
    import: 'default'
  })
);
const reviewedRoutes = flattenJsonModules<ReviewedRouteRecord>(
  import.meta.glob('../../content/reviewed/routes/**/*.json', {
    eager: true,
    import: 'default'
  })
);
const reviewedTerritories = flattenJsonModules<ReviewedTerritoryRecord>(
  import.meta.glob('../../content/reviewed/territories/**/*.json', {
    eager: true,
    import: 'default'
  })
);

export const HISTORICAL_SOURCE_CATALOG =
  sourceCatalogJson as unknown as SourceCatalogEntry[];
export const REVIEWED_HISTORICAL_PEOPLE = reviewedPeople;
export const REVIEWED_HISTORICAL_EVENTS = reviewedEvents;
export const REVIEWED_HISTORICAL_PLACES = reviewedPlaces;
export const REVIEWED_HISTORICAL_CLAIMS = reviewedClaims;
export const REVIEWED_HISTORICAL_TERRITORIES = reviewedTerritories;
export const DERIVED_HISTORICAL_RELATIONS =
  relationsJson as unknown as DerivedHistoricalRelation[];
export const HISTORICAL_INDEX =
  historicalIndexJson as unknown as HistoricalIndexBundle;
export const PERSON_LIFE_RESOLUTIONS =
  personLifeResolutionsJson as unknown as PersonLifeResolution[];

const mergedHistoricalPeople = mergeReviewedPeople(
  BIBLICAL_PEOPLE,
  REVIEWED_HISTORICAL_PEOPLE,
  HISTORICAL_SOURCE_CATALOG
);

const routeIdsByEventId = new Map<string, string[]>();
reviewedRoutes.forEach(record => {
  record.route.associatedEventIds.forEach(eventId => {
    routeIdsByEventId.set(eventId, [
      ...(routeIdsByEventId.get(eventId) ?? []),
      record.route.id
    ]);
  });
});

const unique = (values: Array<string | undefined>): string[] =>
  [...new Set(values.filter((value): value is string => Boolean(value)))];

/**
 * Les fiches existantes restent la base canonique. Les associations A7
 * explicitement relues sont ajoutées sans écraser leurs métadonnées.
 */
export const HISTORICAL_PEOPLE = mergedHistoricalPeople.map(person => {
  const relatedEvents = REVIEWED_HISTORICAL_EVENTS.filter(record =>
    record.event.participantMentions?.some(
      participant => participant.personId === person.id
    )
  );
  return {
    ...person,
    associatedEventIds: unique([
      ...(person.associatedEventIds ?? []),
      ...relatedEvents.map(record => record.event.id)
    ]),
    associatedLocationIds: unique([
      ...(person.associatedLocationIds ?? []),
      ...relatedEvents.flatMap(record =>
        (record.event.placeMentions ?? []).map(mention => mention.placeId)
      )
    ]),
    associatedRouteIds: unique([
      ...(person.associatedRouteIds ?? []),
      ...relatedEvents.flatMap(
        record => routeIdsByEventId.get(record.event.id) ?? []
      )
    ])
  };
});

export type HistoricalPersonAssociationStatus =
  | 'calculated-overlap'
  | 'biblically-attested'
  | 'documented-interaction';

export interface HistoricalPersonAssociation {
  personId: string;
  name: string;
  contextLabel?: string;
  status: HistoricalPersonAssociationStatus;
  certainty: DerivedHistoricalRelation['certainty'];
  periodLabel?: string;
  supportingClaimIds: string[];
}

const relationsForPair = (leftId: string, rightId: string) =>
  DERIVED_HISTORICAL_RELATIONS.filter(
    relation =>
      relation.subjectIds.includes(leftId) &&
      relation.subjectIds.includes(rightId)
  );

const associationStatus = (
  relations: DerivedHistoricalRelation[]
): HistoricalPersonAssociationStatus =>
  relations.some(
    relation => relation.relationLevel === 'documented-interaction'
  )
    ? 'documented-interaction'
    : relations.some(relation => relation.relationLevel === 'same-event')
      ? 'biblically-attested'
      : 'calculated-overlap';

const associationsForRolePair = (
  personId: string,
  ownRoles: Array<'king' | 'queen' | 'prophet'>,
  otherRole: 'king' | 'queen' | 'prophet'
): HistoricalPersonAssociation[] => {
  const person = HISTORICAL_PEOPLE.find(candidate => candidate.id === personId);
  if (!person || !person.roles?.some(role => ownRoles.includes(role as never))) {
    return [];
  }
  const relationByOtherId = new Map<string, DerivedHistoricalRelation>();
  DERIVED_HISTORICAL_RELATIONS.filter(
    relation =>
      relation.relationLevel === 'prophet-during-reign' &&
      relation.subjectIds.includes(personId)
  ).forEach(relation => {
    const otherId = relation.subjectIds.find(id => id !== personId);
    if (otherId) relationByOtherId.set(otherId, relation);
  });

  return [...relationByOtherId.entries()]
    .flatMap(([otherId, overlapRelation]) => {
      const other = HISTORICAL_PEOPLE.find(candidate => candidate.id === otherId);
      if (!other?.roles?.includes(otherRole)) return [];
      const pairRelations = relationsForPair(personId, otherId);
      return [
        {
          personId: otherId,
          name: other.name,
          contextLabel: other.realmIds?.includes('territory-kingdom-judah')
            ? 'Royaume de Juda'
            : other.realmIds?.includes('territory-kingdom-israel')
              ? 'Royaume d’Israël'
              : other.roles?.includes('prophet')
                ? 'Ministère prophétique'
                : undefined,
          status: associationStatus(pairRelations),
          certainty: overlapRelation.certainty,
          periodLabel: overlapRelation.temporalOverlap?.displayLabel,
          supportingClaimIds: [
            ...new Set(
              pairRelations.flatMap(relation => relation.supportingClaimIds)
            )
          ]
        }
      ];
    })
    .sort((left, right) => left.name.localeCompare(right.name));
};

export const getActiveProphetsDuringReign = (
  kingId: string
): HistoricalPersonAssociation[] =>
  associationsForRolePair(kingId, ['king', 'queen'], 'prophet');

export const getContemporaryKingsForProphet = (
  prophetId: string
): HistoricalPersonAssociation[] => [
  ...associationsForRolePair(prophetId, ['prophet'], 'king'),
  ...associationsForRolePair(prophetId, ['prophet'], 'queen')
].sort((left, right) => left.name.localeCompare(right.name));

export const HISTORICAL_SNAPSHOT_CATALOG =
  createHistoricalSnapshotCatalog(
    {
      sources: HISTORICAL_SOURCE_CATALOG,
      people: REVIEWED_HISTORICAL_PEOPLE,
      events: REVIEWED_HISTORICAL_EVENTS,
      places: REVIEWED_HISTORICAL_PLACES,
      claims: REVIEWED_HISTORICAL_CLAIMS
    },
    HISTORICAL_INDEX,
    DERIVED_HISTORICAL_RELATIONS,
    { placeNames: BIBLICAL_PLACES }
  );
