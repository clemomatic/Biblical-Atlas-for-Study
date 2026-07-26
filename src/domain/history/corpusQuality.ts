import type { BiblicalPlace, EventData } from '../../types.ts';
import { generateCalculatedHistoricalClaims } from './calculatedClaims.ts';
import {
  HistoricalDataValidationError,
  validateGeneratedRelations,
  validateHistoricalDataset,
  type HistoricalValidationIssue
} from './contentValidation.ts';
import type {
  CalculatedHistoricalClaim,
  DerivedHistoricalRelation,
  HistoricalDataset,
  KnownHistoricalEntities
} from './contentTypes.ts';
import {
  findEventReconciliationCandidates,
  type EventReconciliationCandidate
} from './eventReconciliation.ts';
import type { PersonLifeResolution } from './personClaimResolution.ts';
import { validateTemporalSpan } from './temporal.ts';
import type { TemporalSpan } from './types.ts';

export interface CorpusQualityPeriodIssue {
  id: string;
  path: string;
  message: string;
}

export interface CorpusQualityReport {
  version: '1';
  summary: {
    reviewedPeople: number;
    reviewedEvents: number;
    reviewedClaims: number;
    reviewedPresences: number;
    generatedRelations: number;
    blockingIssues: number;
    backlogItems: number;
  };
  peopleWithoutSource: string[];
  eventsWithoutSource: string[];
  placesWithoutProvenance: string[];
  impossiblePeriods: CorpusQualityPeriodIssue[];
  orphanIdentifiers: HistoricalValidationIssue[];
  relationsWithoutSufficientEvidence: HistoricalValidationIssue[];
  unreviewedClaims: string[];
  contradictions: string[];
  nonReproducibleCalculations: string[];
  possibleDuplicates: EventReconciliationCandidate[];
  legacyModelElements: {
    peopleStoredAsEvents: string[];
    eventsOutsideReviewedCorpus: string[];
  };
  stagingItems: string[];
}

export interface CorpusQualityInput {
  dataset: HistoricalDataset;
  knownEntities: KnownHistoricalEntities;
  generatedRelations: DerivedHistoricalRelation[];
  storedCalculatedClaims: CalculatedHistoricalClaim[];
  personLifeResolutions: PersonLifeResolution[];
  applicationEvents: EventData[];
  applicationPlaces: BiblicalPlace[];
  migratedPersonIds: Iterable<string>;
}

const stable = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

const captureValidationIssues = (action: () => void): HistoricalValidationIssue[] => {
  try {
    action();
    return [];
  } catch (error) {
    if (error instanceof HistoricalDataValidationError) return error.issues;
    throw error;
  }
};

const collectPeriodIssues = (dataset: HistoricalDataset): CorpusQualityPeriodIssue[] => {
  const periods: Array<{ id: string; path: string; period?: TemporalSpan }> = [];
  dataset.people.forEach(record => {
    periods.push({ id: record.person.id, path: 'people.lifeSpan', period: record.person.lifeSpan });
    record.person.activityPeriods.forEach(activity => periods.push({
      id: activity.id,
      path: 'people.activityPeriods',
      period: activity.span
    }));
  });
  dataset.events.forEach(record => periods.push({
    id: record.event.id,
    path: 'events.period',
    period: record.event.period
  }));
  dataset.claims.forEach(claim => periods.push({
    id: claim.id,
    path: 'claims.period',
    period: claim.period
  }));
  dataset.presences.forEach(presence => periods.push({
    id: presence.id,
    path: 'presences.period',
    period: presence.period
  }));
  dataset.routes.forEach(record => periods.push({
    id: record.route.id,
    path: 'routes.period',
    period: record.route.period
  }));
  dataset.territories.forEach(record => {
    periods.push({ id: record.territory.id, path: 'territories.period', period: record.territory.period });
    record.territory.capitalPhases.forEach(phase => periods.push({
      id: phase.id,
      path: 'territories.capitalPhases.period',
      period: phase.period
    }));
  });

  return periods.flatMap(item => {
    if (!item.period) return [];
    try {
      validateTemporalSpan(item.period);
      return [];
    } catch (error) {
      return [{
        id: item.id,
        path: item.path,
        message: error instanceof Error ? error.message : String(error)
      }];
    }
  }).sort((left, right) => left.id.localeCompare(right.id));
};

const isLegacyPersonEvent = (event: EventData): boolean =>
  event.categoryId === 'characters' ||
  event.category.toLocaleLowerCase('fr').includes('personnage');

export const buildCorpusQualityReport = (
  input: CorpusQualityInput
): CorpusQualityReport => {
  const { dataset } = input;
  const datasetIssues = captureValidationIssues(() =>
    validateHistoricalDataset(dataset, input.knownEntities)
  );
  const relationIssues = captureValidationIssues(() =>
    validateGeneratedRelations(
      input.generatedRelations,
      dataset,
      input.knownEntities
    )
  );
  const impossiblePeriods = collectPeriodIssues(dataset);
  const orphanIdentifiers = datasetIssues.filter(issue =>
    /inexistant|orphelin/i.test(issue.message)
  );
  const relationsWithoutSufficientEvidence = relationIssues.filter(issue =>
    /claim|preuve|document|justific|interaction|participation|certain/i.test(issue.message)
  );
  const unreviewedClaims = dataset.claims
    .filter(claim =>
      claim.workflowStatus !== 'reviewed' ||
      claim.origin !== 'reviewed' ||
      claim.evidence.some(evidence => evidence.humanReviewStatus !== 'reviewed')
    )
    .map(claim => claim.id)
    .sort();
  const contradictions = [
    ...input.personLifeResolutions
      .filter(resolution => resolution.status === 'divergent')
      .map(resolution => `person:${resolution.personId}`),
    ...input.storedCalculatedClaims
      .filter(claim => Boolean(claim.conflict))
      .map(claim => `claim:${claim.id}`)
  ].sort();
  const regeneratedCalculatedClaims = generateCalculatedHistoricalClaims(
    dataset.claims,
    dataset.calculations
  );
  const nonReproducibleCalculations =
    stable(regeneratedCalculatedClaims) === stable(input.storedCalculatedClaims)
      ? []
      : [
          ...new Set([
            ...regeneratedCalculatedClaims.map(claim => claim.id),
            ...input.storedCalculatedClaims.map(claim => claim.id)
          ])
        ].sort();
  const reviewedEventIds = new Set(dataset.events.map(record => record.event.id));
  const migratedPersonIds = new Set(input.migratedPersonIds);
  const peopleStoredAsEvents = input.applicationEvents
    .filter(isLegacyPersonEvent)
    .filter(event => !event.historicalPersonId || !migratedPersonIds.has(event.historicalPersonId))
    .map(event => event.id)
    .sort();
  const eventsOutsideReviewedCorpus = input.applicationEvents
    .filter(event => !isLegacyPersonEvent(event))
    .filter(event => !reviewedEventIds.has(event.id))
    .map(event => event.id)
    .sort();
  const peopleWithoutSource = dataset.people
    .filter(record => record.sourceIds.length === 0)
    .map(record => record.person.id)
    .sort();
  const eventsWithoutSource = [
    ...dataset.events
      .filter(record => record.sourceIds.length === 0)
      .map(record => record.event.id),
    ...input.applicationEvents
      .filter(event => !event.sources?.length && !reviewedEventIds.has(event.id))
      .map(event => event.id)
  ].filter((id, index, values) => values.indexOf(id) === index).sort();
  const placesWithoutProvenance = input.applicationPlaces
    .filter(place =>
      !place.coordinateSource &&
      !place.geographicProvenance?.length &&
      !place.sources?.length
    )
    .map(place => place.id)
    .sort();
  const possibleDuplicates = findEventReconciliationCandidates(dataset.events)
    .filter(candidate => candidate.decision !== 'same-stable-id');
  const stagingItems = dataset.staging.map(record => record.id).sort();
  const blockingIssues =
    impossiblePeriods.length +
    orphanIdentifiers.length +
    relationsWithoutSufficientEvidence.length +
    unreviewedClaims.length +
    nonReproducibleCalculations.length;
  const backlogItems =
    peopleWithoutSource.length +
    eventsWithoutSource.length +
    placesWithoutProvenance.length +
    contradictions.length +
    possibleDuplicates.length +
    peopleStoredAsEvents.length +
    eventsOutsideReviewedCorpus.length +
    stagingItems.length;

  return {
    version: '1',
    summary: {
      reviewedPeople: dataset.people.length,
      reviewedEvents: dataset.events.length,
      reviewedClaims: dataset.claims.length,
      reviewedPresences: dataset.presences.length,
      generatedRelations: input.generatedRelations.length,
      blockingIssues,
      backlogItems
    },
    peopleWithoutSource,
    eventsWithoutSource,
    placesWithoutProvenance,
    impossiblePeriods,
    orphanIdentifiers,
    relationsWithoutSufficientEvidence,
    unreviewedClaims,
    contradictions,
    nonReproducibleCalculations,
    possibleDuplicates,
    legacyModelElements: {
      peopleStoredAsEvents,
      eventsOutsideReviewedCorpus
    },
    stagingItems
  };
};