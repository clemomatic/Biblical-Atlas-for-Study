import {readFileSync} from 'node:fs';
import {createDecipheriv,createHash} from 'node:crypto';
import {inflateSync} from 'node:zlib';
import {createRequire} from 'node:module';
import initSqlJs from 'sql.js';
import {unzipSync,strFromU8} from 'fflate';
const require=createRequire(import.meta.url);
/** Independent oracle: BibleVerse rows, NOT the chapter parsing used by the plugin.
 * Text stays in process and is never committed or bundled with the plugin.
 */
export async function bibleVerseOracle(file:string):Promise<Record<string,string>>{
  const outer=unzipSync(readFileSync(file),{filter:f=>f.name==='contents'});
  const inner=unzipSync(outer.contents,{filter:f=>f.name.endsWith('.db')});
  const SQL=await initSqlJs({locateFile:n=>require.resolve('sql.js/dist/'+n)});
  const db=new SQL.Database(Object.values(inner)[0]);
  try{
    const p=db.exec('SELECT MepsLanguageIndex,Symbol,Year,IssueTagNumber FROM Publication LIMIT 1')[0].values[0];
    const card=p.slice(0,3).join('_')+(Number(p[3])?'_'+p[3]:'');
    const hash=createHash('sha256').update(card).digest();
    const mask=Buffer.from('11cbb5587e32846d4c26790c633da289f66fe5842a3a585ce1bc3a294af5ada7','hex');
    const key=Buffer.from(hash.map((v,i)=>v^mask[i]));const results:Record<string,string>={};
    for(const [bytes] of db.exec('SELECT Content FROM BibleVerse ORDER BY BibleVerseId')[0].values){
      if(!bytes)continue;
      const decipher=createDecipheriv('aes-128-cbc',key.subarray(0,16),key.subarray(16));
      const html=strFromU8(inflateSync(Buffer.concat([decipher.update(bytes as Uint8Array),decipher.final()])));
      const match=/id="v(\d+)-(\d+)-(\d+)"/.exec(html);if(!match)throw Error('BibleVerse identifier missing.');
      results[match.slice(1).join(':')]=html;
    }
    return results;
  }finally{db.close();}
}
