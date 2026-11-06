export interface DeskNote {path:string;title:string;modified:number;kind?:string}
/** Public source documents stay in the library; actual personal notes stay editable. */
export function personalDeskNotes(notes:DeskNote[],query='',preparationOnly=false):DeskNote[] {
  const fold=(text:string)=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr');
  const needle=fold(query.trim());
  return notes.filter(note=>note.kind!=='jwpub-document'&&
    !/(?:^|\/)(?:Bibliothèque virtuelle|Annotations JW Library)(?:\/|$)/i.test(note.path)&&
    !/(?:^|\/)Imports\/.*\/INDEX\//i.test(note.path)&&
    (!preparationOnly||/(?:réunions?|reunions?|discours|préparations?|preparations?|assemblées?|ecoles?|écoles?)/i.test(note.path))&&
    (!needle||fold(note.title+' '+note.path).includes(needle)))
    .sort((a,b)=>b.modified-a.modified||a.title.localeCompare(b.title,'fr'));
}
