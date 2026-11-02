"""Synthetic regression tests for the local JW bridge: no private source data."""
import hashlib
import json
import os
from pathlib import Path
import sqlite3
import tempfile
import unittest
import zipfile

from bible_lab_bridge import import_backup, export_backup, overview

GUID='11111111-2222-3333-4444-555555555555'

def sample_archive(path:Path, schema:int=16, malformed_fk:bool=False):
    with tempfile.TemporaryDirectory() as temp:
        db=Path(temp)/'userData.db'
        con=sqlite3.connect(db)
        con.execute(f'PRAGMA user_version={schema}')
        con.execute('CREATE TABLE Note (NoteId INTEGER PRIMARY KEY,Guid TEXT,Title TEXT,Content TEXT,Created TEXT,LastModified TEXT,LocationId INTEGER,UserMarkId INTEGER)')
        con.execute('CREATE TABLE Tag(TagId INTEGER PRIMARY KEY,Name TEXT)')
        con.execute('CREATE TABLE TagMap(TagMapId INTEGER PRIMARY KEY,NoteId INTEGER,TagId INTEGER,Position INTEGER)')
        con.execute('CREATE TABLE LastModified(LastModified TEXT)')
        for table in ('UserMark','Bookmark','InputField','PlaylistItem'):
            con.execute(f'CREATE TABLE "{table}"(Id INTEGER PRIMARY KEY)')
        con.execute('INSERT INTO Note VALUES (1,?,?,?,?,?,?,?)',(GUID,'Note de test','Ligne 1\r\nLigne 2','2026-01-01T00:00:00Z','2026-01-01T00:00:00Z',None,None))
        con.execute('INSERT INTO Tag VALUES (1,?)',('Méditation',))
        con.execute('INSERT INTO TagMap VALUES (1,1,1,0)')
        con.execute('INSERT INTO LastModified VALUES (?)',('2026-01-01T00:00:00Z',))
        con.commit();con.close()
        raw=db.read_bytes()
        manifest={'name':path.name,'creationDate':'2026-01-01','userDataBackup':{
          'databaseName':'userData.db','schemaVersion':schema,'hash':hashlib.sha256(raw).hexdigest(),
          'lastModifiedDate':'2026-01-01T00:00:00Z'}}
        with zipfile.ZipFile(path,'w',zipfile.ZIP_DEFLATED) as z:
            z.writestr('manifest.json',json.dumps(manifest))
            z.writestr('userData.db',raw)
            z.writestr('cover.jpg',b'unchanged-media')

class BridgeRoundtrip(unittest.TestCase):
    def test_roundtrip_both_schemas_and_crlf(self):
        for schema in (14,16):
            with self.subTest(schema=schema), tempfile.TemporaryDirectory() as temp:
                base=Path(temp)
                source=base/'original.jwlibrary'
                sample_archive(source,schema)
                self.assertEqual(overview(source)['schema'],schema)
                notes=base/'notes'
                self.assertEqual(import_backup(source,notes),1)
                self.assertEqual(export_backup(source,notes,base/'no-change.jwlibrary')['changed'],0)
                note=next(notes.glob('*.md'))
                with note.open('a',encoding='utf-8',newline='') as f:f.write('\nAjout test')
                new=base/'modified.jwlibrary'
                result=export_backup(source,notes,new)
                self.assertEqual(result['changed'],1)
                self.assertEqual(result['pre_existing_fk_issues'],0)
                self.assertEqual(overview(new)['schema'],schema)
                with zipfile.ZipFile(source) as original, zipfile.ZipFile(new) as updated:
                    self.assertEqual(original.read('cover.jpg'),updated.read('cover.jpg'))
                    self.assertNotEqual(original.read('userData.db'),updated.read('userData.db'))
                    with tempfile.TemporaryDirectory() as dt:
                        db=Path(dt)/'updated.db';db.write_bytes(updated.read('userData.db'))
                        con=sqlite3.connect(db)
                        content=con.execute('SELECT Content FROM Note WHERE Guid=?',(GUID,)).fetchone()[0]
                        self.assertEqual(content,'Ligne 1\r\nLigne 2\nAjout test')
                        con.close()

    def test_source_never_overwritten(self):
        with tempfile.TemporaryDirectory() as temp:
            source=Path(temp)/'backup.jwlibrary'
            sample_archive(source)
            notes=Path(temp)/'notes'
            import_backup(source,notes)
            with self.assertRaises(ValueError):export_backup(source,notes,source)

    def test_tampered_source_refused(self):
        with tempfile.TemporaryDirectory() as temp:
            base=Path(temp);source=base/'backup.jwlibrary';sample_archive(source)
            notes=base/'notes';import_backup(source,notes)
            with zipfile.ZipFile(source,'a') as z:z.writestr('extra.bin',b'changed')
            with self.assertRaises(ValueError):export_backup(source,notes,base/'out.jwlibrary')

if __name__=='__main__':unittest.main()
