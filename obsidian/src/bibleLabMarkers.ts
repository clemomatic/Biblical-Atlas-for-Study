/** Turn !!reference!! in reading-mode Markdown into a local, actionable Bible Lab link.
 * Works on rendered text nodes only, never on code blocks or existing links.
 */
export function enhanceBibleLabMarkers(container: HTMLElement, open: (reference:string)=>void): void {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let node: Node|null;
  while ((node=walker.nextNode())) {
    if (!(node instanceof Text) || !node.textContent || !/!![^!]+!!/.test(node.textContent)) continue;
    const parent=node.parentElement;
    if (!parent || parent.closest('a, code, pre, script, style, button, .biblelab-ref'))continue;
    nodes.push(node);
  }
  for(const textNode of nodes) {
    const text=textNode.textContent||'';
    const regex=/!!([^!\r\n]{1,220})!!/g;
    const fragment=document.createDocumentFragment();
    let previous=0;
    for(const match of text.matchAll(regex)) {
      const start=match.index??0;
      if(start>previous)fragment.append(document.createTextNode(text.slice(previous,start)));
      const ref=match[1].trim();
      const link=document.createElement('a');
      link.className='biblelab-ref';
      link.href='#';
      link.textContent=ref;
      link.title='Ouvrir dans Bible Lab';
      link.addEventListener('click',event=>{event.preventDefault();open(ref);});
      fragment.append(link);
      previous=start+match[0].length;
    }
    if(previous<text.length)fragment.append(document.createTextNode(text.slice(previous)));
    textNode.replaceWith(fragment);
  }
}
