import React from 'react';
import {
  Calculator,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  GitMerge,
  HelpCircle,
  Lightbulb,
  Library
} from 'lucide-react';
import type {
  EntityMethodology,
  MethodologyMethod
} from '../domain/history/entityMethodology';

const methodPresentation: Record<
  MethodologyMethod,
  { label: string; explanation: string; icon: React.ReactNode; className: string }
> = {
  direct: {
    label: 'Directement attest\u00e9',
    explanation: 'Une r\u00e9f\u00e9rence relue soutient directement cette affirmation.',
    icon: <CheckCircle2 className="size-4" />,
    className: 'border-[var(--color-mineral)] bg-[var(--color-mineral-soft)] text-[var(--color-mineral)]'
  },
  calculated: {
    label: 'Calcul\u00e9',
    explanation: 'Le r\u00e9sultat est reproductible \u00e0 partir d\u2019affirmations d\u2019entr\u00e9e conserv\u00e9es.',
    icon: <Calculator className="size-4" />,
    className: 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary-dark)]'
  },
  inferred: {
    label: 'Inf\u00e9r\u00e9',
    explanation: 'La conclusion est interpr\u00e9tative et reste distincte des faits directement cit\u00e9s.',
    icon: <Lightbulb className="size-4" />,
    className: 'border-[var(--color-warning)] bg-[var(--color-bronze-soft)] text-[var(--color-warning)]'
  },
  'generated-overlap': {
    label: 'G\u00e9n\u00e9r\u00e9 par chevauchement',
    explanation: 'La relation provient du moteur temporel ou g\u00e9ographique, sans pr\u00e9sumer une rencontre.',
    icon: <GitMerge className="size-4" />,
    className: 'border-[var(--color-olive)] bg-[var(--color-olive-soft)] text-[var(--color-olive)]'
  }
};

const certaintyLabels: Record<EntityMethodology['certainty'], string> = {
  certain: 'Certain',
  probable: 'Probable',
  possible: 'Possible',
  unknown: 'Non d\u00e9termin\u00e9'
};

export const SourcesAndMethodPanel = ({
  methodology
}: {
  methodology: EntityMethodology;
}) => (
  <details className="group border-l-2 border-[var(--color-primary)] bg-[var(--color-paper-muted)]" data-testid="sources-and-method">
    <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm font-bold text-[var(--color-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-primary)] [&::-webkit-details-marker]:hidden">
      <Library className="size-4 text-[var(--color-primary)]" />
      <span className="flex-1">{'Sources et m\u00e9thode'}</span>
      <span className="text-xs font-medium text-[var(--color-ink-muted)]">
        {methodology.sourceCount} source{methodology.sourceCount > 1 ? 's' : ''}
      </span>
      <ChevronDown className="size-4 text-[var(--color-ink-muted)] transition-transform group-open:rotate-180" />
    </summary>

    <div className="space-y-5 border-t border-[var(--color-stone-light)] px-4 py-4">
      <div>
        <p className="text-xs font-semibold text-[var(--color-ink-muted)]">Nature des informations</p>
        {methodology.methods.length ? (
          <div className="mt-2 space-y-2">
            {methodology.methods.map(method => {
              const item = methodPresentation[method];
              return (
                <div key={method} className={`border-l-2 px-3 py-2 ${item.className}`}>
                  <p className="flex items-center gap-2 text-xs font-bold">
                    {item.icon}
                    {item.label}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--color-ink-soft)]">
                    {item.explanation}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-2 text-xs leading-relaxed text-[var(--color-ink-soft)]">
            {'Aucune m\u00e9thode structur\u00e9e n\u2019est encore enregistr\u00e9e pour cette fiche.'}
          </p>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <dt className="font-semibold text-[var(--color-ink-muted)]">Certitude</dt>
          <dd className="mt-1 font-bold text-[var(--color-ink)]">{certaintyLabels[methodology.certainty]}</dd>
        </div>
        <div>
          <dt className="font-semibold text-[var(--color-ink-muted)]">{'Derni\u00e8re v\u00e9rification'}</dt>
          <dd className="mt-1 font-bold tabular-nums text-[var(--color-ink)]">
            {methodology.lastVerified ?? 'Non renseign\u00e9e'}
          </dd>
        </div>
      </dl>

      {methodology.sources.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-[var(--color-ink-muted)]">Sources consultables</p>
          <ul className="mt-2 space-y-2">
            {methodology.sources.map(source => (
              <li key={source.id}>
                {source.url ? (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-h-11 items-start gap-2 border-l-2 border-[var(--color-stone)] px-3 py-2 text-xs text-[var(--color-ink)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{source.label}</span>
                      {source.reference && <span className="mt-0.5 block text-[var(--color-ink-muted)]">{source.reference}</span>}
                    </span>
                    <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-[var(--color-ink-muted)]" />
                  </a>
                ) : (
                  <div className="border-l-2 border-[var(--color-stone)] px-3 py-2 text-xs text-[var(--color-ink)]">
                    <span className="font-semibold">{source.label}</span>
                    {source.reference && <span className="mt-0.5 block text-[var(--color-ink-muted)]">{source.reference}</span>}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {methodology.limitations.length > 0 && (
        <div className="border-l-2 border-[var(--color-warning)] bg-[var(--color-bronze-soft)]/45 px-3 py-3">
          <p className="flex items-center gap-2 text-xs font-bold text-[var(--color-ink)]">
            <HelpCircle className="size-4 text-[var(--color-warning)]" />
            Limites
          </p>
          <ul className="mt-2 space-y-1 text-xs leading-relaxed text-[var(--color-ink-soft)]">
            {methodology.limitations.map(limit => <li key={limit}>&bull; {limit}</li>)}
          </ul>
        </div>
      )}
    </div>
  </details>
);