import test from 'node:test';
import assert from 'node:assert/strict';
import { findInlineReferences, linkReferencesInMarkdown } from './inlineReferenceScanner.ts';

// This is the user's established writing pattern: one sentence, references in parentheses.
// The new sidebar may compose this text but must not break the existing automatic links.
test('An idea with parenthesized sources keeps its prose and readable references', () => {
  const original = 'Les anciens doivent cultiver une véritable amitié (Jean 7:24 ; Marc 10:14).';
  const found = findInlineReferences(original);
  assert.deepEqual(found.map(item => item.label), ['Jean 7:24', 'Marc 10:14']);
  assert.ok(found.every(item => item.ref.kind === 'scripture'));
  assert.equal(original.slice(found[0].from, found[0].to), 'Jean 7:24');
  assert.equal(original.slice(found[1].from, found[1].to), 'Marc 10:14');

  // Automatic detection never changes the Markdown source.
  assert.equal(original, 'Les anciens doivent cultiver une véritable amitié (Jean 7:24 ; Marc 10:14).');

  // Explicit conversion, if requested, retains the one-line sentence and is idempotent.
  const converted = linkReferencesInMarkdown(original);
  assert.equal(converted.count, 2);
  assert.ok(converted.text.startsWith('Les anciens doivent cultiver une véritable amitié ('));
  assert.ok(converted.text.endsWith(').'));
  assert.ok(converted.text.includes('[Jean 7:24](https://wol.jw.org/fr/wol/b/r30/lp-f/nwt/43/7)'));
  assert.ok(converted.text.includes('[Marc 10:14](https://wol.jw.org/fr/wol/b/r30/lp-f/nwt/41/10)'));
  assert.equal(linkReferencesInMarkdown(converted.text).count, 0);
});
