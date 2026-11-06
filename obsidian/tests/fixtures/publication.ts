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
