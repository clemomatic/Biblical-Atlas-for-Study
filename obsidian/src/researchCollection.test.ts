import test from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyResearchCollection,addResearchCapture,addResearchIdea,
  normalizeResearchCollection,assignCaptureToIdea,unassignedResearchCaptures,
  renameResearchIdea,moveIdeaCapture,ideaMarkdown,unassignCaptureFromIdea,
  deleteResearchIdea,removeResearchCapture,updateResearchCapture
} from './researchCollection.ts';

test('Capture can remain unclassified without an idea or research plan',()=>{
  const store=addResearchCapture(emptyResearchCollection(),{
    label:'Une référence passionnante',excerpt:'Un extrait pour plus tard.',
    url:'https://wol.jw.org/fr/wol/d/r30/lp-f/2024663#h=3'
  });
  assert.equal(store.captures.length,1);
  assert.equal(store.ideas.length,0);
  assert.equal(store.captures[0].planId,null);
  assert.equal(unassignedResearchCaptures(store).length,1);
  assert.ok(store.captures[0].url.endsWith('#h=3'));
  assert.deepEqual(normalizeResearchCollection(JSON.parse(JSON.stringify(store))),store);
});
test('An idea renders its sentence with ordered WOL links between parentheses',()=>{
  let store=emptyResearchCollection();
  store=addResearchCapture(store,{label:'Jean 7:24',
    url:'https://wol.jw.org/fr/wol/b/r30/lp-f/nwt/43/7',excerpt:'Juger avec justice'});
  const first=store.captures[0].id;
  store=addResearchCapture(store,{label:'w24 novembre p. 7 § 2',
    url:'https://wol.jw.org/fr/wol/d/r30/lp-f/2024663#h=3'});
  const second=store.captures[0].id;
  store=addResearchIdea(store);
  const ideaId=store.ideas[0].id;
  store=renameResearchIdea(store,ideaId,'Les anciens doivent cultiver l’amitié');
  store=assignCaptureToIdea(store,ideaId,first);
  store=assignCaptureToIdea(store,ideaId,second);
  store=assignCaptureToIdea(store,ideaId,second);
  assert.equal(store.ideas[0].captureIds.length,2);
  store=moveIdeaCapture(store,ideaId,second,-1);
  assert.equal(ideaMarkdown(store.ideas[0],store),
    'Les anciens doivent cultiver l’amitié ([w24 novembre p. 7 § 2](https://wol.jw.org/fr/wol/d/r30/lp-f/2024663#h=3) ; [Jean 7:24](https://wol.jw.org/fr/wol/b/r30/lp-f/nwt/43/7))');
  store=unassignCaptureFromIdea(store,ideaId,first);
  assert.equal(store.captures.length,2,'Removing from an idea does not delete research sources');
  store=deleteResearchIdea(store,ideaId);
  assert.equal(unassignedResearchCaptures(store).length,2);
});
test('Deleted captures no longer leave phantom citations; invalid sites are never exported',()=>{
  let store=addResearchCapture(emptyResearchCollection(),{
    label:'Article',url:'https://wol.jw.org.attacker.example/fr/wol/d/r30/lp-f/22'
  });
  assert.equal(store.captures[0].url,'');
  store=updateResearchCapture(store,store.captures[0].id,{url:'https://wol.jw.org/fr/wol/d/r30/lp-f/22#h=2'});
  store=addResearchIdea(store);
  const id=store.ideas[0].id,source=store.captures[0].id;
  store=assignCaptureToIdea(store,id,source);
  store=removeResearchCapture(store,source);
  assert.equal(store.ideas[0].captureIds.length,0);
  assert.equal(ideaMarkdown(store.ideas[0],store),'');
});
