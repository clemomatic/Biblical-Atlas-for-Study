import {requestUrl} from 'obsidian';
import {parseScripture} from './bibleLabData';
import {readableOfficialHtml} from './readerText';
import type {ReferenceEntry} from './referenceReader';
import type {ReadingSettings} from './readingSettings';
import {editorialNotes,noteComparison,studyNoteRanges,translationChunks,type EditorialNote} from './studyNoteData';

const API={fr:'https://www.jw.org/fr/biblioth%C3%A8que/bible/bible-d-etude/livres/json/html/',
  en:'https://www.jw.org/en/library/bible/study-bible/books/json/html/'};
async function timed<T>(promise:Promise<T>):Promise<T>{
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{return await Promise.race([promise,new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('La source ne répond pas. Réessaie.')),15000);})]);}
  finally{clearTimeout(timer);}
}
/** Optional public editorial content only. Personal notes never reach this service. */
export class StudyNotesService {
  private notes=new Map<string,{date:number;value:Promise<EditorialNote[]>}>();
  private translations=new Map<string,Promise<string>>();
  constructor(private settings:()=>ReadingSettings){}
  private async fetchNotes(language:'fr'|'en',range:string):Promise<EditorialNote[]>{
    const key=language+'|'+range,previous=this.notes.get(key);
    if(previous&&Date.now()-previous.date<24*60*60*1000)return previous.value;
    const value=(async()=>{
      const response=await timed(requestUrl({url:API[language]+range,throw:false}));
      if(response.status!==200)throw Error('Édition '+(language==='fr'?'française':'anglaise')+' indisponible.');
      if(response.text.length>3000000)throw Error('Réponse trop volumineuse.');
      return editorialNotes(response.json);
    })();
    this.notes.set(key,{date:Date.now(),value});
    while(this.notes.size>100)this.notes.delete(this.notes.keys().next().value!);
    try{return await value;}catch(e){this.notes.delete(key);throw e;}
  }
  private translate(text:string):Promise<string>{
    const previous=this.translations.get(text);if(previous)return previous;
    const value=(async()=>{
      if(text.length>15000)throw Error('Note trop longue pour la traduction gratuite.');
      const translated:string[]=[];
      for(const chunk of translationChunks(text)){
        const url='https://api.mymemory.translated.net/get?'+new URLSearchParams({q:chunk,langpair:'en|fr'});
        const response=await timed(requestUrl({url,throw:false}));
        const data=response.json as {responseStatus?:number;quotaFinished?:boolean;responseData?:{translatedText?:string}};
        const result=data?.responseData?.translatedText;
        if(response.status!==200||Number(data?.responseStatus)!==200||data?.quotaFinished||
          typeof result!=='string'||!result.trim()||result.length>10000)
          throw Error('Traduction gratuite indisponible ou quota atteint. L’original reste disponible.');
        // Decode text entities only; no returned HTML is inserted into the page.
        const inert=new DOMParser().parseFromString('<body></body>','text/html');
        const node=inert.createElement('textarea');node.innerHTML=result;
        translated.push(node.value);
      }
      return translated.join(' ').replace(/\s+/g,' ').trim();
    })();
    this.translations.set(text,value);
    while(this.translations.size>150)this.translations.delete(this.translations.keys().next().value!);
    void value.catch(()=>this.translations.delete(text));return value;
  }
  render(parent:HTMLElement,ref:ReferenceEntry):void{
    parent.querySelector('.jwsd-study-supplements')?.remove();
    if(!this.settings().englishNotes||!parseScripture(ref.label))return;
    const section=parent.createEl('details',{cls:'jwsd-study-supplements'});section.open=true;
    section.createEl('summary',{text:'Notes d’étude · français et anglais'});
    const body=section.createDiv();body.createEl('p',{text:'Comparaison des éditions officielles…',attr:{role:'status'}});
    void this.load(body,ref).catch(error=>{
      if(!body.isConnected)return;body.empty();body.createEl('p',{text:error instanceof Error?error.message:'Comparaison indisponible.'});
      const retry=body.createEl('button',{text:'Réessayer',attr:{type:'button'}});
      retry.addEventListener('click',()=>this.render(parent,ref));
    });
  }
  private async load(body:HTMLElement,ref:ReferenceEntry):Promise<void>{
    const ranges=studyNoteRanges(ref.label),french:EditorialNote[]=[],english:EditorialNote[]=[];
    // Small worker pool rather than a burst of requests for a long passage.
    let next=0;
    await Promise.all(Array.from({length:Math.min(3,ranges.length)},async()=>{
      while(next<ranges.length){const range=ranges[next++];
        const [fr,en]=await Promise.all([this.fetchNotes('fr',range),this.fetchNotes('en',range)]);
        french.push(...fr);english.push(...en);
      }
    }));
    if(!body.isConnected)return;const existing=body.parentElement?.parentElement?.textContent||'';body.empty();
    const dedupe=(items:EditorialNote[])=>[...new Map(items.map(n=>[n.id,n])).values()];
    const fr=dedupe(french),en=noteComparison(fr,dedupe(english));
    body.createEl('p',{cls:'jwsd-study-comparison-status',text:fr.length+' notes françaises · '+en.length+' notes anglaises'});
    const missing=en.filter(n=>n.missingFrench);
    if(!missing.length)body.createEl('p',{text:en.length?'Aucune absence française établie pour ces versets. Le contenu de deux notes dans des langues différentes demande une comparaison manuelle.':'Aucune note d’étude anglaise pour ce passage dans les données reçues.'});
    for(const note of fr){
      const text=readableOfficialHtml(note.html,'note');
      if(!text||existing.includes(text))continue;
      const item=body.createEl('details',{cls:'jwsd-editorial-note'});
      item.createEl('summary',{text:'Français · '+text.slice(0,90)});
      item.createEl('p',{text,attr:{lang:'fr'}});
    }
    for(const note of en){
      const text=readableOfficialHtml(note.html,'note');if(!text)continue;
      const item=body.createEl('details',{cls:'jwsd-editorial-note is-english'});item.open=note.missingFrench;
      item.createEl('summary',{text:note.missingFrench?'Note anglaise · aucune note française sur ce verset':'Note anglaise · correspondance à vérifier'});
      const number=Number(note.verse),book=Math.floor(number/1000000),chapter=Math.floor(number/1000)%1000,verse=number%1000;
      item.createEl('a',{text:'Source officielle · '+chapter+':'+verse,attr:{href:`https://www.jw.org/en/library/bible/study-bible/books/${this.bookSlug(book)}/${chapter}/#v${note.verse}`,target:'_blank',rel:'noopener noreferrer'}});
      const translated=item.createDiv({cls:'jwsd-study-translation'});
      const original=item.createEl('details');original.open=!this.settings().translateEnglish;
      original.createEl('summary',{text:'Original anglais'});original.createEl('p',{text,attr:{lang:'en'}});
      let running=false;
      const translate=async()=>{
        if(running)return;running=true;translated.empty();translated.createEl('p',{text:'Traduction en cours…',attr:{role:'status'}});
        try{const result=await this.translate(text);if(!translated.isConnected)return;
          translated.empty();translated.createEl('p',{cls:'jwsd-translation-label',text:'Traduction automatique non officielle · original anglais · MyMemory'});
          translated.createEl('p',{text:result,attr:{lang:'fr'}});
        }catch(e){if(translated.isConnected){translated.empty();translated.createEl('p',{text:e instanceof Error?e.message:'Traduction indisponible.'});original.open=true;}}
        finally{running=false;}
      };
      if(this.settings().translateEnglish&&note.missingFrench)await translate();
      else{const button=translated.createEl('button',{text:'Traduire en français',attr:{type:'button'}});button.addEventListener('click',()=>{void translate();});}
    }
  }
  private bookSlug(book:number):string {
    return ('genesis exodus leviticus numbers deuteronomy joshua judges ruth 1-samuel 2-samuel 1-kings 2-kings 1-chronicles 2-chronicles ezra nehemiah esther job psalms proverbs ecclesiastes song-of-solomon isaiah jeremiah lamentations ezekiel daniel hosea joel amos obadiah jonah micah nahum habakkuk zephaniah haggai zechariah malachi matthew mark luke john acts romans 1-corinthians 2-corinthians galatians ephesians philippians colossians 1-thessalonians 2-thessalonians 1-timothy 2-timothy titus philemon hebrews james 1-peter 2-peter 1-john 2-john 3-john jude revelation').split(' ')[book-1]||'matthew';
  }
}
