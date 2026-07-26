import type { PersonActivityType } from './types.ts';

export interface ActivityVisualDefinition {
  label: string;
  color: string;
  softColor: string;
  pattern: 'solid' | 'dotted' | 'dashed';
}

export const ACTIVITY_VISUALS: Record<
  PersonActivityType | 'lifespan',
  ActivityVisualDefinition
> = {
  lifespan: {
    label: 'Vie connue',
    color: 'var(--color-stone)',
    softColor: 'var(--color-stone-light)',
    pattern: 'solid'
  },
  reign: {
    label: 'Règne',
    color: 'var(--color-bronze)',
    softColor: 'var(--color-bronze-soft)',
    pattern: 'solid'
  },
  prophecy: {
    label: 'Activité prophétique',
    color: 'var(--color-mineral)',
    softColor: 'var(--color-mineral-soft)',
    pattern: 'dashed'
  },
  ministry: {
    label: 'Ministère',
    color: 'var(--color-primary)',
    softColor: 'var(--color-primary-soft)',
    pattern: 'solid'
  },
  office: {
    label: 'Fonction officielle',
    color: 'var(--color-olive)',
    softColor: 'var(--color-olive-soft)',
    pattern: 'dotted'
  },
  journey: {
    label: 'Voyage',
    color: 'var(--color-warning)',
    softColor: 'var(--color-bronze-soft)',
    pattern: 'dashed'
  },
  residence: {
    label: 'Résidence documentée',
    color: 'var(--color-ink-muted)',
    softColor: 'var(--color-paper-muted)',
    pattern: 'dotted'
  },
  imprisonment: {
    label: 'Emprisonnement ou exil',
    color: 'var(--color-danger)',
    softColor: 'color-mix(in srgb, var(--color-danger) 12%, var(--color-paper))',
    pattern: 'dashed'
  },
  other: {
    label: 'Autre activité documentée',
    color: 'var(--color-ink-soft)',
    softColor: 'var(--color-stone-light)',
    pattern: 'dotted'
  }
};

export const getActivityVisual = (
  type: PersonActivityType
): ActivityVisualDefinition => ACTIVITY_VISUALS[type];
