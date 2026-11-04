import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyLibraryVolume,filteredVolumes,localDocumentUrl,LIBRARY_FILTERS,jwpubPublicationId} from './libraryCatalog.ts';

test('Bookcase categories are stable in French without treating private files as public',()=>{
 assert.equal(classifyLibraryVolume('nwt','Traduction du monde nouveau'),'bible');
 assert.equal(classifyLibraryVolume('w26','La Tour de Garde'),'magazines');
 assert.equal(classifyLibraryVolume('ca-copgm27','Programme'), 'assemblies');
 assert.equal(classifyLibraryVolume('s-38','Instructions'),'schools');
 assert.equal(classifyLibraryVolume('it-1','Étude perspicace des Écritures'),'books');
 assert.equal(classifyLibraryVolume('personal','Carnet personnel'),'other');
 assert.equal(LIBRARY_FILTERS[0].title,'Tout');
});
test('The personal shelf includes only explicitly imported local publications',()=>{
 const volume={title:'A',symbol:'w',year:2026,language:3,documents:1,path:'safe/Imports/A',
   items:[],coverPath:null,category:'magazines' as const};
 const list=[{...volume,origin:'personal' as const},{...volume,title:'B',origin:'download' as const}];
 assert.deepEqual(filteredVolumes(list,'personal').map(v=>v.title),['A']);
 assert.deepEqual(filteredVolumes(list,'magazines').map(v=>v.title),['A','B']);
});
test('Only an explicit French MEPS ID creates a WOL deep link',()=>{
 const volume={title:'A',symbol:'w',year:2026,language:3,documents:1,path:'safe/Imports/A',
  items:[],coverPath:null,category:'magazines' as const,origin:'personal' as const};
 const item={documentId:4,mepsId:2026440,title:'Article',path:'004 · Article.md'};
 assert.equal(localDocumentUrl(volume,item),'https://wol.jw.org/fr/wol/d/r30/lp-f/2026440');
 assert.equal(localDocumentUrl({...volume,language:0},item),null);
 assert.equal(localDocumentUrl(volume,{...item,mepsId:null}),null);
});

test('JWPUB cross-publication links resolve by ID locally, without online guesses',()=>{
 assert.equal(jwpubPublicationId('jwpub://p/F:2026440/7-7'),2026440);
 assert.equal(jwpubPublicationId('jwpub://p/X:1102016902/'),1102016902);
 assert.equal(jwpubPublicationId('jwpub://b/NWTR/1:1:1'),null);
 assert.equal(jwpubPublicationId('https://wol.jw.org/fr/wol/d/r30/lp-f/2026440'),null);
 assert.equal(jwpubPublicationId('jwpub://p/F:0/'),null);
});
