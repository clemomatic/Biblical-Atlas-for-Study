#!/usr/bin/env python3
"""Build a NON-DESTRUCTIVE opt-in Explorer beta from the exact 0.22.9 archive.
The source plugin main.js is a byte-for-byte prefix in the resulting artifact.
Only main.js, styles.css and manifest.json can differ from the reference ZIP.
"""
import hashlib,json,zipfile,pathlib,sys,base64

ROOT=pathlib.Path(__file__).resolve().parent
SRC=ROOT.parent/'source' if (ROOT.parent/'source/explorer-overlay.js').exists() else ROOT
DEFAULT_BASE=ROOT.parent/'0.22.9/JW-Study-Desk-0.22.9-original.zip'
BASE=pathlib.Path(sys.argv[1]) if len(sys.argv)>1 else DEFAULT_BASE
OUT=pathlib.Path(sys.argv[2]) if len(sys.argv)>2 else ROOT/'JW-Study-Desk-0.23.0-beta.1-Explorer-Test.zip'
EXPECTED='d8fea56c79809c6f39368d89c17adab785bf7a7f2c47803e54a81b0b2bb0fb6b'
sha=lambda b:hashlib.sha256(b).hexdigest()
if not BASE.is_file() and len(sys.argv)==1:
    # No sources are synthesized: restore exactly the saved 0.22.9 ZIP bytes.
    parts=ROOT.parent/'0.22.9/zip-b64'
    names=sorted(parts.glob('part-*.b64'))
    assert len(names)==30, f'ZIP reference parts not found: {parts}'
    assert [x.name for x in names] == [f'part-{i:02}.b64' for i in range(1,31)]
    encoded=''.join(x.read_text().strip() for x in names)
    BASE.write_bytes(base64.b64decode(encoded,validate=True))
assert BASE.is_file(),f'Base ZIP missing: {BASE}'
assert sha(BASE.read_bytes())==EXPECTED,'STOP: source archive is not the exact 0.22.9 release'
with zipfile.ZipFile(BASE) as z:
    assert z.testzip() is None, 'Invalid ZIP'
    original={i.filename:z.read(i.filename) for i in z.infolist()}
files=original.copy()
old_main=files['atlas-biblique/main.js']
old_css=files['atlas-biblique/styles.css']
overlay=(SRC/'explorer-overlay.js').read_bytes()
css=(SRC/'explorer.css').read_bytes()
assert b'module.exports=EN;' in old_main[-100:] and b'module.exports=JwsdExplorerPlugin;' in overlay
files['atlas-biblique/main.js']=old_main+b'\n\n/* JWSD 0.23.0 beta: additive Explorer only */\n'+overlay+b'\n'
files['atlas-biblique/styles.css']=old_css+b'\n\n'+css+b'\n'
manifest=json.loads(files['atlas-biblique/manifest.json'])
assert manifest['id']=='atlas-biblique' and manifest['version']=='0.22.9'
manifest['version']='0.23.0-beta.1'
files['atlas-biblique/manifest.json']=(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n').encode()
assert files['atlas-biblique/main.js'].startswith(old_main), 'original bundle modified!'
assert files['atlas-biblique/styles.css'].startswith(old_css), 'original CSS modified!'
assert {k for k in files if files[k] != original[k]} == {
    'atlas-biblique/main.js','atlas-biblique/styles.css','atlas-biblique/manifest.json'
}, 'Unexpected change to release files'
assert set(files)==set(original), 'Release file inventory modified'
OUT.parent.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(OUT,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=8) as z:
    for k,v in files.items():z.writestr(k,v)
with zipfile.ZipFile(OUT) as z:
    assert z.testzip() is None
    assembled=z.read('atlas-biblique/main.js')
    assert assembled[:len(old_main)]==old_main
    assert json.loads(z.read('atlas-biblique/manifest.json'))['version']=='0.23.0-beta.1'
    assert len(set(z.namelist()))==len(z.namelist())
print(json.dumps({'output':str(OUT),'base_sha256':sha(BASE.read_bytes()),'original_main_sha256':sha(old_main),'new_zip_sha256':sha(OUT.read_bytes()),'files':len(files),'original_main_prefix_preserved':True,'old_css_prefix_preserved':True},ensure_ascii=False,indent=2))
