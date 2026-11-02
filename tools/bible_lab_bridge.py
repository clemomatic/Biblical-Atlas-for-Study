#!/usr/bin/env python3
"""Bible Lab JW bridge. Read-only import, explicit export to a NEW .jwlibrary.

Requires Python 3.10+. JWPUB import requires: pip install cryptography beautifulsoup4 markdownify
No networking, no uploads, no modification of the source archives.
"""
from __future__ import annotations
import argparse, hashlib, io, json, os, re, shutil, sqlite3, sys, tempfile, zipfile, zlib
from pathlib import Path
from datetime import datetime, timezone

MARKER = '<!-- BIBLE_LAB_NOTE_START -->\n'
MAX_ARCHIVE = 400 * 1024 * 1024
MAX_EXPANDED = 800 * 1024 * 1024

def sha(data:bytes)->str:return hashlib.sha256(data).hexdigest()
def safe_filename(s:str)->str:
    t=re.sub(r'[\\/:*?"<>|\x00-\x1f]+',' ',s or '').strip(' .')
    return re.sub(r'\s+',' ',t)[:85] or 'Sans titre'
def zip_check(z:zipfile.ZipFile):
    inf=z.infolist()
    if len(inf)>10000 or sum(i.file_size for i in inf)>MAX_EXPANDED:
        raise ValueError('Archive décompressée trop volumineuse')
    for i in inf:
        if i.file_size>MAX_EXPANDED or i.filename.startswith('/') or '..' in Path(i.filename).parts:
            raise ValueError('Entrée ZIP invalide')
def open_backup(path:Path):
    if path.stat().st_size>MAX_ARCHIVE:raise ValueError('Archive source trop volumineuse')
    z=zipfile.ZipFile(path);zip_check(z)
    m=json.loads(z.read('manifest.json'))
    info=m['userDataBackup'];db_name=info['databaseName']
    if db_name not in z.namelist():raise ValueError('Base SQLite absente')
    db=z.read(db_name)
    if sha(db)!=info['hash']:raise ValueError('Checksum SHA-256 incorrect dans le manifeste')
    if not db.startswith(b'SQLite format 3\x00'):raise ValueError('Entête SQLite non reconnu')
    return z,m,db

def sqlite_copy(db:bytes,context):
    path=Path(context.name)/'userData.db';path.write_bytes(db)
    con=sqlite3.connect(path)
    if con.execute('PRAGMA integrity_check').fetchone()[0]!='ok':raise ValueError('Base SQLite invalide')
    schema=con.execute('PRAGMA user_version').fetchone()[0]
    if schema not in (14,15,16):raise ValueError(f'Schéma non testé: {schema} (14-16 uniquement)')
    return con,path,schema

def overview(path:Path):
    with tempfile.TemporaryDirectory() as tmp:
        z,m,db=open_backup(path)
        with z:
            con,_,schema=sqlite_copy(db,type('Temp',(),{'name':tmp})())
            counts={name:con.execute(f'SELECT COUNT(*) FROM "{name}"').fetchone()[0] for name in ('Note','UserMark','Tag','Bookmark','InputField','PlaylistItem')}
            con.close()
            return {'date':m.get('creationDate'),'schema':schema,'size':path.stat().st_size,'files':len(z.namelist()),'counts':counts,'verified':True}

def make_note(note,labels):
    guid,title,content,created,modified,location,mark=note
    title=title or '';content=content or ''
    fields=[
        '---','bible_lab_kind: jw-library-note',
        'jw_guid: '+json.dumps(guid,ensure_ascii=False),
        'title: '+json.dumps(title,ensure_ascii=False),
        'jw_created: '+json.dumps(created),
        'jw_last_modified: '+json.dumps(modified),
        'jw_location_id: '+json.dumps(location),
        'jw_user_mark_id: '+json.dumps(mark),
        'jw_tags: '+json.dumps(labels,ensure_ascii=False),
        'jw_original_hash: '+sha((title+'\x00'+content).encode()),
        '---','',MARKER.rstrip('\n'),content]
    return '\n'.join(fields)

def parse_note(path:Path):
    with path.open('r',encoding='utf-8',newline='') as handle:raw=handle.read()
    if MARKER not in raw:raise ValueError(f'Marqueur perdu dans {path.name}')
    header,content=raw.split(MARKER,1)
    def prop(key):
        m=re.search(r'^'+re.escape(key)+r':\s*(.*)$',header,re.M)
        if not m:raise ValueError(f'Champ {key} absent')
        return m.group(1)
    guid=json.loads(prop('jw_guid'))
    title=json.loads(prop('title'))
    original_hash=prop('jw_original_hash').strip()
    if not re.fullmatch(r'[0-9a-fA-F]{64}',original_hash):raise ValueError('Hash de note invalide')
    if not re.fullmatch(r'[0-9a-fA-F-]{36}',guid):raise ValueError('GUID invalide')
    return guid,title,content,original_hash

def import_backup(path:Path,dest:Path):
    if dest.exists() and any(dest.iterdir()):raise ValueError('Le dossier de destination doit être vide')
    dest.mkdir(parents=True,exist_ok=True)
    z,m,db=open_backup(path)
    with z,tempfile.TemporaryDirectory() as tmp:
        con,_,schema=sqlite_copy(db,type('Temp',(),{'name':tmp})())
        labels={}
        q='SELECT tm.NoteId, t.Name FROM TagMap tm JOIN Tag t ON t.TagId=tm.TagId WHERE tm.NoteId IS NOT NULL ORDER BY tm.Position'
        for nid,label in con.execute(q):labels.setdefault(nid,[]).append(label)
        rows=con.execute('SELECT NoteId, Guid, Title, Content, Created, LastModified, LocationId, UserMarkId FROM Note ORDER BY NoteId')
        count=0
        tag_notes={}
        for nid,guid,title,content,created,modified,loc,mark in rows:
            name=safe_filename(title)+' — '+guid+'.md'
            note=make_note((guid,title,content,created,modified,loc,mark),labels.get(nid,[]))
            
            with (dest/name).open('w',encoding='utf-8',newline='') as handle:handle.write(note)
            count+=1
            for label in labels.get(nid,[]):tag_notes.setdefault(label,[]).append((Path(name).stem,title or 'Sans titre'))
        # Visual navigation index; stored in a subfolder, never considered a JW note on re-export.
        index=dest/'INDEX';index.mkdir(exist_ok=True)
        tag_folder=index/'Thèmes';tag_folder.mkdir(exist_ok=True)
        dashboard=['---','bible_lab_kind: jw-library-index','---','# Mon laboratoire d’étude','','> [!summary] Mes recherches JW Library','> **'+str(count)+' notes** · **'+str(len(tag_notes))+' thèmes**','','## Explorer les thèmes','']
        for label,linked in sorted(tag_notes.items(), key=lambda pair:(-len(pair[1]),pair[0].casefold())):
            filename=safe_filename(label)+'-'+sha(label.encode())[:8]+'.md'
            dashboard.append('- [['+Path(filename).stem+'|'+label.replace('|',' ') +']] · '+str(len(linked)))
            lines=['---','bible_lab_kind: jw-library-tag-index','---','# '+label,'','> [!info] '+str(len(linked))+' notes reliées','']
            lines += ['- [['+stem+'|'+(title or 'Sans titre').replace('|',' ') +']]' for stem,title in linked]
            (tag_folder/filename).write_text('\n'.join(lines)+'\n','utf-8')
        (index/'00 Tableau de recherche.md').write_text('\n'.join(dashboard)+'\n','utf-8')
        con.close()
        source={'source_name':path.name,'source_sha256':sha(path.read_bytes()),'schema_version':schema,'note_count':count,'description':'Enregistre les GUID, titres, contenus et étiquettes en Markdown; réexportation limitée à Title et Content des notes existantes.'}
        (dest/'_BIBLE_LAB_IMPORT.json').write_text(json.dumps(source,indent=2,ensure_ascii=False),'utf-8')
        return count

def export_backup(source:Path,notes:Path,dest:Path):
    if dest.resolve()==source.resolve():raise ValueError('Il est interdit d’écraser la sauvegarde source')
    if dest.exists():raise ValueError('Fichier destination existant, choisir un autre nom')
    report=json.loads((notes/'_BIBLE_LAB_IMPORT.json').read_text('utf-8'))
    if sha(source.read_bytes())!=report['source_sha256']:raise ValueError('La sauvegarde source ne correspond pas à l’import')
    z,m,db=open_backup(source)
    with z,tempfile.TemporaryDirectory() as tmp:
        con,db_path,schema=sqlite_copy(db,type('Temp',(),{'name':tmp})())
        if schema!=report['schema_version']:raise ValueError('Schéma différent')
        baseline_fk=set(map(tuple,con.execute('PRAGMA foreign_key_check').fetchall()))
        known={r[0]:(r[1],r[2] or '',r[3] or '') for r in con.execute('SELECT Guid,NoteId,Title,Content FROM Note')}
        changes=[];seen=set()
        for file in notes.glob('*.md'):
            guid,title,content,original_hash=parse_note(file)
            if guid in seen:raise ValueError(f'Doublon GUID {guid}')
            seen.add(guid)
            if guid not in known:raise ValueError('Note inconnue, ajout non pris en charge: '+guid)
            nid,old_title,old_content=known[guid]
            if sha((old_title+'\x00'+old_content).encode())!=original_hash:
                raise ValueError(f'La note {guid} ne correspond plus à la sauvegarde source')
            if (title,content)!=(old_title,old_content):changes.append((title,content,nid))
        if len(seen)!=report['note_count'] or len(seen)!=len(known):raise ValueError('Ensemble de notes incomplet : export refusé')
        if not changes:return {'changed':0,'message':'Aucune modification : export non créé'}
        now=datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
        with con:
            con.executemany('UPDATE Note SET Title=?,Content=?,LastModified=? WHERE NoteId=?',[(title,content,now,nid) for title,content,nid in changes])
            con.execute('UPDATE LastModified SET LastModified=?',(now,))
        if con.execute('PRAGMA integrity_check').fetchone()[0]!='ok':raise ValueError('PRAGMA integrity_check échoué')
        fk=set(map(tuple,con.execute('PRAGMA foreign_key_check').fetchall()))
        if fk!=baseline_fk:raise ValueError('Une relation SQLite a été modifiée ou corrompue : export refusé')
        if con.execute('SELECT COUNT(*) FROM Note').fetchone()[0]!=len(known):raise ValueError('Perte de notes détectée')
        con.close()
        new_bytes=db_path.read_bytes()
        m['userDataBackup']['hash']=sha(new_bytes)
        m['userDataBackup']['lastModifiedDate']=now
        # Preserve every media entry and its archive metadata; write to temp first.
        partial=dest.with_suffix(dest.suffix+'.partial')
        try:
            with zipfile.ZipFile(partial,'w') as out:
                for info in z.infolist():
                    if info.filename=='manifest.json':data=json.dumps(m,ensure_ascii=False,separators=(',',':')).encode()
                    elif info.filename==m['userDataBackup']['databaseName']:data=new_bytes
                    else:data=z.read(info.filename)
                    out.writestr(info,data)
            with zipfile.ZipFile(partial) as check:
                d=check.read(m['userDataBackup']['databaseName'])
                if sha(d)!=m['userDataBackup']['hash']:raise ValueError('Checksum export invalide')
                if len(check.namelist())!=len(z.namelist()):raise ValueError('Fichiers perdus')
            partial.replace(dest)
        finally:
            if partial.exists():partial.unlink()
        return {'changed':len(changes),'output':str(dest),'source_unchanged':True,'size_bytes':dest.stat().st_size,'pre_existing_fk_issues':len(baseline_fk)}

def import_jwpub(path:Path,dest:Path):
    try:
        from cryptography.hazmat.primitives.ciphers import Cipher,algorithms,modes
        from bs4 import BeautifulSoup
        from markdownify import markdownify
    except ImportError as e:raise RuntimeError('Installer: pip install cryptography beautifulsoup4 markdownify') from e
    with zipfile.ZipFile(path) as outer:
        zip_check(outer)
        m=json.loads(outer.read('manifest.json'))
        with zipfile.ZipFile(io.BytesIO(outer.read('contents'))) as inner:
            zip_check(inner)
            dbname=next((x for x in inner.namelist() if x.endswith('.db')),None)
            if not dbname:raise ValueError('JWPUB interne sans base SQLite')
            with tempfile.TemporaryDirectory() as tmp:
                dbpath=Path(tmp)/'publication.db';dbpath.write_bytes(inner.read(dbname))
                con=sqlite3.connect('file:'+str(dbpath)+'?mode=ro',uri=True)
                lang,symbol,year,tag=con.execute('SELECT MepsLanguageIndex,Symbol,Year,IssueTagNumber FROM Publication').fetchone()
                card=f'{lang}_{symbol}_{year}'+(f'_{tag}' if str(tag) not in ('0','None') else '')
                hash_bytes=hashlib.sha256(card.encode()).digest()
                const=bytes.fromhex('11cbb5587e32846d4c26790c633da289f66fe5842a3a585ce1bc3a294af5ada7')
                x=bytes(a^b for a,b in zip(hash_bytes,const));key,iv=x[:16],x[16:]
                rows=con.execute('SELECT DocumentId,Title,Content FROM Document ORDER BY DocumentId').fetchall()
                if dest.exists() and any(dest.iterdir()):raise ValueError('Le dossier de destination doit être vide')
                dest.mkdir(parents=True,exist_ok=True)
                count=0
                for docid,title,encrypted in rows:
                    decryptor=Cipher(algorithms.AES(key),modes.CBC(iv)).decryptor()
                    block=decryptor.update(encrypted)+decryptor.finalize()
                    pad=block[-1]
                    if not 1<=pad<=16 or block[-pad:]!=bytes([pad])*pad:raise ValueError('Padding AES invalide')
                    html=zlib.decompress(block[:-pad]).decode('utf-8')
                    soup=BeautifulSoup(html,'html.parser')
                    for el in soup.select('.pageNum,script,style') :el.decompose()
                    for img in soup.find_all('img'):
                        src=img.get('src','')
                        if src.startswith('jwpub-media://'):
                            filename=src.removeprefix('jwpub-media://')
                            if filename in inner.namelist():
                                asset_dir=dest/'assets';asset_dir.mkdir(exist_ok=True)
                                (asset_dir/Path(filename).name).write_bytes(inner.read(filename))
                                img['src']='assets/'+Path(filename).name
                    for taglink in soup.find_all('a',href=True):
                        href=taglink['href']
                        if href.startswith('jwpub://'):
                            taglink['href']=href
                    body=soup.select_one('body') or soup
                    md=markdownify(str(body),heading_style='ATX',strip=['span']).strip()
                    title=title or f'Document {docid}'
                    pre='---\nbible_lab_kind: jwpub-document\npublication: '+json.dumps(m.get('publication',{}).get('title',''),ensure_ascii=False)+'\npublication_symbol: '+json.dumps(symbol)+'\ndocument_id: '+str(docid)+'\nsource_jwpub: '+json.dumps(path.name)+'\n---\n\n'
                    filename=f'{docid:03d} — {safe_filename(title)}.md'
                    (dest/filename).write_text(pre+'# '+title+'\n\n'+md+'\n','utf-8');count+=1
                con.close()
                return {'documents':count,'publication':m.get('publication',{}).get('title'),'output':str(dest)}

def main():
 p=argparse.ArgumentParser(description='Bible Lab bridge (sans écrasement ni réseau)')
 s=p.add_subparsers(dest='command',required=True)
 q=s.add_parser('inspect');q.add_argument('archive',type=Path)
 q=s.add_parser('import-backup');q.add_argument('archive',type=Path);q.add_argument('folder',type=Path)
 q=s.add_parser('export-backup');q.add_argument('archive',type=Path);q.add_argument('folder',type=Path);q.add_argument('output',type=Path)
 q=s.add_parser('import-jwpub');q.add_argument('archive',type=Path);q.add_argument('folder',type=Path)
 a=p.parse_args()
 try:
  if a.command=='inspect':result=overview(a.archive)
  if a.command=='import-backup':result={'notes_exported':import_backup(a.archive,a.folder)}
  if a.command=='export-backup':result=export_backup(a.archive,a.folder,a.output)
  if a.command=='import-jwpub':result=import_jwpub(a.archive,a.folder)
  print(json.dumps(result,indent=2,ensure_ascii=False));return 0
 except Exception as e:print('ERREUR:',str(e),file=sys.stderr);return 1
if __name__=='__main__':raise SystemExit(main())