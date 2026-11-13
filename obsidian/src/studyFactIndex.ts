import type { StudyFact } from './studyFacts.ts';
import { validateStudyFacts } from './studyFacts.ts';

export interface IndexedStudyEpisode {
  id: string;
  title: string;
  path: string;
  facts: StudyFact[];
  /** V1 links are merely associations, never asserted historical presences. */
  legacyLinks: Array<{ personId: string; placeId?: string; reference: string }>;
  linkedPersonIds: string[];
  linkedPlaceIds: string[];
}
export interface StudyEpisodeSummary {
  id: string;
  title: string;
  path: string;
  factCount: number;
  legacyCount: number;
}
export interface StudyFactIndexSnapshot {
  byPerson: Record<string, StudyEpisodeSummary[]>;
  byPlace: Record<string, StudyEpisodeSummary[]>;
  byEvent: Record<string, StudyEpisodeSummary[]>;
}
const validId = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-zA-Z0-9_-]{1,300}$/.test(value);

/** Incrementally updated reverse index: no Vault-wide scan on person opening. */
export class StudyFactIndex {
  private records = new Map<string, IndexedStudyEpisode>();
  private byPerson = new Map<string, Map<string, StudyEpisodeSummary>>();
  private byPlace = new Map<string, Map<string, StudyEpisodeSummary>>();
  private byEvent = new Map<string, Map<string, StudyEpisodeSummary>>();

  hasPath(path: string): boolean { return this.records.has(path); }
  paths(): string[] { return [...this.records.keys()]; }

  remove(path: string): boolean {
    const previous = this.records.get(path);
    if (!previous) return false;
    this.records.delete(path);
    for (const reverse of [this.byPerson, this.byPlace, this.byEvent]) {
      for (const [entityId, episodes] of reverse) {
        episodes.delete(path);
        if (!episodes.size) reverse.delete(entityId);
      }
    }
    return true;
  }

  /** Read the already-parsed frontmatter, never guess an identity from prose. */
  update(path: string, raw: unknown): boolean {
    const meta = raw && typeof raw === 'object' && !Array.isArray(raw)
      ? raw as Record<string, unknown> : null;
    if (!meta || meta.jwsd_kind !== 'episode-connections' ||
      !validId(meta.jwsd_episode_id)) return this.remove(path);

    const id = meta.jwsd_episode_id;
    const title = typeof meta.jwsd_episode_title === 'string' && meta.jwsd_episode_title.trim()
      ? meta.jwsd_episode_title.trim() : id;
    const facts = validateStudyFacts(meta.jwsd_episode_facts ?? []);
    const legacyLinks: IndexedStudyEpisode['legacyLinks'] = [];
    const legacyRaw = meta.jwsd_episode_connections;
    if (Array.isArray(legacyRaw)) for (const item of legacyRaw) {
      if (!item || typeof item !== 'object') continue;
      const link = item as Record<string, unknown>;
      if (!validId(link.personId) || typeof link.reference !== 'string') continue;
      legacyLinks.push({
        personId: link.personId,
        ...(validId(link.placeId) ? { placeId: link.placeId } : {}),
        reference: link.reference
      });
    }
    const people = new Set([
      ...legacyLinks.map(item => item.personId),
      ...facts.map(fact => fact.personId),
      ...facts.flatMap(fact => fact.targetPersonId ? [fact.targetPersonId] : []),
      ...(Array.isArray(meta.atlas_entities) ? meta.atlas_entities : [])
        .filter((value): value is string => typeof value === 'string' && value.startsWith('person:'))
        .map(value => value.slice('person:'.length))
    ]);
    const places = new Set([
      ...legacyLinks.flatMap(item => item.placeId ? [item.placeId] : []),
      ...facts.flatMap(fact => fact.placeId ? [fact.placeId] : []),
      ...(Array.isArray(meta.atlas_entities) ? meta.atlas_entities : [])
        .filter((value): value is string => typeof value === 'string' && value.startsWith('place:'))
        .map(value => value.slice('place:'.length))
    ]);
    const next: IndexedStudyEpisode = {
      id, title, path, facts, legacyLinks,
      linkedPersonIds: [...people].sort(), linkedPlaceIds: [...places].sort()
    };
    const previous = this.records.get(path);
    if (previous && JSON.stringify(previous) === JSON.stringify(next)) return false;
    this.remove(path);
    this.records.set(path, next);
    const summary: StudyEpisodeSummary = {
      id, title, path, factCount: facts.length, legacyCount: legacyLinks.length
    };
    for (const [reverse, keys] of [
      [this.byPerson, people], [this.byPlace, places],
      [this.byEvent, new Set([id])]
    ] as const) {
      for (const key of keys) {
        const matches = reverse.get(key) ?? new Map<string, StudyEpisodeSummary>();
        matches.set(path, summary);
        reverse.set(key, matches);
      }
    }
    return true;
  }

  rename(oldPath: string, newPath: string): boolean {
    const previous = this.records.get(oldPath);
    if (!previous) return false;
    this.remove(oldPath);
    return this.update(newPath, {
      jwsd_kind: 'episode-connections', jwsd_episode_id: previous.id,
      jwsd_episode_title: previous.title,
      jwsd_episode_facts: previous.facts,
      jwsd_episode_connections: previous.legacyLinks,
      atlas_entities: [
        ...previous.linkedPersonIds.map(id => 'person:' + id),
        ...previous.linkedPlaceIds.map(id => 'place:' + id)
      ]
    });
  }

  forPerson(personId: string): StudyEpisodeSummary[] {
    return [...(this.byPerson.get(personId)?.values() ?? [])]
      .sort((a,b) => a.title.localeCompare(b.title, 'fr') || a.path.localeCompare(b.path));
  }

  forPlace(placeId: string): StudyEpisodeSummary[] {
    return [...(this.byPlace.get(placeId)?.values() ?? [])]
      .sort((a,b) => a.title.localeCompare(b.title, 'fr') || a.path.localeCompare(b.path));
  }
  forEvent(eventId: string): StudyEpisodeSummary[] {
    return [...(this.byEvent.get(eventId)?.values() ?? [])]
      .sort((a,b) => a.title.localeCompare(b.title, 'fr') || a.path.localeCompare(b.path));
  }

  snapshot(): StudyFactIndexSnapshot {
    return {
      byPerson: Object.fromEntries([...this.byPerson.keys()].sort().map(id => [id, this.forPerson(id)])),
      byPlace: Object.fromEntries([...this.byPlace.keys()].sort().map(id => [id, this.forPlace(id)])),
      byEvent: Object.fromEntries([...this.byEvent.keys()].sort().map(id => [id, this.forEvent(id)]))
    };
  }
}
