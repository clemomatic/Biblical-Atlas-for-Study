#!/usr/bin/env python3
"""Rebuild JW Study Desk 0.22.10 from the original 0.22.9 archive.
Usage: python3 patch_references.py BASE.zip OUTPUT.zip
The input is the recovered stable build, not the 0.9.x TypeScript tree.
"""
import pathlib, zipfile, json, hashlib, sys
base=pathlib.Path(sys.argv[1]); out=pathlib.Path(sys.argv[2]); prefix='atlas-biblique/'
assert hashlib.sha256(base.read_bytes()).hexdigest()=='d8fea56c79809c6f39368d89c17adab785bf7a7f2c47803e54a81b0b2bb0fb6b'
with zipfile.ZipFile(base) as z:
    assert z.testzip() is None
    files={i.filename:z.read(i.filename) for i in z.infolist()}
s=files[prefix+'main.js'].decode()
def sub(a,b):
    global s
    assert s.count(a)==1,(a,s.count(a))
    s=s.replace(a,b,1)
sub('function cp(t){const e=[];for(const a of B7)for(const i of t.matchAll(a)){const n=i[1],o=(i.index||0)+(i[0].length-n.length),l=o+n.length;',r'''function jwsdCitationClean(t){return Ua(t).replace(/[–—‑−]/g,"-").replace(/^((?:w|wp|ws|g|mwb)\d{2}(?:\.\d{1,2})?\s+(?:\d{1,2}\s*\/\s*\d{1,2}|[\p{L}.]+))\s*,\s*(?=p\.?\s*\d)/iu,"$1 ").replace(/\s*[.,;]$/,'')}function jwsdCitationScan(t){return t.replace(/&(?:amp;){0,3}(?:#x[0-9a-f]+|#\d+|nbsp|thinsp|ensp|emsp)[;:]/gi,m=>/^\s+$/u.test(X3(m))?" ".repeat(m.length):m).replace(/[‑−—]/g,"-")}function cp(t){const e=[],scan=jwsdCitationScan(t);for(const a of B7)for(const i of scan.matchAll(a)){const o=(i.index||0)+(i[0].length-i[1].length),l=o+i[1].length,n=t.slice(o,l);''')
sub(r'new RegExp(wn+"("+y7+"\\s+"+C7+',r'new RegExp(wn+"("+y7+"(?:\\s*,\\s*|\\s+)"+C7+')
sub(r'new RegExp(wn+"((?:w|wp|g)\\d{2}(?:\\.\\d{1,2})?\\s+(?:"+m7+")\\s+"+hu+',r'new RegExp(wn+"((?:w|wp|ws|g|mwb)\\d{2}(?:\\.\\d{1,2})?\\s+(?:"+m7+")(?:\\s*,\\s*|\\s+)"+hu+')
sub(r'new RegExp(wn+"((?:w|wp|g)\\d{2}\\.\\d{1,2}\\s+"+hu+',r'new RegExp(wn+"((?:w|wp|ws|g|mwb)\\d{2}\\.\\d{1,2}(?:\\s*,\\s*|\\s+)"+hu+')
sub('function E0(t){const e=u7(Ua(t))','function E0(t){const e=u7(jwsdCitationClean(t))')
sub(r':Ua(t).replace(/\s*§\s*\d{1,3}(?:\s*[-–,]\s*\d{1,3})*\s*$/,""))}function jwsdCitationClean',r':jwsdCitationClean(t).replace(/\s*§\s*\d{1,3}(?:\s*[-–,]\s*\d{1,3})*\s*$/,""))}function jwsdCitationClean')
sub(r'const d=n.match(/^(?:w|ws|g)\d{2}\s+(\d{1,2})\/(\d{1,2})\s+(?:p\.?\s*)?',r'const d=jwsdCitationClean(n).match(/^(?:w|ws|g)\d{2}\s+(\d{1,2})\/(\d{1,2})\s+(?:p\.?\s*)?')
sub(r'zl="\\s+(?:p\\.?\\s*)?',r'zl="(?:\\s*,\\s*|\\s+)(?:p\\.?\\s*)?')
sub('function Nk(t){return t.normalize','function Nk(t){return jwsdCitationClean(t).normalize')
sub(r'\\b((?:w|wp|g|mwb)\\d{2})\\.',r'\\b((?:w|wp|ws|g|mwb)\\d{2})\\.')
sub(r'\\b((?:w|g|mwb)\\d{2})\\s+',r'\\b((?:w|wp|ws|g|mwb)\\d{2})\\s+')
sub(r'\\b((?:w|g)\\d{2})\\s+(\\d{1,2})/',r'\\b((?:w|ws|g)\\d{2})\\s+(\\d{1,2})/')
# Official references independently verified: do not guess any document IDs.
sub('function Ug(t){const e=ss(t);','function Ug(t){const jwsdPages=er(t);if(jwsdPages?.issue==="mwb21.11"&&jwsdPages.first===7&&jwsdPages.last===7)return pt+"d/r30/lp-f/202021411";if(jwsdPages?.issue==="w15 15/4"&&jwsdPages.first>=8&&jwsdPages.last<=13&&jwsdPages.last>8)return pt+"d/r30/lp-f/2015282";const e=ss(t);')
sub('const n=new URL(e).searchParams.get("q")?.trim()||t.label,o=er(t.label)?t.label:n,l=Ug(t.label)||Ug(n);','const n=jwsdCitationClean(new URL(e).searchParams.get("q")?.trim()||t.label),o=er(t.label)?jwsdCitationClean(t.label):n,l=Ug(t.label)||Ug(n);')
sub('const d=a.startsWith("/fr/wol/s/")?pt+"l/r30/lp-f?"+new URLSearchParams({q:n}):e;let g,p=null;','const d=a.startsWith("/fr/wol/s/")||n!==new URL(e).searchParams.get("q")?pt+"l/r30/lp-f?"+new URLSearchParams({q:n}):e;let g,p=null;')
sub('const w=er(n),f=w?[n,w.issue+" "+w.first+(w.last!==w.first?"-"+w.last:""),w.issue]:[n];','const w=er(o)||er(n),f=w?[o,n,w.issue+" "+w.first+(w.last!==w.first?"-"+w.last:""),w.issue]:[n];')
sub('B=zg(R,D,o),B||p?.lines.length)break','B=zg(R,D,o),B)break')
manifest=json.loads(files[prefix+'manifest.json']); assert manifest['version']=='0.22.9'
manifest['version']='0.22.10'
files[prefix+'manifest.json']=(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n').encode()
files[prefix+'main.js']=s.encode()
checksum=prefix+'SHA256SUMS.txt'
if checksum in files:
    updated=[]
    for line in files[checksum].decode().splitlines():
        parts=line.split(maxsplit=1)
        if len(parts)==2:
            name=parts[1].strip().lstrip('*'); key=name if name in files else prefix+name
            if key in files and key!=checksum:
                line=hashlib.sha256(files[key]).hexdigest()+(' *' if parts[1].startswith('*') else '  ')+name
        updated.append(line)
    files[checksum]=('\n'.join(updated)+'\n').encode()
out.parent.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED,compresslevel=8) as z:
    for name,data in files.items():z.writestr(name,data)
with zipfile.ZipFile(base) as a,zipfile.ZipFile(out) as b:
    assert b.testzip() is None and a.namelist()==b.namelist()
    changed=[x for x in a.namelist() if a.read(x)!=b.read(x)]
    assert set(changed)<={prefix+'main.js',prefix+'manifest.json',checksum}
print('Changed:',changed,'version:',manifest['version'])
