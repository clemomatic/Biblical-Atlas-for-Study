import React from 'react';
import { Calculator, ExternalLink, TriangleAlert } from 'lucide-react';
import type { CertaintyLevel } from '../types';
import type { HistoricalClaim } from '../domain/history/contentTypes';
import { formatTemporalSpanFrench } from '../domain/history/temporal';
import type { HistoricalCalculationDetail } from '../data/historicalStudyData';
import { getJwDocumentTarget } from '../utils/jwLinks';

const certaintyLabels: Record<CertaintyLevel, string> = {
  certain: 'Établi à partir des entrées',
  probable: 'Probable',
  possible: 'Possible — relecture nécessaire',
  unknown: 'Niveau non déterminé'
};

const predicateLabels: Partial<Record<HistoricalClaim['predicate'], string>> = {
  birth: 'Naissance',
  death: 'Décès',
  'age-at-event': 'Âge indiqué',
  duration: 'Durée indiquée',
  'historical-event': 'Date de l’événement'
};

const inputLabel = (claim: HistoricalClaim): string => {
  if (claim.quantity) {
    const qualifier = claim.quantity.approximate ? 'environ ' : '';
    const margin = claim.quantity.uncertaintyYears
      ? ` (± ${claim.quantity.uncertaintyYears} ans)`
      : '';
    return `${predicateLabels[claim.predicate] ?? 'Quantité'} : ${qualifier}${claim.quantity.years} ans${margin}`;
  }
  if (claim.period) {
    return `${predicateLabels[claim.predicate] ?? 'Période'} : ${formatTemporalSpanFrench(claim.period)}`;
  }
  return predicateLabels[claim.predicate] ?? claim.predicate;
};

export const HistoricalCalculationPanel = ({
  items
}: {
  items: HistoricalCalculationDetail[];
}) => {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="historical-calculation-title" className="space-y-3">
      <h3
        id="historical-calculation-title"
        className="flex items-center gap-2 text-sm font-bold text-[var(--color-ink)]"
      >
        <Calculator className="size-4 text-[var(--color-bronze)]" />
        Date estimée
      </h3>
      {items.map(({ claim, inputClaims, source }) => {
        const target = source?.url
          ? getJwDocumentTarget(source.url, 'insight')
          : null;
        return (
          <article
            key={claim.id}
            className="border-l-2 border-[var(--color-bronze)] bg-[var(--color-bronze-soft)]/45 p-4"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-[family-name:var(--font-editorial)] text-xl font-semibold text-[var(--color-ink)]">
                {formatTemporalSpanFrench(claim.period)}
              </p>
              <span className="text-xs font-semibold text-[var(--color-bronze)]">
                Calculée
              </span>
            </div>
            <p className="mt-1 text-xs font-medium text-[var(--color-ink-muted)]">
              {certaintyLabels[claim.certainty]}
              {claim.calculation.uncertaintyYears > 0 &&
                ` · marge ± ${claim.calculation.uncertaintyYears} ans`}
            </p>

            <details className="mt-3 border-t border-[var(--color-bronze)]/20 pt-3">
              <summary className="cursor-pointer text-sm font-semibold text-[var(--color-primary-dark)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]">
                Calculée à partir de…
              </summary>
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-[var(--color-ink-soft)]">
                <ul className="space-y-2">
                  {inputClaims.map(input => (
                    <li
                      key={input.id}
                      className="border-l border-[var(--color-stone)] pl-3"
                    >
                      <span className="block font-semibold text-[var(--color-ink)]">
                        {inputLabel(input)}
                      </span>
                      <span className="block text-xs text-[var(--color-ink-muted)]">
                        {input.evidence[0]?.shortReference}
                      </span>
                    </li>
                  ))}
                </ul>
                <p>{claim.calculation.explanation}</p>
                {target && source && (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-semibold text-[var(--color-ink)]">
                      Source : {source.publication}, {source.title}
                    </span>
                    <a
                      href={target.finderUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-10 items-center gap-1 px-2 font-semibold text-[var(--color-primary)] underline-offset-4 hover:underline"
                    >
                      Ouvrir la source
                      <ExternalLink className="size-3.5" />
                    </a>
                  </div>
                )}
              </div>
            </details>

            {claim.conflict && (
              <div
                role="status"
                className="mt-3 flex gap-2 border-l-2 border-[var(--color-danger)] bg-[var(--color-paper)] p-3 text-xs leading-relaxed text-[var(--color-danger)]"
              >
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                <span>
                  {claim.conflict.explanation} Relecture requise avant toute
                  relation certaine.
                </span>
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
};
