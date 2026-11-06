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
       // Compute fenced-code context once per viewport, not for every
       // rendered line on every keystroke (important for Android notes).
       let fence=false;
       const isFence=(line:string)=>/^\s*(?:\x60{3,}|~{3,})/.test(line);
       for(let i=Math.max(1,first-1200);i<first;i++)
         if(isFence(doc.line(i).text))fence=!fence;
       for(let lineNumber=first;lineNumber<=last;lineNumber++){
         const line=doc.line(lineNumber),text=line.text;
         if(isFence(text)){fence=!fence;continue;}
         if(visited.has(lineNumber))continue;visited.add(lineNumber);
         if(fence)continue;
         for(const ref of findInlineReferences(text)){
           const from=line.from+ref.from,to=line.from+ref.to;
           if(from>=to)continue;
           result.push({from,to,value:Decoration.mark({
             class:'biblelab-inline-editor-ref',
             attributes:{'data-biblelab-ref':encodeURIComponent(ref.ref.label),
               title:'Lire '+ref.label+' dans JW Study Desk'}
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
