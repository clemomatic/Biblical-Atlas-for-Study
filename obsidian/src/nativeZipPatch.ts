/** Rewrites only named ZIP entries and preserves compressed media byte-for-byte.
 * Supports single-disk classic ZIP, rejects ZIP64 and malformed offsets.
 * Designed for large JW Library backups on memory-constrained mobile devices.
 */
import { deflateSync } from 'fflate';
const read16=(view:DataView,pos:number)=>view.getUint16(pos,true);
const read32=(view:DataView,pos:number)=>view.getUint32(pos,true);
const write16=(view:DataView,pos:number,value:number)=>view.setUint16(pos,value,true);
const write32=(view:DataView,pos:number,value:number)=>view.setUint32(pos,value,true);
const utf8=new TextDecoder('utf-8',{fatal:true});
const MAX_TOTAL=400*1024*1024;
type Entry={name:string;central:Uint8Array;localOffset:number;nameBytes:Uint8Array;time:number;date:number;flags:number;end:number};
const CRC_TABLE=Uint32Array.from({length:256},(_,n)=>{
  let x=n;for(let i=0;i<8;i++)x=x&1?0xedb88320^(x>>>1):x>>>1;
  return x>>>0;
});
function crc32(bytes:Uint8Array):number{
  let x=0xffffffff;
  for(const b of bytes)x=CRC_TABLE[(x^b)&255]^(x>>>8);
  return (x^0xffffffff)>>>0;
}
function compose(chunks:Uint8Array[]):Uint8Array{
  const size=chunks.reduce((total,chunk)=>total+chunk.length,0);
  if(size>MAX_TOTAL)throw Error('ZIP de sortie trop volumineux.');
  const joined=new Uint8Array(size);let offset=0;
  for(const chunk of chunks){joined.set(chunk,offset);offset+=chunk.length;}
  return joined;
}
export function replaceZipEntries(source:Uint8Array,replacements:Map<string,Uint8Array>):Uint8Array{
  if(source.length>MAX_TOTAL)throw Error('Archive d’origine trop volumineuse.');
  const view=new DataView(source.buffer,source.byteOffset,source.byteLength);
  let eocd=-1;
  for(let i=source.length-22;i>=Math.max(0,source.length-65557);i--){
    if(read32(view,i)===0x06054b50&&i+22+read16(view,i+20)===source.length){eocd=i;break;}
  }
  if(eocd<0)throw Error('Fin d’archive ZIP non reconnue.');
  if(read16(view,eocd+4)||read16(view,eocd+6))throw Error('ZIP multi-disque non pris en charge.');
  const count=read16(view,eocd+10),cdSize=read32(view,eocd+12),cdOffset=read32(view,eocd+16);
  if(count===0xffff||cdOffset===0xffffffff||cdSize===0xffffffff||count>10000||cdOffset+cdSize!==eocd)throw Error('Table ZIP non valide ou ZIP64.');
  let cursor=cdOffset;const entries:Entry[]=[];const seen=new Set<string>();
  for(let i=0;i<count;i++){
    if(cursor+46>eocd||read32(view,cursor)!==0x02014b50)throw Error('Entrée de répertoire ZIP invalide.');
    const nameLen=read16(view,cursor+28),extraLen=read16(view,cursor+30),commentLen=read16(view,cursor+32);
    const end=cursor+46+nameLen+extraLen+commentLen;
    if(end>eocd)throw Error('Répertoire ZIP tronqué.');
    const nameBytes=source.subarray(cursor+46,cursor+46+nameLen),name=utf8.decode(nameBytes);
    if(seen.has(name))throw Error('Entrée ZIP en double : '+name);
    seen.add(name);
    if(name.startsWith('/')||name.split('/').includes('..'))throw Error('Chemin ZIP interdit.');
    const localOffset=read32(view,cursor+42),flags=read16(view,cursor+8);
    if(localOffset>=cdOffset||localOffset+30>cdOffset||read32(view,localOffset)!==0x04034b50||flags&1)throw Error('En-tête ZIP local invalide ou chiffré.');
    entries.push({name,central:source.slice(cursor,end),localOffset,nameBytes,time:read16(view,cursor+12),date:read16(view,cursor+14),flags,end});
    cursor=end;
  }
  if(cursor!==eocd)throw Error('Taille du répertoire ZIP incohérente.');
  for(const name of replacements.keys())if(!seen.has(name))throw Error('Fichier ZIP à remplacer introuvable : '+name);
  const sorted=[...entries].sort((a,b)=>a.localOffset-b.localOffset);
  const offsets=new Map<string,number>();
  const blocks:Uint8Array[]=[];
  let outOffset=0;
  for(let i=0;i<sorted.length;i++){
    const entry=sorted[i],next=i+1<sorted.length?sorted[i+1].localOffset:cdOffset;
    if(next<=entry.localOffset||next>cdOffset)throw Error('En-têtes ZIP chevauchants.');
    offsets.set(entry.name,outOffset);
    const data=replacements.get(entry.name);
    let block:Uint8Array;
    if(data){
      if(data.length>MAX_TOTAL)throw Error('Fichier de sortie trop volumineux.');
      const packed=deflateSync(data,{level:1});
      const local=new Uint8Array(30+entry.nameBytes.length+packed.length);
      const h=new DataView(local.buffer);
      write32(h,0,0x04034b50);write16(h,4,20);
      write16(h,6,entry.flags&~0x0009);write16(h,8,8);
      write16(h,10,entry.time);write16(h,12,entry.date);
      write32(h,14,crc32(data));write32(h,18,packed.length);write32(h,22,data.length);
      write16(h,26,entry.nameBytes.length);write16(h,28,0);
      local.set(entry.nameBytes,30);local.set(packed,30+entry.nameBytes.length);
      block=local;
      const central=new DataView(entry.central.buffer,entry.central.byteOffset,entry.central.byteLength);
      write16(central,6,20);write16(central,8,entry.flags&~0x0009);write16(central,10,8);
      write32(central,16,crc32(data));write32(central,20,packed.length);write32(central,24,data.length);
    }else block=source.subarray(entry.localOffset,next);
    blocks.push(block);outOffset+=block.length;
  }
  const newCDOffset=outOffset;
  for(const entry of entries){
    const v=new DataView(entry.central.buffer,entry.central.byteOffset,entry.central.byteLength);
    write32(v,42,offsets.get(entry.name)!);
    blocks.push(entry.central);outOffset+=entry.central.length;
  }
  const newCDSize=outOffset-newCDOffset,comment=source.subarray(eocd+22);
  const end=new Uint8Array(22+comment.length);
  const ev=new DataView(end.buffer);
  write32(ev,0,0x06054b50);write16(ev,8,count);write16(ev,10,count);
  write32(ev,12,newCDSize);write32(ev,16,newCDOffset);write16(ev,20,comment.length);
  end.set(comment,22);blocks.push(end);
  return compose(blocks);
}
