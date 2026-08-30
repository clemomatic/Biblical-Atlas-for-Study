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

export type HebrewCalendarMonth =
  | 'nisan'
  | 'iyar'
  | 'sivan'
  | 'tammuz'
  | 'av'
  | 'elul'
  | 'tishri'
  | 'heshvan'
  | 'kislev'
  | 'tebeth'
  | 'shebat'
  | 'adar';

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
  calendarMonth?: HebrewCalendarMonth;
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

export type PersonActivityPhase =
  | 'standard'
  | 'co-reign'
  | 'disputed-reign'
  | 'limited-reign'
  | 'fully-established-reign'
  | 'prophetic-ministry'
  | 'official-office';

export type BiblicalPersonRole =
  | 'king'
  | 'queen'
  | 'prophet'
  | 'other';

export interface PersonActivityPeriod extends EntityMetadata {
  id: string;
  type: PersonActivityType;
  phase?: PersonActivityPhase;
  label: string;
  span: TemporalSpan;
  /** Royaume ou territoire dans lequel l’activité est exercée. */
  realmId?: string;
  /**
   * Siège administratif associé à l’activité. Ce champ ne constitue pas à lui
   * seul une preuve de présence : celle-ci exige toujours un PresenceEpisode.
   */
  capitalPlaceId?: string;
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
  roles?: BiblicalPersonRole[];
  historicalCategories?: string[];
  realmIds?: string[];
  description?: string;
  lifeSpan?: TemporalSpan;
  lifeSpanClaimIds?: string[];
  /**
   * Fenêtres dessinées par une source qui situent une personne sans prétendre
   * représenter sa naissance et sa mort. Elles ne participent jamais au calcul
   * automatique des contemporains.
   */
  sourceTimelineWindows?: SourceTimelineWindow[];
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

export interface SourceTimelineWindow {
  id: string;
  sourceId: string;
  kind: 'collective-context';
  label: string;
  span: TemporalSpan;
  supportingClaimIds: string[];
  notes: string;
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
