import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateTalkPlan0229, readTalkPlan0229, writeTalkPlan0229,
  companionPlaylistPath, assertPlaylistReplacementAllowed,
  initialSpeakerState, toggleSpeakerFollow
} from './talkStudio0229Recovery.ts';

const plan = () => ({
  version: 1 as const,
  kind: 'public' as const,
  status: 'draft' as const,
  target: 1800, favorite: false, tags: ['préparation'],
  nodes: [
    { id: 'theme', parent: null, title: 'Mon discours', note: '',
      position: { x: 0, y: 0 }, color: 'blue' as const,
      mode: 'auto' as const, seconds: 0, collapsed: false,
      references: [], images: [] },
    { id: 'part-a', parent: 'theme', title: 'Première partie', note: 'Lire Jean 7:24',
      position: { x: 250, y: 0 }, color: 'green' as const,
      mode: 'fixed' as const, seconds: 600, collapsed: false,
      references: [{ label: 'Jean 7:24', url: 'https://wol.jw.org/fr/wol/b/r30/lp-f/nwt/43/7', read: false }],
      images: [] }
  ],
  relations: [],
  introSong: { number: 144, title: 'Fixons nos regards sur le prix !',
    url: 'https://www.jw.org/fr/biblioth%C3%A8que/musique-chansons/chantons-joyeusement/144-fixons-nos-regards-sur-le-prix/' },
  outline: { collectionId: 'test', templateId: 'outline', revision: 'a'.repeat(64) },
  xmind: { archive: 'a'.repeat(64), sheet: 0, filename: 'carte.xmind' }
});

test('0.22.9 cards keep their theme, branches, hymn and unknown project fields', () => {
  const valid = validateTalkPlan0229(plan());
  assert.equal(valid.nodes[0].id, 'theme');
  assert.equal(valid.introSong?.number, 144);
  assert.deepEqual(valid.outline, { collectionId: 'test', templateId: 'outline', revision: 'abc' });
});

test('read and write preserve surrounding Markdown and all original metadata', () => {
  const input = '---\nbible_lab_kind: discourse\njwsd_discours: 1\n---\n\n# Titre\n\n' +
    '```jwsd-discours\n' + JSON.stringify(plan()) + '\n```\n\n## Notes personnelles\n\nSans modification.\n';
  const parsed = readTalkPlan0229(input);
  const output = writeTalkPlan0229(input, input, parsed);
  assert.ok(output.startsWith('---\nbible_lab_kind: discourse\njwsd_discours: 1\n---'));
  assert.ok(output.endsWith('## Notes personnelles\n\nSans modification.\n'));
  assert.deepEqual(readTalkPlan0229(output).xmind, plan().xmind);
  assert.equal(readTalkPlan0229(output).introSong?.number, 144);
  assert.throws(() => writeTalkPlan0229(input, 'une autre version', parsed), /changé/);
});

test('invalid or cycled card structures are rejected before save', () => {
  const cyclic = plan();
  cyclic.nodes[1].parent = 'part-a';
  assert.throws(() => validateTalkPlan0229(cyclic), /cyclique/);
  assert.throws(() => validateTalkPlan0229({ ...plan(), nodes: [] }), /inconnu ou incomplet/);
  assert.throws(() => readTalkPlan0229('# Une note sans carte'), /jwsd-discours/);
});

test('only hymns from current official songbook range are accepted', () => {
  assert.throws(() => validateTalkPlan0229({ ...plan(), introSong: { ...plan().introSong, number: 165 } }), /cantique/);
  assert.throws(() => validateTalkPlan0229({ ...plan(), introSong: { ...plan().introSong, url: 'https://evil.test/song' } }), /cantique/);
});

test('playlist path is a safe sibling of the Markdown project', () => {
  assert.equal(companionPlaylistPath('Etude/Discours/Mon discours.md'), 'Etude/Discours/Mon discours.jwlplaylist');
  for (const unsafe of ['../Plan.md', 'Etude/../Plan.md', '/tmp/Plan.md', 'file.txt', 'Etude//Plan.md']) {
    assert.throws(() => companionPlaylistPath(unsafe), /invalide/);
  }
  assert.throws(() => assertPlaylistReplacementAllowed(true, false), /Confirme/);
  assert.doesNotThrow(() => assertPlaylistReplacementAllowed(true, true));
  assert.doesNotThrow(() => assertPlaylistReplacementAllowed(false, false));
});

test('speaker follows current branch by default, and the control is reversible', () => {
  const initial = initialSpeakerState();
  assert.equal(initial.followBranch, true);
  assert.equal(initial.inlineNotes, true);
  assert.equal(toggleSpeakerFollow(initial).followBranch, false);
  assert.deepEqual(toggleSpeakerFollow(toggleSpeakerFollow(initial)), initial);
});

test('0.22.9 validates map layout, source and original template fingerprints', () => {
  assert.doesNotThrow(() => validateTalkPlan0229({
    ...plan(), mapLayout:'free', source:'JWPub source ID',
    lastRehearsal:{date:Date.now(),seconds:1234,checkpoints:{theme:0,'part-a':500}}
  }));
  assert.throws(() => validateTalkPlan0229({
    ...plan(), mapLayout:'unexpected'
  }), /format inconnu/);
  assert.throws(() => validateTalkPlan0229({
    ...plan(), outline:{collectionId:'test',templateId:'outline',revision:'bad'}
  }), /modèle de discours/);
  assert.throws(() => validateTalkPlan0229({
    ...plan(), xmind:{archive:'bad',sheet:0,filename:'plan.xmind'}
  }), /XMind/);
});

test('0.22.9 rejects corrupt map styles and references before modifying Markdown', () => {
  const badWidth = plan(); badWidth.nodes[1].mapWidth = 1000;
  assert.throws(() => validateTalkPlan0229(badWidth), /bulle/);
  const badPosition = plan(); badPosition.nodes[1].position.x = 1000000;
  assert.throws(() => validateTalkPlan0229(badPosition), /bulle/);
  const badReference = plan(); badReference.nodes[1].references[0].read = undefined as unknown as boolean;
  assert.throws(() => validateTalkPlan0229(badReference), /bulle/);
  const badImage = plan(); badImage.nodes[1].images.push({
    path:'illustration.png', caption:'', show:true, mapRatio:9
  });
  assert.throws(() => validateTalkPlan0229(badImage), /bulle/);
});

test('archivedFrom must match the archived state, invalid rehearsals fail', () => {
  assert.throws(() => validateTalkPlan0229({...plan(), archivedFrom:'draft'}), /format inconnu/);
  assert.doesNotThrow(() => validateTalkPlan0229({...plan(), status:'archived', archivedFrom:'ready'}));
  assert.throws(() => validateTalkPlan0229({
    ...plan(), lastRehearsal:{date:NaN,seconds:300,checkpoints:{}}
  }), /répétition/);
});
