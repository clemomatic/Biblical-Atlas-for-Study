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
  'reign-start',
  'reign-end',
  'prophecy',
  'office',
  'political-event',
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

const VALID_PLACE_GRANULARITIES = new Set([
  'point',
  'area',
  'region',
  'route'
]);

const VALID_RELATION_LEVELS = new Set([
  'lifespan-overlap',
  'activity-overlap',
  'prophet-during-reign',
  'simultaneous-reigns',
  'same-region',
  'same-place',
  'same-event',
  'documented-interaction'
]);

const VALID_ACTIVITY_PHASES = new Set([
  'standard',
  'co-reign',
  'disputed-reign',
  'limited-reign',
  'fully-established-reign',
  'prophetic-ministry',
  'official-office'
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
      if (activity.phase && !VALID_ACTIVITY_PHASES.has(activity.phase)) {
        issues.push({
          path: `${path}.person.activityPeriods[${activityIndex}].phase`,
          message: `Phase d’activité inconnue : ${activity.phase}.`
        });
      }
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
    record.place.regionIds?.forEach((regionId, regionIndex) => {
      if (!regionId.trim()) {
        issues.push({
          path: `${path}.place.regionIds[${regionIndex}]`,
          message: 'Un identifiant de région ne peut pas être vide.'
        });
      }
    });
    if (
      record.place.certainty !== undefined &&
      !VALID_CERTAINTY_LEVELS.has(record.place.certainty)
    ) {
      issues.push({
        path: `${path}.place.certainty`,
        message: `Degré de certitude inconnu : ${record.place.certainty}.`
      });
    }
  });

  dataset.territories.forEach((record, index) => {
    const path = `reviewed.territories[${index}]`;
    registerId(record.territory.id, `${path}.territory.id`);
    territoryIds.add(record.territory.id);
    if (record.workflowStatus !== 'reviewed') {
      issues.push({
        path,
        message: 'Le territoire doit avoir le statut reviewed.'
      });
    }
    validateSourceIds(record.sourceIds, `${path}.sourceIds`);
    validateSpanAt(record.territory.period, `${path}.territory.period`, issues);
    if (record.territory.geometryStatus !== 'not-provided') {
      issues.push({
        path: `${path}.territory.geometryStatus`,
        message:
          'Un territoire A6 ne doit pas recevoir une géométrie non fournie par la source.'
      });
    }
    record.territory.capitalPhases.forEach((phase, phaseIndex) => {
      const phasePath = `${path}.territory.capitalPhases[${phaseIndex}]`;
      registerId(phase.id, `${phasePath}.id`);
      validateSpanAt(phase.period, `${phasePath}.period`, issues);
      if (!placeIds.has(phase.placeId)) {
        issues.push({
          path: `${phasePath}.placeId`,
          message: `Lieu inexistant : ${phase.placeId}.`
        });
      }
      if (!VALID_CERTAINTY_LEVELS.has(phase.certainty)) {
        issues.push({
          path: `${phasePath}.certainty`,
          message: `Degré de certitude inconnu : ${phase.certainty}.`
        });
      }
    });
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

  dataset.routes.forEach((record, index) => {
    const path = `reviewed.routes[${index}]`;
    registerId(record.route.id, `${path}.route.id`);
    routeIds.add(record.route.id);
    if (record.workflowStatus !== 'reviewed') {
      issues.push({
        path,
        message: 'L’itinéraire doit avoir le statut reviewed.'
      });
    }
    validateSourceIds(record.sourceIds, `${path}.sourceIds`);
    validateSpanAt(record.route.period, `${path}.route.period`, issues);
    if (
      record.route.geometryPrecision !== 'schematic' ||
      record.route.notForExactNavigation !== true
    ) {
      issues.push({
        path,
        message:
          'Un itinéraire A7 doit être explicitement schématique et impropre à la navigation exacte.'
      });
    }
    if (record.route.placeIds.length < 2) {
      issues.push({
        path: `${path}.route.placeIds`,
        message: 'Un itinéraire doit relier au moins deux lieux.'
      });
    }
    validateRelatedIds(
      record.route.placeIds,
      placeIds,
      `${path}.route.placeIds`,
      'Lieu'
    );
    if (!VALID_CERTAINTY_LEVELS.has(record.route.certainty)) {
      issues.push({
        path: `${path}.route.certainty`,
        message: `Degré de certitude inconnu : ${record.route.certainty}.`
      });
    }
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
    if (
      record.event.sourceOrder !== undefined &&
      (!Number.isInteger(record.event.sourceOrder) ||
        record.event.sourceOrder < 1)
    ) {
      issues.push({
        path: `${path}.event.sourceOrder`,
        message: 'L’ordre dans la source doit être un entier positif.'
      });
    }
    if (
      record.event.certainty !== undefined &&
      !VALID_CERTAINTY_LEVELS.has(record.event.certainty)
    ) {
      issues.push({
        path: `${path}.event.certainty`,
        message: `Degré de certitude inconnu : ${record.event.certainty}.`
      });
    }
    record.event.biblicalReferences?.forEach((reference, referenceIndex) => {
      if (!reference.trim()) {
        issues.push({
          path: `${path}.event.biblicalReferences[${referenceIndex}]`,
          message: 'Une référence biblique ne peut pas être vide.'
        });
      }
    });
    record.event.placeMentions?.forEach((mention, mentionIndex) => {
      const mentionPath = `${path}.event.placeMentions[${mentionIndex}]`;
      if (!mention.label?.trim()) {
        issues.push({
          path: `${mentionPath}.label`,
          message: 'Le libellé du lieu est obligatoire.'
        });
      }
      if (!VALID_PLACE_GRANULARITIES.has(mention.granularity)) {
        issues.push({
          path: `${mentionPath}.granularity`,
          message: `Granularité géographique inconnue : ${mention.granularity}.`
        });
      }
      if (!VALID_CERTAINTY_LEVELS.has(mention.certainty)) {
        issues.push({
          path: `${mentionPath}.certainty`,
          message: `Degré de certitude inconnu : ${mention.certainty}.`
        });
      }
      if (mention.placeId && !placeIds.has(mention.placeId)) {
        issues.push({
          path: `${mentionPath}.placeId`,
          message: `Lieu inexistant : ${mention.placeId}.`
        });
      }
    });
    record.event.participantMentions?.forEach((mention, mentionIndex) => {
      const mentionPath = `${path}.event.participantMentions[${mentionIndex}]`;
      if (!mention.label?.trim()) {
        issues.push({
          path: `${mentionPath}.label`,
          message: 'Le libellé du participant est obligatoire.'
        });
      }
      if (!VALID_CERTAINTY_LEVELS.has(mention.certainty)) {
        issues.push({
          path: `${mentionPath}.certainty`,
          message: `Degré de certitude inconnu : ${mention.certainty}.`
        });
      }
      if (mention.personId && !personIds.has(mention.personId)) {
        issues.push({
          path: `${mentionPath}.personId`,
          message: `Personnage inexistant : ${mention.personId}.`
        });
      }
    });
    validateRelatedIds(
      record.event.supersedesLegacyEventIds,
      eventIds,
      `${path}.event.supersedesLegacyEventIds`,
      'Événement remplacé'
    );
  });

  dataset.routes.forEach((record, index) => {
    validateRelatedIds(
      record.route.associatedEventIds,
      eventIds,
      `reviewed.routes[${index}].route.associatedEventIds`,
      'Événement'
    );
  });

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
      if (activity.realmId && !territoryIds.has(activity.realmId)) {
        issues.push({
          path: `${activityPath}.realmId`,
          message: `Territoire inexistant : ${activity.realmId}.`
        });
      }
      if (
        activity.capitalPlaceId &&
        !placeIds.has(activity.capitalPlaceId)
      ) {
        issues.push({
          path: `${activityPath}.capitalPlaceId`,
          message: `Capitale inexistante : ${activity.capitalPlaceId}.`
        });
      }
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

  const validateSupportingClaimIds = (
    claimIds: string[] | undefined,
    path: string
  ): void => {
    claimIds?.forEach((claimId, claimIndex) => {
      if (!claimsById.has(claimId)) {
        issues.push({
          path: `${path}[${claimIndex}]`,
          message: `Affirmation justificative inexistante : ${claimId}.`
        });
      }
    });
  };

  dataset.people.forEach((record, personIndex) => {
    const personPath = `reviewed.people[${personIndex}].person`;
    validateSupportingClaimIds(
      record.person.lifeSpanClaimIds,
      `${personPath}.lifeSpanClaimIds`
    );
    record.person.activityPeriods.forEach((activity, activityIndex) => {
      validateSupportingClaimIds(
        activity.supportingClaimIds,
        `${personPath}.activityPeriods[${activityIndex}].supportingClaimIds`
      );
    });
  });
  dataset.events.forEach((record, eventIndex) => {
    validateSupportingClaimIds(
      record.event.supportingClaimIds,
      `reviewed.events[${eventIndex}].event.supportingClaimIds`
    );
  });
  dataset.territories.forEach((record, territoryIndex) => {
    record.territory.capitalPhases.forEach((phase, phaseIndex) => {
      validateSupportingClaimIds(
        phase.supportingClaimIds,
        `reviewed.territories[${territoryIndex}].territory.capitalPhases[${phaseIndex}].supportingClaimIds`
      );
    });
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
  dataset: HistoricalDataset,
  known: KnownHistoricalEntities = {}
): void {
  const issues: HistoricalValidationIssue[] = [];
  const relationIds = new Set<string>();
  const claimsById = new Map(
    dataset.claims.map(claim => [claim.id, claim])
  );
  const presencesById = new Map(
    dataset.presences.map(presence => [presence.id, presence])
  );
  const personIds = new Set(dataset.people.map(record => record.person.id));
  const placeIds = new Set(dataset.places.map(record => record.place.id));
  const eventIds = new Set(dataset.events.map(record => record.event.id));
  addIterable(personIds, known.personIds);
  addIterable(placeIds, known.placeIds);
  addIterable(eventIds, known.eventIds);

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
    if (!VALID_RELATION_LEVELS.has(relation.relationLevel)) {
      issues.push({
        path: `${path}.relationLevel`,
        message: `Niveau de relation inconnu : ${relation.relationLevel}.`
      });
    }
    if (
      relation.subjectIds.length < 2 ||
      new Set(relation.subjectIds).size !== relation.subjectIds.length
    ) {
      issues.push({
        path: `${path}.subjectIds`,
        message:
          'Une relation doit relier au moins deux personnes distinctes.'
      });
    }
    relation.subjectIds.forEach((personId, personIndex) => {
      if (!personIds.has(personId)) {
        issues.push({
          path: `${path}.subjectIds[${personIndex}]`,
          message: `Personnage généré inexistant : ${personId}.`
        });
      }
    });
    if (!relation.supportingClaimIds.length) {
      issues.push({
        path: `${path}.supportingClaimIds`,
        message: 'Une relation générée doit conserver ses claims justificatifs.'
      });
    }
    relation.supportingClaimIds.forEach((claimId, claimIndex) => {
      if (!claimsById.has(claimId)) {
        issues.push({
          path: `${path}.supportingClaimIds[${claimIndex}]`,
          message: `Claim d’entrée inexistant : ${claimId}.`
        });
      }
    });
    if (!relation.generatedFromIds.length) {
      issues.push({
        path: `${path}.generatedFromIds`,
        message: 'Les enregistrements ayant produit la relation sont obligatoires.'
      });
    }
    relation.placeIds?.forEach((placeId, placeIndex) => {
      if (!placeIds.has(placeId)) {
        issues.push({
          path: `${path}.placeIds[${placeIndex}]`,
          message: `Lieu généré inexistant : ${placeId}.`
        });
      }
    });
    relation.eventIds?.forEach((eventId, eventIndex) => {
      if (!eventIds.has(eventId)) {
        issues.push({
          path: `${path}.eventIds[${eventIndex}]`,
          message: `Événement généré inexistant : ${eventId}.`
        });
      }
    });
    if (
      [
        'lifespan-overlap',
        'activity-overlap',
        'prophet-during-reign',
        'simultaneous-reigns',
        'same-place',
        'same-region'
      ]
        .includes(relation.relationLevel) &&
      !relation.temporalOverlap
    ) {
      issues.push({
        path: `${path}.temporalOverlap`,
        message: 'Cette relation temporelle nécessite un chevauchement explicite.'
      });
    }
    if (
      relation.relationLevel === 'same-place' &&
      relation.placeIds?.length !== 1
    ) {
      issues.push({
        path: `${path}.placeIds`,
        message: 'Une relation same-place doit cibler un seul lieu précis.'
      });
    }
    if (
      relation.relationLevel === 'same-region' &&
      (!relation.regionIds?.length || (relation.placeIds?.length ?? 0) < 2)
    ) {
      issues.push({
        path,
        message:
          'Une relation same-region doit conserver la région et les lieux distincts.'
      });
    }
    if (
      relation.relationLevel === 'same-event' &&
      !relation.eventIds?.length
    ) {
      issues.push({
        path: `${path}.eventIds`,
        message: 'Une relation same-event doit citer un événement.'
      });
    }
    const supportingClaims = relation.supportingClaimIds
      .map(claimId => claimsById.get(claimId))
      .filter(claim => claim !== undefined);
    if (
      relation.relationLevel === 'same-event' &&
      !supportingClaims.every(
        claim =>
          claim.predicate === 'participation' &&
          claim.evidence.some(evidence => evidence.method === 'direct')
      )
    ) {
      issues.push({
        path: `${path}.supportingClaimIds`,
        message:
          'Une relation same-event nécessite des participations directement documentées.'
      });
    }
    if (
      relation.certainty === 'certain' &&
      supportingClaims.some(claim => claim.certainty !== 'certain')
    ) {
      issues.push({
        path: `${path}.certainty`,
        message:
          'Une donnée possible ou probable ne peut pas produire une relation certaine.'
      });
    }
    if (relation.relationLevel === 'documented-interaction') {
      const hasDirectInteractionClaim = supportingClaims.some(
        claim =>
          claim.predicate === 'attested-interaction' &&
          claim.evidence.some(evidence => evidence.method === 'direct')
      );
      if (!hasDirectInteractionClaim) {
        issues.push({
          path: `${path}.supportingClaimIds`,
          message:
            'Une interaction attestée nécessite un claim direct d’interaction.'
        });
      }
    }
    const inputPresences = relation.generatedFromIds
      .map(sourceId => presencesById.get(sourceId))
      .filter(presence => presence !== undefined);
    if (
      inputPresences.length > 0 &&
      inputPresences.some(
        presence =>
          !(relation.placeIds ?? []).includes(presence.placeId) ||
          !relation.subjectIds.includes(presence.personId)
      )
    ) {
      issues.push({
        path,
        message:
          'Les personnes ou le lieu générés ne correspondent pas aux épisodes d’entrée.'
      });
    }
    if (!validateIsoDate(relation.generatedAt.slice(0, 10))) {
      issues.push({
        path: `${path}.generatedAt`,
        message: 'generatedAt doit être une date ISO déterministe.'
      });
    }
    validateSpanAt(
      relation.temporalOverlap,
      `${path}.temporalOverlap`,
      issues
    );
  });

  if (issues.length > 0) {
    throw new HistoricalDataValidationError(issues);
  }
}
