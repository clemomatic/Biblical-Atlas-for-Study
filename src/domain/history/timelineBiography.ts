import type {
  BiblicalPerson,
  PersonActivityPeriod,
  PersonActivityType
} from './types.ts';
import type {
  EventData,
  HistoricalPersonLaneId
} from '../../types.ts';
import { eventDataToTemporalSpan } from './eventChronology.ts';
import { getTemporalInterval } from './temporal.ts';

export interface BiographyLaneDefinition {
  id: HistoricalPersonLaneId;
  label: string;
  shortLabel: string;
  description: string;
  color: string;
  softColor: string;
  order: number;
}

export const BIOGRAPHY_LANES: readonly BiographyLaneDefinition[] = [
  {
    id: 'united-monarchy',
    label: 'Rois d’Israël unifié',
    shortLabel: 'Monarchie unifiée',
    description:
      'Règnes concernant l’ensemble des tribus avant la division du royaume.',
    color: '#8b653f',
    softColor: '#f3e7d8',
    order: 10
  },
  {
    id: 'judah-kings',
    label: 'Rois de Juda',
    shortLabel: 'Juda',
    description: 'Règnes associés au royaume de Juda.',
    color: '#8d4f56',
    softColor: '#f2e5e5',
    order: 20
  },
  {
    id: 'israel-kings',
    label: 'Rois des dix tribus',
    shortLabel: 'Dix tribus',
    description: 'Règnes associés au royaume d’Israël après la division.',
    color: '#397b78',
    softColor: '#e1f0ed',
    order: 30
  },
  {
    id: 'prophets',
    label: 'Prophètes',
    shortLabel: 'Prophètes',
    description: 'Vies et périodes d’activité prophétique documentées.',
    color: '#3f4e78',
    softColor: '#e9edf7',
    order: 40
  },
  {
    id: 'people',
    label: 'Autres personnages',
    shortLabel: 'Personnages',
    description: 'Autres vies et périodes d’activité documentées.',
    color: '#687258',
    softColor: '#e9ede2',
    order: 50
  }
] as const;

export const BIOGRAPHY_LANE_BY_ID = new Map(
  BIOGRAPHY_LANES.map(lane => [lane.id, lane] as const)
);

const normalizeName = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase();

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const legacyActivityType = (
  event: EventData
): PersonActivityType | undefined => {
  const category = normalizeName(event.category);
  if (category.includes('roi') || category.includes('regne')) return 'reign';
  if (category.includes('prophete')) return 'prophecy';
  return undefined;
};

const activityRealm = (event: EventData): string | undefined => {
  const category = normalizeName(event.category);
  if (category.includes('juda')) return 'territory-kingdom-judah';
  if (category.includes('israel')) return 'territory-kingdom-israel';
  return undefined;
};

const startsWithPersonName = (
  event: EventData,
  person: BiblicalPerson
): boolean => {
  const eventName = normalizeName(event.text);
  return [person.name, ...(person.alternateNames ?? [])].some(name => {
    const normalized = normalizeName(name);
    return eventName === normalized || eventName.startsWith(`${normalized} `);
  });
};

const sameActivity = (
  left: PersonActivityPeriod,
  right: PersonActivityPeriod
): boolean => {
  if (left.type !== right.type) return false;
  const leftInterval = getTemporalInterval(left.span);
  const rightInterval = getTemporalInterval(right.span);
  return (
    !leftInterval.unknown &&
    !rightInterval.unknown &&
    leftInterval.yearMin === rightInterval.yearMin &&
    leftInterval.yearMax === rightInterval.yearMax
  );
};

export interface LegacyBiographyMerge {
  activitiesByPersonId: Map<string, PersonActivityPeriod[]>;
  supersededLegacyEventIds: Set<string>;
}

/**
 * Rattache uniquement les anciennes lignes de fonction dont le nom désigne
 * sans ambiguïté une personne possédant déjà une ligne de vie.
 *
 * Les dates et la certitude restent celles de l'EventData existant. Cette
 * normalisation est visuelle et ne crée aucun nouveau fait historique.
 */
export const mergeLegacyActivitiesIntoBiographies = (
  people: readonly BiblicalPerson[],
  legacyEvents: readonly EventData[]
): LegacyBiographyMerge => {
  const activitiesByPersonId = new Map<string, PersonActivityPeriod[]>();
  const supersededLegacyEventIds = new Set<string>();

  people
    .filter(person => person.lifeSpan)
    .forEach(person => {
      const canonical = [...person.activityPeriods];
      const matchedLegacyActivities = legacyEvents
        .filter(event => {
          const type = legacyActivityType(event);
          if (!type) return false;
          return (
            event.id === person.legacyEventId ||
            startsWithPersonName(event, person)
          );
        })
        .map(event => {
          const type = legacyActivityType(event) as PersonActivityType;
          const activity: PersonActivityPeriod = {
            id: `legacy-activity-${event.id}`,
            type,
            label:
              type === 'reign'
                ? event.text === person.name
                  ? 'Règne'
                  : event.text.replace(
                      new RegExp(
                        `^${escapeRegExp(person.name)}\\s*[-—:]?\\s*`,
                        'i'
                      ),
                      ''
                    ) || 'Règne'
                : 'Activité prophétique',
            span: eventDataToTemporalSpan(event),
            realmId: activityRealm(event),
            associatedEventIds: [event.id],
            associatedLocationIds: event.associatedLocationIds,
            associatedRouteIds: event.associatedRouteIds,
            biblicalReferences: event.biblicalReferences,
            documentaryReferences: event.documentaryReferences,
            sources: event.sources,
            certainty: event.certainty,
            notes:
              'Période reprise d’une ligne de compatibilité existante et intégrée au ruban biographique.'
          };
          return { activity, eventId: event.id };
        });

      matchedLegacyActivities.forEach(({ activity, eventId }) => {
        if (person.activityPeriods.length === 0) {
          if (!canonical.some(existing => sameActivity(existing, activity))) {
            canonical.push(activity);
          }
        }
        supersededLegacyEventIds.add(eventId);
      });

      activitiesByPersonId.set(person.id, canonical);
    });

  legacyEvents.forEach(event => {
    const type = legacyActivityType(event);
    const names = normalizeName(event.text).split(' et ').filter(Boolean);
    if (!type || names.length < 2) return;

    const eventInterval = getTemporalInterval(
      eventDataToTemporalSpan(event)
    );
    if (
      eventInterval.unknown ||
      eventInterval.yearMin === undefined ||
      eventInterval.yearMax === undefined
    ) {
      return;
    }

    const realmId = activityRealm(event);
    const everyNamedPersonHasTheDocumentedPhase = names.every(name =>
      people.some(
        person =>
          [person.name, ...(person.alternateNames ?? [])].some(
            candidate => normalizeName(candidate) === name
          ) &&
          person.activityPeriods.some(activity => {
            if (activity.type !== type) return false;
            if (realmId && activity.realmId !== realmId) return false;
            const activityInterval = getTemporalInterval(activity.span);
            return (
              !activityInterval.unknown &&
              activityInterval.yearMin !== undefined &&
              activityInterval.yearMax !== undefined &&
              activityInterval.yearMin <= eventInterval.yearMax &&
              eventInterval.yearMin <= activityInterval.yearMax
            );
          })
      )
    );

    if (everyNamedPersonHasTheDocumentedPhase) {
      supersededLegacyEventIds.add(event.id);
    }
  });

  return { activitiesByPersonId, supersededLegacyEventIds };
};

export const getBiographyLaneId = (
  person: Pick<BiblicalPerson, 'roles' | 'activityPeriods'>,
  activities: readonly PersonActivityPeriod[] = person.activityPeriods
): HistoricalPersonLaneId => {
  const reign = activities.find(activity => activity.type === 'reign');
  if (reign?.realmId === 'territory-kingdom-judah') return 'judah-kings';
  if (reign?.realmId === 'territory-kingdom-israel') return 'israel-kings';
  if (reign) return 'united-monarchy';
  if (
    activities.some(activity => activity.type === 'prophecy') ||
    person.roles?.includes('prophet')
  ) {
    return 'prophets';
  }
  return 'people';
};

export const getBiographyLaneIdForEvent = (
  event: EventData
): HistoricalPersonLaneId => {
  if (event.historicalPersonLaneId) return event.historicalPersonLaneId;
  const category = normalizeName(event.category);
  if (category.includes('roi de juda')) return 'judah-kings';
  if (category.includes('roi d israel')) return 'israel-kings';
  if (category.includes('regne')) return 'united-monarchy';
  if (category.includes('prophete')) return 'prophets';
  return 'people';
};
