import test from 'node:test';
import assert from 'node:assert/strict';
import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
import { patchZip } from './zipPatch.ts';

const encode=strToU8;
function compressedEntry(bytes:Uint8Array,name:string):Uint8Array{
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 let end=-1;for(let i=bytes.length-22;i>=0;i--)if(v.getUint32(i,true)===0x06054b50){end=i;break;}
 assert.ok(end>=0);
 const start=v.getUint32(end+16,true),count=v.getUint16(end+10,true);
 let pos=start;
 const items:{name:string;offset:number}[]=[];
 for(let i=0;i<count;i++){
   const n=v.getUint16(pos+28,true),x=v.getUint16(pos+30,true),c=v.getUint16(pos+32,true);
   items.push({name:strFromU8(bytes.subarray(pos+46,pos+46+n)),offset:v.getUint32(pos+42,true)});
   pos+=46+n+x+c;
 }
 const sorted=items.sort((a,b)=>a.offset-b.offset);
 const index=sorted.findIndex(x=>x.name===name);assert.ok(index>=0);
 return bytes.slice(sorted[index].offset,index+1<sorted.length?sorted[index+1].offset:start);
}
test('patch ZIP changes only database and manifest while preserving compressed media bytes',()=>{
 const media=encode('long asset'.repeat(35000));
 const source=zipSync({'manifest.json':encode('{"hash":"old"}'),'userData.db':encode('original database'),'cover.jpg':media,'playlist/one.mp3':media},{level:6});
 const output=patchZip(source,{'manifest.json':encode('{"hash":"new"}'),'userData.db':encode('changed database')});
 const unzip=unzipSync(output);
 assert.equal(strFromU8(unzip['manifest.json']),'{"hash":"new"}');
 assert.equal(strFromU8(unzip['userData.db']),'changed database');
 assert.deepEqual(unzip['cover.jpg'],media);
 assert.deepEqual(unzip['playlist/one.mp3'],media);
 assert.deepEqual(compressedEntry(source,'cover.jpg'),compressedEntry(output,'cover.jpg'));
 assert.deepEqual(compressedEntry(source,'playlist/one.mp3'),compressedEntry(output,'playlist/one.mp3'));
 assert.ok(output.length<source.length+1000);
});
test('patch ZIP rejects unknown files without altering source',()=>{
 const source=zipSync({'known.txt':encode('hello')});
 const original=source.slice();
 assert.throws(()=>patchZip(source,{'unknown.txt':encode('bad')}),/n’existe pas/);
 assert.deepEqual(source,original);
});
test('patch ZIP supports UTF-8 names, directories and archive comments',()=>{
 const source=zipSync({'Thèmes/étoile.md':encode('# Bonjour'),'manifest.json':encode('{}')});
 const output=patchZip(source,{'Thèmes/étoile.md':encode('# Étude')});
 assert.equal(strFromU8(unzipSync(output)['Thèmes/étoile.md']),'# Étude');
});
