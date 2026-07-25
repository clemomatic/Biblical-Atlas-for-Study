import type {
  CertaintyLevel,
  GeographicProvenanceMethod
} from '../../types.ts';
import type {
  BiblicalPerson,
  TemporalSpan
} from './types.ts';

export type SourceDocumentType =
  | 'bible'
  | 'book'
  | 'encyclopedia'
  | 'article'
  | 'map'
  | 'timeline'
  | 'appendix'
  | 'dataset'
  | 'other';

export type SourceVerificationStatus =
  | 'unverified'
  | 'reviewed'
  | 'verified'
  | 'rejected';

export interface SourceCatalogEntry {
  id: string;
  title: string;
  publication: string;
  chapterOrAppendix?: string;
  pageOrSection?: string;
  url?: string;
  documentType: SourceDocumentType;
  language: string;
  accessedAt?: string;
  notes?: string;
  /**
   * La source autorise uniquement l’extraction de faits et de références.
   * Ces drapeaux ne constituent pas une licence sur le texte ou les images.
   */
  factualDataUseAllowed: boolean;
  longTextReproductionAllowed: false;
  imageReproductionAllowed: false;
  verificationStatus: SourceVerificationStatus;
}

export type HistoricalEntityType =
  | 'person'
  | 'place'
  | 'event'
  | 'route'
  | 'territory';

export interface HistoricalEntityReference {
  entityType: HistoricalEntityType;
  entityId: string;
}

export type HistoricalClaimObject =
  | HistoricalEntityReference
  | { literal: string };

export type HistoricalPredicate =
  | 'birth'
  | 'death'
  | 'lifespan'
  | 'timeline-context'
  | 'historical-event'
  | 'presence'
  | 'residence'
  | 'travel'
  | 'reign'
  | 'reign-start'
  | 'reign-end'
  | 'prophecy'
  | 'office'
  | 'political-event'
  | 'participation'
  | 'family-relation'
  | 'attested-interaction';

export type EvidenceMethod = 'direct' | 'calculated' | 'inferred';
export type HumanReviewStatus = 'pending' | 'reviewed' | 'rejected';

export interface HistoricalEvidence {
  sourceId: string;
  /**
   * Référence courte : verset, page, section, figure ou citation très brève.
   * La validation refuse les chaînes de plus de 280 caractères.
   */
  shortReference: string;
  method: EvidenceMethod;
  inputClaimIds?: string[];
  calculationExplanation?: string;
  humanReviewStatus: HumanReviewStatus;
}

export interface HistoricalClaim {
  id: string;
  workflowStatus: 'reviewed';
  /**
   * `generated` existe dans le type pour pouvoir détecter et refuser qu’une
   * relation calculée soit placée manuellement dans `reviewed`.
   */
  origin: 'reviewed' | 'generated';
  subject: HistoricalEntityReference;
  predicate: HistoricalPredicate;
  object?: HistoricalClaimObject;
  placeId?: string;
  eventId?: string;
  period?: TemporalSpan;
  certainty: CertaintyLevel;
  evidence: HistoricalEvidence[];
  notes?: string;
}

export type PresenceType =
  | 'resident'
  | 'visitor'
  | 'traveler'
  | 'ministry'
  | 'reign-seat'
  | 'imprisonment'
  | 'possible-presence';

export interface PresenceEpisode {
  id: string;
  workflowStatus: 'reviewed';
  origin: 'reviewed';
  personId: string;
  placeId: string;
  period: TemporalSpan;
  presenceType: PresenceType;
  certainty: CertaintyLevel;
  associatedEventIds?: string[];
  supportingClaimIds: string[];
  notes?: string;
}

export interface ReviewedPersonRecord {
  workflowStatus: 'reviewed';
  sourceIds: string[];
  person: BiblicalPerson;
}

export interface ReviewedEventRecord {
  workflowStatus: 'reviewed';
  sourceIds: string[];
  event: {
    id: string;
    name: string;
    period?: TemporalSpan;
    sourceOrder?: number;
    category?: string;
    description?: string;
    biblicalReferences?: string[];
    certainty?: CertaintyLevel;
    supportingClaimIds?: string[];
    placeMentions?: HistoricalPlaceMention[];
    participantMentions?: HistoricalParticipantMention[];
    /** Anciennes lignes remplacées uniquement après rapprochement documenté. */
    supersedesLegacyEventIds?: string[];
    notes?: string;
  };
}

export type HistoricalPlaceGranularity =
  | 'point'
  | 'area'
  | 'region'
  | 'route';

export interface HistoricalPlaceMention {
  label: string;
  placeId?: string;
  granularity: HistoricalPlaceGranularity;
  certainty: CertaintyLevel;
  notes?: string;
}

export interface HistoricalParticipantMention {
  label: string;
  personId?: string;
  certainty: CertaintyLevel;
  notes?: string;
}

export interface ReviewedPlaceRecord {
  workflowStatus: 'reviewed';
  sourceIds: string[];
  place: {
    id: string;
    name: string;
    /** IDs géographiques explicites ; aucune région n’est déduite du nom. */
    regionIds?: string[];
    certainty?: CertaintyLevel;
    notes?: string;
  };
}

export interface ReviewedRouteRecord {
  workflowStatus: 'reviewed';
  sourceIds: string[];
  route: {
    id: string;
    name: string;
    description: string;
    period?: TemporalSpan;
    placeIds: string[];
    associatedEventIds: string[];
    personIds: string[];
    biblicalReferences: string[];
    certainty: CertaintyLevel;
    geometryPrecision: 'schematic';
    routeNature: 'documented' | 'reconstructed' | 'schematic';
    tracePrecision: 'exact' | 'approximate' | 'indicative-place-sequence';
    stepOrder: 'source-chronology' | 'documented-sequence';
    notForExactNavigation: true;
    notes: string;
  };
}

export interface ReviewedGeographicLink {
  id: string;
  workflowStatus: 'reviewed';
  origin: 'reviewed';
  sourceIds: string[];
  primarySourceId: string;
  mapId: string;
  mapReference: string;
  subject: HistoricalEntityReference;
  placeId?: string;
  eventIds?: string[];
  personIds?: string[];
  presenceEpisodeIds?: string[];
  method: GeographicProvenanceMethod;
  certainty: CertaintyLevel;
  sourceMapCertainty: CertaintyLevel;
  coordinatesChanged: false;
  limitations: string;
}

export interface ReviewedTerritoryRecord {
  workflowStatus: 'reviewed';
  sourceIds: string[];
  territory: {
    id: string;
    name: string;
    period: TemporalSpan;
    capitalPhases: Array<{
      id: string;
      placeId: string;
      period: TemporalSpan;
      certainty: CertaintyLevel;
      supportingClaimIds?: string[];
      notes?: string;
    }>;
    certainty: CertaintyLevel;
    /** Les appendices A6 n’autorisent pas à inventer une géométrie. */
    geometryStatus: 'not-provided';
    notes?: string;
  };
}

export interface StagingReviewDecision {
  status: 'pending' | 'reviewed' | 'rejected';
  reviewedAt?: string;
  sourceReference?: string;
  entityIdsVerified?: boolean;
}

export interface StagingParticipationCandidate {
  personId: string;
  certainty: CertaintyLevel;
}

export interface StagingPresenceCandidate {
  personId: string;
  placeId: string;
  presenceType: PresenceType;
  certainty: CertaintyLevel;
}

export interface StagingInteractionCandidate {
  subjectId: string;
  objectPersonId: string;
  certainty: CertaintyLevel;
}

export interface StagingEventCandidate {
  event: Omit<ReviewedEventRecord['event'], 'supportingClaimIds'>;
  participations: StagingParticipationCandidate[];
  presences: StagingPresenceCandidate[];
  interactions?: StagingInteractionCandidate[];
}

export interface StagingEventPayload {
  dateText: string;
  placeText: string;
  eventText: string;
  biblicalReferences: string[];
  certainty: CertaintyLevel;
  period: TemporalSpan;
  review: StagingReviewDecision;
  candidate?: StagingEventCandidate;
  unresolvedItems?: string[];
}

export interface StagingHistoricalRecord {
  id: string;
  entityType: HistoricalEntityType | 'claim' | 'presence';
  workflowStatus: 'staging' | 'reviewed';
  sourceHints?: string[];
  extractionNotes?: string;
  payload: unknown;
  presentedAsValidated?: boolean;
}

export interface DerivedHistoricalRelation {
  id: string;
  subjectIds: string[];
  origin: 'generated';
  relationLevel:
    | 'lifespan-overlap'
    | 'activity-overlap'
    | 'prophet-during-reign'
    | 'simultaneous-reigns'
    | 'same-region'
    | 'same-place'
    | 'same-event'
    | 'documented-interaction';
  temporalOverlap?: TemporalSpan;
  placeIds?: string[];
  regionIds?: string[];
  eventIds?: string[];
  certainty: CertaintyLevel;
  supportingClaimIds: string[];
  generatedFromIds: string[];
  generatedAt: string;
  generator: {
    name: 'historical-relation-engine';
    version: '2';
  };
}

export interface HistoricalDataset {
  sources: SourceCatalogEntry[];
  staging: StagingHistoricalRecord[];
  people: ReviewedPersonRecord[];
  events: ReviewedEventRecord[];
  places: ReviewedPlaceRecord[];
  routes: ReviewedRouteRecord[];
  geography: ReviewedGeographicLink[];
  territories: ReviewedTerritoryRecord[];
  claims: HistoricalClaim[];
  presences: PresenceEpisode[];
}

export interface KnownHistoricalEntities {
  personIds?: Iterable<string>;
  placeIds?: Iterable<string>;
  eventIds?: Iterable<string>;
  routeIds?: Iterable<string>;
  territoryIds?: Iterable<string>;
}
