import type {
  BiblicalRoute,
  CertaintyLevel,
  EntityMetadata,
  EventData,
  BiblicalPlace
} from '../../types.ts';
import type { BiblicalPerson } from './types.ts';
import type {
  DerivedHistoricalRelation,
  HistoricalClaim,
  HistoricalEntityType,
  SourceCatalogEntry
} from './contentTypes.ts';

export type MethodologyMethod =
  | 'direct'
  | 'calculated'
  | 'inferred'
  | 'generated-overlap';

export interface MethodologySource {
  id: string;
  label: string;
  url?: string;
  reference?: string;
  verificationStatus?: SourceCatalogEntry['verificationStatus'];
}

export interface EntityMethodology {
  methods: MethodologyMethod[];
  certainty: CertaintyLevel;
  sourceCount: number;
  sources: MethodologySource[];
  lastVerified?: string;
  limitations: string[];
  claimIds: string[];
  relationIds: string[];
  usesLegacyMetadata: boolean;
}

export interface EntityMethodologyCatalog {
  claims: HistoricalClaim[];
  calculatedClaims: HistoricalClaim[];
  relations: DerivedHistoricalRelation[];
  sources: SourceCatalogEntry[];
  sourceIdsByEntity?: Partial<Record<HistoricalEntityType, Record<string, string[]>>>;
}

export type MethodologyEntity =
  | EventData
  | BiblicalPlace
  | BiblicalRoute
  | BiblicalPerson;

const methodOrder: MethodologyMethod[] = [
  'direct',
  'calculated',
  'inferred',
  'generated-overlap'
];

const unique = <T>(values: T[]): T[] => [...new Set(values)];

const relevantRelationLevels = new Set<DerivedHistoricalRelation['relationLevel']>([
  'lifespan-overlap',
  'activity-overlap',
  'same-region',
  'same-place',
  'same-event',
  'prophet-during-reign'
]);

const claimTargetsEntity = (
  claim: HistoricalClaim,
  entityType: HistoricalEntityType,
  entityId: string
): boolean =>
  (claim.subject.entityType === entityType && claim.subject.entityId === entityId) ||
  (claim.object && 'entityType' in claim.object &&
    claim.object.entityType === entityType && claim.object.entityId === entityId) ||
  (entityType === 'place' && claim.placeId === entityId) ||
  (entityType === 'event' && claim.eventId === entityId);

const relationTargetsEntity = (
  relation: DerivedHistoricalRelation,
  entityType: HistoricalEntityType,
  entityId: string
): boolean => {
  if (entityType === 'person') return relation.subjectIds.includes(entityId);
  if (entityType === 'place') return relation.placeIds?.includes(entityId) ?? false;
  if (entityType === 'event') return relation.eventIds?.includes(entityId) ?? false;
  return false;
};

const entityMetadataSources = (entity: EntityMetadata): MethodologySource[] => [
  ...(entity.sources ?? []).map(source => ({
    id: source.id,
    label: source.label,
    url: source.url,
    reference: source.citation
  })),
  ...(entity.geographicProvenance ?? []).map(item => ({
    id: item.sourceId,
    label: item.sourceLabel,
    url: item.sourceUrl,
    reference: `${item.mapReference} \u00b7 provenance g\u00e9ographique`
  }))
];

export const buildEntityMethodology = (
  entityType: HistoricalEntityType,
  entity: MethodologyEntity,
  catalog: EntityMethodologyCatalog
): EntityMethodology => {
  const claims = [...catalog.claims, ...catalog.calculatedClaims]
    .filter(claim => claimTargetsEntity(claim, entityType, entity.id))
    .sort((left, right) => left.id.localeCompare(right.id));
  const relations = catalog.relations
    .filter(relation => relationTargetsEntity(relation, entityType, entity.id))
    .sort((left, right) => left.id.localeCompare(right.id));
  const methods = new Set<MethodologyMethod>();
  claims.forEach(claim =>
    claim.evidence.forEach(evidence => methods.add(evidence.method))
  );
  if (relations.some(relation => relevantRelationLevels.has(relation.relationLevel))) {
    methods.add('generated-overlap');
  }

  const structuredSourceIds = unique([
    ...(catalog.sourceIdsByEntity?.[entityType]?.[entity.id] ?? []),
    ...claims.flatMap(claim => claim.evidence.map(evidence => evidence.sourceId))
  ]);
  const sourcesById = new Map(
    catalog.sources.map(source => [source.id, source])
  );
  const structuredSources = structuredSourceIds.flatMap(sourceId => {
    const source = sourcesById.get(sourceId);
    if (!source) return [];
    const references = claims
      .flatMap(claim => claim.evidence)
      .filter(evidence => evidence.sourceId === sourceId)
      .map(evidence => evidence.shortReference);
    return [{
      id: source.id,
      label: source.chapterOrAppendix ?? source.title,
      url: source.url,
      reference: unique(references).join(' \u00b7 ') || source.pageOrSection,
      verificationStatus: source.verificationStatus
    }];
  });
  const sources = [
    ...structuredSources,
    ...entityMetadataSources(entity)
  ].filter(
    (source, index, values) =>
      values.findIndex(candidate => candidate.id === source.id) === index
  );

  const limitations = unique([
    ...(entity.geographicProvenance ?? []).map(item => item.limitations),
    ...claims.flatMap(claim => {
      const conflict = (claim as HistoricalClaim & {
        conflict?: { explanation: string };
      }).conflict;
      return conflict ? [conflict.explanation] : [];
    }),
    ...(relations.some(relation => relevantRelationLevels.has(relation.relationLevel))
      ? ['Un chevauchement temporel ou g\u00e9ographique ne d\u00e9montre pas, \u00e0 lui seul, une rencontre.']
      : []),
    ...(claims.length === 0
      ? ['Cette fiche appartient encore au mod\u00e8le historique ant\u00e9rieur : sa m\u00e9thode n\u2019est pas encore enti\u00e8rement normalis\u00e9e en affirmations tra\u00e7ables.']
      : [])
  ]);
  const accessedDates = catalog.sources
    .filter(source => structuredSourceIds.includes(source.id))
    .map(source => source.accessedAt)
    .filter((value): value is string => Boolean(value));

  return {
    methods: methodOrder.filter(method => methods.has(method)),
    certainty: entity.certainty ?? 'unknown',
    sourceCount: sources.length,
    sources,
    lastVerified: entity.lastVerified ?? accessedDates.sort().at(-1),
    limitations,
    claimIds: claims.map(claim => claim.id),
    relationIds: relations.map(relation => relation.id),
    usesLegacyMetadata: claims.length === 0
  };
};