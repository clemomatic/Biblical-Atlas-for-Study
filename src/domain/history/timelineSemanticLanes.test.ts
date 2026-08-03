import assert from 'node:assert/strict';
import test from 'node:test';
import type { EventData } from '../../types.ts';
import {
  getTimelineSemanticLane,
  getTimelineSemanticLaneCounts
} from './timelineSemanticLanes.ts';

const event = (
  id: string,
  category: string,
  isPoint: boolean,
  startYear = 50,
  endYear = startYear
): EventData => ({
  id,
  text: id,
  categoryId: category,
  category,
  startRaw: String(startYear),
  endRaw: String(endYear),
  startYear,
  endYear,
  startPos: startYear,
  endPos: endYear,
  isPoint,
  fuzzyStart: false,
  fuzzyEnd: false
});

test('sépare la rédaction ponctuelle d’une période de rédaction', () => {
  assert.equal(
    getTimelineSemanticLane(event('jalon', 'Rédaction livre', true)).id,
    'point-writing'
  );
  assert.equal(
    getTimelineSemanticLane(
      event('période rédaction', 'Rédaction livre', false, 40, 60)
    ).id,
    'period-writing'
  );
});

test('range les règnes durables parmi les périodes politiques', () => {
  assert.equal(
    getTimelineSemanticLane(event('règne fictif', 'Roi', false, -10, 10)).id,
    'period-reigns'
  );
});

test('compte séparément les points et les durées', () => {
  const counts = getTimelineSemanticLaneCounts([
    event('fait', 'Événement', true),
    event('contexte', 'Contexte', false, -100, 20)
  ]);
  assert.equal(counts.get('point-first-century'), 1);
  assert.equal(counts.get('period-context'), 1);
});
