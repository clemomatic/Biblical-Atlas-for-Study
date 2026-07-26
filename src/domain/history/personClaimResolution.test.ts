import assert from 'node:assert/strict';
import test from 'node:test';
import type { HistoricalClaim } from './contentTypes.ts';
import { conservativeLifespanSpan } from './contentGeneration.ts';
import { resolvePersonLifeClaims } from './personClaimResolution.ts';
import { getTemporalInterval } from './temporal.ts';

const claim = (
  id: string,
  start: number,
  end: number,
  approximate = false
): HistoricalClaim => ({
  id,
  workflowStatus: 'reviewed',
  origin: 'reviewed',
  subject: { entityType: 'person', entityId: 'person-test' },
  predicate: 'lifespan',
  period: {
    start: {
      yearMin: start,
      yearMax: start,
      precision: 'year',
      approximate,
      certainty: approximate ? 'probable' : 'certain'
    },
    end: {
      yearMin: end,
      yearMax: end,
      precision: 'year',
      approximate,
      certainty: approximate ? 'probable' : 'certain'
    },
    displayLabel: `${start}-${end}`
  },
  certainty: approximate ? 'probable' : 'certain',
  evidence: [
    {
      sourceId: 'source-test',
      shortReference: id,
      method: 'direct',
      humanReviewStatus: 'reviewed'
    }
  ]
});

test('préfère une affirmation précise compatible sans supprimer les autres', () => {
  const result = resolvePersonLifeClaims('person-test', [
    claim('claim-wide', -100, -20, true),
    claim('claim-precise', -90, -30)
  ]);
  assert.equal(result.status, 'compatible');
  assert.equal(result.selectedClaimId, 'claim-precise');
  assert.deepEqual(result.candidateClaimIds, ['claim-precise', 'claim-wide']);
});

test('refuse de sélectionner automatiquement des affirmations divergentes', () => {
  const result = resolvePersonLifeClaims('person-test', [
    claim('claim-first', -100, -80),
    claim('claim-second', -40, -20)
  ]);
  assert.equal(result.status, 'divergent');
  assert.equal(result.selectedClaimId, undefined);
  assert.deepEqual(result.divergentClaimPairs, [
    ['claim-first', 'claim-second']
  ]);
});

test('signale une période insuffisante sans inventer de valeur', () => {
  const result = resolvePersonLifeClaims('person-test', []);
  assert.equal(result.status, 'insufficient');
  assert.equal(result.selectedSpan, undefined);
});

test('borne prudemment un décès indiqué seulement après une date', () => {
  const span = claim('claim-open', -70, -2).period!;
  span.end = {
    ...span.end!,
    precision: 'after'
  };
  const interval = getTemporalInterval(conservativeLifespanSpan(span));
  assert.deepEqual(interval, {
    yearMin: -70,
    yearMax: -2,
    unknown: false
  });
});
