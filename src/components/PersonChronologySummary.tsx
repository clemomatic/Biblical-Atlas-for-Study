import { Calendar, ExternalLink, Info, Timer, UserRound } from 'lucide-react';
import type { BiblicalPerson, PersonActivityPeriod, TemporalSpan } from '../domain/history/types.ts';
import { calculateAgeAtPeriod, calculateElapsedActivity } from '../domain/history/eventChronology.ts';
import { formatTemporalBoundaryFrench, formatTemporalSpanFrench } from '../domain/history/temporal.ts';
import { getAuthoritativeBiographicalRecords, type AuthoritativeChronologyRecord } from '../data/authoritativeChronology.ts';

const activityLabels: Record<PersonActivityPeriod['type'], string> = {
  reign: 'Règne', prophecy: 'Activité prophétique', ministry: 'Ministère',
  office: 'Fonction', journey: 'Déplacement', residence: 'Résidence',
  imprisonment: 'Emprisonnement', other: 'Période documentée'
};

const oneBoundarySpan = (boundary: TemporalSpan['start'] | undefined): TemporalSpan | undefined =>
  boundary ? { start: boundary, displayLabel: '' } : undefined;

const ageAtBoundary = (person: BiblicalPerson, boundary: TemporalSpan['start'] | undefined) => {
  const period = oneBoundarySpan(boundary);
  return period ? calculateAgeAtPeriod(person.lifeSpan, period) : undefined;
};

const durationAtEnd = (activity: PersonActivityPeriod) => {
  const period = oneBoundarySpan(activity.span.end);
  return period ? calculateElapsedActivity(activity, period) : undefined;
};

const SAMUEL_SEQUENCE = [
  'samuel-naissance', 'samuel-enfance-rama', 'samuel-presentation-silo',
  'samuel-service-silo', 'samuel-visites-parents', 'samuel-appel',
  'samuel-prophete', 'samuel-mizpa', 'samuel-juge', 'samuel-circuit',
  'samuel-rama', 'samuel-fils-juges', 'samuel-onction-saul',
  'samuel-onction-david', 'samuel-mort'
];

const recordOrder = (record: AuthoritativeChronologyRecord): number => {
  const index = SAMUEL_SEQUENCE.indexOf(record.id);
  if (index >= 0) return index;
  return record.startYear === undefined ? 10_000 : record.startYear;
};

const BiographyMilestone = ({ record }: { key?: string; record: AuthoritativeChronologyRecord }) => {
  const dateLabel = [record.startLabel, record.endLabel].filter(Boolean).join(' → ') || 'Datation non chiffrée';
  const isRelative = record.startYear === undefined;
  return (
    <li className="relative border-l border-[var(--color-stone)] pb-4 pl-5 last:pb-0">
      <span
        className={`absolute -left-[5px] top-1 size-2.5 rounded-full border-2 border-[var(--color-paper)] ${isRelative ? 'bg-[var(--color-olive)]' : 'bg-[var(--color-bronze)]'}`}
        aria-hidden="true"
      />
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-semibold leading-5 text-[var(--color-ink)]">{record.title}</p>
        <span className="shrink-0 rounded-full bg-[var(--color-paper-muted)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-ink-muted)]">
          {isRelative ? 'repère relatif' : record.confidence ?? 'à vérifier'}
        </span>
      </div>
      <p className="mt-1 text-xs font-medium tabular-nums text-[var(--color-primary-dark)]">{dateLabel}</p>
      {record.notes && <p className="mt-1 text-xs leading-5 text-[var(--color-ink-muted)]">{record.notes}</p>}
      {record.sourceUrls.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {record.sourceUrls.map((url, index) => (
            <a key={url} href={url} target="_blank" rel="noreferrer" className="inline-flex min-h-8 items-center gap-1 text-xs font-semibold text-[var(--color-primary)] underline-offset-2 hover:underline">
              Source {index + 1}<ExternalLink className="size-3" aria-hidden="true" />
            </a>
          ))}
        </div>
      )}
    </li>
  );
};

export function PersonChronologySummary({ person }: { person: BiblicalPerson }) {
  const deathAge = ageAtBoundary(person, person.lifeSpan?.end);
  const records = [...getAuthoritativeBiographicalRecords(person.id)]
    .filter(record => record.id !== person.id)
    .sort((left, right) => recordOrder(left) - recordOrder(right));

  return (
    <section className="space-y-5" data-testid="person-chronology-summary">
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--color-ink)]">
          <UserRound className="size-4 text-[var(--color-bronze)]" aria-hidden="true" />
          Synthèse chronologique
        </h3>
        {person.lifeSpan ? (
          <div className="bg-[var(--color-paper-muted)] p-4">
            <p className="font-editorial text-lg font-semibold text-[var(--color-ink)]">{formatTemporalSpanFrench(person.lifeSpan)}</p>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold text-[var(--color-ink-muted)]">Naissance</dt>
                <dd className="mt-0.5 text-sm font-medium tabular-nums text-[var(--color-ink)]">
                  {person.lifeSpan.start ? formatTemporalBoundaryFrench(person.lifeSpan.start) : 'Non déterminée'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-[var(--color-ink-muted)]">Décès / dernière borne</dt>
                <dd className="mt-0.5 text-sm font-medium tabular-nums text-[var(--color-ink)]">
                  {person.lifeSpan.end ? formatTemporalBoundaryFrench(person.lifeSpan.end) : 'Non déterminé'}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold text-[var(--color-ink-muted)]">Âge au décès ou à la dernière borne</dt>
                <dd className="mt-0.5 text-sm font-semibold text-[var(--color-primary-dark)]">{deathAge?.label ?? 'Âge impossible à déterminer'}</dd>
                {deathAge?.explanation && <p className="mt-1 text-xs leading-5 text-[var(--color-ink-muted)]">{deathAge.explanation}</p>}
              </div>
            </dl>
          </div>
        ) : (
          <div className="flex gap-3 border-l-2 border-[var(--color-warning)] bg-[var(--color-bronze-soft)]/45 p-4 text-sm text-[var(--color-ink-soft)]">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            La période de vie n’est pas suffisamment documentée. Les fonctions connues restent affichées séparément.
          </div>
        )}
      </div>

      {person.activityPeriods.length > 0 && (
        <div>
          <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--color-ink)]">
            <Timer className="size-4 text-[var(--color-mineral)]" aria-hidden="true" />
            Fonctions et périodes d’activité
          </h4>
          <div className="space-y-2">
            {person.activityPeriods.map(activity => {
              const ageAtStart = ageAtBoundary(person, activity.span.start);
              const ageAtEnd = ageAtBoundary(person, activity.span.end);
              const duration = durationAtEnd(activity);
              return (
                <article key={activity.id} className="border-l-2 border-[var(--color-mineral)] bg-[var(--color-mineral-soft)]/45 p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-[var(--color-ink)]">{activity.label}</p>
                    <span className="text-[11px] font-semibold text-[var(--color-ink-muted)]">{activityLabels[activity.type]}</span>
                  </div>
                  <p className="mt-1 text-xs font-medium tabular-nums text-[var(--color-primary-dark)]">{formatTemporalSpanFrench(activity.span)}</p>
                  <dl className="mt-2 grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
                    <div><dt className="inline text-[var(--color-ink-muted)]">Âge au début : </dt><dd className="inline font-semibold text-[var(--color-ink)]">{ageAtStart?.label ?? 'indéterminable'}</dd></div>
                    <div><dt className="inline text-[var(--color-ink-muted)]">Âge à la fin : </dt><dd className="inline font-semibold text-[var(--color-ink)]">{ageAtEnd?.label ?? 'indéterminable'}</dd></div>
                    <div className="sm:col-span-2"><dt className="inline text-[var(--color-ink-muted)]">Durée : </dt><dd className="inline font-semibold text-[var(--color-ink)]">{duration?.label.replace(/^Depuis /, '') ?? 'non calculable'}</dd></div>
                  </dl>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {records.length > 0 && (
        <details open={person.id === 'samuel-vie'} className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-bold text-[var(--color-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]">
            <Calendar className="size-4 text-[var(--color-bronze)]" aria-hidden="true" />
            Repères biographiques documentés
            <span className="ml-auto text-xs font-semibold text-[var(--color-ink-muted)]">{records.length}</span>
          </summary>
          <p className="mb-4 text-xs leading-5 text-[var(--color-ink-muted)]">
            Les repères relatifs suivent l’ordre narratif de la source. Ils ne sont pas artificiellement positionnés sur l’axe des années.
          </p>
          <ol className="ml-1">{records.map(record => <BiographyMilestone key={record.id} record={record} />)}</ol>
        </details>
      )}
    </section>
  );
}
