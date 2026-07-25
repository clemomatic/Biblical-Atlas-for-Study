import historicalIndexJson from '../../content/generated/historical-index.json';
import relationsJson from '../../content/generated/relations.json';
import sourceCatalogJson from '../../content/sources/source-catalog.json';
import type {
  DerivedHistoricalRelation,
  HistoricalClaim,
  ReviewedEventRecord,
  ReviewedPersonRecord,
  ReviewedPlaceRecord,
  SourceCatalogEntry
} from '../domain/history/contentTypes';
import type { HistoricalIndexBundle } from '../domain/history/historicalIndex';
import {
  createHistoricalSnapshotCatalog,
  mergeReviewedPeople
} from '../domain/history/historicalSnapshot';
import { BIBLICAL_PEOPLE } from './biblicalPeople';
import { BIBLICAL_PLACES } from './mapData';

const flattenJsonModules = <T>(
  modules: Record<string, unknown>
): T[] =>
  Object.entries(modules)
    .sort(([left], [right]) => left.localeCompare(right))
    .flatMap(([, value]) => (Array.isArray(value) ? (value as T[]) : []));

const reviewedPeople = flattenJsonModules<ReviewedPersonRecord>(
  import.meta.glob('../../content/reviewed/people/**/*.json', {
    eager: true,
    import: 'default'
  })
);
const reviewedEvents = flattenJsonModules<ReviewedEventRecord>(
  import.meta.glob('../../content/reviewed/events/**/*.json', {
    eager: true,
    import: 'default'
  })
);
const reviewedPlaces = flattenJsonModules<ReviewedPlaceRecord>(
  import.meta.glob('../../content/reviewed/places/**/*.json', {
    eager: true,
    import: 'default'
  })
);
const reviewedClaims = flattenJsonModules<HistoricalClaim>(
  import.meta.glob('../../content/reviewed/claims/**/*.json', {
    eager: true,
    import: 'default'
  })
);

export const HISTORICAL_SOURCE_CATALOG =
  sourceCatalogJson as unknown as SourceCatalogEntry[];
export const REVIEWED_HISTORICAL_PEOPLE = reviewedPeople;
export const REVIEWED_HISTORICAL_EVENTS = reviewedEvents;
export const REVIEWED_HISTORICAL_PLACES = reviewedPlaces;
export const REVIEWED_HISTORICAL_CLAIMS = reviewedClaims;
export const DERIVED_HISTORICAL_RELATIONS =
  relationsJson as unknown as DerivedHistoricalRelation[];
export const HISTORICAL_INDEX =
  historicalIndexJson as unknown as HistoricalIndexBundle;

export const HISTORICAL_PEOPLE = mergeReviewedPeople(
  BIBLICAL_PEOPLE,
  REVIEWED_HISTORICAL_PEOPLE,
  HISTORICAL_SOURCE_CATALOG
);

export const HISTORICAL_SNAPSHOT_CATALOG =
  createHistoricalSnapshotCatalog(
    {
      sources: HISTORICAL_SOURCE_CATALOG,
      people: REVIEWED_HISTORICAL_PEOPLE,
      events: REVIEWED_HISTORICAL_EVENTS,
      places: REVIEWED_HISTORICAL_PLACES,
      claims: REVIEWED_HISTORICAL_CLAIMS
    },
    HISTORICAL_INDEX,
    DERIVED_HISTORICAL_RELATIONS,
    { placeNames: BIBLICAL_PLACES }
  );
