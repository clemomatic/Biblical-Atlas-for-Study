import { CalendarClock, MapPin, UserRound, X } from 'lucide-react';
import type { BiblicalPerson } from '../domain/history/types.ts';
import {
  calculateEventParticipants,
  eventDataToTemporalSpan
} from '../domain/history/eventChronology.ts';
import { formatTemporalSpanFrench } from '../domain/history/temporal.ts';
import type { BiblicalPlace, EventData } from '../types.ts';

interface EventContextPreviewProps {
  event: EventData;
  people: readonly BiblicalPerson[];
  places: readonly BiblicalPlace[];
  onOpenDetails: () => void;
  onClose: () => void;
}

export function EventContextPreview({
  event,
  people,
  places,
  onOpenDetails,
  onClose
}: EventContextPreviewProps) {
  const participants = calculateEventParticipants(event, people);
  const place = places.find(candidate =>
    event.associatedLocationIds?.includes(candidate.id)
  );

  return (
    <aside
      className="fixed inset-x-3 bottom-20 z-[80] max-h-[min(65vh,520px)] overflow-auto rounded-[var(--radius-lg)] border border-[var(--color-stone)] bg-[var(--color-paper)] p-4 shadow-[var(--shadow-3)] md:absolute md:inset-x-auto md:bottom-auto md:right-4 md:top-20 md:w-[360px]"
      aria-label={`Aperçu de l’événement ${event.text}`}
      data-testid="event-context-preview"
    >
      <button
        type="button"
        onClick={onClose}
        className="atlas-icon-button absolute right-2 top-2"
        aria-label="Fermer l’aperçu"
      >
        <X className="size-4" />
      </button>
      <p className="atlas-kicker">Événement sélectionné</p>
      <h3 className="mt-1 font-serif text-xl font-semibold text-[var(--color-ink)]">
        {event.text}
      </h3>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium text-[var(--color-ink-soft)]">
        <span className="inline-flex items-center gap-1">
          <CalendarClock className="size-3.5" />
          {formatTemporalSpanFrench(eventDataToTemporalSpan(event))}
        </span>
        {place && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" />
            {place.name}
          </span>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {participants.length > 0 ? participants.map(calculation => (
          <section
            key={calculation.person.id}
            className="border-l-2 border-[var(--color-primary-soft)] pl-3"
          >
            <h4 className="flex items-center gap-1.5 text-sm font-bold">
              <UserRound className="size-3.5 text-[var(--color-primary)]" />
              {calculation.person.name}
            </h4>
            <p className="mt-1 text-xs text-[var(--color-ink-soft)]">
              <span className="font-semibold">Âge :</span>{' '}
              {calculation.age.label}
            </p>
            {calculation.activeActivities.map(situation => (
              <p
                key={situation.activity.id}
                className="mt-1 text-xs text-[var(--color-ink-soft)]"
              >
                <span className="font-semibold">Activité :</span>{' '}
                {situation.label}
              </p>
            ))}
            {calculation.activeActivities.length === 0 &&
              calculation.pendingActivities.slice(0, 1).map(situation => (
                <p
                  key={situation.activity.id}
                  className="mt-1 text-xs text-[var(--color-ink-soft)]"
                >
                  <span className="font-semibold">Situation :</span>{' '}
                  {situation.label}
                </p>
              ))}
            <p className="mt-1 text-[11px] text-[var(--color-ink-muted)]">
              {calculation.age.explanation}
            </p>
          </section>
        )) : (
          <p className="text-sm text-[var(--color-ink-muted)]">
            Aucun participant identifié par un ID stable pour cet événement.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onOpenDetails}
        className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-dark)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
      >
        <span className="md:hidden">Explorer dans la frise</span>
        <span className="hidden md:inline">Voir les détails et les sources</span>
      </button>
    </aside>
  );
}
