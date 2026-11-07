export interface ReadingSettings {
  mode:'popup'|'panel'|'none';
  closeOnOutsideClick:boolean;
  automaticReference:boolean;
  followNote:boolean;
  display:'preview'|'expanded';
  englishNotes:boolean;
  translateEnglish:boolean;
}
export const DEFAULT_READING:ReadingSettings={mode:'popup',closeOnOutsideClick:true,
  automaticReference:false,followNote:true,display:'preview',englishNotes:false,translateEnglish:false};
export function readingSettings(raw:unknown):ReadingSettings {
  const r=(raw&&typeof raw==='object'?raw:{}) as Partial<ReadingSettings>;
  return {mode:r.mode==='panel'||r.mode==='none'?r.mode:'popup',
    closeOnOutsideClick:r.closeOnOutsideClick!==false,automaticReference:r.automaticReference===true,
    followNote:r.followNote!==false,display:r.display==='expanded'?'expanded':'preview',
    englishNotes:r.englishNotes===true,translateEnglish:r.translateEnglish===true};
}
