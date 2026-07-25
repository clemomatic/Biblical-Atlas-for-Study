import {
  validateTemporalSpan
} from './temporal.ts';
import type {
  DerivedHistoricalRelation,
  HistoricalClaim,
  HistoricalDataset,
  HistoricalEntityReference,
  KnownHistoricalEntities,
  SourceCatalogEntry
} from './contentTypes.ts';

export interface HistoricalValidationIssue {
  path: string;
  message: string;
}

export class HistoricalDataValidationError extends Error {
  readonly issues: HistoricalValidationIssue[];

  constructor(issues: HistoricalValidationIssue[]) {
    super(
      `Validation historique échouée avec ${issues.length} erreur${issues.length > 1 ? 's' : ''}.`
    );
    this.name = 'HistoricalDataValidationError';
    this.issues = issues;
  }
}

const VALID_PREDICATES = new Set([
  'birth',
  'death',
  'presence',
  'residence',
  'travel',
  'reign',
  'prophecy',
  'office',
  'participation',
  'family-relation',
  'attested-interaction'
]);

const VALID_CERTAINTY_LEVELS = new Set([
  'certain',
  'probable',
  'possible',
  'unknown'
]);

const VALID_ENTITY_TYPES = new Set([
  'person',
  'place',
  'event',
  'route',
  'territory'
]);

const VALID_SOURCE_TYPES = new Set([
  'bible',
  'book',
  'encyclopedia',
  'article',
  'map',
  'timeline',
  'appendix',
  'dataset',
  'other'
]);

const VALID_SOURCE_STATUSES = new Set([
  'unverified',
  'reviewed',
  'verified',
  'rejected'
]);

const VALID_EVIDENCE_METHODS = new Set([
  'direct',
  'calculated',
  'inferred'
]);

const VALID_PRESENCE_TYPES = new Set([
  'resident',
  'visitor',
  'traveler',
  'ministry',
  'reign-seat',
  'imprisonment',
  'possible-presence'
]);

const addIterable = (
  target: Set<string>,
  values: Iterable<string> | undefined
): void => {
  if (!values) return;
  for (const value of values) target.add(value);
};

const validateIsoDate = (value: string): boolean => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

const ensureSourceCanSupportReviewedData = (
  source: SourceCatalogEntry | undefined,
  path: string,
  issues: HistoricalValidationIssue[]
): void => {
  if (!source) return;
  if (
    source.verificationStatus !== 'reviewed' &&
    source.verificationStatus !== 'verified'
  ) {
    issues.push({
      path,
      message:
        'Une donnée relue doit citer une source elle-même relue ou vérifiée.'
    });
  }
};

const validateSpanAt = (
  period: Parameters<typeof validateTemporalSpan>[0] | undefined,
  path: string,
  issues: HistoricalValidationIssue[]
): void => {
  if (!period) return;
  try {
    validateTemporalSpan(period);
  } catch (error) {
    issues.push({
      path,
      message:
        error instanceof Error ? error.message : 'Période temporelle invalide.'
    });
  }
};

export function validateHistoricalDataset(
  dataset: HistoricalDataset,
  known: KnownHistoricalEntities = {}
): void {
  const issues: HistoricalValidationIssue[] = [];
  const identifiers = new Map<string, string>();
  const sourcesById = new Map<string, SourceCatalogEntry>();

  const registerId = (id: string, path: string): void => {
    if (!id?.trim()) {
      issues.push({ path, message: 'Un identifiant non vide est obligatoire.' });
      return;
    }
    const previousPath = identifiers.get(id);
    if (previousPath) {
      issues.push({
        path,
        message: `Identifiant dupliqué « ${id} », déjà utilisé dans ${previousPath}.`
      });
      return;
    }
    identifiers.set(id, path);
  };

  dataset.sources.forEach((source, index) => {
    const path = `sources[${index}]`;
    registerId(source.id, `${path}.id`);
    sourcesById.set(source.id, source);
    if (!source.title?.trim() || !source.publication?.trim()) {
      issues.push({
        path,
        message: 'Le titre et la publication sont obligatoires.'
      });
    }
    if (!source.language?.trim()) {
      issues.push({ path, message: 'La langue de la source est obligatoire.' });
    }
    if (!VALID_SOURCE_TYPES.has(source.documentType)) {
      issues.push({
        path: `${path}.documentType`,
        message: `Type de document inconnu : ${source.documentType}.`
      });
    }
    if (!VALID_SOURCE_STATUSES.has(source.verificationStatus)) {
      issues.push({
        path: `${path}.verificationStatus`,
        message: `Statut de source inconnu : ${source.verificationStatus}.`
      });
    }
    if (source.accessedAt && !validateIsoDate(source.accessedAt)) {
      issues.push({
        path: `${path}.accessedAt`,
        message: 'La date de consultation doit suivre le format AAAA-MM-JJ.'
      });
    }
    if (
      source.factualDataUseAllowed !== true ||
      source.longTextReproductionAllowed !== false ||
      source.imageReproductionAllowed !== false
    ) {
      issues.push({
        path,
        message:
          'La politique doit autoriser uniquement les données factuelles et interdire la reproduction de longs textes et d’images.'
      });
    }
  });

  const validateSourceIds = (sourceIds: string[], path: string): void => {
    if (!Array.isArray(sourceIds) || sourceIds.length === 0) {
      issues.push({
        path,
        message: 'Une donnée relue doit citer au moins une source.'
      });
      return;
    }
    sourceIds.forEach((sourceId, index) => {
      const source = sourcesById.get(sourceId);
      if (!source) {
        issues.push({
          path: `${path}[${index}]`,
          message: `Source inexistante : ${sourceId}.`
        });
      } else {
        ensureSourceCanSupportReviewedData(
          source,
          `${path}[${index}]`,
          issues
        );
      }
    });
  };

  dataset.staging.forEach((record, index) => {
    const path = `staging[${index}]`;
    registerId(record.id, `${path}.id`);
    if (
      record.workflowStatus !== 'staging' ||
      record.presentedAsValidated === true
    ) {
      issues.push({
        path,
        message:
          'Un enregistrement staging ne peut pas être présenté comme relu ou validé.'
      });
    }
  });

  const personIds = new Set<string>();
  const placeIds = new Set<string>();
  const eventIds = new Set<string>();
  const routeIds = new Set<string>();
  const territoryIds = new Set<string>();
  addIterable(personIds, known.personIds);
  addIterable(placeIds, known.placeIds);
  addIterable(eventIds, known.eventIds);
  addIterable(routeIds, known.routeIds);
  addIterable(territoryIds, known.territoryIds);

  dataset.people.forEach((record, index) => {
    const path = `reviewed.people[${index}]`;
    registerId(record.person.id, `${path}.person.id`);
    personIds.add(record.person.id);
    if (record.workflowStatus !== 'reviewed') {
      issues.push({ path, message: 'La fiche doit avoir le statut reviewed.' });
    }
    validateSourceIds(record.sourceIds, `${path}.sourceIds`);
    validateSpanAt(record.person.lifeSpan, `${path}.person.lifeSpan`, issues);
    record.person.activityPeriods.forEach((activity, activityIndex) => {
      registerId(
        activity.id,
        `${path}.person.activityPeriods[${activityIndex}].id`
      );
      validateSpanAt(
        activity.span,
        `${path}.person.activityPeriods[${activityIndex}].span`,
        issues
      );
    });
  });

  dataset.places.forEach((record, index) => {
    const path = `reviewed.places[${index}]`;
    registerId(record.place.id, `${path}.place.id`);
    placeIds.add(record.place.id);
    if (record.workflowStatus !== 'reviewed') {
      issues.push({ path, message: 'Le lieu doit avoir le statut reviewed.' });
    }
    validateSourceIds(record.sourceIds, `${path}.sourceIds`);
  });

  dataset.events.forEach((record, index) => {
    const path = `reviewed.events[${index}]`;
    registerId(record.event.id, `${path}.event.id`);
    eventIds.add(record.event.id);
    if (record.workflowStatus !== 'reviewed') {
      issues.push({
        path,
        message: 'L’événement doit avoir le statut reviewed.'
      });
    }
    validateSourceIds(record.sourceIds, `${path}.sourceIds`);
    validateSpanAt(record.event.period, `${path}.event.period`, issues);
  });

  const validateRelatedIds = (
    values: string[] | undefined,
    knownIds: Set<string>,
    path: string,
    label: string
  ): void => {
    values?.forEach((value, index) => {
      if (!knownIds.has(value)) {
        issues.push({
          path: `${path}[${index}]`,
          message: `${label} inexistant : ${value}.`
        });
      }
    });
  };

  dataset.people.forEach((record, index) => {
    const path = `reviewed.people[${index}].person`;
    validateRelatedIds(
      record.person.associatedEventIds,
      eventIds,
      `${path}.associatedEventIds`,
      'Événement'
    );
    validateRelatedIds(
      record.person.associatedLocationIds,
      placeIds,
      `${path}.associatedLocationIds`,
      'Lieu'
    );
    validateRelatedIds(
      record.person.associatedRouteIds,
      routeIds,
      `${path}.associatedRouteIds`,
      'Itinéraire'
    );
    validateRelatedIds(
      record.person.associatedPersonIds,
      personIds,
      `${path}.associatedPersonIds`,
      'Personnage'
    );
    record.person.activityPeriods.forEach((activity, activityIndex) => {
      const activityPath = `${path}.activityPeriods[${activityIndex}]`;
      validateRelatedIds(
        activity.associatedEventIds,
        eventIds,
        `${activityPath}.associatedEventIds`,
        'Événement'
      );
      validateRelatedIds(
        activity.associatedLocationIds,
        placeIds,
        `${activityPath}.associatedLocationIds`,
        'Lieu'
      );
      validateRelatedIds(
        activity.associatedRouteIds,
        routeIds,
        `${activityPath}.associatedRouteIds`,
        'Itinéraire'
      );
      validateRelatedIds(
        activity.associatedPersonIds,
        personIds,
        `${activityPath}.associatedPersonIds`,
        'Personnage'
      );
    });
  });

  const entityExists = (reference: HistoricalEntityReference): boolean => {
    if (reference.entityType === 'person') {
      return personIds.has(reference.entityId);
    }
    if (reference.entityType === 'place') {
      return placeIds.has(reference.entityId);
    }
    if (reference.entityType === 'event') {
      return eventIds.has(reference.entityId);
    }
    if (reference.entityType === 'route') {
      return routeIds.has(reference.entityId);
    }
    return territoryIds.has(reference.entityId);
  };

  const validateEntityReference = (
    reference: HistoricalEntityReference,
    path: string
  ): void => {
    if (!VALID_ENTITY_TYPES.has(reference.entityType)) {
      issues.push({
        path,
        message: `Type d’entité inconnu : ${reference.entityType}.`
      });
      return;
    }
    if (!entityExists(reference)) {
      issues.push({
        path,
        message: `${reference.entityType} inexistant : ${reference.entityId}.`
      });
    }
  };

  const claimsById = new Map<string, HistoricalClaim>();
  dataset.claims.forEach((claim, index) => {
    registerId(claim.id, `reviewed.claims[${index}].id`);
    claimsById.set(claim.id, claim);
  });

  dataset.claims.forEach((claim, index) => {
    const path = `reviewed.claims[${index}]`;
    if (claim.workflowStatus !== 'reviewed') {
      issues.push({
        path,
        message: 'Une affirmation relue doit avoir le statut reviewed.'
      });
    }
    if (claim.origin === 'generated') {
      issues.push({
        path,
        message:
          'Une affirmation générée ne peut pas être enregistrée dans reviewed.'
      });
    }
    if (!VALID_PREDICATES.has(claim.predicate)) {
      issues.push({
        path: `${path}.predicate`,
        message: `Prédicat historique inconnu : ${claim.predicate}.`
      });
    }
    if (!VALID_CERTAINTY_LEVELS.has(claim.certainty)) {
      issues.push({
        path: `${path}.certainty`,
        message: `Degré de certitude inconnu : ${claim.certainty}.`
      });
    }
    validateEntityReference(claim.subject, `${path}.subject`);
    if (claim.object && 'entityType' in claim.object) {
      validateEntityReference(claim.object, `${path}.object`);
    }
    if (claim.placeId && !placeIds.has(claim.placeId)) {
      issues.push({
        path: `${path}.placeId`,
        message: `Lieu inexistant : ${claim.placeId}.`
      });
    }
    if (claim.eventId && !eventIds.has(claim.eventId)) {
      issues.push({
        path: `${path}.eventId`,
        message: `Événement inexistant : ${claim.eventId}.`
      });
    }
    validateSpanAt(claim.period, `${path}.period`, issues);

    if (!Array.isArray(claim.evidence) || claim.evidence.length === 0) {
      issues.push({
        path: `${path}.evidence`,
        message: 'Une affirmation relue doit posséder au moins une preuve.'
      });
      return;
    }

    claim.evidence.forEach((evidence, evidenceIndex) => {
      const evidencePath = `${path}.evidence[${evidenceIndex}]`;
      const source = sourcesById.get(evidence.sourceId);
      if (!source) {
        issues.push({
          path: `${evidencePath}.sourceId`,
          message: `Source inexistante : ${evidence.sourceId}.`
        });
      } else {
        ensureSourceCanSupportReviewedData(
          source,
          `${evidencePath}.sourceId`,
          issues
        );
      }
      if (!evidence.shortReference?.trim()) {
        issues.push({
          path: `${evidencePath}.shortReference`,
          message: 'Une référence courte est obligatoire.'
        });
      } else if (evidence.shortReference.length > 280) {
        issues.push({
          path: `${evidencePath}.shortReference`,
          message:
            'La référence dépasse 280 caractères ; ne recopiez pas de long extrait.'
        });
      }
      if (evidence.humanReviewStatus !== 'reviewed') {
        issues.push({
          path: `${evidencePath}.humanReviewStatus`,
          message:
            'Toute preuve placée dans reviewed doit avoir été relue humainement.'
        });
      }
      if (!VALID_EVIDENCE_METHODS.has(evidence.method)) {
        issues.push({
          path: `${evidencePath}.method`,
          message: `Méthode de preuve inconnue : ${evidence.method}.`
        });
      }
      if (evidence.method === 'calculated') {
        if (!evidence.inputClaimIds?.length) {
          issues.push({
            path: `${evidencePath}.inputClaimIds`,
            message:
              'Une affirmation calculée doit déclarer ses affirmations d’entrée.'
          });
        }
        if (!evidence.calculationExplanation?.trim()) {
          issues.push({
            path: `${evidencePath}.calculationExplanation`,
            message: 'Le calcul doit être expliqué.'
          });
        }
      }
      if (
        evidence.method === 'inferred' &&
        !evidence.calculationExplanation?.trim()
      ) {
        issues.push({
          path: `${evidencePath}.calculationExplanation`,
          message: 'Une inférence doit être expliquée.'
        });
      }
      evidence.inputClaimIds?.forEach((inputId, inputIndex) => {
        if (inputId === claim.id) {
          issues.push({
            path: `${evidencePath}.inputClaimIds[${inputIndex}]`,
            message: 'Une affirmation ne peut pas se calculer elle-même.'
          });
        } else if (!claimsById.has(inputId)) {
          issues.push({
            path: `${evidencePath}.inputClaimIds[${inputIndex}]`,
            message: `Affirmation d’entrée inexistante : ${inputId}.`
          });
        }
      });
    });
  });

  dataset.presences.forEach((presence, index) => {
    const path = `reviewed.presences[${index}]`;
    registerId(presence.id, `${path}.id`);
    if (
      presence.workflowStatus !== 'reviewed' ||
      presence.origin !== 'reviewed'
    ) {
      issues.push({
        path,
        message: 'Un épisode de présence validé doit provenir de reviewed.'
      });
    }
    if (!personIds.has(presence.personId)) {
      issues.push({
        path: `${path}.personId`,
        message: `Personnage inexistant : ${presence.personId}.`
      });
    }
    if (!placeIds.has(presence.placeId)) {
      issues.push({
        path: `${path}.placeId`,
        message: `Lieu inexistant : ${presence.placeId}.`
      });
    }
    if (!VALID_PRESENCE_TYPES.has(presence.presenceType)) {
      issues.push({
        path: `${path}.presenceType`,
        message: `Type de présence inconnu : ${presence.presenceType}.`
      });
    }
    if (!VALID_CERTAINTY_LEVELS.has(presence.certainty)) {
      issues.push({
        path: `${path}.certainty`,
        message: `Degré de certitude inconnu : ${presence.certainty}.`
      });
    }
    validateSpanAt(presence.period, `${path}.period`, issues);
    presence.associatedEventIds?.forEach((eventId, eventIndex) => {
      if (!eventIds.has(eventId)) {
        issues.push({
          path: `${path}.associatedEventIds[${eventIndex}]`,
          message: `Événement inexistant : ${eventId}.`
        });
      }
    });
    if (!presence.supportingClaimIds?.length) {
      issues.push({
        path: `${path}.supportingClaimIds`,
        message:
          'Un épisode relu doit citer au moins une affirmation justificative.'
      });
    } else {
      presence.supportingClaimIds.forEach((claimId, claimIndex) => {
        if (!claimsById.has(claimId)) {
          issues.push({
            path: `${path}.supportingClaimIds[${claimIndex}]`,
            message: `Affirmation justificative inexistante : ${claimId}.`
          });
        }
      });
    }
  });

  if (issues.length > 0) {
    throw new HistoricalDataValidationError(issues);
  }
}

export function validateGeneratedRelations(
  relations: DerivedHistoricalRelation[],
  dataset: HistoricalDataset
): void {
  const issues: HistoricalValidationIssue[] = [];
  const relationIds = new Set<string>();
  const claimIds = new Set(dataset.claims.map(claim => claim.id));
  const presencesById = new Map(
    dataset.presences.map(presence => [presence.id, presence])
  );

  relations.forEach((relation, index) => {
    const path = `generated.relations[${index}]`;
    if (relationIds.has(relation.id)) {
      issues.push({
        path: `${path}.id`,
        message: `Identifiant généré dupliqué : ${relation.id}.`
      });
    }
    relationIds.add(relation.id);
    if (relation.origin !== 'generated') {
      issues.push({
        path,
        message: 'Une relation calculée doit avoir l’origine generated.'
      });
    }
    if (!relation.inputClaimIds.length) {
      issues.push({
        path: `${path}.inputClaimIds`,
        message: 'Une relation générée doit conserver ses claims d’entrée.'
      });
    }
    relation.inputClaimIds.forEach((claimId, claimIndex) => {
      if (!claimIds.has(claimId)) {
        issues.push({
          path: `${path}.inputClaimIds[${claimIndex}]`,
          message: `Claim d’entrée inexistant : ${claimId}.`
        });
      }
    });
    relation.generatedFromPresenceIds.forEach(
      (presenceId, presenceIndex) => {
        if (!presencesById.has(presenceId)) {
          issues.push({
            path: `${path}.generatedFromPresenceIds[${presenceIndex}]`,
            message: `Présence d’entrée inexistante : ${presenceId}.`
          });
        }
      }
    );
    const inputPresences = relation.generatedFromPresenceIds
      .map(presenceId => presencesById.get(presenceId))
      .filter(presence => presence !== undefined);
    if (
      inputPresences.length > 0 &&
      inputPresences.some(
        presence =>
          presence.placeId !== relation.placeId ||
          (presence.personId !== relation.subjectPersonId &&
            presence.personId !== relation.objectPersonId)
      )
    ) {
      issues.push({
        path,
        message:
          'Les personnes ou le lieu générés ne correspondent pas aux épisodes d’entrée.'
      });
    }
    validateSpanAt(relation.period, `${path}.period`, issues);
  });

  if (issues.length > 0) {
    throw new HistoricalDataValidationError(issues);
  }
}
