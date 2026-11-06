import test from 'node:test';
import assert from 'node:assert/strict';
import {PublicationDownloads,downloadKey} from './publicationDownloads.ts';

test('Downloads canonicalize Insight, deduplicate clicks and serialize heavy files',async()=>{
  const calls:string[]=[];let release:()=>void=()=>{};
  const hold=new Promise<void>(resolve=>{release=resolve;});
  const queue=new PublicationDownloads(async(symbol,_issue,progress)=>{
    calls.push(symbol);progress({stage:'downloading'});
    if(symbol==='it')await hold;
    return true;
  });
  const first=queue.download('it-1');assert.equal(queue.download('it-2'),first);
  const next=queue.download('nwtsty');await Promise.resolve();
  assert.deepEqual(calls,['it']);assert.equal(queue.get('nwtsty')?.stage,'queued');
  assert.equal(downloadKey('IT-2'),'it|');release();await Promise.all([first,next]);
  assert.deepEqual(calls,['it','nwtsty']);assert.equal(queue.get('it')?.stage,'ready');
});
test('A failed transfer exposes its reason, does not block the next file and can be retried',async()=>{
  let attempts=0;const changes:string[]=[];
  const queue=new PublicationDownloads(async symbol=>{
    if(symbol==='it'&&attempts++===0)throw Error('Connexion interrompue.');return true;
  });
  const unsubscribe=queue.subscribe(key=>changes.push(key));
  await queue.download('it');assert.equal(queue.get('it')?.error,'Connexion interrompue.');
  await queue.download('nwtsty');assert.equal(queue.get('nwtsty')?.stage,'ready');
  await queue.download('it');assert.equal(queue.get('it')?.stage,'ready');
  assert.ok(changes.includes('it|'));unsubscribe();
});
test('Unloading the plugin prevents a queued job from beginning',async()=>{
  let release:()=>void=()=>{};const hold=new Promise<void>(resolve=>{release=resolve;});const calls:string[]=[];
  const queue=new PublicationDownloads(async symbol=>{calls.push(symbol);await hold;return true;});
  const first=queue.download('it'),second=queue.download('nwtsty');await Promise.resolve();
  queue.dispose();release();await Promise.all([first,second]);assert.deepEqual(calls,['it']);
});
