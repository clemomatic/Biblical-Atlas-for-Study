import test from 'node:test';
import assert from 'node:assert/strict';
import { addResearchCapture,addResearchIdea,assignCaptureToIdea,emptyResearchCollection,renameResearchIdea,removeResearchCapture } from './researchCollection.ts';
import { connectionsForIdea,researchDossierMarkdown } from './researchConnections.ts';

test('Connections appear only for actual shared captures and disappear when removed',()=>{
  let c=emptyResearchCollection();
  c=addResearchCapture(c,{label:'Jean 7:24',url:'https://wol.jw.org/fr/wol/b/r30/lp-f/nwt/43/7'});
  const source=c.captures[0].id;
  c=addResearchIdea(c);const a=c.ideas[0].id;
  c=addResearchIdea(c);const b=c.ideas[0].id;
  c=assignCaptureToIdea(c,a,source);
  c=assignCaptureToIdea(c,b,source);
  assert.deepEqual(connectionsForIdea(c,a),[{ideaId:b,sharedCaptureIds:[source]}]);
  c=removeResearchCapture(c,source);
  assert.deepEqual(connectionsForIdea(c,a),[]);
});
test('Dossier contains citations, excerpts and explicitly shared connections',()=>{
  let c=addResearchCapture(emptyResearchCollection(),{
    label:'Jean 7:24',excerpt:'Jugez avec justice',
    comment:'À approfondir',url:'https://wol.jw.org/fr/wol/b/r30/lp-f/nwt/43/7'
  });
  const source=c.captures[0].id;
  c=addResearchIdea(c);const a=c.ideas[0].id;
  c=addResearchIdea(c);const b=c.ideas[0].id;
  c=renameResearchIdea(c,a,'Le discernement');
  c=renameResearchIdea(c,b,'La justice');
  c=assignCaptureToIdea(c,a,source);
  c=assignCaptureToIdea(c,b,source);
  const md=researchDossierMarkdown(c);
  assert.match(md,/Le discernement/);
  assert.match(md,/La justice/);
  assert.match(md,/Idées reliées/);
  assert.match(md,/Jugez avec justice/);
  assert.match(md,/À approfondir/);
  assert.match(md,/https:\/\/wol\.jw\.org/);
});
