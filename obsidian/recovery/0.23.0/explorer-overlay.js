/*
 * JW Study Desk 0.23.0-beta.3 — opt-in Explorer WOL extension.
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
  const MAX_INDEX_PAGES = 5;
  const MAX_INDEX_CHOICES = 200;
  const htmlText = value => String(value || '').replace(/[\s\u00a0\u202f]+/g, ' ').trim();
  const trim = (value, max = 240) => htmlText(value).slice(0, max);
  const keyOf = value => trim(value, 250).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const cleanQuery = value => trim(value, 180);
  const urlFor = (q, scope = 'all', page = 1) => {
    const p = new URLSearchParams({ q: cleanQuery(q), p: scope === 'index' ? 'doc' : 'par', r: 'occ', st: 'g' });
    if (scope === 'index') p.append('fc[]', 'dx');
    if (Number.isInteger(page) && page > 1 && page <= MAX_INDEX_PAGES) p.set('pg', String(page));
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
  // Exact Index headings and compound headings are distinct user choices.
  // Never infer that the first search hit is the intended subject.
  function indexTopic(title) {
    return trim(title, 180)
      .replace(/\s*\([\u200e\u200f\s]*\d+\s+occurrences?\s*\)\s*$/i, '')
      .replace(/\s*[—–-]\s*Index(?: des publications[^)]*)?\s*$/i, '')
      .replace(/^\s*Index\s*:\s*/i, '')
      .trim();
  }
  function indexMatchRank(query, title) {
    const q = keyOf(query).replace(/[^a-z0-9]+/g, ' ').trim();
    const value = keyOf(indexTopic(title)).replace(/[^a-z0-9]+/g, ' ').trim();
    if (!q || !value) return 3;
    if (q === value) return 0;
    if (value.startsWith(q + ' ')) return 1;
    if ((' ' + value + ' ').includes(' ' + q + ' ')) return 2;
    return 3;
  }
  function indexChoices(query, hits) {
    const unique = new Map();
    for (const hit of hits) {
      const url = safeReferenceUrl(hit?.url);
      const topic = indexTopic(hit?.title || '');
      if (!url || !topic) continue;
      const rank = indexMatchRank(query, topic);
      const candidate = { ...hit, url, title:topic, rank, kind:'index' };
      const previous = unique.get(url);
      if (!previous || candidate.rank < previous.rank) unique.set(url, candidate);
    }
    const collator = new Intl.Collator('fr', { sensitivity:'base', numeric:true });
    return [...unique.values()].sort((a, b) =>
      a.rank - b.rank || collator.compare(a.title, b.title) || a.url.localeCompare(b.url)
    ).slice(0, MAX_INDEX_CHOICES);
  }

  /**
   * Parse WOL search pages with either a named results list or results
   * embedded into main/#content. The fallback is limited to verified
   * search pages with an explicit results marker, never article navigation.
   */
  function searchResults(html, sourceUrl, forceIndex = false) {
    if (!safeWolUrl(sourceUrl) || !/\/fr\/wol\/s\/r30\/lp-f/.test(new URL(sourceUrl).pathname)) return [];
    const doc = parse(html);
    const resultsSelector = '#searchResults,.searchResults,.search-results,#results,.resultList,#lookupResults,[data-search-results],.search-result-list,.searchResultList';
    const direct = doc.querySelector(resultsSelector);
    const containsResultMarker = /(?:\d[\d\s,.]*\s*r[ée]sultats?\b|recherche limit[ée]e\s+[àa]|search results?\b)/i.test(html);
    const fallback = !direct && containsResultMarker
      ? doc.querySelector('main,[role="main"],#content,.mainContent,.content') || doc.body : null;
    const root = direct || fallback;
    if (!root) return [];
    const output = [], seen = new Set();
    const anchors = Array.from(root.querySelectorAll('a[href]'));
    const requestedQuery = new URL(sourceUrl).searchParams.get('q') || '';
    for (const anchor of anchors.slice(0, 1500)) {
      if (!isValidItem(anchor)) continue;
      const url = safeReferenceUrl(anchor.getAttribute('href') || '', sourceUrl);
      if (!url || seen.has(url) || !/\/wol\/d\//.test(url)) continue;
      const item = anchor.closest?.('.searchResult,.search-result,.result,.result-item,.resultItem,[data-result],li,article,div.result,div.item') || anchor.parentElement;
      const title = indexTopic(anchor.textContent || anchor.getAttribute('title') || item?.querySelector('h2,h3,h4')?.textContent || '');
      if (!title || title.length < 3 || /^(?:index des publications|rechercher|sommaire|retour|précédent|suivant|bible|accueil|ouvrir|imprimer|image|vidéo|écouter)$/i.test(title)) continue;
      const entry = item?.closest?.('.searchResult,.search-result,.result,.result-item,.resultItem,[data-result]') || item;
      const metadataText = trim(entry?.textContent || item?.textContent || '', 700);
      const meta = trim(entry?.querySelector?.('.pubRef,.publication,.source,.resultMeta,.resultSource,small')?.textContent || '', 200);
      const isIndex = /(?:\bdx(?:86[-–]23|\d{2}[-–]\d{2})?\b|index\s+1986[-–]2023|index\s+des\s+publications)/i.test(metadataText + ' ' + meta);
      const related = indexMatchRank(requestedQuery,title);
      if (fallback && !isIndex && related > 2) continue;
      if (forceIndex && !isIndex && related > 2) continue;
      const kind = forceIndex || isIndex ? 'index' : classify(title, meta);
      const excerpt = trim(metadataText.replace(anchor.textContent || '', '').replace(meta, ''), 250);
      const image = entry?.querySelector?.('img[src]');
      const thumb = image ? safeThumb(image.getAttribute('src') || '', sourceUrl) : null;
      output.push({ title, url, excerpt, meta:meta || (isIndex ? 'Index des publications' : ''), thumb, kind });
      seen.add(url);
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
      this.indexPage = 1; this.indexExhausted = false; this.selectedIndexLabel = '';
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
      this.indexPage=1;this.indexExhausted=false;this.selectedIndexLabel='';
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
      this.indexPage=1;this.indexExhausted=false;this.selectedIndexLabel='';
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
      this.query=q; this.hits=[]; this.indexHits=[]; this.groups=[]; this.indexUrl=null;
      this.selectedIndexLabel='';this.indexPage=1;this.indexExhausted=false;this.loading=true;
      const seq=++this.sequence;
      this.updateStatus('Recherche sur WOL…'); this.render();
      if (remember) await this.pushTrail({type:'search',query:q,label:q});
      try {
        const regular = urlFor(q);
        const index = urlFor(q,'index');
        const indexParagraph = new URL(index); indexParagraph.searchParams.set('p','par');
        // User-initiated requests only. Never open an Index entry without a choice.
        let a=[], b=[];
        const failures=[];
        try { a=searchResults(await this.fetchHtml(regular),regular); }
        catch(e){ failures.push(String(e?.message||e)); }
        if(seq!==this.sequence)return;
        try { b=searchResults(await this.fetchHtml(index),index,true); }
        catch(e){ failures.push(String(e?.message||e)); }
        if(seq!==this.sequence)return;
        try { b.push(...searchResults(await this.fetchHtml(indexParagraph.href),indexParagraph.href,true)); }
        catch(e){ failures.push(String(e?.message||e)); }
        if(seq!==this.sequence)return;
        this.hits=a.filter(hit=>hit.kind!=='index');
        this.indexHits=indexChoices(q,[...b,...a.filter(hit=>hit.kind==='index')]);
        if(seq!==this.sequence)return;
        this.updateStatus(this.indexHits.length ?
          `${this.indexHits.length} rubrique(s) de l’Index proposée(s) · Choisis celle que tu veux explorer${failures.length?' · lecture partielle':''}` :
          a.length ? `${this.hits.length} article(s) trouvé(s) · Aucune rubrique de l’Index sur cette page.` :
          'Aucun résultat structuré récupéré. La recherche officielle reste accessible.');
      } catch(e){
        if(seq!==this.sequence)return;
        this.updateStatus('Recherche indisponible : '+String(e?.message||e));
      } finally {
        if(seq===this.sequence){this.loading=false;this.render();}
      }
    }
    async loadMoreIndex() {
      if (!this.query || this.loading || this.indexExhausted || this.indexPage >= MAX_INDEX_PAGES) return;
      this.loading=true;const seq=++this.sequence;
      const nextPage=this.indexPage+1;
      this.updateStatus(`Recherche d’autres rubriques (page ${nextPage})…`);this.render();
      try {
        const url=urlFor(this.query,'index',nextPage);
        const more=searchResults(await this.fetchHtml(url),url,true);
        if(seq!==this.sequence)return;
        const found=indexChoices(this.query,[...this.indexHits,...more]);
        const gained=found.length-this.indexHits.length;
        this.indexHits=found;this.indexPage=nextPage;
        this.indexExhausted=!gained || !more.length || nextPage>=MAX_INDEX_PAGES || found.length>=MAX_INDEX_CHOICES;
        this.updateStatus(gained ? `${found.length} rubrique(s) au total · Choisis une rubrique` :
          'Aucune autre rubrique trouvée sur cette page.');
      } catch(e) {
        if(seq!==this.sequence)return;
        this.updateStatus('Impossible de charger d’autres rubriques : '+String(e?.message||e));
      } finally {if(seq===this.sequence){this.loading=false;this.render();}}
    }
    async exploreIndex(url,label,remember=true) {
      const target=safeReferenceUrl(url);
      if(!target)return;
      this.loading=true;const seq=++this.sequence;this.indexUrl=target;
      this.selectedIndexLabel=trim(label,180);this.groups=[];
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
    async openReference(url,label,context='',remember=true) {
      const target=safeWolUrl(url);if(!target)return;
      // Open the official /pc/ source synchronously from the user's click,
      // before asynchronous persistence can cause pop-up blocking.
      const bibliography=/\/wol\/pc\//.test(target);
      if(bibliography)this.openOfficial(target);
      if(remember)await this.pushTrail({type:'document',url:target,label:trim(label,180)});
      // Delegate direct document reading to the untouched 0.22.9 reader.
      if(bibliography){this.render();return;}
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
      else await this.openReference(item.url,item.label,'',false);
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
      heading.append(textNode('h2','','Explorer WOL · bêta 3'));
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
      if(this.query && !this.loading && !this.indexHits.length){
        const notice=textNode('section','jwsd-x-panel');
        notice.append(textNode('h3','','Rubriques de l’Index non identifiées'));
        notice.append(textNode('p','jwsd-x-muted',
          'Aucune rubrique n’a pu être extraite de la réponse WOL. Ouvre la recherche officielle pour consulter les sujets sans choix automatique.'));
        notice.append(button('Consulter les rubriques sur WOL ↗',
          ()=>this.openOfficial(urlFor(this.query,'index'))));
        body.append(notice);
      }
      if(this.indexHits.length){
        const section=textNode('section','jwsd-x-panel jwsd-x-index-choices');
        section.append(textNode('h3','','Choisis une rubrique de l’Index'));
        section.append(textNode('p','jwsd-x-muted',
          'Les titres exacts apparaissent d’abord. Aucune rubrique n’est ouverte automatiquement.'));
        const labels=['Correspondance exacte','Rubriques commençant par ce terme',
          'Rubriques contenant ce terme','Autres rubriques associées'];
        for (let rank=0;rank<4;rank++){
          const matches=this.indexHits.filter(hit=>hit.rank===rank);
          if(!matches.length)continue;
          section.append(textNode('h4','jwsd-x-choice-category',labels[rank]));
          const list=textNode('div','jwsd-x-choice-list');
          for(const hit of matches){
            const choice=button(hit.title,()=>this.exploreIndex(hit.url,hit.title),'jwsd-x-choice');
            if(hit.url===this.indexUrl){
              choice.classList.add('is-selected');
              choice.setAttribute('aria-current','true');
            }
            const info=textNode('div','jwsd-x-choice-info');
            info.append(choice);
            if(hit.meta)info.append(textNode('small','jwsd-x-muted',hit.meta));
            list.append(info);
          }
          section.append(list);
        }
        if(!this.indexExhausted && this.indexPage<MAX_INDEX_PAGES){
          const more=button('Afficher d’autres rubriques',()=>this.loadMoreIndex());
          more.disabled=this.loading;section.append(more);
        }
        section.append(button('Voir tous les résultats de l’Index sur WOL ↗',
          ()=>this.openOfficial(urlFor(this.query,'index'))));
        body.append(section);
      }
      if(this.indexUrl){
        const section=textNode('section','jwsd-x-panel');
        section.append(textNode('h3','',`Rubrique choisie : ${this.selectedIndexLabel||'Index'}`));
        if(!this.loading && !this.groups.length)
          section.append(textNode('p','jwsd-x-muted','Aucune référence structurée extraite ; consulte la rubrique officielle.'));
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
        section.append(button('Ouvrir cette rubrique sur WOL ↗',()=>this.openOfficial(this.indexUrl)));
        body.append(section);
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
