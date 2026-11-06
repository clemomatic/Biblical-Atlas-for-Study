import {parseScripture} from './bibleLabData.ts';
import {directWolMepsId} from './offlinePublications.ts';
import {annotationsForBibleChapter} from './jwAnnotationLibrary.ts';
import type {JwAnnotationIndex,JwAnnotationLocation,JwAnnotationMark,JwAnnotationNote,JwAnnotationRange,JwAnnotationBookmark} from './jwAnnotations.ts';
import type {ReferenceEntry} from './referenceReader.ts';

export interface PopupAnnotationMatch {
  scope:'chapter'|'document';
  sourceLabel:string;
  confidence:'chapter'|'meps-id';
  marks:{mark:JwAnnotationMark;ranges:JwAnnotationRange[]}[];
  notes:JwAnnotationNote[];
  bookmarks:JwAnnotationBookmark[];
}
const unique=<T>(items:T[]):T[]=>[...new Set(items)];
/** Bible Lab renders a chapter-level annotation rail until exact token positions
 * can be checked against the original JWPUB HTML. It never guesses a word span. */
export function annotationsForPopupReference(
  index:JwAnnotationIndex,ref:ReferenceEntry
):PopupAnnotationMatch|null{
  const verse=parseScripture(ref.label);
  let chapter=verse?.chapter??null,book=verse?.book??null;
  if(book===null){
    try{
      const url=new URL(ref.url);
      const match=url.pathname.match(/\/wol\/b\/r30\/lp-f\/(?:nwt|nwtsty)\/(\d{1,2})\/(\d{1,3})\/?/);
      if(match){book=Number(match[1]);chapter=Number(match[2]);}
    }catch{/* Ignore malformed references. */}
  }
  if(book!==null&&chapter!==null){
    const data=annotationsForBibleChapter(index,book,chapter);
    if(!data)return null;
    return {scope:'chapter',sourceLabel:'Bible · livre '+book+', chapitre '+chapter,
      confidence:'chapter',marks:data.marks,notes:data.notes,bookmarks:data.bookmarks};
  }
  // An exact WOL document ID is stronger than a title guess. In a backup it
  // may occur in multiple issue/localisation records; aggregate only those
  // that have this exact source ID, never infer it from an article title.
  const meps=directWolMepsId(ref.url);
  if(meps===null)return null;
  const locations=index.locations.filter(l=>l.language===3&&l.document===meps);
  if(!locations.length)return null;
  const ids=new Set(locations.map(l=>l.id));
  const marks=index.marks.filter(m=>ids.has(m.location));
  const markIds=new Set(marks.map(m=>m.id));
  const ranges=new Map<number,JwAnnotationRange[]>();
  for(const range of index.ranges)if(markIds.has(range.mark)){
    const items=ranges.get(range.mark)||[];items.push(range);ranges.set(range.mark,items);
  }
  const notes=index.notes.filter(n=>
    (n.location!==null&&ids.has(n.location))||
    (n.mark!==null&&markIds.has(n.mark)));
  const bookmarks=index.bookmarks.filter(b=>
    (b.location!==null&&ids.has(b.location))||
    (b.publicationLocation!==null&&ids.has(b.publicationLocation)));
  if(!marks.length&&!notes.length&&!bookmarks.length)return null;
  return {scope:'document',sourceLabel:
    'Publication '+unique(locations.map(l=>l.symbol||'')).filter(Boolean).join(', '),
    confidence:'meps-id',
    marks:marks.map(mark=>({mark,ranges:ranges.get(mark.id)||[]})),
    notes,bookmarks};
}
