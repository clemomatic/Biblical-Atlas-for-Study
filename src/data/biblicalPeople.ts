import { legacyPersonEventToBiblicalPerson } from '../adapters/legacyPeopleAdapter';
import type { BiblicalPerson } from '../domain/history/types';
import { EVENTS } from './timelineEvents';

/**
 * Premier échantillon représentatif de la migration.
 *
 * Les IDs restent ceux des EventData actuels. Les objets sont construits par
 * l’adaptateur pour garantir qu’aucune date, relation ou référence n’est
 * réinterprétée dans ce premier lot.
 */
export const MIGRATED_PERSON_IDS = [
  'event-adam-2peny4',
  'event-abraham-mdcznq',
  'event-david-iixp36',
  'event-jesus-en-tant-qu-humain-1f4ceyz',
  'event-jean-le-baptiseur-dvgl2c'
] as const;

const requireLegacyPerson = (id: string) => {
  const event = EVENTS.find(candidate => candidate.id === id);
  if (!event) {
    throw new Error(`Personnage historique introuvable : ${id}.`);
  }
  return event;
};

export const BIBLICAL_PEOPLE: BiblicalPerson[] = MIGRATED_PERSON_IDS.map(id =>
  legacyPersonEventToBiblicalPerson(requireLegacyPerson(id))
);
