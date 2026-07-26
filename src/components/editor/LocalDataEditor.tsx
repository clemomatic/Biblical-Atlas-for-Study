import { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileJson2,
  Save,
  Upload,
  XCircle
} from 'lucide-react';
import type {
  BiblicalPlace,
  CertaintyLevel,
  EventData,
  TimelineDisplayLevel
} from '../../types.ts';
import type {
  SourceCatalogEntry
} from '../../domain/history/contentTypes.ts';
import type {
  BiblicalPerson,
  PersonActivityType,
  TemporalPrecision,
  TemporalSpan
} from '../../domain/history/types.ts';
import {
  calculateAgeAtPeriod,
  calculateElapsedActivity,
  eventDataToTemporalSpan
} from '../../domain/history/eventChronology.ts';
import {
  getTemporalInterval,
  historicalYearToTimelineIndex
} from '../../domain/history/temporal.ts';
import {
  createEmptyEditorBatch,
  type EditorActivityProposal,
  type EditorEventProposal,
  type EditorPersonProposal,
  type EditorProposal,
  type EditorSourceProposal,
  type EditorStagingBatch
} from '../../domain/history/editorTypes.ts';
import { validateEditorBatch } from '../../domain/history/editorValidation.ts';
import { ACTIVITY_VISUALS } from '../../domain/history/activityVisuals.ts';
import { BiographicalRibbon } from '../BiographicalRibbon.tsx';

type EditorTab = 'person' | 'activity' | 'event' | 'source' | 'proposals';

interface LocalDataEditorProps {
  people: readonly BiblicalPerson[];
  events: readonly EventData[];
  places: readonly BiblicalPlace[];
  sources: readonly SourceCatalogEntry[];
}

interface TemporalDraft {
  startMin: string;
  startMax: string;
  endMin: string;
  endMax: string;
  precision: TemporalPrecision;
  approximate: boolean;
  certainty: CertaintyLevel;
  displayLabel: string;
}

const EMPTY_TEMPORAL: TemporalDraft = {
  startMin: '',
  startMax: '',
  endMin: '',
  endMax: '',
  precision: 'year',
  approximate: false,
  certainty: 'certain',
  displayLabel: ''
};

const toNumber = (value: string): number | undefined => {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const toTemporalSpan = (draft: TemporalDraft): TemporalSpan => {
  const startMin = toNumber(draft.startMin);
  const startMax = toNumber(draft.startMax) ?? startMin;
  const endMin = toNumber(draft.endMin);
  const endMax = toNumber(draft.endMax) ?? endMin;
  const boundary = (yearMin: number | undefined, yearMax: number | undefined) =>
    yearMin === undefined && yearMax === undefined
      ? undefined
      : {
          yearMin,
          yearMax,
          precision:
            yearMin !== yearMax && draft.precision === 'year'
              ? ('range' as const)
              : draft.precision,
          approximate: draft.approximate,
          certainty: draft.certainty
        };
  return {
    start: boundary(startMin, startMax),
    end: boundary(endMin, endMax),
    displayLabel: draft.displayLabel
  };
};

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);

const splitValues = (value: string) =>
  value
    .split(/[,;\n]/)
    .map(item => item.trim())
    .filter(Boolean);

const fromTemporalSpan = (span: TemporalSpan | undefined): TemporalDraft => ({
  startMin: span?.start?.yearMin?.toString() ?? '',
  startMax: span?.start?.yearMax?.toString() ?? '',
  endMin: span?.end?.yearMin?.toString() ?? '',
  endMax: span?.end?.yearMax?.toString() ?? '',
  precision: span?.start?.precision ?? span?.end?.precision ?? 'year',
  approximate: Boolean(
    span?.start?.approximate || span?.end?.approximate
  ),
  certainty:
    span?.start?.certainty ??
    span?.end?.certainty ??
    'certain',
  displayLabel: span?.displayLabel ?? ''
});

const safeTemporalInterval = (span: TemporalSpan) => {
  try {
    return getTemporalInterval(span);
  } catch {
    return { unknown: true as const };
  }
};

const safeAge = (
  lifeSpan: TemporalSpan | undefined,
  period: TemporalSpan
) => {
  try {
    return calculateAgeAtPeriod(lifeSpan, period);
  } catch {
    return {
      precision: 'unknown' as const,
      label: 'Âge impossible à déterminer',
      explanation: 'La période saisie doit être corrigée avant le calcul.'
    };
  }
};

const safeDuration = (
  activity: Parameters<typeof calculateElapsedActivity>[0],
  period: TemporalSpan
) => {
  try {
    return calculateElapsedActivity(activity, period);
  } catch {
    return undefined;
  }
};

const inputClass =
  'min-h-11 w-full rounded-[var(--radius-sm)] border border-[var(--color-stone)] bg-[var(--color-paper)] px-3 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-soft)]';

function TemporalFields({
  value,
  onChange,
  title
}: {
  value: TemporalDraft;
  onChange: (value: TemporalDraft) => void;
  title: string;
}) {
  const set = <K extends keyof TemporalDraft>(
    key: K,
    next: TemporalDraft[K]
  ) => onChange({ ...value, [key]: next });
  return (
    <fieldset className="rounded-[var(--radius-md)] bg-[var(--color-paper-muted)] p-4">
      <legend className="px-1 text-sm font-bold">{title}</legend>
      <p className="mb-3 text-xs text-[var(--color-ink-muted)]">
        Convention : -1 = 1 av. n. è., 1 = 1 de n. è. ; l’année 0 est refusée.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          ['startMin', 'Début, première année possible'],
          ['startMax', 'Début, dernière année possible'],
          ['endMin', 'Fin, première année possible'],
          ['endMax', 'Fin, dernière année possible']
        ].map(([key, label]) => (
          <label key={key} className="text-xs font-semibold">
            {label}
            <input
              type="number"
              value={value[key as keyof TemporalDraft] as string}
              onChange={event =>
                set(key as keyof TemporalDraft, event.target.value as never)
              }
              className={`${inputClass} mt-1 tabular-nums`}
            />
          </label>
        ))}
        <label className="text-xs font-semibold">
          Précision
          <select
            value={value.precision}
            onChange={event =>
              set('precision', event.target.value as TemporalPrecision)
            }
            className={`${inputClass} mt-1`}
          >
            {['day', 'month', 'season', 'year', 'range', 'before', 'after', 'unknown'].map(
              precision => <option key={precision}>{precision}</option>
            )}
          </select>
        </label>
        <label className="text-xs font-semibold">
          Certitude
          <select
            value={value.certainty}
            onChange={event =>
              set('certainty', event.target.value as CertaintyLevel)
            }
            className={`${inputClass} mt-1`}
          >
            <option value="certain">Certain</option>
            <option value="probable">Probable</option>
            <option value="possible">Possible</option>
            <option value="unknown">Inconnu</option>
          </select>
        </label>
      </div>
      <label className="mt-3 block text-xs font-semibold">
        Libellé éditorial
        <input
          value={value.displayLabel}
          onChange={event => set('displayLabel', event.target.value)}
          className={`${inputClass} mt-1`}
          placeholder="Vers 659 av. n. è."
        />
      </label>
      <label className="mt-3 flex min-h-11 items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={value.approximate}
          onChange={event => set('approximate', event.target.checked)}
        />
        Borne approximative
      </label>
    </fieldset>
  );
}

function EntityField({
  label,
  value,
  onChange,
  options,
  required = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly { id: string; name: string }[];
  required?: boolean;
}) {
  const listId = `editor-${slugify(label)}`;
  const byLabel = useMemo(
    () => new Map(options.map(option => [`${option.name} — ${option.id}`, option.id])),
    [options]
  );
  const selected = options.find(option => option.id === value);
  return (
    <label className="block text-xs font-semibold">
      {label}
      <input
        list={listId}
        required={required}
        value={selected ? `${selected.name} — ${selected.id}` : value}
        onChange={event =>
          onChange(byLabel.get(event.target.value) ?? event.target.value)
        }
        className={`${inputClass} mt-1`}
        placeholder="Rechercher par nom…"
      />
      <datalist id={listId}>
        {options.map(option => (
          <option key={option.id} value={`${option.name} — ${option.id}`} />
        ))}
      </datalist>
    </label>
  );
}

const proposalId = (kind: EditorProposal['kind'], entityId: string) =>
  `proposal-${kind}-${entityId || crypto.randomUUID()}`;

function MultiEntityField({
  label,
  values,
  onChange,
  options
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  options: readonly { id: string; name: string }[];
}) {
  return (
    <label className="block text-xs font-semibold">
      {label}
      <select
        multiple
        value={values}
        onChange={event =>
          onChange(
            Array.from<HTMLOptionElement>(
              event.currentTarget.selectedOptions
            ).map(option => option.value)
          )
        }
        className={`${inputClass} mt-1 min-h-28 py-2`}
        aria-describedby={`${slugify(label)}-hint`}
      >
        {options.map(option => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
      <span
        id={`${slugify(label)}-hint`}
        className="mt-1 block font-normal text-[var(--color-ink-muted)]"
      >
        Ctrl/Cmd + clic pour sélectionner plusieurs éléments.
      </span>
    </label>
  );
}

export default function LocalDataEditor({
  people,
  events,
  places,
  sources
}: LocalDataEditorProps) {
  const [tab, setTab] = useState<EditorTab>('person');
  const [sourceId, setSourceId] = useState(sources[0]?.id ?? '');
  const [extractionNote, setExtractionNote] = useState('');
  const [claimIds, setClaimIds] = useState('');
  const [batch, setBatch] = useState(() => createEmptyEditorBatch(sources[0]?.id ?? ''));
  const [validationMessage, setValidationMessage] = useState('');
  const [issues, setIssues] = useState<ReturnType<typeof validateEditorBatch>['issues']>([]);
  const [personName, setPersonName] = useState('');
  const [editingPersonId, setEditingPersonId] = useState('');
  const [editingActivityId, setEditingActivityId] = useState('');
  const [editingEventId, setEditingEventId] = useState('');
  const [editingSourceId, setEditingSourceId] = useState('');
  const [alternateNames, setAlternateNames] = useState('');
  const [description, setDescription] = useState('');
  const [personPeriod, setPersonPeriod] = useState(EMPTY_TEMPORAL);
  const [activityPersonId, setActivityPersonId] = useState('');
  const [activityType, setActivityType] = useState<PersonActivityType>('reign');
  const [activityLabel, setActivityLabel] = useState('');
  const [activityPeriod, setActivityPeriod] = useState(EMPTY_TEMPORAL);
  const [activityPlaces, setActivityPlaces] = useState<string[]>([]);
  const [activityEvents, setActivityEvents] = useState<string[]>([]);
  const [eventTitle, setEventTitle] = useState('');
  const [eventCategory, setEventCategory] = useState('Événement biblique');
  const [eventDescription, setEventDescription] = useState('');
  const [eventPeriod, setEventPeriod] = useState(EMPTY_TEMPORAL);
  const [eventParticipants, setEventParticipants] = useState<string[]>([]);
  const [eventPlaces, setEventPlaces] = useState<string[]>([]);
  const [biblicalReferences, setBiblicalReferences] = useState('');
  const [timelineLevel, setTimelineLevel] = useState<TimelineDisplayLevel>('study');
  const [sourceTitle, setSourceTitle] = useState('');
  const [sourcePublication, setSourcePublication] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const importRef = useRef<HTMLInputElement>(null);

  const catalogs = useMemo(
    () => ({
      personIds: new Set(people.map(person => person.id)),
      placeIds: new Set(places.map(place => place.id)),
      eventIds: new Set(events.map(event => event.id)),
      sourceIds: new Set(sources.map(source => source.id))
    }),
    [events, people, places, sources]
  );

  const currentSource = sources.find(source => source.id === sourceId);
  const sourceIds = currentSource ? [currentSource.id] : [];
  const operation =
    (tab === 'person' && editingPersonId) ||
    (tab === 'activity' && editingActivityId) ||
    (tab === 'event' && editingEventId) ||
    (tab === 'source' && editingSourceId)
      ? ('update' as const)
      : ('create' as const);
  const common = {
    operation,
    sourceIds,
    claimIds: splitValues(claimIds),
    extractionNote
  };

  const personPreview = useMemo(() => {
    const lifeSpan = toTemporalSpan(personPeriod);
    const interval = safeTemporalInterval(lifeSpan);
    if (
      interval.unknown ||
      interval.yearMin === undefined ||
      interval.yearMax === undefined
    ) return null;
    const personId = `person-${slugify(personName || 'apercu')}`;
    const activities =
      activityPersonId === personId || (!activityPersonId && personName)
        ? [{
            id: `activity-${slugify(activityLabel || activityType)}`,
            type: activityType,
            label: activityLabel || ACTIVITY_VISUALS[activityType].label,
            span: toTemporalSpan(activityPeriod),
            certainty: activityPeriod.certainty
          }]
        : [];
    const previewEvent: EventData = {
      id: personId,
      text: personName || 'Aperçu de la personne',
      categoryId: 'characters',
      category: 'Personnages',
      startRaw: '',
      endRaw: '',
      startYear: interval.yearMin,
      endYear: interval.yearMax,
      startPos: historicalYearToTimelineIndex(interval.yearMin),
      endPos: historicalYearToTimelineIndex(interval.yearMax),
      isPoint: false,
      fuzzyStart: Boolean(lifeSpan.start?.approximate),
      fuzzyEnd: Boolean(lifeSpan.end?.approximate),
      historicalPersonId: personId,
      historicalPersonSpanKind: 'lifespan',
      historicalActivityPeriods: activities
    };
    return previewEvent;
  }, [
    activityLabel,
    activityPeriod,
    activityPersonId,
    activityType,
    personName,
    personPeriod
  ]);

  const activityPreview = useMemo(() => {
    const person = people.find(candidate => candidate.id === activityPersonId);
    if (!person || !activityLabel) return null;
    const activity: EditorActivityProposal['data'] = {
      id: `activity-${person.id}-${slugify(activityLabel)}`,
      personId: person.id,
      type: activityType,
      label: activityLabel,
      span: toTemporalSpan(activityPeriod),
      certainty: activityPeriod.certainty,
      associatedLocationIds: activityPlaces,
      associatedEventIds: activityEvents
    };
    const startAge = safeAge(person.lifeSpan, {
      start: activity.span.start,
      displayLabel: ''
    });
    const endAge = activity.span.end
      ? safeAge(person.lifeSpan, {
          start: activity.span.end,
          displayLabel: ''
        })
      : undefined;
    const duration = safeDuration(
      { ...activity, associatedLocationIds: activity.associatedLocationIds },
      { start: activity.span.end ?? activity.span.start, displayLabel: '' }
    );
    return { person, startAge, endAge, duration };
  }, [activityEvents, activityLabel, activityPeriod, activityPersonId, activityPlaces, activityType, people]);

  const affectedEvents = useMemo(() => {
    const personId = activityPersonId;
    if (!personId) return [];
    const person = people.find(candidate => candidate.id === personId);
    if (!person) return [];
    return events
      .filter(event => event.associatedCharacterIds?.includes(personId))
      .slice(0, 8)
      .map(event => ({
        event,
        age: calculateAgeAtPeriod(person.lifeSpan, eventDataToTemporalSpan(event))
      }));
  }, [activityPersonId, events, people]);

  const addProposal = (proposal: EditorProposal) => {
    setBatch(previous => ({
      ...previous,
      sourceId,
      extractionNote,
      proposals: [...previous.proposals, proposal]
    }));
    setTab('proposals');
    setValidationMessage('Proposition ajoutée au lot local ; elle reste non relue.');
  };

  const buildCurrentProposal = (): EditorProposal | null => {
    if (tab === 'person') {
      const id = editingPersonId || `person-${slugify(personName)}`;
      return {
        ...common,
        id: proposalId('person', id),
        kind: 'person',
        data: {
          id,
          name: personName,
          alternateNames: splitValues(alternateNames),
          description,
          lifeSpan: toTemporalSpan(personPeriod),
          certainty: personPeriod.certainty
        }
      } satisfies EditorPersonProposal;
    }
    if (tab === 'activity') {
      const id =
        editingActivityId || `activity-${activityPersonId}-${slugify(activityLabel || activityType)}`;
      return {
        ...common,
        id: proposalId('activity', id),
        kind: 'activity',
        data: {
          id,
          personId: activityPersonId,
          type: activityType,
          label: activityLabel,
          span: toTemporalSpan(activityPeriod),
          certainty: activityPeriod.certainty,
          associatedLocationIds: activityPlaces,
          associatedEventIds: activityEvents
        }
      } satisfies EditorActivityProposal;
    }
    if (tab === 'event') {
      const id = editingEventId || `event-${slugify(eventTitle)}`;
      return {
        ...common,
        id: proposalId('event', id),
        kind: 'event',
        data: {
          id,
          title: eventTitle,
          period: toTemporalSpan(eventPeriod),
          category: eventCategory,
          description: eventDescription,
          participantIds: eventParticipants,
          placeIds: eventPlaces,
          biblicalReferences: splitValues(biblicalReferences),
          certainty: eventPeriod.certainty,
          timelineLevel
        }
      } satisfies EditorEventProposal;
    }
    if (tab === 'source') {
      const id = editingSourceId || `source-${slugify(sourceTitle)}`;
      const existingSource = sources.find(source => source.id === editingSourceId);
      return {
        ...common,
        id: proposalId('source', id),
        kind: 'source',
        data: {
          ...existingSource,
          id,
          title: sourceTitle,
          publication: sourcePublication,
          url: sourceUrl || undefined,
          documentType: 'other',
          language: 'fr',
          factualDataUseAllowed: true,
          longTextReproductionAllowed: false,
          imageReproductionAllowed: false,
          verificationStatus: 'unverified'
        }
      } satisfies EditorSourceProposal;
    }
    return null;
  };

  const validate = () => {
    const result = validateEditorBatch(batch, catalogs, people);
    setIssues(result.issues);
    setValidationMessage(
      result.valid
        ? 'Le lot est structurellement valide. Une relecture humaine reste obligatoire.'
        : 'Le lot contient des erreurs à corriger avant enregistrement.'
    );
    return result;
  };

  const exportBatch = () => {
    const blob = new Blob([`${JSON.stringify(batch, null, 2)}\n`], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${batch.id}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const saveStaging = async () => {
    const result = validate();
    if (!result.valid) return;
    try {
      const response = await fetch('/__atlas-editor/staging', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch)
      });
      if (!response.ok) throw new Error('API locale indisponible');
      const payload = await response.json() as { path: string };
      setValidationMessage(`Lot enregistré atomiquement dans ${payload.path}.`);
    } catch {
      exportBatch();
      setValidationMessage(
        'L’écriture locale est indisponible : le lot JSON a été exporté à la place.'
      );
    }
  };

  const importBatch = async (file: File) => {
    try {
      const candidate = JSON.parse(await file.text()) as EditorStagingBatch;
      if (
        candidate.workflowStatus !== 'staging' ||
        candidate.humanReviewStatus !== 'pending'
      ) {
        throw new Error('Une proposition importée ne peut pas être déclarée relue.');
      }
      setBatch(candidate);
      setSourceId(candidate.sourceId);
      setIssues(validateEditorBatch(candidate, catalogs, people).issues);
      setTab('proposals');
      setValidationMessage('Propositions importées pour comparaison et relecture.');
    } catch (error) {
      setValidationMessage(
        error instanceof Error ? error.message : 'Fichier de propositions invalide.'
      );
    }
  };

  const personOptions = people.map(person => ({ id: person.id, name: person.name }));
  const placeOptions = places.map(place => ({ id: place.id, name: place.name }));
  const eventOptions = events.map(event => ({ id: event.id, name: event.text }));
  const activityOptions = people.flatMap(person =>
    person.activityPeriods.map(activity => ({
      id: activity.id,
      name: `${person.name} · ${activity.label}`
    }))
  );
  const sourceOptions = sources.map(source => ({
    id: source.id,
    name: source.title
  }));

  return (
    <div data-testid="atlas-local-editor" className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink)]">
      <header className="sticky top-0 z-20 border-b border-[var(--color-stone)] bg-[var(--color-paper)]/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <a href="/" className="atlas-icon-button" aria-label="Retour à l’atlas">
            <ArrowLeft className="size-4" />
          </a>
          <div>
            <p className="atlas-kicker">Développement local uniquement</p>
            <h1 className="text-lg font-bold">Éditeur historique</h1>
          </div>
          <span className="ml-auto rounded-full bg-[var(--color-warning)]/15 px-3 py-1 text-xs font-bold text-[var(--color-warning)]">
            Staging · jamais publié directement
          </span>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="atlas-surface overflow-hidden rounded-[var(--radius-lg)]">
          <nav className="flex overflow-x-auto border-b border-[var(--color-stone-light)] p-2" aria-label="Types de données">
            {[
              ['person', 'Personnes'],
              ['activity', 'Périodes d’activité'],
              ['event', 'Événements'],
              ['source', 'Sources'],
              ['proposals', `Propositions à vérifier (${batch.proposals.length})`]
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id as EditorTab)}
                className={`min-h-11 shrink-0 px-3 text-sm font-semibold ${
                  tab === id
                    ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary-dark)]'
                    : 'text-[var(--color-ink-muted)]'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="space-y-4 p-5">
            {tab === 'person' && (
              <>
                <h2 className="font-serif text-2xl font-semibold">Personne</h2>
                <EntityField
                  label="Personne existante à modifier (facultatif)"
                  value={editingPersonId}
                  onChange={id => {
                    setEditingPersonId(id);
                    const person = people.find(candidate => candidate.id === id);
                    if (!person) return;
                    setPersonName(person.name);
                    setAlternateNames(person.alternateNames?.join(', ') ?? '');
                    setDescription(person.description ?? '');
                    setPersonPeriod(fromTemporalSpan(person.lifeSpan));
                  }}
                  options={personOptions}
                />
                {editingPersonId && (
                  <button type="button" onClick={() => setEditingPersonId('')} className="text-xs font-semibold text-[var(--color-primary)]">
                    Créer une nouvelle personne à la place
                  </button>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-semibold">Nom
                    <input value={personName} onChange={event => setPersonName(event.target.value)} className={`${inputClass} mt-1`} />
                  </label>
                  <label className="text-xs font-semibold">Noms alternatifs
                    <input value={alternateNames} onChange={event => setAlternateNames(event.target.value)} className={`${inputClass} mt-1`} placeholder="Séparés par des virgules" />
                  </label>
                </div>
                <label className="block text-xs font-semibold">Description courte
                  <textarea value={description} onChange={event => setDescription(event.target.value)} className={`${inputClass} mt-1 min-h-24 py-3`} />
                </label>
                <TemporalFields value={personPeriod} onChange={setPersonPeriod} title="Période de vie" />
              </>
            )}

            {tab === 'activity' && (
              <>
                <h2 className="font-serif text-2xl font-semibold">Période d’activité</h2>
                <EntityField
                  label="Activité existante à modifier (facultatif)"
                  value={editingActivityId}
                  onChange={id => {
                    setEditingActivityId(id);
                    const owner = people.find(person =>
                      person.activityPeriods.some(activity => activity.id === id)
                    );
                    const activity = owner?.activityPeriods.find(item => item.id === id);
                    if (!owner || !activity) return;
                    setActivityPersonId(owner.id);
                    setActivityType(activity.type);
                    setActivityLabel(activity.label);
                    setActivityPeriod(fromTemporalSpan(activity.span));
                    setActivityPlaces(activity.associatedLocationIds ?? []);
                    setActivityEvents(activity.associatedEventIds ?? []);
                  }}
                  options={activityOptions}
                />
                {editingActivityId && (
                  <button type="button" onClick={() => setEditingActivityId('')} className="text-xs font-semibold text-[var(--color-primary)]">
                    Créer une nouvelle activité à la place
                  </button>
                )}
                <EntityField label="Personne" value={activityPersonId} onChange={setActivityPersonId} options={personOptions} required />
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-semibold">Type
                    <select value={activityType} onChange={event => setActivityType(event.target.value as PersonActivityType)} className={`${inputClass} mt-1`}>
                      {Object.entries(ACTIVITY_VISUALS).map(([id, visual]) => <option key={id} value={id}>{visual.label}</option>)}
                    </select>
                  </label>
                  <label className="text-xs font-semibold">Libellé
                    <input value={activityLabel} onChange={event => setActivityLabel(event.target.value)} className={`${inputClass} mt-1`} />
                  </label>
                </div>
                <TemporalFields value={activityPeriod} onChange={setActivityPeriod} title="Période d’activité" />
                <MultiEntityField label="Lieux associés" values={activityPlaces} onChange={setActivityPlaces} options={placeOptions} />
                <MultiEntityField label="Événements associés" values={activityEvents} onChange={setActivityEvents} options={eventOptions} />
              </>
            )}

            {tab === 'event' && (
              <>
                <h2 className="font-serif text-2xl font-semibold">Événement</h2>
                <EntityField
                  label="Événement existant à modifier (facultatif)"
                  value={editingEventId}
                  onChange={id => {
                    setEditingEventId(id);
                    const event = events.find(candidate => candidate.id === id);
                    if (!event) return;
                    setEventTitle(event.text);
                    setEventCategory(event.category);
                    setEventDescription(event.description ?? '');
                    setEventPeriod(fromTemporalSpan(eventDataToTemporalSpan(event)));
                    setEventParticipants(event.associatedCharacterIds ?? []);
                    setEventPlaces(event.associatedLocationIds ?? []);
                    setBiblicalReferences(event.biblicalReferences?.join(', ') ?? '');
                    setTimelineLevel(event.timelineLevel ?? 'study');
                  }}
                  options={eventOptions}
                />
                {editingEventId && (
                  <button type="button" onClick={() => setEditingEventId('')} className="text-xs font-semibold text-[var(--color-primary)]">
                    Créer un nouvel événement à la place
                  </button>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-semibold">Titre
                    <input value={eventTitle} onChange={event => setEventTitle(event.target.value)} className={`${inputClass} mt-1`} />
                  </label>
                  <label className="text-xs font-semibold">Catégorie
                    <input value={eventCategory} onChange={event => setEventCategory(event.target.value)} className={`${inputClass} mt-1`} />
                  </label>
                </div>
                <label className="block text-xs font-semibold">Description courte
                  <textarea value={eventDescription} onChange={event => setEventDescription(event.target.value)} className={`${inputClass} mt-1 min-h-24 py-3`} />
                </label>
                <TemporalFields value={eventPeriod} onChange={setEventPeriod} title="Date ou période" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <MultiEntityField label="Participants" values={eventParticipants} onChange={setEventParticipants} options={personOptions} />
                  <MultiEntityField label="Lieux" values={eventPlaces} onChange={setEventPlaces} options={placeOptions} />
                  <label className="text-xs font-semibold">Références bibliques
                    <input value={biblicalReferences} onChange={event => setBiblicalReferences(event.target.value)} className={`${inputClass} mt-1`} />
                  </label>
                  <label className="text-xs font-semibold">Niveau sur la frise
                    <select value={timelineLevel} onChange={event => setTimelineLevel(event.target.value as TimelineDisplayLevel)} className={`${inputClass} mt-1`}>
                      <option value="overview">Global</option><option value="study">Étude</option><option value="detail">Détail</option>
                    </select>
                  </label>
                </div>
              </>
            )}

            {tab === 'source' && (
              <>
                <h2 className="font-serif text-2xl font-semibold">Nouvelle source</h2>
                <EntityField
                  label="Source existante à modifier (facultatif)"
                  value={editingSourceId}
                  onChange={id => {
                    setEditingSourceId(id);
                    const source = sources.find(candidate => candidate.id === id);
                    if (!source) return;
                    setSourceTitle(source.title);
                    setSourcePublication(source.publication);
                    setSourceUrl(source.url ?? '');
                  }}
                  options={sourceOptions}
                />
                {editingSourceId && (
                  <button type="button" onClick={() => setEditingSourceId('')} className="text-xs font-semibold text-[var(--color-primary)]">
                    Créer une nouvelle source à la place
                  </button>
                )}
                <label className="block text-xs font-semibold">Titre
                  <input value={sourceTitle} onChange={event => setSourceTitle(event.target.value)} className={`${inputClass} mt-1`} />
                </label>
                <label className="block text-xs font-semibold">Publication
                  <input value={sourcePublication} onChange={event => setSourcePublication(event.target.value)} className={`${inputClass} mt-1`} />
                </label>
                <label className="block text-xs font-semibold">URL
                  <input type="url" value={sourceUrl} onChange={event => setSourceUrl(event.target.value)} className={`${inputClass} mt-1`} />
                </label>
                <p className="rounded-[var(--radius-sm)] bg-[var(--color-bronze-soft)] p-3 text-xs leading-relaxed">
                  La proposition autorise seulement les données factuelles. Les longs textes et images restent explicitement interdits.
                </p>
              </>
            )}

            {tab === 'proposals' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-serif text-2xl font-semibold">Propositions à vérifier</h2>
                  <button type="button" onClick={() => importRef.current?.click()} className="atlas-control flex items-center gap-2 px-3">
                    <Upload className="size-4" /> Importer un lot IA
                  </button>
                  <input ref={importRef} type="file" accept="application/json" hidden onChange={event => event.target.files?.[0] && void importBatch(event.target.files[0])} />
                </div>
                {batch.proposals.length === 0 ? (
                  <p className="rounded-[var(--radius-md)] bg-[var(--color-paper-muted)] p-5 text-sm text-[var(--color-ink-muted)]">Aucune proposition. Les données ajoutées ici restent en staging jusqu’à une promotion humaine explicite.</p>
                ) : batch.proposals.map(proposal => (
                  <article key={proposal.id} className="rounded-[var(--radius-md)] border border-[var(--color-stone-light)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div><p className="atlas-kicker">{proposal.kind} · non relu</p><h3 className="font-bold">{'name' in proposal.data ? proposal.data.name : 'title' in proposal.data ? proposal.data.title : 'label' in proposal.data ? proposal.data.label : proposal.data.id}</h3></div>
                      <button type="button" aria-label="Rejeter cette proposition" onClick={() => setBatch(previous => ({ ...previous, proposals: previous.proposals.filter(item => item.id !== proposal.id) }))} className="atlas-icon-button text-[var(--color-danger)]"><XCircle className="size-4" /></button>
                    </div>
                    <p className="mt-2 text-xs text-[var(--color-ink-muted)]">{proposal.extractionNote || 'Note d’extraction manquante'}</p>
                  </article>
                ))}
              </div>
            ) : (
              <>
                <div className="grid gap-3 border-t border-[var(--color-stone-light)] pt-4 sm:grid-cols-2">
                  <label className="text-xs font-semibold">Source précise
                    <select value={sourceId} onChange={event => { setSourceId(event.target.value); setBatch(previous => ({ ...previous, sourceId: event.target.value })); }} className={`${inputClass} mt-1`}>
                      {sources.map(source => <option key={source.id} value={source.id}>{source.title}</option>)}
                    </select>
                  </label>
                  <label className="text-xs font-semibold">Claims justificatifs
                    <input value={claimIds} onChange={event => setClaimIds(event.target.value)} className={`${inputClass} mt-1`} placeholder="Sélection future ou IDs séparés" />
                  </label>
                </div>
                <label className="block text-xs font-semibold">Note d’extraction
                  <textarea aria-label="Note d’extraction" value={extractionNote} onChange={event => setExtractionNote(event.target.value)} className={`${inputClass} mt-1 min-h-20 py-3`} placeholder="Ce que la source affirme réellement, sans long extrait." />
                </label>
                <button type="button" onClick={() => { const proposal = buildCurrentProposal(); if (proposal) addProposal(proposal); }} className="min-h-11 rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-primary-dark)]">
                  Ajouter aux propositions à vérifier
                </button>
              </>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="atlas-surface rounded-[var(--radius-lg)] p-4">
            <h2 className="text-sm font-bold">Prévisualisation immédiate</h2>
            {personPreview ? <div className="mt-3 overflow-x-auto py-8"><BiographicalRibbon event={personPreview} width={520} isActive={false} /></div> : <p className="mt-2 text-sm text-[var(--color-ink-muted)]">Saisissez des bornes chronologiques pour afficher le ruban.</p>}
            {activityPreview && <div className="mt-3 space-y-1 text-sm"><p>Âge au début : <strong>{activityPreview.startAge.label}</strong></p>{activityPreview.endAge && <p>Âge à la fin : <strong>{activityPreview.endAge.label}</strong></p>}<p>Durée : <strong>{activityPreview.duration?.label ?? 'Impossible à déterminer'}</strong></p></div>}
            {affectedEvents.length > 0 && <div className="mt-4"><h3 className="text-xs font-bold">Événements existants concernés</h3><ul className="mt-2 space-y-1 text-xs">{affectedEvents.map(item => <li key={item.event.id}>{item.event.text} · {item.age.label}</li>)}</ul></div>}
          </section>

          <section className="atlas-surface rounded-[var(--radius-lg)] p-4">
            <h2 className="text-sm font-bold">Validation et écriture</h2>
            {validationMessage && <p role="status" className="mt-2 rounded-[var(--radius-sm)] bg-[var(--color-primary-soft)] p-3 text-xs">{validationMessage}</p>}
            {issues.length > 0 && <ul className="mt-3 space-y-2 text-xs">{issues.map((issue, index) => <li key={`${issue.path}-${index}`} className="flex gap-2">{issue.severity === 'error' ? <XCircle className="size-4 shrink-0 text-[var(--color-danger)]" /> : <AlertTriangle className="size-4 shrink-0 text-[var(--color-warning)]" />}<span><strong>{issue.path}</strong> — {issue.message}</span></li>)}</ul>}
            <div className="mt-4 grid gap-2">
              <button type="button" onClick={validate} className="atlas-control flex items-center justify-center gap-2 px-3"><CheckCircle2 className="size-4" /> Valider les données</button>
              <button type="button" onClick={() => void saveStaging()} className="flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-3 text-sm font-semibold text-white"><Save className="size-4" /> Enregistrer dans staging</button>
              <button type="button" onClick={exportBatch} className="atlas-control flex items-center justify-center gap-2 px-3"><Download className="size-4" /> Exporter JSON</button>
              <button type="button" onClick={() => { const result = validate(); if (result.valid) setValidationMessage(`Prêt pour relecture, puis : pnpm historical:promote -- --file content/staging/editor/${batch.id}.json`); }} className="atlas-control flex items-center justify-center gap-2 px-3"><FileJson2 className="size-4" /> Préparer la promotion</button>
              <button type="button" onClick={() => { setBatch(createEmptyEditorBatch(sourceId)); setIssues([]); setValidationMessage('Lot rejeté localement ; aucune donnée reviewed n’a été modifiée.'); }} className="min-h-11 text-sm font-semibold text-[var(--color-danger)]">Rejeter ou corriger le lot</button>
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
}
