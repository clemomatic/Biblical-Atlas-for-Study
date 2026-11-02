/* Lossless ZIP patcher: unchanged entries stay compressed, byte-for-byte.
 * Only the changed SQLite database and manifest are recompressed. Preserves
 * original media, ZIP metadata, ordering and file names; avoids inflating the
 * complete JW Library archive on Android. Standard non-ZIP64 archives only. */
import { zipSync } from 'fflate';

type Entry={name:string;localOffset:number;central:Uint8Array;local:Uint8Array};
const text=new TextDecoder('utf-8');
function endRecord(data:Uint8Array):number{
  const v=new DataView(data.buffer,data.byteOffset,data.byteLength);
  for(let p=data.length-22;p>=Math.max(0,data.length-65557);p--)
    if(v.getUint32(p,true)===0x06054b50 && p+22+v.getUint16(p+20,true)===data.length)return p;
  throw Error('Fin de ZIP introuvable.');
}
function readEntries(data:Uint8Array):{entries:Entry[];eocd:number;comment:Uint8Array}{
 const v=new DataView(data.buffer,data.byteOffset,data.byteLength),eocd=endRecord(data);
 const count=v.getUint16(eocd+10,true),centralStart=v.getUint32(eocd+16,true),centralLen=v.getUint32(eocd+12,true);
 if(v.getUint16(eocd+4,true)!==0||v.getUint16(eocd+6,true)!==0||v.getUint16(eocd+8,true)!==count||
   count<1||count>10000||centralStart+centralLen>eocd)throw Error('ZIP multivolume ou table invalide.');
 let p=centralStart;
 const entries:Entry[]=[];const names=new Set<string>();
 for(let i=0;i<count;i++){
   if(p+46>data.length||v.getUint32(p,true)!==0x02014b50)throw Error('En-tête ZIP invalide.');
   const len=v.getUint16(p+28,true),extra=v.getUint16(p+30,true),comment=v.getUint16(p+32,true);
   const size=46+len+extra+comment,offset=v.getUint32(p+42,true);
   if(p+size>centralStart+centralLen||offset>=centralStart)throw Error('Entrée ZIP tronquée.');
   if(v.getUint32(p+20,true)===0xffffffff||v.getUint32(p+24,true)===0xffffffff||
     offset===0xffffffff)throw Error('ZIP64 non pris en charge.');
   if(v.getUint16(p+8,true)&1)throw Error('ZIP chiffré non pris en charge.');
   const name=text.decode(data.subarray(p+46,p+46+len));
   if(names.has(name)||name.startsWith('/')||name.includes('\\')||name.split('/').includes('..'))
     throw Error('Nom ZIP non sécurisé ou en double.');
   names.add(name);entries.push({name,localOffset:offset,central:data.slice(p,p+size),local:new Uint8Array()});p+=size;
 }
 if(p!==centralStart+centralLen)throw Error('Taille de table ZIP invalide.');
 const sorted=[...entries].sort((a,b)=>a.localOffset-b.localOffset);
 for(let i=0;i<sorted.length;i++){
   const item=sorted[i];const end=i+1<sorted.length?sorted[i+1].localOffset:centralStart;
   if(end<=item.localOffset||v.getUint32(item.localOffset,true)!==0x04034b50)
     throw Error('En-tête de fichier ZIP invalide.');
   item.local=data.subarray(item.localOffset,end);
 }
 return {entries,eocd,comment:data.slice(eocd+22)};
}
export function patchZip(original:Uint8Array, replacements:Record<string,Uint8Array>):Uint8Array{
 const {entries,comment}=readEntries(original);
 const requested=new Set(Object.keys(replacements));
 const parts=new Map<string,{local:Uint8Array;central:Uint8Array}>();
 for(const entry of entries){
   const bytes=replacements[entry.name];
   if(bytes===undefined){parts.set(entry.name,{local:entry.local,central:entry.central});continue;}
   requested.delete(entry.name);
   const mini=zipSync({[entry.name]:[bytes,{level:6}]} as any);
   const parsed=readEntries(mini).entries[0];
   parts.set(entry.name,{local:parsed.local,central:parsed.central});
 }
 if(requested.size)throw Error('Un des fichiers à modifier n’existe pas dans la sauvegarde.');
 const outputChunks:{name:string;data:Uint8Array}[]=[];
 const offsets=new Map<string,number>();
 let position=0;
 for(const item of [...entries].sort((a,b)=>a.localOffset-b.localOffset)){
   const chunk=parts.get(item.name)!.local;
   offsets.set(item.name,position);outputChunks.push({name:item.name,data:chunk});position+=chunk.length;
 }
 const centralStart=position;
 for(const item of entries){
   const header=parts.get(item.name)!.central.slice();
   new DataView(header.buffer,header.byteOffset,header.byteLength).setUint32(42,offsets.get(item.name)!,true);
   outputChunks.push({name:item.name,data:header});position+=header.length;
 }
 const centralSize=position-centralStart;
 if(position>0xffffffff)throw Error('Nouvelle archive trop volumineuse.');
 const tail=new Uint8Array(22+comment.length),v=new DataView(tail.buffer);
 v.setUint32(0,0x06054b50,true);
 v.setUint16(8,entries.length,true);v.setUint16(10,entries.length,true);
 v.setUint32(12,centralSize,true);v.setUint32(16,centralStart,true);
 v.setUint16(20,comment.length,true);tail.set(comment,22);
 const result=new Uint8Array(position+tail.length);
 let at=0;for(const chunk of outputChunks){result.set(chunk.data,at);at+=chunk.data.length;}
 result.set(tail,at);
 return result;
}
