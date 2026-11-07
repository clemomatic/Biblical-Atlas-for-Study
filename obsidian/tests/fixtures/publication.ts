import {zipSync,strToU8} from 'fflate';
import {createHash,createCipheriv} from 'node:crypto';
import {deflateSync} from 'node:zlib';
import {createRequire} from 'node:module';
import initSqlJs from 'sql.js';
const require=createRequire(import.meta.url);
/** Entirely synthetic publication, with the same archive/encryption format. */
export async function publicationBytes(symbol='lff',issue=0,language=3):Promise<Buffer>{
  const SQL=await initSqlJs({locateFile:(name:string)=>require.resolve('sql.js/dist/'+name)});
  const db=new SQL.Database();
  db.run('CREATE TABLE Publication(MepsLanguageIndex INTEGER,Symbol TEXT,Year INTEGER,IssueTagNumber INTEGER)');
  db.run('CREATE TABLE Document(DocumentId INTEGER,MepsDocumentId INTEGER,Title TEXT,Content BLOB)');
  db.run('INSERT INTO Publication VALUES(?,?,?,?)',[language,symbol,2026,issue]);
  const hash=createHash('sha256').update(language+'_'+symbol+'_2026'+(issue?'_'+issue:'')).digest();
  const mask=Buffer.from('11cbb5587e32846d4c26790c633da289f66fe5842a3a585ce1bc3a294af5ada7','hex');
  const key=Buffer.from(hash.map((b,i)=>b^mask[i]));
  const cipher=createCipheriv('aes-128-cbc',key.subarray(0,16),key.subarray(16));
  const text=strToU8('<h1>Une idée utile</h1><p>La patience aide à comprendre et à réfléchir.</p>');
  const encrypted=Buffer.concat([cipher.update(deflateSync(text)),cipher.final()]);
  db.run('INSERT INTO Document VALUES(?,?,?,?)',[1,2026440,'Une idée utile',encrypted]);
  const data=db.export();db.close();
  return Buffer.from(zipSync({'manifest.json':strToU8(JSON.stringify({publication:{title:'Publication de démonstration'}})),contents:zipSync({'publication.db':data})}));
}

/** Real Bible schema shape: NULL book navigation plus separate encrypted chapters. */
export async function biblePublicationBytes():Promise<Buffer>{
  const SQL=await initSqlJs({locateFile:(name:string)=>require.resolve('sql.js/dist/'+name)});
  const db=new SQL.Database();
  db.run('CREATE TABLE Publication(MepsLanguageIndex INTEGER,Symbol TEXT,Year INTEGER,IssueTagNumber INTEGER)');
  db.run("INSERT INTO Publication VALUES(3,'nwtsty',2026,0)");
  db.run('CREATE TABLE Document(DocumentId INTEGER,MepsDocumentId INTEGER,Title TEXT,Content BLOB)');
  db.run("INSERT INTO Document VALUES(28,NULL,'Jean',NULL)");
  db.run('CREATE TABLE BibleBook(BibleBookId INTEGER,ChapterDisplayTitle TEXT)');
  db.run("INSERT INTO BibleBook VALUES(43,'Évangile selon Jean')");
  db.run('CREATE TABLE BibleChapter(BibleChapterId INTEGER,BookNumber INTEGER,ChapterNumber INTEGER,Content BLOB)');
  const hash=createHash('sha256').update('3_nwtsty_2026').digest();
  const mask=Buffer.from('11cbb5587e32846d4c26790c633da289f66fe5842a3a585ce1bc3a294af5ada7','hex');
  const key=Buffer.from(hash.map((b,i)=>b^mask[i]));
  for(const chapter of [7,8]){
    const cipher=createCipheriv('aes-128-cbc',key.subarray(0,16),key.subarray(16));
    const encrypted=Buffer.concat([cipher.update(deflateSync(strToU8('<p>Chapitre de démonstration '+chapter+' pour vérifier la lecture locale.</p>'))),cipher.final()]);
    db.run('INSERT INTO BibleChapter VALUES(?,?,?,?)',[chapter,43,chapter,encrypted]);
  }
  const data=db.export();db.close();
  return Buffer.from(zipSync({'manifest.json':strToU8(JSON.stringify({publication:{title:'Bible d’étude de démonstration'}})),contents:zipSync({'nwtsty.db':data})}));
}

/** Verse identifiers and split poetry mirror both official French Bible schemas.
 * Every sentence below is synthetic. Never use verse labels as verse numbers:
 * the first label contains the chapter number, and Psalms have verse zero.
 */
export async function verseBiblePublicationBytes(symbol='nwtsty',language=3):Promise<Buffer>{
  const SQL=await initSqlJs({locateFile:(name:string)=>require.resolve('sql.js/dist/'+name)});
  const db=new SQL.Database();
  db.run('CREATE TABLE Publication(MepsLanguageIndex INTEGER,Symbol TEXT,Year INTEGER,IssueTagNumber INTEGER)');
  db.run('INSERT INTO Publication VALUES(?,?,2026,0)',[language,symbol]);
  db.run('CREATE TABLE Document(DocumentId INTEGER,MepsDocumentId INTEGER,Title TEXT,Content BLOB)');
  db.run("INSERT INTO Document VALUES(28,NULL,'Jean',NULL)");
  db.run('CREATE TABLE BibleBook(BibleBookId INTEGER,ChapterDisplayTitle TEXT)');
  for(const [book,title] of [[1,'Genèse'],[19,'Psaumes'],[43,'Jean']])db.run('INSERT INTO BibleBook VALUES(?,?)',[book,title]);
  db.run('CREATE TABLE BibleChapter(BibleChapterId INTEGER,BookNumber INTEGER,ChapterNumber INTEGER,Content BLOB)');
  const hash=createHash('sha256').update(language+'_'+symbol+'_2026').digest();
  const mask=Buffer.from('11cbb5587e32846d4c26790c633da289f66fe5842a3a585ce1bc3a294af5ada7','hex');
  const key=Buffer.from(hash.map((b,i)=>b^mask[i]));let id=0;
  const span=(book:number,ch:number,v:number,text:string,part=1)=>`<span id="v${book}-${ch}-${v}-${part}" class="v"><span class="${v===1?'cl':'vl'}">${v===1?ch:v}</span>${text}</span>`;
  const special:Record<number,string>={23:'Une guérison apporte du réconfort.',24:'Ne vous fiez pas à l’apparence. Cherchez un jugement équitable.',25:'La bonté guide les pensées.',26:'La patience reflète une belle qualité.'};
  for(const [book,ch,html] of [
    [1,1,'<p>'+span(1,1,1,'Le commencement de la lecture locale.')+'</p>'],
    [19,3,'<p>'+span(19,3,0,'Un titre à part.')+'</p><p>'+span(19,3,1,'Ô Jéhovah, entends',1)+'</p><p>'+span(19,3,1,'ma prière.<span class="fn">a</span><span class="m">b</span>',2)+'</p>'],
    [43,7,Array.from({length:26},(_,i)=>'<p>'+span(43,7,i+1,(symbol==='nwt'?'Édition standard : ':'')+(special[i+1]||'Texte de démonstration du verset '+(i+1)+'.'))+'</p>').join('')+'<div class="groupFootnote">Un faux résultat : moteursecret.</div>'],
    [43,8,Array.from({length:13},(_,i)=>'<p>'+span(43,8,i+1,'Un nouveau chapitre de lecture, verset '+(i+1)+'.')+'</p>').join('')]
  ] as [number,number,string][]){
    const cipher=createCipheriv('aes-128-cbc',key.subarray(0,16),key.subarray(16));
    const encrypted=Buffer.concat([cipher.update(deflateSync(strToU8(html))),cipher.final()]);
    db.run('INSERT INTO BibleChapter VALUES(?,?,?,?)',[++id,book,ch,encrypted]);
  }
  const data=db.export();db.close();
  return Buffer.from(zipSync({'manifest.json':strToU8(JSON.stringify({publication:{title:'Bible de démonstration '+symbol}})),contents:zipSync({'bible.db':data})}));
}
