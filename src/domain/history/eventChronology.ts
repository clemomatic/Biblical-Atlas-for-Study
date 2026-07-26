import type { EventData } from '../../types.ts';
import {
  compareHistoricalYears,
  getTemporalInterval,
  getTemporalOverlap,
  historicalYearToTimelineIndex,
  legacyYearsToTemporalSpan
} from './temporal.ts';
import type {
  BiblicalPerson,
  PersonActivityPeriod,
  TemporalBoundary,
  TemporalSpan
} from './types.ts';

export type ChronologyPrecision =
  | 'exact'
  | 'approximate'
  | 'range'
  | 'minimum'
  | 'maximum'
  | 'unknown';

export interface AgeEstimate {
  precision: ChronologyPrecision;
  minYears?: number;
  maxYears?: number;
  label: string;
  explanation: string;
}

export interface DurationEstimate {
  precision: ChronologyPrecision;
  minYears?: number;
  maxYears?: number;
  months?: number;
  label: string;
  explanation: string;
}

export interface ActivitySituation {
  activity: PersonActivityPeriod;
  status: 'active' | 'not-started';
  duration?: DurationEstimate;
  label: string;
  explanation: string;
}

export interface PersonAtEventCalculation {
  person: BiblicalPerson;
  age: AgeEstimate;
  activeActivities: ActivitySituation[];
  pendingActivities: ActivitySituation[];
  outsideKnownLife: boolean;
  warnings: string[];
}

const boundaryIsApproximate = (
  boundary: TemporalBoundary | undefined
): boolean =>
  Boolean(
    boundary &&
      (boundary.approximate ||
        boundary.certainty !== 'certain' ||
        boundary.precision === 'range' ||
        boundary.precision === 'before' ||
        boundary.precision === 'after' ||
        (boundary.uncertaintyYears ?? 0) > 0)
  );

const yearsBetween = (start: number, end: number): number =>
  historicalYearToTimelineIndex(end) -
  historicalYearToTimelineIndex(start);

const pluralYears = (value: number): string =>
  `${value} an${value === 1 ? '' : 's'}`;

export function formatAgeEstimateFrench(
  estimate: Omit<AgeEstimate, 'label'>
): string {
  const min = estimate.minYears;
  const max = estimate.maxYears;
  switch (estimate.precision) {
    case 'exact':
      return min === undefined ? 'Âge impossible à déterminer' : pluralYears(min);
    case 'approximate':
      return min === undefined
        ? 'Âge impossible à déterminer'
        : `Environ ${pluralYears(min)}`;
    case 'range':
      return min === undefined || max === undefined
        ? 'Âge impossible à déterminer'
        : `Entre ${min} et ${pluralYears(max)}`;
    case 'minimum':
      return min === undefined
        ? 'Âge impossible à déterminer'
        : `Au moins ${pluralYears(min)}`;
    case 'maximum':
      return max === undefined
        ? 'Âge impossible à déterminer'
        : `Au plus ${pluralYears(max)}`;
    default:
      return 'Âge impossible à déterminer';
  }
}

const unknownAge = (explanation: string): AgeEstimate => ({
  precision: 'unknown',
  label: 'Âge impossible à déterminer',
  explanation
});

const exactCalendarAge = (
  birth: TemporalBoundary | undefined,
  event: TemporalBoundary | undefined
): number | undefined => {
  if (
    !birth ||
    !event ||
    birth.yearMin === undefined ||
    birth.yearMax !== birth.yearMin ||
    event.yearMin === undefined ||
    event.yearMax !== event.yearMin ||
    birth.month === undefined ||
    event.month === undefined ||
    !['month', 'day'].includes(birth.precision) ||
    !['month', 'day'].includes(event.precision) ||
    boundaryIsApproximate(birth) ||
    boundaryIsApproximate(event)
  ) {
    return undefined;
  }

  let age = yearsBetween(birth.yearMin, event.yearMin);
  const birthDay = birth.day ?? 1;
  const eventDay = event.day ?? 1;
  const anniversaryReached =
    event.month > birth.month ||
    (event.month === birth.month && eventDay >= birthDay);
  if (!anniversaryReached) age -= 1;
  return age;
};

export function calculateAgeAtPeriod(
  lifeSpan: TemporalSpan | undefined,
  eventPeriod: TemporalSpan
): AgeEstimate {
  if (!lifeSpan?.start) {
    return unknownAge('Aucune borne de naissance exploitable n’est disponible.');
  }

  const birth = getTemporalInterval({
    start: lifeSpan.start,
    displayLabel: ''
  });
  const event = getTemporalInterval(eventPeriod);
  if (birth.unknown || event.unknown) {
    return unknownAge(
      'La naissance ou la période de l’événement est inconnue.'
    );
  }

  const minAge =
    event.yearMin !== undefined && birth.yearMax !== undefined
      ? yearsBetween(birth.yearMax, event.yearMin)
      : undefined;
  const maxAge =
    event.yearMax !== undefined && birth.yearMin !== undefined
      ? yearsBetween(birth.yearMin, event.yearMax)
      : undefined;

  if (
    (minAge !== undefined && minAge < 0) ||
    (maxAge !== undefined && maxAge < 0)
  ) {
    return unknownAge(
      'L’événement précède la naissance selon les données actuellement connues.'
    );
  }

  const approximate =
    boundaryIsApproximate(lifeSpan.start) ||
    boundaryIsApproximate(eventPeriod.start) ||
    boundaryIsApproximate(eventPeriod.end);

  const calendarAge =
    eventPeriod.end === undefined
      ? exactCalendarAge(lifeSpan.start, eventPeriod.start)
      : undefined;
  if (calendarAge !== undefined && calendarAge >= 0) {
    return {
      precision: 'exact',
      minYears: calendarAge,
      maxYears: calendarAge,
      label: pluralYears(calendarAge),
      explanation:
        'Calcul déterministe tenant compte du mois et, lorsqu’il est connu, du jour.'
    };
  }

  let result: Omit<AgeEstimate, 'label'>;
  if (minAge !== undefined && maxAge !== undefined) {
    if (minAge !== maxAge) {
      result = {
        precision: 'range',
        minYears: minAge,
        maxYears: maxAge,
        explanation:
          'Plage calculée à partir des bornes possibles de naissance et de l’événement.'
      };
    } else {
      result = {
        precision: approximate ? 'approximate' : 'exact',
        minYears: minAge,
        maxYears: maxAge,
        explanation: approximate
          ? 'Calcul fondé sur au moins une borne approximative.'
          : 'Calcul déterministe à partir de deux bornes annuelles certaines.'
      };
    }
  } else if (minAge !== undefined) {
    result = {
      precision: 'minimum',
      minYears: minAge,
      explanation:
        'Seule une limite supérieure de naissance permet d’établir un âge minimal.'
    };
  } else if (maxAge !== undefined) {
    result = {
      precision: 'maximum',
      maxYears: maxAge,
      explanation:
        'Seule une limite inférieure de naissance permet d’établir un âge maximal.'
    };
  } else {
    return unknownAge('Les bornes disponibles ne permettent aucun calcul d’âge.');
  }

  return {
    ...result,
    label: formatAgeEstimateFrench(result)
  };
}

const activityRole = (activity: PersonActivityPeriod): string => {
  if (activity.type === 'reign') return 'roi';
  if (activity.type === 'prophecy') return 'prophète';
  if (activity.type === 'ministry') return 'ministère';
  if (activity.type === 'office') return activity.label.toLocaleLowerCase('fr');
  if (activity.type === 'journey') return 'voyage';
  if (activity.type === 'residence') return 'résidence';
  if (activity.type === 'imprisonment') return 'emprisonnement';
  return activity.label.toLocaleLowerCase('fr');
};

const exactMonthDifference = (
  start: TemporalBoundary | undefined,
  event: TemporalBoundary | undefined
): number | undefined => {
  if (
    !start ||
    !event ||
    start.precision !== 'month' ||
    event.precision !== 'month' ||
    start.yearMin === undefined ||
    event.yearMin === undefined ||
    start.month === undefined ||
    event.month === undefined ||
    boundaryIsApproximate(start) ||
    boundaryIsApproximate(event)
  ) {
    return undefined;
  }
  return (
    yearsBetween(start.yearMin, event.yearMin) * 12 +
    event.month -
    start.month
  );
};

export function calculateElapsedActivity(
  activity: PersonActivityPeriod,
  eventPeriod: TemporalSpan
): DurationEstimate | undefined {
  if (!activity.span.start) return undefined;

  const start = getTemporalInterval({
    start: activity.span.start,
    displayLabel: ''
  });
  const event = getTemporalInterval(eventPeriod);
  if (start.unknown || event.unknown) return undefined;

  const exactMonths = exactMonthDifference(
    activity.span.start,
    eventPeriod.start
  );
  if (exactMonths !== undefined && exactMonths >= 0 && exactMonths < 12) {
    return {
      precision: 'exact',
      months: exactMonths,
      label:
        exactMonths === 0
          ? 'Activité commencée ce mois-ci'
          : `Activité commencée ${exactMonths} mois plus tôt`,
      explanation: 'Calcul au mois à partir de deux dates mensuelles certaines.'
    };
  }

  const minYears =
    event.yearMin !== undefined && start.yearMax !== undefined
      ? yearsBetween(start.yearMax, event.yearMin)
      : undefined;
  const maxYears =
    event.yearMax !== undefined && start.yearMin !== undefined
      ? yearsBetween(start.yearMin, event.yearMax)
      : undefined;
  if (
    (minYears !== undefined && minYears < 0) ||
    (maxYears !== undefined && maxYears < 0)
  ) {
    return undefined;
  }

  const approximate =
    boundaryIsApproximate(activity.span.start) ||
    boundaryIsApproximate(eventPeriod.start) ||
    boundaryIsApproximate(eventPeriod.end);
  let result: DurationEstimate;
  if (minYears !== undefined && maxYears !== undefined) {
    if (minYears !== maxYears) {
      result = {
        precision: 'range',
        minYears,
        maxYears,
        label: `Depuis ${minYears} à ${pluralYears(maxYears)}`,
        explanation:
          'Durée comprise entre les bornes possibles du début d’activité et de l’événement.'
      };
    } else {
      result = {
        precision: approximate ? 'approximate' : 'exact',
        minYears,
        maxYears,
        label: approximate
          ? `Depuis environ ${pluralYears(minYears)}`
          : `Depuis ${pluralYears(minYears)}`,
        explanation: approximate
          ? 'Durée calculée avec au moins une borne approximative.'
          : 'Durée calculée à partir de bornes annuelles certaines.'
      };
    }
  } else if (minYears !== undefined) {
    result = {
      precision: 'minimum',
      minYears,
      label: `Depuis au moins ${pluralYears(minYears)}`,
      explanation: 'La borne connue permet uniquement une durée minimale.'
    };
  } else if (maxYears !== undefined) {
    result = {
      precision: 'maximum',
      maxYears,
      label: `Depuis au plus ${pluralYears(maxYears)}`,
      explanation: 'La borne connue permet uniquement une durée maximale.'
    };
  } else {
    return undefined;
  }
  return result;
}

const eventPrecedesActivity = (
  eventPeriod: TemporalSpan,
  activity: PersonActivityPeriod
): boolean => {
  const event = getTemporalInterval(eventPeriod);
  const activityInterval = getTemporalInterval(activity.span);
  return (
    event.yearMax !== undefined &&
    activityInterval.yearMin !== undefined &&
    compareHistoricalYears(event.yearMax, activityInterval.yearMin) < 0
  );
};

export function getActivitySituationsAtPeriod(
  person: BiblicalPerson,
  eventPeriod: TemporalSpan
): {
  active: ActivitySituation[];
  pending: ActivitySituation[];
} {
  const active: ActivitySituation[] = [];
  const pending: ActivitySituation[] = [];

  person.activityPeriods.forEach(activity => {
    const overlap = getTemporalOverlap(activity.span, eventPeriod);
    if (overlap === 'definite' || overlap === 'possible') {
      const duration = calculateElapsedActivity(activity, eventPeriod);
      const role = activityRole(activity);
      const durationLabel = duration?.label.toLocaleLowerCase('fr');
      active.push({
        activity,
        status: 'active',
        duration,
        label: durationLabel
          ? `${activity.label} ${durationLabel}`
          : `${activity.label} déjà commencée, durée inconnue`,
        explanation:
          duration?.explanation ??
          'La période d’activité recouvre l’événement, mais son début n’est pas exploitable.'
      });
      return;
    }
    if (eventPrecedesActivity(eventPeriod, activity)) {
      const role = activityRole(activity);
      pending.push({
        activity,
        status: 'not-started',
        label:
          activity.type === 'reign'
            ? `Pas encore ${role} à cette date`
            : `${activity.label} pas encore commencée`,
        explanation:
          'La période de l’événement se termine avant le début connu de cette activité.'
      });
    }
  });

  return { active, pending };
}

export function eventDataToTemporalSpan(event: EventData): TemporalSpan {
  if (event.temporalSpan) return event.temporalSpan;
  return legacyYearsToTemporalSpan({
    startYear: event.startYear,
    endYear: event.endYear,
    fuzzyStart: event.fuzzyStart,
    fuzzyEnd: event.fuzzyEnd,
    certainty: event.certainty,
    displayLabel: event.startYear === event.endYear
      ? ''
      : undefined
  });
}

export function calculatePersonAtEvent(
  person: BiblicalPerson,
  eventPeriod: TemporalSpan
): PersonAtEventCalculation {
  const age = calculateAgeAtPeriod(person.lifeSpan, eventPeriod);
  const situations = getActivitySituationsAtPeriod(person, eventPeriod);
  const outsideKnownLife =
    person.lifeSpan !== undefined &&
    getTemporalOverlap(person.lifeSpan, eventPeriod) === 'none';
  const warnings = outsideKnownLife
    ? ['L’événement se situe hors de la période de vie actuellement connue.']
    : [];

  return {
    person,
    age,
    activeActivities: situations.active,
    pendingActivities: situations.pending,
    outsideKnownLife,
    warnings
  };
}

export function calculateEventParticipants(
  event: EventData,
  people: readonly BiblicalPerson[]
): PersonAtEventCalculation[] {
  const participantIds = new Set(event.associatedCharacterIds ?? []);
  if (participantIds.size === 0) return [];
  const eventPeriod = eventDataToTemporalSpan(event);
  return people
    .filter(person => participantIds.has(person.id))
    .map(person => calculatePersonAtEvent(person, eventPeriod));
}
