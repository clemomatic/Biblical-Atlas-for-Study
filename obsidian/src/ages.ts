import { calculateAgeAtPeriod, type AgeEstimate } from '../../src/domain/history/eventChronology.ts';
import { getTemporalInterval, historicalYearToTimelineIndex, timelineIndexToHistoricalYear } from '../../src/domain/history/temporal.ts';
import type { BiblicalPerson, TemporalBoundary, TemporalSpan } from '../../src/domain/history/types';
import { parseYear } from './model.ts';
import { formatDateFrench } from '../../src/utils/dateUtils.ts';

export interface ProbeDate { year: number; month?: number; day?: number; position: number; label: string; span: TemporalSpan }
export interface CursorAge { label: string; explanation: string; status: 'living' | 'not-born' | 'deceased' | 'unknown'; estimate: AgeEstimate }

export function dateFromPosition(position: number): ProbeDate {
  if (!Number.isFinite(position)) throw new Error('La position de date est invalide.');
  position = Math.max(-50000, Math.min(49999.999, position));
  const integer = Math.floor(position + 1e-8); const year = timelineIndexToHistoricalYear(integer);
  const fraction = Math.max(0, position - integer);
  const month = Math.min(12, Math.floor(fraction * 12 + 1e-7) + 1);
  const civilYear = year < 0 ? year + 1 : year;
  const leap = civilYear % 4 === 0 && (civilYear % 100 !== 0 || civilYear % 400 === 0);
  const maxDay = [31,leap ? 29 : 28,31,30,31,30,31,31,30,31,30,31][month - 1];
  const day = Math.min(maxDay, Math.max(1, Math.round((fraction - (month - 1) / 12) * 365) + 1));
  return probeDate(year, month, day);
}
export function probeDate(year: number, month?: number, day?: number): ProbeDate {
  if (parseYear(year) === undefined) throw new Error('Saisis une année entière sans année zéro.');
  if (month !== undefined && (!Number.isInteger(month) || month < 1 || month > 12)) throw new Error('Le mois doit être compris entre 1 et 12.');
  const astronomicalYear = year < 0 ? year + 1 : year;
  const leap = astronomicalYear % 4 === 0 && (astronomicalYear % 100 !== 0 || astronomicalYear % 400 === 0);
  const maxDay = month ? [31,leap ? 29 : 28,31,30,31,30,31,31,30,31,30,31][month - 1] : 31;
  if (day !== undefined && (month === undefined || !Number.isInteger(day) || day < 1 || day > maxDay)) throw new Error('Le jour n’est pas valide pour ce mois.');
  const boundary: TemporalBoundary = { yearMin: year, yearMax: year, month, day, precision: day ? 'day' : month ? 'month' : 'year', certainty: 'certain', calendar: 'gregorian' };
  return { year, month, day, position: historicalYearToTimelineIndex(year) + ((month ?? 1) - 1) / 12 + ((day ?? 1) - 1) / 365,
    label: formatDateFrench(year, month, day), span: { start: boundary, displayLabel: formatDateFrench(year, month, day) } };
}

const comparablePosition = (boundary?: TemporalBoundary): number | undefined => {
  if (!boundary || boundary.yearMin === undefined || boundary.yearMax !== boundary.yearMin || boundary.calendar === 'hebrew' || boundary.calendarMonth || boundary.approximate || boundary.uncertaintyYears || boundary.certainty !== 'certain') return undefined;
  return historicalYearToTimelineIndex(boundary.yearMin) + ((boundary.month ?? 1) - 1) / 12 + ((boundary.day ?? 1) - 1) / 365;
};
function ageEstimate(person: BiblicalPerson, date: ProbeDate, period = date.span): AgeEstimate {
  const birth = person.lifeSpan?.start;
  const safePeriod = birth?.calendar === 'hebrew' || birth?.calendarMonth ? { start: { ...period.start, month: undefined, day: undefined, precision: 'year' as const }, displayLabel: period.displayLabel } : period;
  const age = calculateAgeAtPeriod(person.lifeSpan, safePeriod);
  if (age.precision === 'exact' && (!birth?.month || !date.month || (birth.month === date.month && (!birth.day || !date.day)) || (birth.precision !== 'day' && birth.precision !== 'month') || birth.calendar === 'hebrew' || birth.calendarMonth)) {
    return { ...age, precision: 'approximate', label: `Environ ${age.label}`, explanation: 'L’écart d’années est calculable, mais la date d’anniversaire ne permet pas un âge révolu exact.' };
  }
  return age;
}
export function ageAtCursor(person: BiblicalPerson, date: ProbeDate): CursorAge {
  const age = ageEstimate(person, date);
  const birth = person.lifeSpan?.start;
  const birthInterval = birth ? getTemporalInterval({ start: birth, end: birth, displayLabel: '' }) : undefined;
  const bornAt = comparablePosition(birth);
  const beforeBirth = birthInterval?.yearMin !== undefined && date.year < birthInterval.yearMin || bornAt !== undefined && birth?.month !== undefined && date.position < bornAt;
  if (beforeBirth) return { label: 'Pas encore né', explanation: 'Le repère se situe avant la naissance connue.', status: 'not-born', estimate: age };
  const death = person.lifeSpan?.end;
  const deathInterval = death ? getTemporalInterval({ start: death, end: death, displayLabel: '' }) : undefined;
  const diedAt = comparablePosition(death);
  const afterDeath = deathInterval?.yearMax !== undefined && date.year > deathInterval.yearMax || diedAt !== undefined && death?.month !== undefined && date.position > diedAt;
  if (afterDeath) {
    const atDeath = death ? ageEstimate(person, { ...date, month: death.month, day: death.day, span: { start: death, displayLabel: '' } }, { start: death, displayLabel: '' }) : age;
    return { label: atDeath.precision === 'unknown' ? 'Décédé · âge inconnu' : `Décédé · ${atDeath.label}`, explanation: 'Le repère est après le décès ; la valeur indiquée correspond à l’âge au décès, pas à un âge qui continuerait d’augmenter.', status: 'deceased', estimate: atDeath };
  }
  return { label: age.precision === 'unknown' ? 'Âge inconnu' : age.label, explanation: age.explanation, status: age.precision === 'unknown' ? 'unknown' : 'living', estimate: age };
}
