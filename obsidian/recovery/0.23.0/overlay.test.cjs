const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(fs.existsSync(path.join(__dirname,'explorer-overlay.js')) ? path.join(__dirname,'explorer-overlay.js') : path.join(__dirname,'../source/explorer-overlay.js'), 'utf8');
const targeted = '  module.exports=JwsdExplorerPlugin;';
assert.equal(source.split(targeted).length,2);
const instrumented = source.replace(targeted,`  JwsdExplorerPlugin.__test = {safeWolUrl,safeReferenceUrl,safeThumb,safeState,urlFor,indexGroups,searchResults};\n${targeted}`);

class MockView {constructor(leaf){this.leaf=leaf;this.contentEl={};}}
class BasePlugin {
  constructor(){
    this.app={ vault:{configDir:'.obsidian',adapter:{exists:async()=>false,write:async()=>{},read:async()=>''}},
      workspace:{getLeavesOfType:()=>[],getRightLeaf:()=>null,getLeaf:()=>({setViewState:async()=>{},view:{}}),revealLeaf:async()=>{}}
    };
    this.manifest={id:'atlas-biblique',version:'0.23.0-beta.1'};
    this.log=[];
  }
  async onload(){this.log.push('old:onload');}
  registerView(type,create){this.log.push(['new:view',type]);this.factory=create;}
  addCommand(command){this.log.push(['new:command',command.id]);}
  addRibbonIcon(icon,label,handler){this.log.push(['new:ribbon',icon,label]);}
}
function setup(){
 const sandbox={module:{exports:BasePlugin}, URL, URLSearchParams, console, Date, Math,
   require:(name)=>{assert.equal(name,'obsidian');return {ItemView:MockView,Notice:class{},requestUrl:async()=>({status:200,text:'<html></html>'}),setIcon:()=>{}}}
 };
 vm.runInNewContext(instrumented,sandbox,{filename:'explorer-overlay.js'});
 return {Plugin:sandbox.module.exports,internals:sandbox.module.exports.__test};
}
const {Plugin,internals}=setup();

test('extension inherits and loads the original 0.22.9 plugin before registering a view',async()=>{
 const instance=new Plugin();await instance.onload();
 assert.deepEqual(instance.log.map(v=>typeof v==='string'?v:v[0]),['old:onload','new:view','new:command','new:ribbon']);
 assert.equal(Object.getPrototypeOf(Plugin.prototype),BasePlugin.prototype);
 assert.equal(typeof instance.openBibleLab,'undefined','test mock has no reader method, base is unchanged');
});

test('WOL URL validation rejects untrusted links and accepts official /pc/ bibliography',()=>{
 assert.equal(internals.safeWolUrl('javascript:alert(1)'),null);
 assert.equal(internals.safeWolUrl('http://wol.jw.org/fr/wol/d/r30/lp-f/123'),null);
 assert.equal(internals.safeWolUrl('https://evil.test/fr/wol/d/r30/lp-f/123'),null);
 assert.equal(internals.safeWolUrl('https://wol.jw.org/fr/other'),null);
 assert.equal(internals.safeReferenceUrl('/fr/wol/pc/r30/lp-f/1200271433/9/0'), 'https://wol.jw.org/fr/wol/pc/r30/lp-f/1200271433/9/0');
 assert.equal(internals.safeWolUrl('/fr/wol/b/r30/lp-f/nwt/19/27'),'https://wol.jw.org/fr/wol/b/r30/lp-f/nwt/19/27');
 assert.equal(internals.safeThumb('https://unsafe.test/cover.png'),null);
 assert.equal(internals.safeThumb('https://wol.jw.org/pic.png'),'https://wol.jw.org/pic.png');
});

test('official search URL uses existing WOL search semantics and validates query length',()=>{
 const url=internals.urlFor('courage','index');
 assert.match(url,/\/fr\/wol\/s\/r30\/lp-f/);
 assert.equal(new URL(url).searchParams.get('q'),'courage');
 assert.equal(new URL(url).searchParams.get('fc[]'),'dx');
 assert.equal(new URL(internals.urlFor('courage')).searchParams.get('fc[]'),null);
 assert.ok(new URL(internals.urlFor('x'.repeat(400))).searchParams.get('q').length<=180);
});

test('Explorer state validates saved IDs, WOL pins and trails before read',()=>{
 const invalid=JSON.parse(JSON.stringify({
  activeId:'012345-abc',sessions:[
   {id:'012345-abc',name:'Discours',pins:[
    {url:'https://wol.jw.org/fr/wol/d/r30/lp-f/1200271433',label:'Courage'},
    {url:'https://evil.test',label:'Malicious'}],trail:[
     {type:'search',query:'courage',label:'Sujet'},
     {type:'document',url:'https://evil.test',label:'x'}
   ]},
   {id:'../../danger',name:'unsafe',pins:[]}
  ]}));
 const state=internals.safeState(invalid);
 assert.equal(state.sessions.length,1);
 assert.equal(state.sessions[0].pins.length,1);
 assert.equal(state.sessions[0].trail.length,1);
 assert.equal(state.activeId,'012345-abc');
});

test('saving Explorer state uses its own file and does not touch data.json',async()=>{
 const instance=new Plugin();const writes=[];
 instance.app.vault.adapter.write=async(path,contents)=>writes.push({path,contents});
 await instance.storeExplorerState({sessions:[{id:'012345-abc',name:'Test',pins:[],trail:[]}],activeId:'012345-abc'});
 assert.equal(writes.length,1);
 assert.equal(writes[0].path,'.obsidian/plugins/atlas-biblique/explorer-023.json');
 assert.match(writes[0].contents,/"version": 1/);
 assert.ok(!writes[0].path.endsWith('data.json'));
});

// The following three tests mock only the tiny DOM surface used by the parser,
// with elements explicitly representing the relevant official WOL structure.
class El {
 constructor(tag='div',{cls='',href='',text='',children=[]}={}){
   this.tagName=tag.toUpperCase();this.cls=cls;this.href=href;this.children=children;
   this.childNodes=children.length?children:[{nodeType:3,textContent:text}];this.nodeType=1;
 }
 get textContent(){return this.childNodes.map(c=>c.textContent||'').join('');}
 getAttribute(k){return k==='href'?this.href:k==='src'?this.src:k==='class'?this.cls:null;}
 matches(selector){return selector.split(',').some(p=>{
   p=p.trim();if(p==='a[href]')return this.tagName==='A'&&!!this.href;
   if(p.startsWith('.'))return this.cls.split(/\s+/).includes(p.slice(1));
   return p.toUpperCase()===this.tagName;
 });}
 querySelectorAll(selector){const out=[];const visit=el=>{
   if(el.nodeType!==1)return;
   if(el.matches(selector))out.push(el);
   for(const child of el.childNodes)visit(child);
 };for(const child of this.childNodes)visit(child);return out;}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 closest(selector){return null;}
}
const link=(href,label)=>new El('a',{href,children:[{nodeType:3,textContent:label}]});
const row=(prefix,links)=>new El('p',{children:[{nodeType:3,textContent:prefix},...links]});

function withDocument(construct,fn){
 const baseDomParser=global.DOMParser;
 try{
   // Parser is resolved in VM sandbox as an injected global.
   const scope={module:{exports:BasePlugin},URL,URLSearchParams,Math,Date,console,
     DOMParser: class {parseFromString(){return construct();}},
     require:()=>({ItemView:MockView,Notice:class{},requestUrl:async()=>{},setIcon:()=>{}})
   };
   vm.runInNewContext(instrumented,scope);
   return fn(scope.module.exports.__test);
 }finally{global.DOMParser=baseDomParser;}
}

test('Index parser groups actual explanatory phrases before WOL citation links',()=>{
 const root=new El('div',{cls:'bodyTxt',children:[
  row('comment cultiver : ',[link('/fr/wol/d/r30/lp-f/2019485','w19.07 5-6'),link('/fr/wol/pc/r30/lp-f/1200271433/9/0','mwb17.08 4')]),
  row('comment rester courageux : ',[link('/fr/wol/d/r30/lp-f/1993845','w93 15/11 21-22')]),
  row('comment cultiver : ',[link('/fr/wol/d/r30/lp-f/2019485','w19.07 5-6')])
 ]});
 const doc={querySelector:()=>root};
 withDocument(()=>doc,tools=>{
  const groups=tools.indexGroups('<html/>','https://wol.jw.org/fr/wol/d/r30/lp-f/1200271433');
  assert.equal(groups.length,2);
  assert.equal(groups[0].heading,'comment cultiver');
  assert.equal(groups[0].refs.length,2);
  assert.equal(groups[1].heading,'comment rester courageux');
 });
});

test('Index parser keeps non-citation Bible links inside explanatory phrase',()=>{
 const root=new El('div',{cls:'bodyTxt',children:[
  new El('p',{children:[
   {nodeType:3,textContent:''},
   link('/fr/wol/b/r30/lp-f/nwt/19/27','Psaume 27'),
   {nodeType:3,textContent:' : '},
   link('/fr/wol/d/r30/lp-f/202016164','mwb16.05 7')
  ]})
 ]});
 withDocument(()=>({querySelector:()=>root}),tools=>{
   const groups=tools.indexGroups('x','https://wol.jw.org/fr/wol/d/r30/lp-f/1200271433');
   assert.equal(groups.length,1);
   assert.equal(groups[0].heading,'Psaume 27');
   assert.equal(groups[0].refs.length,1);
 });
});
