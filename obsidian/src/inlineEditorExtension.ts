import { Decoration, ViewPlugin, type DecorationSet, type EditorView, type ViewUpdate } from '@codemirror/view';
import { findInlineReferences } from './inlineReferenceScanner';

/** CodeMirror marks, not rewritten Markdown. Typed references remain editable. */
export function inlineBibleLabEditorExtension(open:(label:string,anchor:HTMLElement)=>void){
 return ViewPlugin.fromClass(class {
   decorations:DecorationSet;
   constructor(view:EditorView){this.decorations=this.build(view);}
   update(update:ViewUpdate):void{
     if(update.docChanged||update.viewportChanged)this.decorations=this.build(update.view);
   }
   build(view:EditorView):DecorationSet{
     const result:Array<{from:number;to:number;value:ReturnType<typeof Decoration.mark>}> = [];
     const doc=view.state.doc;
     // Walk the visible range only; do not scan large vault documents per keystroke.
     const visited=new Set<number>();
     for(const range of view.visibleRanges){
       const first=doc.lineAt(range.from).number;
       const last=doc.lineAt(range.to).number;
       for(let lineNumber=first;lineNumber<=last;lineNumber++){
         if(visited.has(lineNumber))continue;visited.add(lineNumber);
         const line=doc.line(lineNumber),text=line.text;
         // Never decorate a fenced code block. Search backwards for a fence
         // with a bounded lookbehind for responsiveness on long notes.
         let fence=false;
         for(let i=Math.max(1,lineNumber-1200);i<lineNumber;i++){
           if(/^\s*(?:\x60{3,}|~{3,})/.test(doc.line(i).text))fence=!fence;
         }
         if(fence)continue;
         for(const ref of findInlineReferences(text)){
           const from=line.from+ref.from,to=line.from+ref.to;
           if(from>=to)continue;
           result.push({from,to,value:Decoration.mark({
             class:'biblelab-inline-editor-ref',
             attributes:{'data-biblelab-ref':encodeURIComponent(ref.label),
               title:'Lire '+ref.label+' dans Bible Lab'}
           })});
         }
       }
     }
     return Decoration.set(result.sort((a,b)=>a.from-b.from),true);
   }
 }, {
   decorations:instance=>instance.decorations,
   eventHandlers:{
     click(event:MouseEvent,view:EditorView){
       if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||event.button!==0)return false;
       const target=event.target as HTMLElement;
       const el=target.closest<HTMLElement>('.biblelab-inline-editor-ref[data-biblelab-ref]');
       if(!el || !view.dom.contains(el))return false;
       let label='';
       try{label=decodeURIComponent(el.dataset.biblelabRef||'');}catch{return false;}
       if(!label)return false;
       event.preventDefault();event.stopPropagation();
       open(label,el);
       return true;
     }
   }
 });
}
