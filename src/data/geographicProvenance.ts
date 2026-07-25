import sourceCatalogJson from '../../content/sources/source-catalog.json';
import type {
  ReviewedGeographicLink,
  SourceCatalogEntry
} from '../domain/history/contentTypes';
import type {
  GeographicProvenance,
  GeographicProvenanceMethod
} from '../types';

const flattenJsonModules = <T>(
  modules: Record<string, unknown>
): T[] =>
  Object.entries(modules)
    .sort(([left], [right]) => left.localeCompare(right))
    .flatMap(([, value]) => (Array.isArray(value) ? (value as T[]) : []));

const links = flattenJsonModules<ReviewedGeographicLink>(
  import.meta.glob('../../content/reviewed/geography/**/*.json', {
    eager: true,
    import: 'default'
  })
);
const sources =
  sourceCatalogJson as unknown as SourceCatalogEntry[];
const sourcesById = new Map(sources.map(source => [source.id, source]));

const toProvenance = (
  link: ReviewedGeographicLink
): GeographicProvenance => {
  const source = sourcesById.get(link.primarySourceId);
  if (!source) {
    throw new Error(
      `Source géographique introuvable : ${link.primarySourceId}.`
    );
  }
  return {
    id: link.id,
    sourceId: link.primarySourceId,
    sourceLabel: source.chapterOrAppendix
      ? `${source.chapterOrAppendix} · ${source.title}`
      : source.title,
    sourceUrl: source.url,
    mapId: link.mapId,
    mapReference: link.mapReference,
    method: link.method as GeographicProvenanceMethod,
    certainty: link.certainty,
    sourceMapCertainty: link.sourceMapCertainty,
    limitations: link.limitations,
    coordinatesChanged: link.coordinatesChanged
  };
};

const provenanceByEntity = new Map<string, GeographicProvenance[]>();
links.forEach(link => {
  const key = `${link.subject.entityType}:${link.subject.entityId}`;
  provenanceByEntity.set(key, [
    ...(provenanceByEntity.get(key) ?? []),
    toProvenance(link)
  ]);
});

export const getGeographicProvenance = (
  entityType: 'place' | 'event' | 'route',
  entityId: string
): GeographicProvenance[] =>
  provenanceByEntity.get(`${entityType}:${entityId}`) ?? [];

export const REVIEWED_GEOGRAPHIC_LINKS = links;
