import test from 'node:test';
import assert from 'node:assert/strict';
import {
 classifyLibraryPublication,chooseLocalCover,documentSearchSnippet,
 normalizeLibrarySearch,stripImportFrontmatter,lookupLocalDocumentId,bibleJwpubWebLink
} from './localLibraryCatalog.ts';
test('French personal publication categories are deterministic and independent of internet access',()=>{
 assert.equal(classifyLibraryPublication('nwt','La Bible'),'bible');
 assert.equal(classifyLibraryPublication('w26','La Tour de Garde'),'revue');
 assert.equal(classifyLibraryPublication('co-pgm26','Programme de l’assemblée régionale'),'programme');
 assert.equal(classifyLibraryPublication('s-38','Instructions pour les écoles'),'ecole');
 assert.equal(classifyLibraryPublication('it-1','Étude perspicace des Écritures'),'livre');
 assert.equal(classifyLibraryPublication('x42','Documents personnels'),'personnel');
 assert.equal(normalizeLibrarySearch('ÉCOLES et Références'),'ecoles et references');
});
test('Only real named local cover files are eligible',()=>{
 assert.equal(chooseLocalCover(['assets/figure.png','assets/cover.jpg','assets/image.jpg']),'assets/cover.jpg');
 assert.equal(chooseLocalCover(['assets/fig1.jpg','assets/illustration.webp']),null);
 assert.equal(chooseLocalCover(['../../private/cover.jpg']),null);
});
test('Search excerpts strip YAML and preserve surrounding text',()=>{
 const body='---\nsource_meps_docid: 2026001\n---\n# Chapitre\n\nJéhovah est plein de bonté et de sagesse.';
 assert.equal(stripImportFrontmatter(body),'# Chapitre\n\nJéhovah est plein de bonté et de sagesse.');
 assert.match(documentSearchSnippet(body,'BONTÉ'),/bonté/);
 assert.doesNotMatch(documentSearchSnippet(body,'bonté'),/source_meps_docid/);
});
test('Internal publication links are resolved only with exact numeric IDs',()=>{
 assert.equal(lookupLocalDocumentId('jwpub://p/F:2026067/12-14'),2026067);
 assert.equal(lookupLocalDocumentId('jwpub://p/F:2026067/'),2026067);
 assert.equal(lookupLocalDocumentId('jwpub://p/F:wrong'),null);
 assert.equal(lookupLocalDocumentId('https://fake.invalid/jwpub://p/F:2026067'),null);
 assert.equal(bibleJwpubWebLink('jwpub://b/NWTR/43:7:24'),
 'https://wol.jw.org/fr/wol/b/r30/lp-f/nwt/43/7');
 assert.equal(bibleJwpubWebLink('jwpub://b/NWTR/999:1:1'),null);
});
