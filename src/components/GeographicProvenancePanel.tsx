import React from 'react';
import { ChevronDown, ExternalLink, MapPinned, ShieldCheck } from 'lucide-react';
import type {
  CertaintyLevel,
  GeographicProvenance,
  GeographicProvenanceMethod
} from '../types';

const methodLabels: Record<GeographicProvenanceMethod, string> = {
  'source-map-location': 'Localisation portée par la carte source',
  'map-and-event-cross-reference': 'Rapprochement entre la carte et un événement relu',
  'documented-route': 'Déplacement explicitement documenté',
  'reconstructed-route': 'Déplacement reconstitué à partir des sources',
  'schematic-route': 'Ordre de lieux schématique'
};

const certaintyLabels: Record<CertaintyLevel, string> = {
  certain: 'Établi',
  probable: 'Probable',
  possible: 'Possible',
  unknown: 'Non précisé'
};

interface GeographicProvenancePanelProps {
  items: GeographicProvenance[];
}

export const GeographicProvenancePanel: React.FC<
  GeographicProvenancePanelProps
> = ({ items }) => {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="geographic-provenance-title">
      <details className="group overflow-hidden border-l-2 border-[var(--color-mineral)] bg-[var(--color-mineral-soft)]/45">
        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-primary)]">
          <MapPinned
            className="size-5 shrink-0 text-[var(--color-mineral)]"
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1">
            <span
              id="geographic-provenance-title"
              className="block text-sm font-bold text-[var(--color-ink)]"
            >
              Pourquoi ce lieu ou ce tracé ?
            </span>
            <span className="mt-0.5 block text-xs text-[var(--color-ink-muted)]">
              {items.length} {items.length > 1 ? 'preuves géographiques' : 'preuve géographique'}
            </span>
          </span>
          <ChevronDown
            className="size-4 shrink-0 text-[var(--color-ink-muted)] transition-transform duration-200 group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>

        <div className="space-y-3 border-t border-[var(--color-mineral)]/20 px-4 py-4">
          {items.map(item => (
            <article
              key={item.id}
              className="bg-[var(--color-paper)] px-4 py-3 shadow-[var(--shadow-1)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[var(--color-mineral)]">
                    {item.mapId} · {item.mapReference}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--color-ink)]">
                    {methodLabels[item.method]}
                  </p>
                </div>
                <span className="shrink-0 bg-[var(--color-mineral-soft)] px-2 py-1 text-xs font-semibold text-[var(--color-mineral)]">
                  {certaintyLabels[item.certainty]}
                </span>
              </div>

              <dl className="mt-3 grid gap-2 text-xs leading-relaxed text-[var(--color-ink-soft)]">
                <div>
                  <dt className="inline font-semibold text-[var(--color-ink)]">Source : </dt>
                  <dd className="inline">{item.sourceLabel}</dd>
                </div>
                <div>
                  <dt className="inline font-semibold text-[var(--color-ink)]">Certitude portée par la carte : </dt>
                  <dd className="inline">{certaintyLabels[item.sourceMapCertainty]}</dd>
                </div>
                <div>
                  <dt className="inline font-semibold text-[var(--color-ink)]">Limites : </dt>
                  <dd className="inline">{item.limitations}</dd>
                </div>
              </dl>

              {!item.coordinatesChanged && (
                <p className="mt-3 flex items-start gap-2 text-xs text-[var(--color-olive)]">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  Cette association documentaire n’a modifié aucune coordonnée.
                </p>
              )}

              {item.sourceUrl && (
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex min-h-10 items-center gap-2 text-xs font-semibold text-[var(--color-primary)] hover:text-[var(--color-primary-dark)]"
                >
                  Consulter la source
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
              )}
            </article>
          ))}
        </div>
      </details>
    </section>
  );
};
