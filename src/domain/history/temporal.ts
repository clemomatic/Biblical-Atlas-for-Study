import type {
  HistoricalSeason,
  HistoricalYear,
  HebrewCalendarMonth,
  LegacyTemporalPeriod,
  TemporalBoundary,
  TemporalInterval,
  TemporalOverlap,
  TemporalSpan
} from './types.ts';

const MONTH_NAMES = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre'
] as const;

const SEASON_NAMES: Record<HistoricalSeason, string> = {
  spring: 'printemps',
  summer: 'été',
  autumn: 'automne',
  winter: 'hiver'
};

const HEBREW_MONTH_ORDINALS: HebrewCalendarMonth[] = [
  'nisan',
  'iyar',
  'sivan',
  'tammuz',
  'av',
  'elul',
  'tishri',
  'heshvan',
  'kislev',
  'tebeth',
  'shebat',
  'adar'
];

const normalizeCalendarLabel = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/**
 * Convertit les libellés bibliques du corpus en identifiants de mois hébreux.
 * Aucun mois grégorien n'est déduit : « 2e mois » reste Iyar sur le calendrier
 * biblique, conformément au libellé documentaire conservé séparément.
 */
export function parseHebrewCalendarMonth(
  value: string | undefined
): HebrewCalendarMonth | undefined {
  if (!value) return undefined;
  const normalized = normalizeCalendarLabel(value);
  const namedMonths: Array<[RegExp, HebrewCalendarMonth]> = [
    [/\b(nisan|abib)\b/, 'nisan'],
    [/\b(iyar|ziv)\b/, 'iyar'],
    [/\bsivan\b/, 'sivan'],
    [/\b(tammuz|tamouz)\b/, 'tammuz'],
    [/\b(ab|av)\b/, 'av'],
    [/\beloul\b/, 'elul'],
    [/\b(tishri|ethanim|etanim)\b/, 'tishri'],
    [/\b(heshvan|bul)\b/, 'heshvan'],
    [/\bkislev\b/, 'kislev'],
    [/\b(tebeth|tebet)\b/, 'tebeth'],
    [/\bshebat\b/, 'shebat'],
    [/\badar\b/, 'adar']
  ];
  const named = namedMonths.find(([pattern]) => pattern.test(normalized));
  if (named) return named[1];

  const ordinalMatch = normalized.match(/^(\d{1,2})(?:er|e)?\s+mois\b/);
  if (!ordinalMatch) return undefined;
  const ordinal = Number.parseInt(ordinalMatch[1], 10);
  return HEBREW_MONTH_ORDINALS[ordinal - 1];
}

export function assertHistoricalYear(
  value: number,
  fieldName = 'année'
): asserts value is HistoricalYear {
  if (!Number.isInteger(value) || value === 0) {
    throw new RangeError(
      `${fieldName} doit être une année historique entière différente de zéro.`
    );
  }
}

/**
 * Convertit une année historique vers l’axe continu de la frise.
 *
 * Cet axe utilise une coordonnée technique zéro pour 1 de n. è. :
 * `-1` (1 av. n. è.) est immédiatement suivi de `0` (1 de n. è.).
 * Une TimelineCoordinate ne doit jamais être affichée comme une année.
 */
export function historicalYearToTimelineIndex(year: HistoricalYear): number {
  assertHistoricalYear(year);
  return year < 0 ? year : year - 1;
}

export function timelineIndexToHistoricalYear(index: number): HistoricalYear {
  if (!Number.isInteger(index)) {
    throw new RangeError(
      'Une coordonnée entière est requise pour produire une année historique.'
    );
  }
  const year = index < 0 ? index : index + 1;
  assertHistoricalYear(year);
  return year;
}

export function shiftHistoricalYear(
  year: HistoricalYear,
  offset: number
): HistoricalYear {
  assertHistoricalYear(year);
  if (!Number.isInteger(offset)) {
    throw new RangeError('Le décalage doit être un nombre entier d’années.');
  }
  return timelineIndexToHistoricalYear(
    historicalYearToTimelineIndex(year) + offset
  );
}

export function compareHistoricalYears(
  left: HistoricalYear,
  right: HistoricalYear
): number {
  return (
    historicalYearToTimelineIndex(left) -
    historicalYearToTimelineIndex(right)
  );
}

const validateUncertainty = (boundary: TemporalBoundary): void => {
  if (
    boundary.uncertaintyYears !== undefined &&
    (!Number.isInteger(boundary.uncertaintyYears) ||
      boundary.uncertaintyYears < 0)
  ) {
    throw new RangeError(
      'La marge d’incertitude doit être un nombre entier positif ou nul.'
    );
  }
};

export function validateTemporalBoundary(boundary: TemporalBoundary): void {
  if (boundary.yearMin !== undefined) {
    assertHistoricalYear(boundary.yearMin, 'yearMin');
  }
  if (boundary.yearMax !== undefined) {
    assertHistoricalYear(boundary.yearMax, 'yearMax');
  }
  if (
    boundary.yearMin !== undefined &&
    boundary.yearMax !== undefined &&
    compareHistoricalYears(boundary.yearMin, boundary.yearMax) > 0
  ) {
    throw new RangeError('yearMin doit précéder ou égaler yearMax.');
  }
  if (
    boundary.month !== undefined &&
    (!Number.isInteger(boundary.month) ||
      boundary.month < 1 ||
      boundary.month > 12)
  ) {
    throw new RangeError('Le mois doit être compris entre 1 et 12.');
  }
  if (
    boundary.day !== undefined &&
    (!Number.isInteger(boundary.day) || boundary.day < 1 || boundary.day > 31)
  ) {
    throw new RangeError('Le jour doit être compris entre 1 et 31.');
  }

  validateUncertainty(boundary);

  const hasYear =
    boundary.yearMin !== undefined || boundary.yearMax !== undefined;
  if (boundary.precision === 'unknown') {
    return;
  }
  if (!hasYear) {
    throw new RangeError(
      `La précision « ${boundary.precision} » nécessite une année.`
    );
  }
  if (boundary.precision === 'range') {
    if (boundary.yearMin === undefined || boundary.yearMax === undefined) {
      throw new RangeError('Une plage nécessite yearMin et yearMax.');
    }
  }
  if (
    boundary.precision === 'month' &&
    boundary.month === undefined &&
    boundary.calendarMonth === undefined
  ) {
    throw new RangeError('Une précision au mois nécessite un mois.');
  }
  if (
    boundary.precision === 'day' &&
    (
      boundary.day === undefined ||
      (
        boundary.month === undefined &&
        boundary.calendarMonth === undefined
      )
    )
  ) {
    throw new RangeError(
      'Une date précise nécessite un mois numérique ou un mois de calendrier, ainsi qu’un jour.'
    );
  }
  if (
    boundary.calendarMonth !== undefined &&
    boundary.calendar !== 'hebrew'
  ) {
    throw new RangeError(
      'Un mois biblique nécessite le calendrier hébraïque.'
    );
  }
  if (boundary.precision === 'season' && boundary.season === undefined) {
    throw new RangeError('Une précision saisonnière nécessite une saison.');
  }
}

export function createYearBoundary(
  year: HistoricalYear,
  options: Pick<
    TemporalBoundary,
    'approximate' | 'uncertaintyYears' | 'certainty'
  >
): TemporalBoundary {
  assertHistoricalYear(year);
  const boundary: TemporalBoundary = {
    yearMin: year,
    yearMax: year,
    precision: 'year',
    ...options
  };
  validateTemporalBoundary(boundary);
  return boundary;
}

const getAnchorYear = (
  boundary: TemporalBoundary
): HistoricalYear | undefined =>
  boundary.yearMin ?? boundary.yearMax;

const getBoundaryInterval = (
  boundary: TemporalBoundary,
  includeUncertainty: boolean
): TemporalInterval => {
  validateTemporalBoundary(boundary);
  if (boundary.precision === 'unknown') {
    return { unknown: true };
  }

  const uncertainty = includeUncertainty
    ? boundary.uncertaintyYears ?? 0
    : 0;
  const anchor = getAnchorYear(boundary);

  if (boundary.precision === 'before') {
    const maximum = boundary.yearMax ?? anchor;
    return {
      yearMax:
        maximum === undefined
          ? undefined
          : shiftHistoricalYear(maximum, uncertainty),
      unknown: maximum === undefined
    };
  }
  if (boundary.precision === 'after') {
    const minimum = boundary.yearMin ?? anchor;
    return {
      yearMin:
        minimum === undefined
          ? undefined
          : shiftHistoricalYear(minimum, -uncertainty),
      unknown: minimum === undefined
    };
  }

  const minimum = boundary.yearMin ?? boundary.yearMax;
  const maximum = boundary.yearMax ?? boundary.yearMin;
  return {
    yearMin:
      minimum === undefined
        ? undefined
        : shiftHistoricalYear(minimum, -uncertainty),
    yearMax:
      maximum === undefined
        ? undefined
        : shiftHistoricalYear(maximum, uncertainty),
    unknown: minimum === undefined && maximum === undefined
  };
};

/**
 * Renvoie l’enveloppe chronologique d’une période.
 *
 * Une borne absente signifie que l’intervalle est ouvert. Une période dont
 * toutes les bornes sont inconnues renvoie `{ unknown: true }`.
 */
export function getTemporalInterval(
  span: TemporalSpan,
  options: { includeUncertainty?: boolean } = {}
): TemporalInterval {
  const includeUncertainty = options.includeUncertainty ?? true;
  const start = span.start
    ? getBoundaryInterval(span.start, includeUncertainty)
    : undefined;
  const end = span.end
    ? getBoundaryInterval(span.end, includeUncertainty)
    : undefined;

  if (!start && !end) {
    return { unknown: true };
  }
  if (start && !end) {
    return start;
  }
  if (!start && end) {
    return end;
  }

  const startKnown = start && !start.unknown;
  const endKnown = end && !end.unknown;
  if (!startKnown && !endKnown) {
    return { unknown: true };
  }

  return {
    yearMin: startKnown ? start.yearMin : undefined,
    yearMax: endKnown ? end.yearMax : undefined,
    unknown: false
  };
}

export function validateTemporalSpan(span: TemporalSpan): void {
  if (span.start) validateTemporalBoundary(span.start);
  if (span.end) validateTemporalBoundary(span.end);

  const interval = getTemporalInterval(span, {
    includeUncertainty: false
  });
  if (
    interval.yearMin !== undefined &&
    interval.yearMax !== undefined &&
    compareHistoricalYears(interval.yearMin, interval.yearMax) > 0
  ) {
    throw new RangeError(
      'La borne de début de la période doit précéder ou égaler sa borne de fin.'
    );
  }
}

const intervalsIntersect = (
  left: TemporalInterval,
  right: TemporalInterval
): boolean => {
  if (
    left.yearMax !== undefined &&
    right.yearMin !== undefined &&
    compareHistoricalYears(left.yearMax, right.yearMin) < 0
  ) {
    return false;
  }
  if (
    right.yearMax !== undefined &&
    left.yearMin !== undefined &&
    compareHistoricalYears(right.yearMax, left.yearMin) < 0
  ) {
    return false;
  }
  return true;
};

const boundaryCarriesUncertainty = (
  boundary: TemporalBoundary | undefined
): boolean =>
  Boolean(
    boundary &&
      (boundary.approximate ||
        (boundary.uncertaintyYears ?? 0) > 0 ||
        boundary.certainty !== 'certain' ||
        ['range', 'before', 'after', 'unknown'].includes(boundary.precision))
  );

export function getTemporalOverlap(
  left: TemporalSpan,
  right: TemporalSpan
): TemporalOverlap {
  const possibleLeft = getTemporalInterval(left);
  const possibleRight = getTemporalInterval(right);
  if (possibleLeft.unknown || possibleRight.unknown) {
    return 'unknown';
  }
  if (!intervalsIntersect(possibleLeft, possibleRight)) {
    return 'none';
  }

  const baseLeft = getTemporalInterval(left, { includeUncertainty: false });
  const baseRight = getTemporalInterval(right, { includeUncertainty: false });
  const carriesUncertainty = [
    left.start,
    left.end,
    right.start,
    right.end
  ].some(boundaryCarriesUncertainty);

  if (
    !carriesUncertainty &&
    !baseLeft.unknown &&
    !baseRight.unknown &&
    intervalsIntersect(baseLeft, baseRight)
  ) {
    return 'definite';
  }
  return 'possible';
}

/**
 * `unknown` renvoie vrai : avec les informations présentes, un chevauchement
 * reste possible. Utiliser `getTemporalOverlap` pour conserver ce troisième
 * état dans l’interface.
 */
export function canTemporalSpansOverlap(
  left: TemporalSpan,
  right: TemporalSpan
): boolean {
  return getTemporalOverlap(left, right) !== 'none';
}

export function formatHistoricalYearFrench(year: HistoricalYear): string {
  assertHistoricalYear(year);
  return year < 0
    ? `${Math.abs(year)} av. n. è.`
    : `${year} de n. è.`;
}

const formatSingleYearBoundary = (boundary: TemporalBoundary): string => {
  const year = getAnchorYear(boundary);
  if (year === undefined) return 'date inconnue';

  const formattedYear = formatHistoricalYearFrench(year);
  if (boundary.precision === 'day') {
    if (boundary.calendar === 'hebrew' && boundary.calendarMonth) {
      return `${boundary.day} ${boundary.calendarMonth} ${formattedYear}`;
    }
    return `${boundary.day} ${MONTH_NAMES[(boundary.month ?? 1) - 1]} ${formattedYear}`;
  }
  if (boundary.precision === 'month') {
    if (boundary.calendar === 'hebrew' && boundary.calendarMonth) {
      return `${boundary.calendarMonth} ${formattedYear}`;
    }
    return `${MONTH_NAMES[(boundary.month ?? 1) - 1]} ${formattedYear}`;
  }
  if (boundary.precision === 'season') {
    return `${SEASON_NAMES[boundary.season ?? 'spring']} ${formattedYear}`;
  }
  return formattedYear;
};

export function formatTemporalBoundaryFrench(
  boundary: TemporalBoundary
): string {
  validateTemporalBoundary(boundary);
  if (boundary.precision === 'unknown') return 'date inconnue';

  let label: string;
  if (
    boundary.precision === 'range' &&
    boundary.yearMin !== undefined &&
    boundary.yearMax !== undefined
  ) {
    label = `entre ${formatHistoricalYearFrench(boundary.yearMin)} et ${formatHistoricalYearFrench(boundary.yearMax)}`;
  } else if (boundary.precision === 'before') {
    label = `avant ${formatSingleYearBoundary(boundary)}`;
  } else if (boundary.precision === 'after') {
    label = `après ${formatSingleYearBoundary(boundary)}`;
  } else {
    label = formatSingleYearBoundary(boundary);
  }

  if (boundary.approximate) {
    if (boundary.precision === 'before') {
      label = label.replace(/^avant /, 'avant vers ');
    } else if (boundary.precision === 'after') {
      label = label.replace(/^après /, 'après vers ');
    } else {
      label = `vers ${label}`;
    }
  }
  if ((boundary.uncertaintyYears ?? 0) > 0) {
    label += ` (± ${boundary.uncertaintyYears} an${boundary.uncertaintyYears === 1 ? '' : 's'})`;
  }
  return label;
}

export function formatTemporalSpanFrench(
  span: TemporalSpan,
  options: { preferDisplayLabel?: boolean } = {}
): string {
  if ((options.preferDisplayLabel ?? true) && span.displayLabel.trim()) {
    return span.displayLabel.trim();
  }
  if (!span.start && !span.end) return 'Période inconnue';
  if (span.start && !span.end) {
    return formatTemporalBoundaryFrench(span.start);
  }
  if (!span.start && span.end) {
    return formatTemporalBoundaryFrench(span.end);
  }

  const start = span.start as TemporalBoundary;
  const end = span.end as TemporalBoundary;
  const formattedStart = formatTemporalBoundaryFrench(start);
  const formattedEnd = formatTemporalBoundaryFrench(end);
  if (formattedStart === formattedEnd) return formattedStart;
  return `De ${formattedStart} à ${formattedEnd}`;
}

export function legacyYearsToTemporalSpan(
  period: LegacyTemporalPeriod
): TemporalSpan {
  assertHistoricalYear(period.startYear, 'startYear');
  assertHistoricalYear(period.endYear, 'endYear');
  if (compareHistoricalYears(period.startYear, period.endYear) > 0) {
    throw new RangeError('startYear doit précéder ou égaler endYear.');
  }

  const certainty = period.certainty ?? 'unknown';
  const span: TemporalSpan = {
    start: createYearBoundary(period.startYear, {
      approximate: Boolean(period.fuzzyStart),
      certainty
    }),
    end: createYearBoundary(period.endYear, {
      approximate: Boolean(period.fuzzyEnd),
      certainty
    }),
    displayLabel: period.displayLabel ?? ''
  };

  if (!span.displayLabel) {
    span.displayLabel = formatTemporalSpanFrench(span, {
      preferDisplayLabel: false
    });
  }
  return span;
}
