import test from 'node:test';
import assert from 'node:assert/strict';
import { importMarkdownTalk0229, layoutMarkdownTalk0229 } from './talkMarkdownImport0229.ts';
import { computeTalkTiming0229 } from './talkTiming0229.ts';

const ids = () => {
  let next = 0;
  return () => 'node-' + (++next);
};

test('a Markdown plan becomes editable cards with heading hierarchy and notes', () => {
  const source = '# La justice\n\nUne introduction.\n\n## Première partie — 2 min\n\nLire Jean 7:24\n\n### Exemple\n\nIllustrer.\n\n## Deuxième partie — 3 min\n\nConclusion.';
  const plan = importMarkdownTalk0229(source, 'Sans titre', {}, ids());
  assert.equal(plan.nodes[0].title, 'La justice');
  assert.equal(plan.nodes[0].note, 'Une introduction.');
  assert.equal(plan.target, 300);
  assert.equal(plan.nodes.length, 4);
  assert.equal(plan.nodes[1].title, 'Première partie');
  assert.equal(plan.nodes[1].parent, 'theme');
  assert.equal(plan.nodes[1].mode, 'fixed');
  assert.equal(plan.nodes[1].seconds, 120);
  assert.equal(plan.nodes[1].note, 'Lire Jean 7:24');
  assert.equal(plan.nodes[2].parent, 'node-1');
  assert.equal(plan.nodes[2].mode, 'cue');
  assert.equal(plan.nodes[3].seconds, 180);
});

test('frontmatter metadata wins over first h1 and heading times do not override a duration', () => {
  const source = '---\ndiscourse_type: meeting\n---\n# Old heading\n\n## Ouverture (01:30)\nTexte\n';
  const plan = importMarkdownTalk0229(source, 'Fallback',
    {title: 'Titre vérifié', discourse_type:'meeting', duration_minutes: 20}, ids());
  assert.equal(plan.kind, 'meeting');
  assert.equal(plan.nodes[0].title, 'Titre vérifié');
  assert.equal(plan.target, 1200);
  assert.equal(plan.nodes[1].seconds, 90);
  assert.equal(plan.nodes[1].mode, 'fixed');
});

test('headings inside fenced code blocks remain in speaker notes, not new cards', () => {
  const source = '# Le courage\n\n## Exemple\n\n\`\`\`md\n### Do not parse me\n\`\`\`\n\n### Étape réelle\nExplication.';
  const plan = importMarkdownTalk0229(source, 'Fallback', {}, ids());
  assert.equal(plan.nodes.length, 3);
  assert.match(plan.nodes[1].note, /### Do not parse me/);
  assert.equal(plan.nodes[2].title, 'Étape réelle');
});

test('special source sections are detached as free cards exactly as in shipped importer', () => {
  const plan = importMarkdownTalk0229('# Sujet\n\n## Sources vérifiables\nSource\n\n## Partie principale\nIdée',
    'Sans titre', {}, ids());
  assert.equal(plan.nodes[1].parent, null);
  assert.equal(plan.nodes[2].parent, 'theme');
  assert.equal(plan.nodes[2].mode, 'auto');
  assert.equal(plan.mapLayout, 'auto');
});

test('horizontal layout alternates top-level branches and preserves ordered sibling colors', () => {
  const plan = importMarkdownTalk0229('# Sujet\n\n## A\n\n## B\n\n## C\n\n### Enfant',
    'Sans titre', {}, ids());
  assert.ok(plan.nodes[1].position.x < 0);
  assert.ok(plan.nodes[2].position.x > 0);
  assert.ok(plan.nodes[3].position.x < 0);
  assert.ok(plan.nodes[4].position.x < plan.nodes[3].position.x);
  assert.deepEqual(plan.nodes.slice(1,4).map(node => node.color), ['blue', 'green', 'amber']);
  const snapshot = JSON.stringify(plan.nodes.map(n => n.position));
  layoutMarkdownTalk0229(plan);
  assert.equal(JSON.stringify(plan.nodes.map(n => n.position)), snapshot);
});

test('imported fixed headings produce matching 0.22.9 timing slots', () => {
  const plan = importMarkdownTalk0229('# Sujet\n\n## Partie A — 2 min\n\n## Partie B — 3 min',
    'Sans titre', {}, ids());
  const timing = computeTalkTiming0229(plan);
  assert.equal(timing.total, 300);
  assert.equal(timing.slots.get('node-2')?.start, 120);
  assert.equal(timing.slots.get('node-2')?.seconds, 180);
});

test('duplicate ids and more than 500 headings fail safely', () => {
  assert.throws(() => importMarkdownTalk0229('# Sujet\n## A\n## B',
    'Sans titre', {}, () => 'duplicate'), /dupliqué/);
  const headings = '# Sujet\n' + Array.from({length:501}, (_, i) => '## Carte '+i).join('\n');
  assert.throws(() => importMarkdownTalk0229(headings, 'Sans titre', {}, ids()), /500 sujets/);
});
