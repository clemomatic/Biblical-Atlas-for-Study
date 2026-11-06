import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import initSqlJs from 'sql.js';
import {extractJwAnnotations,encodeJwAnnotations,decodeJwAnnotations,summarizeJwAnnotations} from './jwAnnotations.ts';
const require=createRequire(import.meta.url);

async function fixture(schema:14|16){
 const SQL=await initSqlJs({locateFile:(name:string)=>require.resolve('sql.js/dist/'+name)});
 const db=new SQL.Database();
 db.run('CREATE TABLE Location(LocationId INTEGER,BookNumber INTEGER,ChapterNumber INTEGER,DocumentId INTEGER,'+
 'IssueTagNumber INTEGER,KeySymbol TEXT,MepsLanguage INTEGER,Type INTEGER,Title TEXT'+
 (schema===16?',Specialty TEXT,Edition TEXT':'')+')');
 db.run('CREATE TABLE UserMark(UserMarkId INTEGER,UserMarkGuid TEXT,ColorIndex INTEGER,LocationId INTEGER,StyleIndex INTEGER)');
 db.run('CREATE TABLE BlockRange(BlockRangeId INTEGER,BlockType INTEGER,Identifier INTEGER,StartToken INTEGER,EndToken INTEGER,UserMarkId INTEGER)');
 db.run('CREATE TABLE Note(NoteId INTEGER,Guid TEXT,UserMarkId INTEGER,LocationId INTEGER,Title TEXT,Content TEXT,LastModified TEXT,Created TEXT,BlockType INTEGER,BlockIdentifier INTEGER)');
 db.run('CREATE TABLE Bookmark(BookmarkId INTEGER,LocationId INTEGER,PublicationLocationId INTEGER,Slot INTEGER,Title TEXT,Snippet TEXT,BlockType INTEGER,BlockIdentifier INTEGER)');
 db.run('CREATE TABLE Tag(TagId INTEGER,Type INTEGER,Name TEXT)');
 db.run('CREATE TABLE TagMap(TagMapId INTEGER,PlaylistItemId INTEGER,LocationId INTEGER,NoteId INTEGER,TagId INTEGER,Position INTEGER)');
 const locCols=schema===16?'(LocationId,BookNumber,ChapterNumber,DocumentId,IssueTagNumber,KeySymbol,MepsLanguage,Type,Title,Specialty,Edition)':
 '(LocationId,BookNumber,ChapterNumber,DocumentId,IssueTagNumber,KeySymbol,MepsLanguage,Type,Title)';
 db.run('INSERT INTO Location '+locCols+' VALUES (1,41,10,123,0,\'nwtsty\',3,0,\'Bible\''+
 (schema===16?',null,null':'')+')');
 db.run("INSERT INTO UserMark VALUES (9,'mark-guid',2,1,0)");
 db.run('INSERT INTO BlockRange VALUES(2,1,14,0,4,9)');
 db.run("INSERT INTO Note VALUES(5,'note-guid',9,1,'Ma note','Réflexion personnelle','2026-10-27','2026-10-20',1,14)");
 db.run("INSERT INTO Bookmark VALUES(7,1,1,0,'Mon signet','Extrait',1,14)");
 db.run("INSERT INTO Tag VALUES(3,0,'Étude')");
 db.run('INSERT INTO TagMap VALUES(4,null,null,5,3,0)');
 return db;
}
for(const schema of [14,16] as const){
 test('JW annotation extractor preserves anchor, note and highlight relationships for schema '+schema,async()=>{
  const db=await fixture(schema);
  try{
   const index=extractJwAnnotations(db,schema,'mock-hash');
   assert.deepEqual(summarizeJwAnnotations(index),{
    schema,highlights:1,ranges:1,notes:1,bookmarks:1,bibleLocations:1,publicationLocations:1
   });
   assert.equal(index.locations[0].symbol,'nwtsty');
   assert.equal(index.locations[0].book,41);
   assert.equal(index.marks[0].location,index.locations[0].id);
   assert.equal(index.ranges[0].mark,index.marks[0].id);
   assert.equal(index.ranges[0].identifier,14);
   assert.equal(index.notes[0].mark,index.marks[0].id);
   assert.deepEqual(index.notes[0].tags,['Étude']);
   assert.equal(index.bookmarks[0].location,1);
   const decoded=decodeJwAnnotations(encodeJwAnnotations(index));
   assert.deepEqual(decoded,index);
  }finally{db.close();}
 });
}
test('Unknown schema and damaged archives fail closed',async()=>{
 const db=await fixture(16);
 try{assert.throws(()=>extractJwAnnotations(db,17,'mock-hash'),/Schéma/);}
 finally{db.close();}
 assert.throws(()=>decodeJwAnnotations(new Uint8Array([1,2,3])),/invalide/);
});
