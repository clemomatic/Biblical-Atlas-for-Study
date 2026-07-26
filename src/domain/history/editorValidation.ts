import {
  getTemporalInterval,
  getTemporalOverlap,
  validateTemporalSpan
} from './temporal.ts';
import type {
  EditorCatalogs,
  EditorProposal,
  EditorStagingBatch,
  EditorValidationIssue,
  EditorValidationResult
} from './editorTypes.ts';
import type { BiblicalPerson, TemporalSpan } from './types.ts';

const validateSpan = (
  span: TemporalSpan | undefined,
  path: string,
  issues: EditorValidationIssue[]
) => {
  if (!span) return;
  try {
    validateTemporalSpan(span);
  } catch (error) {
    issues.push({
      severity: 'error',
      path,
      message:
        error instanceof Error ? error.message : 'Période chronologique invalide.'
    });
  }
};

const safeTemporalOverlap = (
  left: TemporalSpan,
  right: TemporalSpan
) => {
  try {
    return getTemporalOverlap(left, right);
  } catch {
    return 'unknown' as const;
  }
};

const requireKnownIds = (
  ids: readonly string[],
  known: ReadonlySet<string>,
  path: string,
  label: string,
  issues: EditorValidationIssue[]
) => {
  ids.forEach(id => {
    if (!known.has(id)) {
      issues.push({
        severity: 'error',
        path,
        message: `${label} inexistant : ${id}.`
      });
    }
  });
};

const validateProposal = (
  proposal: EditorProposal,
  catalogs: EditorCatalogs,
  people: readonly BiblicalPerson[],
  issues: EditorValidationIssue[]
) => {
  const basePath = `proposals.${proposal.id}`;
  if (!proposal.extractionNote.trim()) {
    issues.push({
      severity: 'warning',
      path: `${basePath}.extractionNote`,
      message: 'Ajoutez une note courte indiquant comment la donnée a été relevée.'
    });
  }
  requireKnownIds(
    proposal.sourceIds,
    catalogs.sourceIds,
    `${basePath}.sourceIds`,
    'Source',
    issues
  );
  if (proposal.kind !== 'source' && proposal.sourceIds.length === 0) {
    issues.push({
      severity: 'error',
      path: `${basePath}.sourceIds`,
      message: 'Une proposition historique doit citer au moins une source.'
    });
  }

  if (proposal.kind === 'person') {
    validateSpan(proposal.data.lifeSpan, `${basePath}.data.lifeSpan`, issues);
    if (!proposal.data.name.trim()) {
      issues.push({
        severity: 'error',
        path: `${basePath}.data.name`,
        message: 'Le nom de la personne est obligatoire.'
      });
    }
  }

  if (proposal.kind === 'activity') {
    validateSpan(proposal.data.span, `${basePath}.data.span`, issues);
    requireKnownIds(
      [proposal.data.personId],
      catalogs.personIds,
      `${basePath}.data.personId`,
      'Personne',
      issues
    );
    requireKnownIds(
      proposal.data.associatedLocationIds,
      catalogs.placeIds,
      `${basePath}.data.associatedLocationIds`,
      'Lieu',
      issues
    );
    requireKnownIds(
      proposal.data.associatedEventIds,
      catalogs.eventIds,
      `${basePath}.data.associatedEventIds`,
      'Événement',
      issues
    );
    const person = people.find(candidate => candidate.id === proposal.data.personId);
    if (person?.lifeSpan) {
      if (safeTemporalOverlap(person.lifeSpan, proposal.data.span) === 'none') {
        issues.push({
          severity: 'warning',
          path: `${basePath}.data.span`,
          message: 'Cette activité se situe hors de la vie connue.'
        });
      }
      const conflicting = person.activityPeriods.find(
        activity =>
          activity.id !== proposal.data.id &&
          activity.type === proposal.data.type &&
          safeTemporalOverlap(activity.span, proposal.data.span) !== 'none'
      );
      if (conflicting) {
        issues.push({
          severity: 'warning',
          path: `${basePath}.data.span`,
          message:
            `Chevauchement à vérifier avec « ${conflicting.label} » déjà validée.`
        });
      }
    }
  }

  if (proposal.kind === 'event') {
    validateSpan(proposal.data.period, `${basePath}.data.period`, issues);
    requireKnownIds(
      proposal.data.participantIds,
      catalogs.personIds,
      `${basePath}.data.participantIds`,
      'Participant',
      issues
    );
    requireKnownIds(
      proposal.data.placeIds,
      catalogs.placeIds,
      `${basePath}.data.placeIds`,
      'Lieu',
      issues
    );
    if (!proposal.data.title.trim()) {
      issues.push({
        severity: 'error',
        path: `${basePath}.data.title`,
        message: 'Le titre de l’événement est obligatoire.'
      });
    }
    proposal.data.participantIds.forEach(personId => {
      const person = people.find(candidate => candidate.id === personId);
      if (
        person?.lifeSpan &&
        safeTemporalOverlap(person.lifeSpan, proposal.data.period) === 'none'
      ) {
        issues.push({
          severity: 'warning',
          path: `${basePath}.data.participantIds`,
          message: `L’événement est hors de la vie connue de ${person.name}.`
        });
      }
    });
  }
};

export function validateEditorBatch(
  batch: EditorStagingBatch,
  catalogs: EditorCatalogs,
  people: readonly BiblicalPerson[]
): EditorValidationResult {
  const issues: EditorValidationIssue[] = [];
  const effectiveCatalogs: EditorCatalogs = {
    personIds: new Set(catalogs.personIds),
    placeIds: new Set(catalogs.placeIds),
    eventIds: new Set(catalogs.eventIds),
    sourceIds: new Set(catalogs.sourceIds)
  };
  batch.proposals.forEach(proposal => {
    if (proposal.kind === 'person') {
      (effectiveCatalogs.personIds as Set<string>).add(proposal.data.id);
    } else if (proposal.kind === 'event') {
      (effectiveCatalogs.eventIds as Set<string>).add(proposal.data.id);
    } else if (proposal.kind === 'source') {
      (effectiveCatalogs.sourceIds as Set<string>).add(proposal.data.id);
    }
  });
  if (batch.workflowStatus !== 'staging' || batch.humanReviewStatus !== 'pending') {
    issues.push({
      severity: 'error',
      path: 'workflowStatus',
      message: 'Un lot de l’éditeur doit rester en staging et en attente de relecture.'
    });
  }
  if (!effectiveCatalogs.sourceIds.has(batch.sourceId)) {
    issues.push({
      severity: 'error',
      path: 'sourceId',
      message: `Source principale inexistante : ${batch.sourceId}.`
    });
  }
  const ids = new Set<string>();
  batch.proposals.forEach(proposal => {
    if (ids.has(proposal.id)) {
      issues.push({
        severity: 'error',
        path: `proposals.${proposal.id}`,
        message: `Identifiant de proposition dupliqué : ${proposal.id}.`
      });
    }
    ids.add(proposal.id);
    validateProposal(proposal, effectiveCatalogs, people, issues);
  });
  return {
    valid: !issues.some(issue => issue.severity === 'error'),
    issues
  };
}
