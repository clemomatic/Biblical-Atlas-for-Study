import { validateTemporalSpan } from './temporal.ts';
import type {
  HistoricalClaim,
  PresenceEpisode,
  ReviewedEventRecord,
  SourceCatalogEntry,
  StagingEventPayload,
  StagingHistoricalRecord
} from './contentTypes.ts';

const CERTAINTY_LEVELS = new Set([
  'certain',
  'probable',
  'possible',
  'unknown'
]);

export interface StagingPromotionIssue {
  recordId: string;
  message: string;
}

export class StagingPromotionError extends Error {
  readonly issues: StagingPromotionIssue[];

  constructor(issues: StagingPromotionIssue[]) {
    super(
      `Promotion impossible : ${issues.length} problème${issues.length > 1 ? 's' : ''} détecté${issues.length > 1 ? 's' : ''}.`
    );
    this.name = 'StagingPromotionError';
    this.issues = issues;
  }
}

export interface StagingPromotionResult {
  events: ReviewedEventRecord[];
  claims: HistoricalClaim[];
  presences: PresenceEpisode[];
  promotedRecordIds: string[];
  skippedRecordIds: string[];
  unresolvedItems: Array<{
    recordId: string;
    note: string;
  }>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const isStagingEventPayload = (
  value: unknown
): value is StagingEventPayload => {
  if (!isRecord(value)) return false;
  return (
    typeof value.dateText === 'string' &&
    typeof value.placeText === 'string' &&
    typeof value.eventText === 'string' &&
    Array.isArray(value.biblicalReferences) &&
    typeof value.certainty === 'string' &&
    isRecord(value.period) &&
    isRecord(value.review)
  );
};

const createEvidence = (
  sourceId: string,
  sourceReference: string
): HistoricalClaim['evidence'] => [
  {
    sourceId,
    shortReference: sourceReference,
    method: 'direct',
    humanReviewStatus: 'reviewed'
  }
];

const addUniqueIds = (
  ids: string[],
  seen: Set<string>,
  recordId: string,
  issues: StagingPromotionIssue[]
): void => {
  ids.forEach(id => {
    if (seen.has(id)) {
      issues.push({
        recordId,
        message: `L’identifiant généré ${id} est dupliqué.`
      });
    }
    seen.add(id);
  });
};

export function promoteReviewedStagingEvents(
  records: readonly StagingHistoricalRecord[],
  sources: readonly SourceCatalogEntry[]
): StagingPromotionResult {
  const issues: StagingPromotionIssue[] = [];
  const sourcesById = new Map(sources.map(source => [source.id, source]));
  const events: ReviewedEventRecord[] = [];
  const claims: HistoricalClaim[] = [];
  const presences: PresenceEpisode[] = [];
  const promotedRecordIds: string[] = [];
  const skippedRecordIds: string[] = [];
  const unresolvedItems: StagingPromotionResult['unresolvedItems'] = [];
  const generatedIds = new Set<string>();

  [...records]
    .sort((left, right) => left.id.localeCompare(right.id))
    .forEach(record => {
      if (
        record.workflowStatus !== 'staging' ||
        record.entityType !== 'event' ||
        !isStagingEventPayload(record.payload)
      ) {
        issues.push({
          recordId: record.id,
          message:
            'Le fichier de promotion doit contenir uniquement des événements staging au format attendu.'
        });
        return;
      }

      const payload = record.payload;
      payload.unresolvedItems?.forEach(note => {
        unresolvedItems.push({ recordId: record.id, note });
      });

      if (payload.review.status !== 'reviewed') {
        skippedRecordIds.push(record.id);
        return;
      }

      const recordIssues: string[] = [];
      const sourceIds = record.sourceHints ?? [];
      const sourceReference = payload.review.sourceReference?.trim();

      if (sourceIds.length === 0) {
        recordIssues.push('Une source est obligatoire.');
      }
      sourceIds.forEach(sourceId => {
        const source = sourcesById.get(sourceId);
        if (!source) {
          recordIssues.push(`La source ${sourceId} n’existe pas.`);
        } else if (
          source.verificationStatus !== 'reviewed' &&
          source.verificationStatus !== 'verified'
        ) {
          recordIssues.push(`La source ${sourceId} n’est pas relue.`);
        }
      });
      if (!sourceReference) {
        recordIssues.push('Une référence précise dans la source est obligatoire.');
      }
      if (!CERTAINTY_LEVELS.has(payload.certainty)) {
        recordIssues.push('Le degré de certitude est invalide.');
      }
      try {
        validateTemporalSpan(payload.period);
      } catch (error) {
        recordIssues.push(
          error instanceof Error ? error.message : 'La période est invalide.'
        );
      }
      if (payload.review.entityIdsVerified !== true) {
        recordIssues.push(
          'Les identifiants de personnes, lieux et événements doivent avoir été vérifiés.'
        );
      }
      if (
        !payload.review.reviewedAt ||
        !/^\d{4}-\d{2}-\d{2}$/.test(payload.review.reviewedAt)
      ) {
        recordIssues.push('La date de relecture doit suivre le format AAAA-MM-JJ.');
      }
      if (!payload.candidate) {
        recordIssues.push('Aucun candidat à promouvoir n’est fourni.');
      }

      if (recordIssues.length > 0 || !payload.candidate || !sourceReference) {
        recordIssues.forEach(message => issues.push({
          recordId: record.id,
          message
        }));
        return;
      }

      const candidate = payload.candidate;
      if (!candidate.event.id?.trim() || !candidate.event.name?.trim()) {
        issues.push({
          recordId: record.id,
          message: 'Le candidat doit posséder un ID et un nom d’événement.'
        });
        return;
      }
      if (
        JSON.stringify(candidate.event.period) !==
        JSON.stringify(payload.period)
      ) {
        issues.push({
          recordId: record.id,
          message:
            'La période du candidat doit être identique à la période relue du staging.'
        });
        return;
      }
      if (candidate.event.certainty !== payload.certainty) {
        issues.push({
          recordId: record.id,
          message:
            'La certitude de l’événement doit être identique à celle relue dans le staging.'
        });
        return;
      }

      const participantIds = new Set(
        candidate.participations.map(participation => participation.personId)
      );
      const eventClaims: HistoricalClaim[] = [];
      const eventPresences: PresenceEpisode[] = [];
      const primarySourceId = sourceIds[0];

      candidate.participations.forEach(participation => {
        const claimId =
          `claim-${candidate.event.id}-participation-${participation.personId}`;
        eventClaims.push({
          id: claimId,
          workflowStatus: 'reviewed',
          origin: 'reviewed',
          subject: {
            entityType: 'person',
            entityId: participation.personId
          },
          predicate: 'participation',
          object: {
            entityType: 'event',
            entityId: candidate.event.id
          },
          eventId: candidate.event.id,
          period: payload.period,
          certainty: participation.certainty,
          evidence: createEvidence(primarySourceId, sourceReference)
        });
      });

      candidate.presences.forEach(presence => {
        if (!participantIds.has(presence.personId)) {
          issues.push({
            recordId: record.id,
            message:
              `La présence de ${presence.personId} ne correspond à aucune participation explicite.`
          });
          return;
        }
        const suffix = `${presence.personId}-${presence.placeId}`;
        const claimId = `claim-${candidate.event.id}-presence-${suffix}`;
        const presenceId = `presence-${candidate.event.id}-${suffix}`;
        eventClaims.push({
          id: claimId,
          workflowStatus: 'reviewed',
          origin: 'reviewed',
          subject: {
            entityType: 'person',
            entityId: presence.personId
          },
          predicate: 'presence',
          placeId: presence.placeId,
          eventId: candidate.event.id,
          period: payload.period,
          certainty: presence.certainty,
          evidence: createEvidence(primarySourceId, sourceReference)
        });
        eventPresences.push({
          id: presenceId,
          workflowStatus: 'reviewed',
          origin: 'reviewed',
          personId: presence.personId,
          placeId: presence.placeId,
          period: payload.period,
          presenceType: presence.presenceType,
          certainty: presence.certainty,
          associatedEventIds: [candidate.event.id],
          supportingClaimIds: [claimId]
        });
      });

      candidate.interactions?.forEach(interaction => {
        if (
          !participantIds.has(interaction.subjectId) ||
          !participantIds.has(interaction.objectPersonId)
        ) {
          issues.push({
            recordId: record.id,
            message:
              'Une interaction attestée doit relier deux participants explicites de l’événement.'
          });
          return;
        }
        const claimId =
          `claim-${candidate.event.id}-interaction-` +
          `${interaction.subjectId}-${interaction.objectPersonId}`;
        eventClaims.push({
          id: claimId,
          workflowStatus: 'reviewed',
          origin: 'reviewed',
          subject: {
            entityType: 'person',
            entityId: interaction.subjectId
          },
          predicate: 'attested-interaction',
          object: {
            entityType: 'person',
            entityId: interaction.objectPersonId
          },
          eventId: candidate.event.id,
          period: payload.period,
          certainty: interaction.certainty,
          evidence: createEvidence(primarySourceId, sourceReference)
        });
      });

      const eventRecord: ReviewedEventRecord = {
        workflowStatus: 'reviewed',
        sourceIds: [...sourceIds],
        event: {
          ...candidate.event,
          biblicalReferences: [...payload.biblicalReferences],
          supportingClaimIds: eventClaims.map(claim => claim.id)
        }
      };

      addUniqueIds(
        [
          eventRecord.event.id,
          ...eventClaims.map(claim => claim.id),
          ...eventPresences.map(presence => presence.id)
        ],
        generatedIds,
        record.id,
        issues
      );
      events.push(eventRecord);
      claims.push(...eventClaims);
      presences.push(...eventPresences);
      promotedRecordIds.push(record.id);
    });

  if (issues.length > 0) {
    throw new StagingPromotionError(issues);
  }

  return {
    events: events.sort(
      (left, right) =>
        (left.event.sourceOrder ?? 0) - (right.event.sourceOrder ?? 0) ||
        left.event.id.localeCompare(right.event.id)
    ),
    claims: claims.sort((left, right) => left.id.localeCompare(right.id)),
    presences: presences.sort((left, right) => left.id.localeCompare(right.id)),
    promotedRecordIds,
    skippedRecordIds,
    unresolvedItems
  };
}
