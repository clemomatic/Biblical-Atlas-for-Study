/*
 * JW Study Desk 0.23.0-beta.1 — opt-in Explorer WOL extension.
 * Injected AFTER the exact original 0.22.9 main.js, with no replacement
 * or monkey-patching of any existing Atelier, reader or data logic.
 * Copyright (c) 2026 contributors. Source and tests in this directory.
 */
;(() => {
  'use strict';
  const { ItemView, Notice, requestUrl, setIcon } = require('obsidian');
  const OriginalPlugin = module.exports;
  if (typeof OriginalPlugin !== 'function' || typeof OriginalPlugin.prototype.onload !== 'function') {
    throw new Error('JWSD Explorer: le plugin de base 0.22.9 est introuvable.');
  }

  const TYPE = 'jwsd-wol-explorer-023';
  const BASE = 'https://wol.jw.org';
  const MAX_SESSIONS = 16;
  const MAX_PINS = 100;
  const MAX_TRAIL = 45;
  const MAX_RESULT = 60;
  const htmlText = value => String(value || '').replace(/[\s\u00a0\u202f]+/g, ' ').trim();
  const trim = (value, max = 240) => htmlText(value).slice(0, max);
  const keyOf = value => trim(value, 250).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const cleanQuery = value => trim(value, 180);
  const urlFor = (q, scope = 'all') => {
    const p = new URLSearchParams({ q: cleanQuery(q), p: 'par', r: 'occ', st: 'a' });
    if (scope === 'index') p.append('fc[]', 'dx');
    return BASE + '/fr/wol/s/r30/lp-f?' + p;
  };

  function safeWolUrl(input, base = BASE) {
    try {
      const u = new URL(input, base);
      if (u.protocol !== 'https:' || u.hostname !== 'wol.jw.org' || u.port || u.username || u.password) return null;
      if (!/^\/fr\/wol\/(?:d|pc|l|s|b)\/r30\/lp-f(?:\/|$)/.test(u.pathname)) return null;
      if (u.hash && !/^#(?:h|p|v|fn)=[\w,-]+$/i.test(u.hash)) u.hash = '';
      return u.href;
    } catch { return null; }
  }
  const safeReferenceUrl = (url, base) => {
    const normalized = safeWolUrl(url, base);
    return normalized && /\/wol\/(?:d|pc)\//.test(normalized) ? normalized : null;
  };
  function safeThumb(input, base = BASE) {
    try {
      const u = new URL(input, base);
      if (u.protocol !== 'https:' || u.port || u.username || u.password) return null;
      if (u.hostname === 'wol.jw.org' || u.hostname === 'www.jw.org' || u.hostname.endsWith('.jw-cdn.org')) return u.href;
    } catch { /* ignore */ }
    return null;
  }
  function parse(html) { return new DOMParser().parseFromString(html, 'text/html'); }
  function rootOf(doc) {
    return doc.querySelector('#searchResults,.searchResults,.search-results,#results,.resultList,#lookupResults,.bodyTxt,#articleContent,#article,main,article,#content');
  }
  function mainText(el, max = 450) { return trim(el?.textContent || '', max); }
  function isValidItem(node) {
    return !!node && !node.closest('nav,header,footer,aside,[role="navigation"]');
  }
  function classify(title, meta) {
    const t = keyOf(title + ' ' + meta);
    if (/\bindex\b|\bdx(?:86|\d\d)/.test(t)) return 'index';
    if (/guide de recherche/.test(t)) return 'guide';
    return 'article';
  }
  function searchResults(html, sourceUrl, forceIndex = false) {
    const doc = parse(html);
    const root = rootOf(doc);
    if (!root) return [];
    const output = [], seen = new Set();
    const selectors = '.searchResult,.search-result,.result,.result-item,.resultItem,[data-result],li,article';
    let nodes = Array.from(root.querySelectorAll(selectors)).filter(isValidItem);
    nodes = nodes.filter(n => !n.querySelector('.searchResult,.search-result,.result,.result-item,.resultItem,[data-result]'));
    if (!nodes.length) nodes = Array.from(root.querySelectorAll('div,p')).filter(isValidItem);
    for (const node of nodes.slice(0, 900)) {
      const anchors = Array.from(node.querySelectorAll('a[href]'));
      const entry = anchors.map(a => ({ a, url: safeReferenceUrl(a.getAttribute('href') || '', sourceUrl) })).find(x => x.url);
      if (!entry || seen.has(entry.url)) continue;
      const title = trim(node.querySelector('h2,h3,h4,.resultTitle,.title')?.textContent || entry.a.textContent, 180);
      if (!title || title.length < 3) continue;
      const meta = mainText(node.querySelector('.pubRef,.publication,.source,.resultMeta,.resultSource'), 160);
      const body = mainText(node, 800);
      const excerpt = trim(body.replace(title, '').replace(meta, ''), 370);
      const image = node.querySelector('img[src]');
      const thumb = image ? safeThumb(image.getAttribute('src') || '', sourceUrl) : null;
      output.push({ title, url: entry.url, excerpt, meta, thumb,
        kind: forceIndex ? 'index' : classify(title, meta) });
      seen.add(entry.url);
      if (output.length >= MAX_RESULT) break;
    }
    return output;
  }

  function beforeFirstCitation(element, sourceUrl) {
    const segments = [];
    let stopped = false;
    const visit = node => {
      if (stopped) return;
      if (node.nodeType === 3) { segments.push(node.textContent || ''); return; }
      if (node.nodeType !== 1) return;
      if (node.matches?.('script,style,svg,button')) return;
      if (node.matches?.('a[href]') && safeReferenceUrl(node.getAttribute('href'), sourceUrl)) {
        stopped = true; return;
      }
      for (const child of node.childNodes) visit(child);
    };
    visit(element);
    return trim(segments.join(' '), 270).replace(/[,:;：\s]+$/, '');
  }

  /** Groups official references under the actual Index text preceding them. */
  function indexGroups(html, sourceUrl) {
    if (!safeReferenceUrl(sourceUrl)) return [];
    const doc = parse(html), root = doc.querySelector('.bodyTxt,#articleContent,#article,article,main,#content');
    if (!root) return [];
    const rows = Array.from(root.querySelectorAll('h2,h3,h4,p,li,dt,dd,div.p,div.par,div[data-pid]'))
      .filter(el => isValidItem(el) && !el.querySelector('p,li,dt,dd,div.p,div.par,div[data-pid]'));
    const grouped = [], lookup = new Map();
    let section = '';
    for (const row of rows.slice(0, 1600)) {
      const anchors = Array.from(row.querySelectorAll('a[href]'));
      const refs = [];
      const seen = new Set();
      for (const anchor of anchors) {
        const url = safeReferenceUrl(anchor.getAttribute('href') || '', sourceUrl);
        const label = trim(anchor.textContent, 125);
        if (!url || !label || seen.has(url + label)) continue;
        seen.add(url + label); refs.push({ url, label });
        if (refs.length >= 35) break;
      }
      const label = refs.length ? beforeFirstCitation(row, sourceUrl) : mainText(row, 160);
      if (!refs.length) {
        // A short heading followed by a colon is an Index subtopic, not a document.
        if (label && label.length < 110 && (/:\s*$/.test(label) || /^H[2-4]$/.test(row.tagName))) {
          section = label.replace(/[:：]\s*$/, '');
        }
        continue;
      }
      if (!label) continue; // never invent the sentence preceding the references
      const category = section && section !== label ? section : '';
      const key = keyOf(category + '\n' + label);
      let group = lookup.get(key);
      if (!group) {
        if (grouped.length >= 120) break;
        group = { heading: label, path: category ? [category] : [], refs: [] };
        grouped.push(group); lookup.set(key, group);
      }
      const current = new Set(group.refs.map(r => r.url + '|' + r.label));
      for (const ref of refs) {
        if (!current.has(ref.url + '|' + ref.label)) group.refs.push(ref);
      }
    }
    return grouped;
  }

  function safeState(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const sessions = [];
    for (const item of Array.isArray(source.sessions) ? source.sessions.slice(0, MAX_SESSIONS) : []) {
      if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !/^[a-z0-9-]{5,70}$/i.test(item.id)) continue;
      if (sessions.some(s => s.id === item.id)) continue;
      const pins = [];
      for (const pin of Array.isArray(item.pins) ? item.pins.slice(0, MAX_PINS) : []) {
        const url = safeWolUrl(pin?.url);
        if (url && !pins.some(p => p.url === url)) pins.push({ url, label: trim(pin.label, 180), context: trim(pin.context, 250) });
      }
      const trail = [];
      for (const t of Array.isArray(item.trail) ? item.trail.slice(-MAX_TRAIL) : []) {
        if (!t || !['search','index','document'].includes(t.type)) continue;
        const url = t.type === 'search' ? null : safeWolUrl(t.url);
        const query = t.type === 'search' ? cleanQuery(t.query) : '';
        if (t.type === 'search' && !query || t.type !== 'search' && !url) continue;
        trail.push({ type:t.type, query, url, label: trim(t.label, 180) });
      }
      sessions.push({ id:item.id, name:trim(item.name, 80)||'Recherche', pins, trail });
    }
    return { version: 1, activeId: sessions.some(s => s.id === source.activeId) ? source.activeId : sessions[0]?.id || null, sessions };
  }
  const uniqueId = () => Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,9);
  function newSession(name='Nouvelle recherche') {
    return { id:uniqueId(), name, pins:[], trail:[] };
  }
  function textNode(name, className, text) {
    const el = document.createElement(name);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function button(label, cb, className='jwsd-x-button') {
    const el = textNode('button', className, label);
    el.type = 'button'; el.addEventListener('click', cb); return el;
  }
  function showIcon(parent, icon) {
    try { setIcon(parent, icon); } catch { parent.textContent = '▧'; }
  }

  class ExplorerView extends ItemView {
    constructor(leaf, plugin) {
      super(leaf);
      this.plugin = plugin;
      this.data = null; this.session = null; this.query = ''; this.scope = 'all';
      this.hits = []; this.indexHits = []; this.groups = []; this.indexUrl = null;
      this.loading = false; this.sequence = 0; this.status = '';
      this.cache = new Map(); this.showPins = false;
      this.history = []; this.historyIndex = -1;
    }
    getViewType() { return TYPE; }
    getDisplayText() { return 'Explorer WOL'; }
    getIcon() { return 'search'; }
    async onOpen() {
      try {
        this.data = await this.plugin.explorerState();
        if (!this.data.sessions.length) {
          const session = newSession();
          this.data.sessions.push(session); this.data.activeId = session.id;
          await this.plugin.storeExplorerState(this.data);
        }
        this.session = this.data.sessions.find(s => s.id === this.data.activeId) || this.data.sessions[0];
        this.render();
      } catch (error) {
        this.contentEl.replaceChildren(textNode('p','jwsd-x-error','Impossible d’ouvrir Explorer : '+String(error?.message || error)));
      }
    }
    async onClose() { this.sequence++; this.cache.clear(); }
    updateStatus(message) { this.status = message; if (this.statusEl) this.statusEl.textContent = message; }
    async persist() { await this.plugin.storeExplorerState(this.data); }
    async addSession() {
      if (this.data.sessions.length >= MAX_SESSIONS) { new Notice('Explorer : 16 recherches au maximum.'); return; }
      const session = newSession();
      this.data.sessions.unshift(session); this.data.activeId=session.id; this.session=session;
      this.query=''; this.hits=[]; this.indexHits=[]; this.groups=[]; this.indexUrl=null;
      this.history=[]; this.historyIndex=-1;
      await this.persist(); this.render();
    }
    async renameSession() {
      if (!this.session) return;
      const value=window.prompt('Nom de cette recherche',this.session.name);
      if (value===null) return;
      if (!trim(value,80)) { new Notice('Indique un nom pour cette recherche.'); return; }
      this.session.name=trim(value,80); await this.persist(); this.render();
    }
    async chooseSession(id) {
      const session=this.data.sessions.find(s=>s.id===id);
      if (!session) return;
      this.data.activeId=id;this.session=session;
      this.query='';this.hits=[];this.indexHits=[];this.groups=[];this.indexUrl=null;
      this.history=[];this.historyIndex=-1; await this.persist();this.render();
    }
    async fetchHtml(url) {
      const safe=safeWolUrl(url);
      if (!safe) throw new Error('Adresse WOL non autorisée.');
      const entry=this.cache.get(safe);
      if (entry&&Date.now()-entry.date<15*60_000) return entry.html;
      const result=await requestUrl({url:safe,throw:false});
      if (result.status!==200 || !/<(?:html|body|main|article)\b/i.test(result.text)) {
        throw new Error('WOL ne renvoie pas de page lisible (HTTP '+result.status+').');
      }
      if(this.cache.size >= 20)this.cache.delete(this.cache.keys().next().value);
      this.cache.set(safe,{date:Date.now(),html:result.text});return result.text;
    }
    async search(query, remember=true) {
      const q=cleanQuery(query);if(!q) return;
      this.query=q; this.groups=[]; this.indexUrl=null; this.loading=true;
      const seq=++this.sequence;
      this.updateStatus('Recherche sur WOL…'); this.render();
      if (remember) await this.pushTrail({type:'search',query:q,label:q});
      try {
        const regular = urlFor(q);
        const index = urlFor(q,'index');
        // User-initiated requests only; one page per scope, plus at most one Index entry.
        let a=[], b=[];
        const failures=[];
        try { a=searchResults(await this.fetchHtml(regular),regular); }
        catch(e){ failures.push(String(e?.message||e)); }
        if(seq!==this.sequence)return;
        try { b=searchResults(await this.fetchHtml(index),index,true); }
        catch(e){ failures.push(String(e?.message||e)); }
        if(seq!==this.sequence)return;
        this.hits=a;this.indexHits=b.filter(hit=>hit.kind==='index');
        const first=this.indexHits.find(hit=>/\/wol\/d\//.test(hit.url));
        if(first){
          this.indexUrl=first.url;
          try { this.groups=indexGroups(await this.fetchHtml(first.url),first.url); }
          catch(e){ failures.push(String(e?.message||e)); }
        }
        if(seq!==this.sequence)return;
        this.updateStatus((a.length+b.length)?
          `${a.length} résultat(s) · ${b.length} entrée(s) de l’Index${failures.length?' · lecture partielle':''}`:
          'Aucun résultat structuré récupéré. La recherche officielle reste accessible.');
      } catch(e){
        if(seq!==this.sequence)return;
        this.updateStatus('Recherche indisponible : '+String(e?.message||e));
      } finally {
        if(seq===this.sequence){this.loading=false;this.render();}
      }
    }
    async exploreIndex(url,label,remember=true) {
      const target=safeReferenceUrl(url);
      if(!target)return;
      this.loading=true;const seq=++this.sequence;this.indexUrl=target;
      this.updateStatus('Lecture de l’entrée de l’Index…');this.render();
      if(remember)await this.pushTrail({type:'index',url:target,label:trim(label,180)});
      try {
        this.groups=indexGroups(await this.fetchHtml(target),target);
        if(seq!==this.sequence)return;
        this.updateStatus(this.groups.length?`${this.groups.length} rubrique(s) de l’Index`:
          'Cette entrée ne contient pas de rubriques extractibles ; ouvre la source officielle.');
      }catch(e){if(seq!==this.sequence)return;this.groups=[];this.updateStatus(String(e?.message||e));}
      finally {if(seq===this.sequence){this.loading=false;this.render();}}
    }
    async openReference(url,label,context='') {
      const target=safeWolUrl(url);if(!target)return;
      await this.pushTrail({type:'document',url:target,label:trim(label,180)});
      // Delegate the actual reading to the existing, untouched 0.22.9 reader.
      // PC links may be unresolved; in that case expose the official source.
      if (/\/wol\/pc\//.test(target)) { this.openOfficial(target); return; }
      try { await this.plugin.openBibleLab(target,label); }
      catch { this.openOfficial(target); }
      this.render();
    }
    openOfficial(url) {
      const target=safeWolUrl(url);if(!target)return;
      window.open(target,'_blank','noopener,noreferrer');
    }
    async pushTrail(item) {
      if(!this.session)return;
      this.session.trail.push(item);
      if(this.session.trail.length>MAX_TRAIL)this.session.trail.splice(0,this.session.trail.length-MAX_TRAIL);
      await this.persist();
    }
    async pin(url,label,context='') {
      const safe=safeWolUrl(url);if(!safe||!this.session)return;
      if(this.session.pins.some(pin=>pin.url===safe)) { new Notice('Référence déjà épinglée.'); return; }
      if(this.session.pins.length>=MAX_PINS){new Notice('Limite de 100 épingles atteinte.');return;}
      this.session.pins.push({url:safe,label:trim(label,180),context:trim(context,250)});
      await this.persist();this.render();
    }
    async unpin(url) {
      this.session.pins=this.session.pins.filter(pin=>pin.url!==url);
      await this.persist();this.render();
    }
    async goTrail(index) {
      const item=this.session?.trail[index];if(!item)return;
      if(item.type==='search') {this.query=item.query;await this.search(item.query,false);}
      else if(item.type==='index')await this.exploreIndex(item.url,item.label,false);
      else await this.openReference(item.url,item.label);
    }
    card(host,hit,options={}) {
      const card=textNode('article','jwsd-x-card');
      const thumb=textNode('span','jwsd-x-thumb');
      if(hit.thumb) {
        const image=textNode('img');image.src=hit.thumb;image.alt='';image.loading='lazy';
        image.onerror=()=>{image.remove();showIcon(thumb,'book-open');};thumb.append(image);
      } else showIcon(thumb,'book-open');
      const body=textNode('div','jwsd-x-card-copy');
      const heading=button(hit.title,()=>options.index ? this.exploreIndex(hit.url,hit.title):this.openReference(hit.url,hit.title,options.context||''),'jwsd-x-link');
      body.append(heading);
      if(hit.meta) body.append(textNode('small','jwsd-x-muted',hit.meta));
      if(hit.excerpt)body.append(textNode('p','jwsd-x-excerpt',hit.excerpt));
      const actions=textNode('div','jwsd-x-actions');
      actions.append(button('Épingler',()=>this.pin(hit.url,hit.title,options.context||'')));
      actions.append(button('WOL ↗',()=>this.openOfficial(hit.url)));
      body.append(actions);card.append(thumb,body);host.append(card);
    }
    render() {
      if(!this.contentEl||!this.session)return;
      const host=this.contentEl;host.replaceChildren();host.addClass?.('jwsd-x-shell');
      const heading=textNode('div','jwsd-x-head');
      heading.append(textNode('h2','','Explorer WOL'));
      heading.append(button('+',()=>this.addSession(),'jwsd-x-mini'));
      heading.append(button('Renommer',()=>this.renameSession(),'jwsd-x-mini'));
      host.append(heading);
      const selector=textNode('select','jwsd-x-sessions');selector.setAttribute('aria-label','Recherche active');
      for(const s of this.data.sessions) {
        const option=textNode('option','',s.name);option.value=s.id;option.selected=s.id===this.session.id;
        selector.append(option);
      }
      selector.addEventListener('change',()=>this.chooseSession(selector.value));host.append(selector);
      const form=textNode('form','jwsd-x-search');
      const input=textNode('input');input.type='search';input.value=this.query;input.placeholder='Rechercher sur WOL…';
      input.maxLength=180;input.setAttribute('aria-label','Sujet ou expression');
      const submit=button('Rechercher',()=>this.search(input.value));submit.disabled=this.loading;
      form.addEventListener('submit',ev=>{ev.preventDefault();this.search(input.value);});
      form.append(input,submit);host.append(form);
      if(this.session.trail.length){
        const trail=textNode('div','jwsd-x-trail');
        trail.append(textNode('small','jwsd-x-muted','Fil d’exploration'));
        for(const [i,item] of this.session.trail.slice(-7).entries()){
          const originalIndex=this.session.trail.length-Math.min(7,this.session.trail.length)+i;
          trail.append(button(item.label||item.query||'Étape',()=>this.goTrail(originalIndex),'jwsd-x-crumb'));
        }
        host.append(trail);
      }
      const status=textNode('p','jwsd-x-status',this.status||'Saisis un mot pour explorer WOL et son Index.');
      status.setAttribute('role','status');status.setAttribute('aria-live','polite');this.statusEl=status;host.append(status);
      const body=textNode('div','jwsd-x-body');host.append(body);
      if(this.groups.length){
        const section=textNode('section','jwsd-x-panel');
        section.append(textNode('h3','','Dans l’Index'));
        for(const group of this.groups.slice(0,60)){
          const block=textNode('div','jwsd-x-index-block');
          if(group.path.length) block.append(textNode('small','jwsd-x-muted',group.path.join(' › ')));
          block.append(textNode('h4','',group.heading));
          for(const ref of group.refs.slice(0,9))this.card(block,{
            title:ref.label,url:ref.url,thumb:null,meta:'',excerpt:''
          },{context:group.heading});
          if(group.refs.length>9)block.append(textNode('p','jwsd-x-muted',`+${group.refs.length-9} référence(s) sur WOL`));
          section.append(block);
        }
        if(this.indexUrl)section.append(button('Ouvrir l’entrée complète sur WOL ↗',()=>this.openOfficial(this.indexUrl)));
        body.append(section);
      }
      if(this.indexHits.length){
        const section=textNode('section','jwsd-x-panel');section.append(textNode('h3','','Entrées de l’Index'));
        for(const hit of this.indexHits.slice(0,18))this.card(section,hit,{index:true});body.append(section);
      }
      if(this.hits.length){
        const section=textNode('section','jwsd-x-panel');section.append(textNode('h3','','Articles et publications'));
        for(const hit of this.hits.slice(0,30))this.card(section,hit,{index:hit.kind==='index'});body.append(section);
      }
      if(this.query){body.append(button('Voir la recherche officielle sur WOL ↗',()=>this.openOfficial(urlFor(this.query))));}
      const pinned=textNode('section','jwsd-x-pins');
      const toggle=button(`Épingles (${this.session.pins.length}) ${this.showPins?'▾':'▸'}`,()=>{this.showPins=!this.showPins;this.render();});
      pinned.append(toggle);
      if(this.showPins){
        for(const pin of this.session.pins){
          const row=textNode('div','jwsd-x-pin');
          row.append(button(pin.label,()=>this.openReference(pin.url,pin.label,pin.context),'jwsd-x-link'));
          if(pin.context)row.append(textNode('small','jwsd-x-muted',pin.context));
          row.append(button('Retirer',()=>this.unpin(pin.url)));
          pinned.append(row);
        }
        if(!this.session.pins.length)pinned.append(textNode('p','jwsd-x-muted','Aucune référence épinglée dans cette recherche.'));
      }
      host.append(pinned);
    }
  }

  class JwsdExplorerPlugin extends OriginalPlugin {
    async onload() {
      await super.onload();
      try {
        this.registerView(TYPE,leaf=>new ExplorerView(leaf,this));
        this.addCommand({id:'open-wol-explorer-023',name:'Explorer WOL : recherche et Index',callback:()=>this.openExplorer()});
        // Only a new ribbon action; existing search and Atelier are untouched.
        this.addRibbonIcon('search','Explorer WOL',()=>this.openExplorer());
      } catch(error) {
        // A failing experimental add-on must not stop the proven 0.22.9 plugin.
        console.error('JW Study Desk Explorer 0.23 beta:',error);
        new Notice('Explorer WOL indisponible. Les fonctions existantes restent accessibles.');
      }
    }
    async explorerState() {
      if(this._jwsdExplorerState)return this._jwsdExplorerState;
      const path=this._jwsdExplorerFilePath();
      let data={};
      try {if(await this.app.vault.adapter.exists(path))data=JSON.parse(await this.app.vault.adapter.read(path));}
      catch(error){console.warn('Explorer : données illisibles, la sauvegarde existante reste intacte.',error);}
      this._jwsdExplorerState=safeState(data);
      return this._jwsdExplorerState;
    }
    _jwsdExplorerFilePath() {
      return this.app.vault.configDir+'/plugins/'+this.manifest.id+'/explorer-023.json';
    }
    async storeExplorerState(data) {
      this._jwsdExplorerState=safeState(data);
      const file=this._jwsdExplorerFilePath();
      const output=JSON.stringify(this._jwsdExplorerState,null,2);
      // Serializes concurrent writes without ever touching data.json.
      const prior=this._jwsdExplorerSaveTail||Promise.resolve();
      const current=prior.catch(()=>{}).then(()=>this.app.vault.adapter.write(file,output));
      this._jwsdExplorerSaveTail=current;
      await current;
    }
    async openExplorer() {
      const leaves=this.app.workspace.getLeavesOfType(TYPE);
      let leaf=leaves[0];
      if(!leaf) {
        leaf=this.app.workspace.getRightLeaf(false)||this.app.workspace.getLeaf('tab');
        await leaf.setViewState({type:TYPE,active:true});
      }
      await this.app.workspace.revealLeaf(leaf);
    }
  }
  module.exports=JwsdExplorerPlugin;
})();
