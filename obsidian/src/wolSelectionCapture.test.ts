import test from 'node:test';
import assert from 'node:assert/strict';
import {
  wolArticleTitle,parseWolPageSnapshot,quoteFromWolSelection,
  sourceFromWolPage,WOL_PAGE_SNAPSHOT_SCRIPT
} from './wolSelectionCapture.ts';

const url='https://wol.jw.org/fr/wol/d/r30/lp-f/2024663';
test('Title is taken from the article, not its numeric WOL URL',()=>{
  assert.equal(wolArticleTitle('Comment devenir de véritables amis ? — BIBLIOTHÈQUE EN LIGNE Watchtower'),
    'Comment devenir de véritables amis ?');
  assert.equal(wolArticleTitle('Consulter'),'');
  assert.equal(sourceFromWolPage({title:'L’amitié véritable',url,paragraphUrl:'',selectionText:''},url)?.label,
    'L’amitié véritable');
  assert.equal(sourceFromWolPage(null,url)?.label,'Article WOL · titre à compléter');
});
test('Saved excerpt keeps the exact paragraph anchor and the original title',()=>{
  const snapshot=parseWolPageSnapshot({
    title:'Aimez-vous les uns les autres',
    url,selectionText:'Le véritable amour se manifeste par les actes.',
    paragraphUrl:url+'#h=5'
  });
  assert.deepEqual(quoteFromWolSelection(snapshot,'Le véritable amour se manifeste par les actes.',url),{
    label:'Aimez-vous les uns les autres',
    excerpt:'Le véritable amour se manifeste par les actes.',url:url+'#h=5',comment:''
  });
});
test('Wrong-domain or wrong-document anchors are never accepted',()=>{
  assert.equal(parseWolPageSnapshot({title:'X',url:'https://wol.jw.org.attacker.tld/page'}),null);
  const snapshot=parseWolPageSnapshot({
    title:'Une pensée',url,paragraphUrl:'https://wol.jw.org/fr/wol/d/r30/lp-f/9876543#h=4',
    selectionText:'Une idée.'
  });
  assert.equal(snapshot?.paragraphUrl,'');
  assert.equal(quoteFromWolSelection(snapshot,'Une idée.',url)?.url,url);
  assert.equal(quoteFromWolSelection(snapshot,'',url),null);
});
test('No guessed paragraph number; script only inspects title, selection and adjacent link',()=>{
  assert.match(WOL_PAGE_SNAPSHOT_SCRIPT,/selection\.toString/);
  assert.match(WOL_PAGE_SNAPSHOT_SCRIPT,/paragraphUrl/);
  assert.doesNotMatch(WOL_PAGE_SNAPSHOT_SCRIPT,/cookie|localStorage|sessionStorage/);
});

test('Guest-side selection extraction reads real nearby paragraph links, never adjacent paragraphs',()=>{
  const article='https://wol.jw.org/fr/wol/d/r30/lp-f/2024663';
  const anchor={getAttribute:()=> '#h=7'};
  const body={
    querySelectorAll:()=> [{},{}],
    parentElement:null
  };
  const paragraph={
    querySelectorAll:(selector:string)=>selector==='p'?[]:[anchor],
    parentElement:body
  };
  const node={
    nodeType:1,
    closest:(selector:string)=>selector==='a[href]'?null:paragraph
  };
  const selection={
    rangeCount:1,getRangeAt:()=>({startContainer:node}),
    toString:()=> 'La véritable amitié.'
  };
  const windowMock={
    getSelection:()=>selection,
    location:{
      href:article,origin:'https://wol.jw.org',
      pathname:'/fr/wol/d/r30/lp-f/2024663'
    }
  };
  const documentMock={
    title:'Bibliothèque en ligne Watchtower',
    querySelector:(selector:string)=>selector.includes('h1')
      ?{textContent:'Une véritable amitié'}:null
  };
  const snapshot=(new Function('window','document','URL',
    'return '+WOL_PAGE_SNAPSHOT_SCRIPT))(windowMock,documentMock,URL);
  assert.equal(snapshot.title,'Une véritable amitié');
  assert.equal(snapshot.paragraphUrl,article+'#h=7');
  assert.equal(snapshot.selectionText,'La véritable amitié.');
  paragraph.querySelectorAll=()=>[];
  assert.equal((new Function('window','document','URL',
    'return '+WOL_PAGE_SNAPSHOT_SCRIPT))(windowMock,documentMock,URL).paragraphUrl,'');
});
