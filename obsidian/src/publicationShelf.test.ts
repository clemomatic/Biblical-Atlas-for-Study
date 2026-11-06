import test from 'node:test';
import assert from 'node:assert/strict';
import {publicationShelf,filterPublicationShelf,publicationSeries,type ShelfLocalVolume} from './publicationShelf.ts';
import {FEATURED_JW_ORG,type JwCatalogEntry} from './jwOrgCatalog.ts';
const official=(symbol='w',issue='202609',title='La Tour de Garde'):JwCatalogEntry=>({symbol,issue,title,category:'magazines',coverUrl:'',sourcePage:''});
const local=(change:Partial<ShelfLocalVolume>={}):ShelfLocalVolume=>({symbol:'w',issue:'202609',title:'La Tour de Garde',language:3,path:'Imports/w',category:'magazines',origin:'download',...change});

test('One shelf merges an exact downloaded edition and prefers its readable virtual copy',()=>{
  const shelf=publicationShelf([official()],[local(),local({path:'Virtual/w',virtual:true})]);
  assert.equal(shelf.length,1);assert.equal(shelf[0].local?.path,'Virtual/w');
});
test('Unlisted private books, distinct private titles and foreign editions are never lost',()=>{
  const shelf=publicationShelf([official()],[local(),local({title:'Mes instructions',path:'Imports/private'}),local({language:0,path:'Imports/en'}),local({symbol:'s-38',title:'Mon manuel',path:'Imports/school'})]);
  assert.equal(shelf.length,4);
  assert.equal(shelf.filter(item=>item.local).length,4);
});
test('Edition matching keeps two magazine issues distinct and does not install another issue',()=>{
  const shelf=publicationShelf([official(),official('w','202701')],[local()]);
  assert.equal(shelf.length,2);assert.equal(shelf[1].local,null);
});
test('Availability, category and accent-insensitive multiple-word search work together',()=>{
  const shelf=publicationShelf([official(),official('w','202701','Étudier avec patience')],[local()]);
  assert.equal(filterPublicationShelf(shelf,'magazines','PATience etudier').length,1);
  assert.equal(filterPublicationShelf(shelf,'all','',true).length,1);
  assert.equal(filterPublicationShelf(shelf,'personal','').length,0);
});
test('Magazine series group editions in reverse date order without grouping foreign copies',()=>{
  const shelf=publicationShelf([official(),official('w','202701')],[local({language:0,path:'en/w'})]);
  const groups=publicationSeries(shelf);
  assert.equal(groups.length,2);const series=groups.find(group=>group.entries.length===2)!;
  assert.equal(series.entries[0].issue,'202701');assert.ok(groups.some(group=>group.entries.length===1));
});
test('Offline fallback offers both Bible editions and one complete Insight download',()=>{
  for(const symbol of ['nwt','nwtsty','it'])assert.ok(FEATURED_JW_ORG.some(item=>item.symbol===symbol));
  assert.equal(FEATURED_JW_ORG.filter(item=>item.symbol.startsWith('it')).length,1);
});
