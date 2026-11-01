import test from 'node:test';
import assert from 'node:assert/strict';
import {zipSync,unzipSync,strToU8,strFromU8} from 'fflate';
import {replaceZipEntries} from './nativeZipPatch.ts';
function makeSource(){
  return zipSync({
    'manifest.json':strToU8('{"hash":"old"}'),
    'userData.db':new Uint8Array(1024).fill(42),
    'photo.jpg':new Uint8Array(25000).map((_,i)=>i&255),
    'media/clip.bin':new Uint8Array(45000).fill(11)
  },{level:6});
}
test('ZIP patch preserves all media bytes and restores new manifest/database',()=>{
  const input=makeSource();
  const original=unzipSync(input);
  const newDb=new Uint8Array(1800).fill(27);
  const output=replaceZipEntries(input,new Map([
    ['manifest.json',strToU8('{"hash":"new"}')],
    ['userData.db',newDb]
  ]));
  const changed=unzipSync(output);
  assert.equal(strFromU8(changed['manifest.json']),'{"hash":"new"}');
  assert.deepEqual(changed['userData.db'],newDb);
  assert.deepEqual(changed['photo.jpg'],original['photo.jpg']);
  assert.deepEqual(changed['media/clip.bin'],original['media/clip.bin']);
  assert.equal(Object.keys(changed).length,Object.keys(original).length);
  assert.deepEqual(unzipSync(input)['userData.db'],original['userData.db']);
});
test('ZIP patch rejects absent files and corrupt central-directory pointers',()=>{
  const input=makeSource();
  assert.throws(()=>replaceZipEntries(input,new Map([['missing.db',new Uint8Array(3)]])),/introuvable/);
  const corrupt=new Uint8Array(input);
  corrupt[corrupt.length-20]=0xff;
  assert.throws(()=>replaceZipEntries(corrupt,new Map([['userData.db',new Uint8Array(3)]])));
});
