import type { AtlasEntityKey } from '../../src/atlasIntegration.ts';

/**
 * Personal, source-linked knowledge. These are NEVER promoted to reviewed
 * historical claims merely because a user saved them.
 */
export type StudyFactKind =
  | 'mention' | 'participation' | 'presence' | 'interaction' | 'relationship';
export type StudyFactAssessment = 'sourced' | 'hypothesis';

export interface StudyFact {
  id: string;
  personId: string;
  kind: StudyFactKind;
  /** Only used by interactions or relationships; never guessed from names. */
  targetPersonId?: string;
  /** Only used by presences; an unresolved place may be a literal name. */
  placeId?: string;
  placeLabel?: string;
  reference: string;
  note?: string;
  assessment: StudyFactAssessment;
}

const validId = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-zA-Z0-9_-]{1,300}$/.test(value);
const normalize = (value: string): string =>
  value.replace(/[\r\n\x00-\x1f]+/g, ' ').trim();
const kinds: ReadonlySet<string> = new Set([
  'mention', 'participation', 'presence', 'interaction', 'relationship'
]);
const assessments: ReadonlySet<string> = new Set(['sourced', 'hypothesis']);

/**
 * Known-ID checks are optional for indexing old notes; required by the editor.
 * Never reinterpret an old bare person/place association as a physical presence.
 */
export function validateStudyFacts(
  raw: unknown,
  knownPeople?: ReadonlySet<string>,
  knownPlaces?: ReadonlySet<string>
): StudyFact[] {
  if (!Array.isArray(raw) || raw.length > 200) throw new Error('La fiche contient trop de faits ou un format incorrect.');
  const ids = new Set<string>();
  return raw.map((value, index) => {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error('Fait d’étude invalide à la ligne ' + (index + 1));
    const data = value as Record<string, unknown>;
    if (!validId(data.id) || ids.has(data.id)) throw new Error('Identifiant de fait absent ou en double.');
    ids.add(data.id);
    if (!validId(data.personId) || (knownPeople && !knownPeople.has(data.personId)))
      throw new Error('Personnage non reconnu : sélectionne une fiche existante.');
    if (typeof data.kind !== 'string' || !kinds.has(data.kind))
      throw new Error('Type de fait non reconnu.');
    if (typeof data.assessment !== 'string' || !assessments.has(data.assessment))
      throw new Error('Niveau de vérification personnel non reconnu.');
    if (typeof data.reference !== 'string' || !normalize(data.reference) || data.reference.length > 280)
      throw new Error('Chaque fait nécessite une référence de 280 caractères maximum.');
    if (data.note !== undefined && (typeof data.note !== 'string' || data.note.length > 1200))
      throw new Error('Une remarque ne peut pas dépasser 1 200 caractères.');

    const relation = data.kind === 'interaction' || data.kind === 'relationship';
    const presence = data.kind === 'presence';
    if (relation) {
      if (!validId(data.targetPersonId) || data.targetPersonId === data.personId ||
          (knownPeople && !knownPeople.has(data.targetPersonId)))
        throw new Error('Choisis un second personnage distinct pour cette relation.');
    } else if (data.targetPersonId !== undefined) {
      throw new Error('Un personnage cible est réservé aux relations entre personnes.');
    }

    if (presence) {
      const hasPlaceId = data.placeId !== undefined;
      const hasPlaceLabel = data.placeLabel !== undefined;
      if (hasPlaceId === hasPlaceLabel)
        throw new Error('Indique un lieu de l’Atlas ou un nom de lieu non identifié.');
      if (hasPlaceId && (!validId(data.placeId) || (knownPlaces && !knownPlaces.has(data.placeId))))
        throw new Error('Le lieu choisi est inconnu dans l’Atlas.');
      if (hasPlaceLabel && (typeof data.placeLabel !== 'string' ||
          !normalize(data.placeLabel) || data.placeLabel.length > 160))
        throw new Error('Nom de lieu invalide.');
    } else if (data.placeId !== undefined || data.placeLabel !== undefined) {
      throw new Error('Un lieu individuel est réservé aux faits de présence.');
    }

    return {
      id: data.id as string,
      personId: data.personId as string,
      kind: data.kind as StudyFactKind,
      ...(relation ? { targetPersonId: data.targetPersonId as string } : {}),
      ...(presence && data.placeId ? { placeId: data.placeId as string } : {}),
      ...(presence && data.placeLabel ? { placeLabel: normalize(data.placeLabel as string) } : {}),
      reference: normalize(data.reference),
      ...(typeof data.note === 'string' && normalize(data.note) ? { note: normalize(data.note) } : {}),
      assessment: data.assessment as StudyFactAssessment
    };
  });
}

export const studyFactLabels: Record<StudyFactKind, string> = {
  mention: 'Mention dans le récit',
  participation: 'Participation à l’épisode',
  presence: 'Présence dans un lieu',
  interaction: 'Interaction entre personnages',
  relationship: 'Relation entre personnages'
};

export function studyFactEntityKeys(
  eventId: string,
  facts: readonly StudyFact[]
): AtlasEntityKey[] {
  if (!validId(eventId)) throw new Error('Identifiant d’épisode invalide.');
  return [...new Set([
    `event:${eventId}`,
    ...facts.map(fact => `person:${fact.personId}`),
    ...facts.flatMap(fact => fact.targetPersonId ? [`person:${fact.targetPersonId}`] : []),
    ...facts.flatMap(fact => fact.placeId ? [`place:${fact.placeId}`] : [])
  ])] as AtlasEntityKey[];
}
