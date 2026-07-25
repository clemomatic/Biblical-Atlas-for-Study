import type {
  CertaintyLevel,
  EntityMetadata
} from '../../types.ts';

/**
 * Année historique signée, sans année zéro.
 *
 * - `-1` représente 1 av. n. è.
 * - `1` représente 1 de n. è.
 * - `0` est toujours invalide.
 *
 * Le type reste numérique pour faciliter la migration du corpus existant.
 * Toute valeur provenant de l’extérieur doit passer par `assertHistoricalYear`.
 */
export type HistoricalYear = number;

export type TemporalPrecision =
  | 'day'
  | 'month'
  | 'season'
  | 'year'
  | 'range'
  | 'before'
  | 'after'
  | 'unknown';

export type HistoricalSeason = 'spring' | 'summer' | 'autumn' | 'winter';

export interface TemporalBoundary {
  /** Première année possible, selon la convention HistoricalYear. */
  yearMin?: HistoricalYear;
  /** Dernière année possible, selon la convention HistoricalYear. */
  yearMax?: HistoricalYear;
  month?: number;
  day?: number;
  /** Calendrier explicite lorsque la source ne donne pas une date grégorienne. */
  calendar?: 'gregorian' | 'hebrew';
  /** Mois biblique conservé sans conversion spéculative vers le calendrier grégorien. */
  calendarMonth?: 'nisan' | 'iyar';
  season?: HistoricalSeason;
  precision: TemporalPrecision;
  approximate?: boolean;
  /**
   * Marge symétrique exprimée en années historiques.
   * Le calcul saute automatiquement l’année zéro.
   */
  uncertaintyYears?: number;
  certainty: CertaintyLevel;
}

export interface TemporalSpan {
  start?: TemporalBoundary;
  end?: TemporalBoundary;
  /**
   * Libellé éditorial conservé quand une publication impose une formulation.
   * Les utilitaires savent aussi produire un libellé français automatiquement.
   */
  displayLabel: string;
}

export type PersonActivityType =
  | 'ministry'
  | 'reign'
  | 'office'
  | 'prophecy'
  | 'journey'
  | 'residence'
  | 'imprisonment'
  | 'other';

export interface PersonActivityPeriod extends EntityMetadata {
  id: string;
  type: PersonActivityType;
  label: string;
  span: TemporalSpan;
  supportingClaimIds?: string[];
  associatedEventIds?: string[];
  associatedLocationIds?: string[];
  associatedRouteIds?: string[];
  associatedPersonIds?: string[];
}

export interface BiblicalPerson extends EntityMetadata {
  /**
   * Identifiant canonique. Pendant la migration, il est identique à l’ID de
   * l’EventData historique correspondant.
   */
  id: string;
  name: string;
  alternateNames?: string[];
  description?: string;
  lifeSpan?: TemporalSpan;
  lifeSpanClaimIds?: string[];
  activityPeriods: PersonActivityPeriod[];
  associatedEventIds?: string[];
  associatedLocationIds?: string[];
  associatedRouteIds?: string[];
  associatedPersonIds?: string[];
  /**
   * Lien de transition vers la ligne de frise héritée. Il pourra disparaître
   * lorsque la frise consommera directement les personnes.
   */
  legacyEventId?: string;
}

export type TemporalOverlap = 'definite' | 'possible' | 'none' | 'unknown';

export interface TemporalInterval {
  /** Borne absente : intervalle ouvert vers le passé. */
  yearMin?: HistoricalYear;
  /** Borne absente : intervalle ouvert vers le futur. */
  yearMax?: HistoricalYear;
  /** Vrai uniquement lorsqu’aucune borne exploitable n’est connue. */
  unknown: boolean;
}

export interface LegacyTemporalPeriod {
  startYear: number;
  endYear: number;
  fuzzyStart?: boolean;
  fuzzyEnd?: boolean;
  certainty?: CertaintyLevel;
  displayLabel?: string;
}
