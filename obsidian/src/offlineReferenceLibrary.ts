import { TFile, type App } from 'obsidian';
import {
  OFFLINE_INDEX_NAME,directWolMepsId,validateOfflineIndex,
  type OfflineImportIndex
} from './offlinePublications';
import type { ReferenceEntry,ReaderLine,ReaderResult } from './referenceReader';
import {readVirtualPublications,loadVirtualText} from './virtualJwpub';

export interface LocalPublication {
  title:string;
  symbol:string;
  language:number;
  year:number;
  documents:number;
  path:string;
}
const validBase=(root:string)=>root.replace(/\/+$/,'')+'/Imports/';

/** Only manifests produced by explicit local JWPUB imports are considered. */
export async function readLocalPublicationIndexes(app:App,rootFolder:string):Promise<
  {folder:string;index:OfflineImportIndex}[]
>{
  const prefix=validBase(rootFolder);
  const found:{folder:string;index:OfflineImportIndex}[]=[];
  for(const file of app.vault.getFiles()){
    if(file.name!==OFFLINE_INDEX_NAME||!file.path.startsWith(prefix))continue;
    const folder=file.path.slice(0,-('/'+OFFLINE_INDEX_NAME).length);
    // Manifest must sit directly in its imported publication folder.
    if(folder.slice(prefix.length).includes('/'))continue;
    try{
      const content=await app.vault.cachedRead(file);
      if(content.length>4*1024*1024)continue;
      const parsed=validateOfflineIndex(JSON.parse(content));
      if(parsed)found.push({folder,index:parsed});
    }catch{/* A damaged manifest cannot make reading WOL references fail. */}
  }
  return found.sort((a,b)=>a.folder.localeCompare(b.folder,'fr'));
}
export async function listLocalPublications(app:App,root:string):Promise<LocalPublication[]>{
  const manifests=await readLocalPublicationIndexes(app,root);
  return manifests.map(item=>({
    title:item.index.publication.title,
    symbol:item.index.publication.symbol,
    language:item.index.publication.language,
    year:item.index.publication.year,
    documents:item.index.documents.length,path:item.folder
  }));
}
const cleanMarkdown=(input:string)=>input
  .replace(/^---\s*\n[\s\S]*?\n---\s*\n/,'')
  .replace(/^# [^\n]+\n/,'')
  .trim();
function localReaderLines(markdown:string):ReaderLine[]{
  const text=cleanMarkdown(markdown).slice(0,600000);
  const blocks=text.split(/\n\s*\n/).slice(0,1000);
  const lines:ReaderLine[]=[];
  for(const block of blocks){
    const trimmed=block.trim();
    if(!trimmed)continue;
    const heading=/^#{1,6}\s+([^\n]+)/.exec(trimmed);
    const content=(heading?heading[1]:trimmed)
      // The local view displays readable text; Markdown links can still
      // be followed in the source note. No HTML is executed here.
      .replace(/!\[([^\]]*)\]\([^)]+\)/g,'$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g,'$1')
      .replace(/(?:^|\n)\s*[*_]{1,2}/g,'')
      .replace(/\*{2,}/g,'')
      .trim().slice(0,6500);
    if(content)lines.push({type:heading?'heading':'paragraph',text:content});
  }
  return lines;
}

/**
 * Uses exact MEPS document identifiers (not title inference). We cannot safely
 * map WOL's #h=N fragment to JWPUB paragraph IDs; the whole article is shown
 * with a visible precision warning rather than a fabricated location.
 */
export async function resolveOfflineDocument(
  app:App,root:string,ref:ReferenceEntry
):Promise<ReaderResult|null>{
  if(ref.kind==='scripture')return null;
  const meps=directWolMepsId(ref.url);
  if(!meps)return null;
  const indexes=await readLocalPublicationIndexes(app,root);
  for(const {folder,index} of indexes){
    if(index.publication.language!==3)continue; // French WOL references only
    const match=index.documents.find(doc=>doc.mepsId===meps);
    if(!match)continue;
    const file=app.vault.getAbstractFileByPath(folder+'/'+match.path);
    if(!(file instanceof TFile))continue;
    try{
      const content=await app.vault.cachedRead(file);
      return {
        title:match.title,
        kind:'article',
        sourceUrl:ref.url,
        lines:localReaderLines(content),
        links:[],
        notice:'Texte issu de ta bibliothèque locale · hors connexion. '+
          (new URL(ref.url).hash?
            'Le numéro de paragraphe WOL n’est pas confirmé dans cette copie ; vérifie la position dans la source officielle.':
            'Les liens officiels sont conservés.')
      };
    }catch{/* Fall back to WOL if the local note was removed or inaccessible. */}
  }
  // Virtual publications resolve the same precise MEPS document IDs without
  // requiring an individual Markdown file for every chapter or article.
  const virtual=await readVirtualPublications(app,root);
  for(const {folder,index} of virtual){
    if(index.publication.language!==3)continue;
    const match=index.documents.find(doc=>doc.mepsId===meps);
    if(!match)continue;
    try{
      const content=(await loadVirtualText(app,folder)).get(match.documentId);
      if(!content)continue;
      return {
        title:match.title,kind:'article',sourceUrl:ref.url,
        lines:localReaderLines(content),links:[],
        notice:'Texte de ton JWPUB virtuel · hors connexion. '+
          (new URL(ref.url).hash?
            'La position exacte du paragraphe WOL reste à confirmer.':
            'Document reconnu par son identifiant MEPS.')
      };
    }catch{/* Continue with the official online reference if cache is damaged. */}
  }
  return null;
}
