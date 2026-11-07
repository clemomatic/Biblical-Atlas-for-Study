import test from 'node:test';
import assert from 'node:assert/strict';
import {editorialNotes,noteComparison,studyNoteRanges,translationChunks} from './studyNoteData.ts';
import {readingSettings} from './readingSettings.ts';
test('Only absent French verse notes establish an absence; different IDs never do',()=>{
  const french=[{id:'1',verse:'40001001',html:'Français'}];
  const english=[{id:'2',verse:'40001001',html:'English A'},{id:'3',verse:'40001002',html:'English B'}];
  assert.deepEqual(noteComparison(french,english).map(n=>n.missingFrench),[false,true]);
});
test('Official API note records preserve the source verse and reject malformed rows',()=>{
  const data={ranges:{'40001001':{commentaries:[{id:5,source:'40001001',content:'<p>Une note.</p>'},
    {id:6,source:'incorrect',content:'<p>Erronée.</p>'}]}}};
  assert.deepEqual(editorialNotes(data),[{id:'5',verse:'40001001',html:'<p>Une note.</p>'}]);
  assert.throws(()=>editorialNotes({}));
});
test('The study lookup keeps disjoint and cross-chapter verse coordinates',()=>{
  assert.deepEqual(studyNoteRanges('Jean 3:16,18'),['43003016','43003018']);
  assert.deepEqual(studyNoteRanges('Daniel 1:1–3:30'),['27001001-27003030']);
  assert.deepEqual(studyNoteRanges('Invalide'),[]);
});
test('Free translation chunks respect UTF-8 bytes without dropping or breaking Unicode',()=>{
  for(const text of ['été déjà 🙂 '.repeat(100),'é'.repeat(1000),'Une phrase. Une autre phrase.']){
    const chunks=translationChunks(text);
    assert.equal(chunks.join(''),text);
    assert.ok(chunks.every(c=>new TextEncoder().encode(c).length<=480));
    assert.ok(chunks.every(c=>!c.includes('\uFFFD')));
  }
});
test('Reader settings migrate old data without silently enabling online notes',()=>{
  assert.equal(readingSettings(undefined).englishNotes,false);
  assert.equal(readingSettings({mode:'panel',closeOnOutsideClick:false}).mode,'panel');
  assert.equal(readingSettings({mode:'panel',closeOnOutsideClick:false}).closeOnOutsideClick,false);
  assert.equal(readingSettings({mode:'invalid'}).mode,'popup');
});
