import type {
  CertaintyLevel,
  TimelineDisplayLevel
} from '../../types.ts';
import type { SourceCatalogEntry } from './contentTypes.ts';
import type {
  PersonActivityType,
  TemporalSpan
} from './types.ts';

export type EditorProposalKind = 'person' | 'activity' | 'event' | 'source';

interface EditorProposalBase {
  id: string;
  kind: EditorProposalKind;
  operation: 'create' | 'update';
  sourceIds: string[];
  claimIds: string[];
  extractionNote: string;
}

export interface EditorPersonProposal extends EditorProposalBase {
  kind: 'person';
  data: {
    id: string;
    name: string;
    alternateNames: string[];
    description: string;
    lifeSpan?: TemporalSpan;
    certainty: CertaintyLevel;
  };
}

export interface EditorActivityProposal extends EditorProposalBase {
  kind: 'activity';
  data: {
    id: string;
    personId: string;
    type: PersonActivityType;
    label: string;
    span: TemporalSpan;
    certainty: CertaintyLevel;
    associatedLocationIds: string[];
    associatedEventIds: string[];
  };
}

export interface EditorEventProposal extends EditorProposalBase {
  kind: 'event';
  data: {
    id: string;
    title: string;
    period: TemporalSpan;
    category: string;
    description: string;
    participantIds: string[];
    placeIds: string[];
    biblicalReferences: string[];
    certainty: CertaintyLevel;
    timelineLevel: TimelineDisplayLevel;
  };
}

export interface EditorSourceProposal extends EditorProposalBase {
  kind: 'source';
  data: SourceCatalogEntry;
}

export type EditorProposal =
  | EditorPersonProposal
  | EditorActivityProposal
  | EditorEventProposal
  | EditorSourceProposal;

/**
 * Enveloppe commune aux saisies humaines et aux propositions assistées.
 * Le statut ne peut jamais être "reviewed" : seule la commande de promotion
 * existante peut créer des données relues.
 */
export interface EditorStagingBatch {
  schemaVersion: 1;
  workflowStatus: 'staging';
  humanReviewStatus: 'pending';
  id: string;
  sourceId: string;
  extractionNote: string;
  createdAt: string;
  createdBy: 'local-editor' | 'ai-proposal';
  proposals: EditorProposal[];
}

export interface EditorCatalogs {
  personIds: ReadonlySet<string>;
  placeIds: ReadonlySet<string>;
  eventIds: ReadonlySet<string>;
  sourceIds: ReadonlySet<string>;
}

export interface EditorValidationIssue {
  severity: 'error' | 'warning';
  path: string;
  message: string;
}

export interface EditorValidationResult {
  valid: boolean;
  issues: EditorValidationIssue[];
}

export const createEmptyEditorBatch = (
  sourceId: string,
  createdBy: EditorStagingBatch['createdBy'] = 'local-editor'
): EditorStagingBatch => ({
  schemaVersion: 1,
  workflowStatus: 'staging',
  humanReviewStatus: 'pending',
  id: `editor-${new Date().toISOString().replace(/[:.]/g, '-')}`,
  sourceId,
  extractionNote: '',
  createdAt: new Date().toISOString(),
  createdBy,
  proposals: []
});
