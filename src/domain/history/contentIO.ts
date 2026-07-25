import {
  readdir,
  readFile
} from 'node:fs/promises';
import { join } from 'node:path';
import type {
  HistoricalClaim,
  HistoricalDataset,
  PresenceEpisode,
  ReviewedEventRecord,
  ReviewedPersonRecord,
  ReviewedPlaceRecord,
  ReviewedRouteRecord,
  SourceCatalogEntry,
  StagingHistoricalRecord
} from './contentTypes.ts';

const readJsonArray = async <T>(filePath: string): Promise<T[]> => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    throw new Error(
      `Impossible de lire ${filePath} : ${error instanceof Error ? error.message : String(error)}`
    );
  }
  if (!Array.isArray(parsed)) {
    throw new TypeError(`${filePath} doit contenir un tableau JSON.`);
  }
  return parsed as T[];
};

const readJsonDirectory = async <T>(directory: string): Promise<T[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const values: T[] = [];
  for (const entry of entries.sort((left, right) =>
    left.name.localeCompare(right.name)
  )) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      values.push(...(await readJsonDirectory<T>(entryPath)));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      values.push(...(await readJsonArray<T>(entryPath)));
    }
  }
  return values;
};

const readOptionalJsonDirectory = async <T>(
  directory: string
): Promise<T[]> => {
  try {
    return await readJsonDirectory<T>(directory);
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return [];
    }
    throw error;
  }
};

export async function loadHistoricalDataset(
  contentRoot: string
): Promise<HistoricalDataset> {
  return {
    sources: await readJsonArray<SourceCatalogEntry>(
      join(contentRoot, 'sources', 'source-catalog.json')
    ),
    staging: await readJsonDirectory<StagingHistoricalRecord>(
      join(contentRoot, 'staging')
    ),
    people: await readJsonDirectory<ReviewedPersonRecord>(
      join(contentRoot, 'reviewed', 'people')
    ),
    events: await readJsonDirectory<ReviewedEventRecord>(
      join(contentRoot, 'reviewed', 'events')
    ),
    places: await readJsonDirectory<ReviewedPlaceRecord>(
      join(contentRoot, 'reviewed', 'places')
    ),
    routes: await readOptionalJsonDirectory<ReviewedRouteRecord>(
      join(contentRoot, 'reviewed', 'routes')
    ),
    claims: await readJsonDirectory<HistoricalClaim>(
      join(contentRoot, 'reviewed', 'claims')
    ),
    presences: await readJsonDirectory<PresenceEpisode>(
      join(contentRoot, 'reviewed', 'presences')
    )
  };
}
