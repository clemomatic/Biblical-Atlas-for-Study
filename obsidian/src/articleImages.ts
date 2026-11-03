/** Safe image handling for official WOL/JW.org article illustrations.
 * Only explicit official image hosts are accepted; HTML from remote pages is
 * never inserted into the vault or into the Obsidian DOM.
 */
export interface ArticleImage {src:string;alt:string;caption?:string;width?:number;height?:number}
const IMAGE_HOSTS=new Set([
 'wol.jw.org','www.jw.org','cms-imgp.jw-cdn.org',
 'assetsnffrgf-a.akamaihd.net','download-a.akamaihd.net'
]);
export function officialImageUrl(raw:string,base:string):string|null{
 if(!raw.trim())return null;
 try{
  const url=new URL(raw.trim(),base);
  if(url.protocol!=='https:'||url.username||url.password||!IMAGE_HOSTS.has(url.hostname))return null;
  if(url.href.length>2048)return null;
  url.hash='';
  return url.href;
 }catch{return null;}
}
function bestSrcset(raw:string,base:string):string|null{
 const sources=raw.split(',').map(part=>{
  const m=part.trim().match(/^(\S+)(?:\s+([\d.]+)(w|x))?$/);
  if(!m)return null;
  const url=officialImageUrl(m[1],base);
  return url?{url,rank:m[3]==='w'?Number(m[2]||0):Number(m[2]||1)*1000}:null;
 }).filter((v):v is {url:string;rank:number}=>v!==null);
 sources.sort((a,b)=>b.rank-a.rank);
 return sources[0]?.url||null;
}
function text(node:Element|null):string{
 return (node?.textContent||'').replace(/\s+/g,' ').trim().slice(0,450);
}
export function articleImageFrom(img:HTMLImageElement,base:string):ArticleImage|null{
 if(img.closest('header,footer,nav,aside,[hidden],[aria-hidden="true"]'))return null;
 const figure=img.closest('figure');
 const width=Number(img.getAttribute('width'));
 const height=Number(img.getAttribute('height'));
 // Ignore tiny buttons, trackers and navigation icons, not actual artwork.
 if(!figure&&((width>0&&width<90)||(height>0&&height<70)))return null;
 if(!figure&&img.closest('.icon,.sprite,.avatar,.logo,.shareButton'))return null;
 const anchor=img.closest('a[href]');
 const href=anchor?.getAttribute('href')||'';
 const resolvedHref=href?officialImageUrl(href,base):null;
 // A WOL /wol/mp/ link is an HTML image-viewer PAGE, not an image.
 // Never use that URL as <img src>, otherwise the image appears broken.
 const full=resolvedHref&&/\.(?:png|jpe?g|webp|avif|gif)(?:[?#]|$)/i.test(resolvedHref)
   ?resolvedHref:null;
 const candidates=[
  img.getAttribute('data-imgsrc'),img.getAttribute('data-full-image'),
  img.getAttribute('data-original'),anchor?.getAttribute('data-imgsrc'),
 ].filter((v):v is string=>!!v);
 const data=candidates.map(x=>officialImageUrl(x,base)).find(Boolean);
 const picture=img.closest('picture');
 const source=picture?.querySelector('source[srcset],source[data-srcset]');
 const srcset=bestSrcset(img.getAttribute('data-srcset')||img.getAttribute('srcset')||
   source?.getAttribute('data-srcset')||source?.getAttribute('srcset')||'',base);
 const src=data||full||srcset||
  officialImageUrl(img.getAttribute('data-src')||'',base)||
  officialImageUrl(img.getAttribute('src')||'',base);
 if(!src)return null;
 const caption=figure?
  text(figure.querySelector('figcaption,.caption,.imgCaption')) :
  text(img.closest('.illustration,.image')?.querySelector('.caption,.imgCaption')||null);
 const alt=img.getAttribute('alt')?.replace(/\s+/g,' ').trim().slice(0,300)||caption||'Illustration de l’article';
 return {src,alt,...(caption?{caption}:{}),
  ...(width>0&&width<10000?{width}:{}),
  ...(height>0&&height<10000?{height}:{})};
}
/** Both the sidebar and inline preview use this identical accessible figure. */
export function renderArticleImage(parent:HTMLElement,image:ArticleImage):HTMLElement{
 const figure=document.createElement('figure');
 figure.className='biblelab-article-figure';
 const open=document.createElement('button');
 open.type='button';open.className='biblelab-article-image-open';
 open.setAttribute('aria-label','Agrandir l’illustration');
 open.title='Agrandir l’illustration';
 const img=document.createElement('img');
 img.src=image.src;img.alt=image.alt;img.loading='lazy';img.decoding='async';
 img.referrerPolicy='no-referrer';
 if(image.width&&image.height){img.width=image.width;img.height=image.height;}
 open.appendChild(img);figure.appendChild(open);
 if(image.caption){
  const caption=document.createElement('figcaption');
  caption.textContent=image.caption;figure.appendChild(caption);
 }
 open.addEventListener('click',()=>{
  const dialog=document.createElement('dialog');
  dialog.className='biblelab-image-lightbox';
  dialog.setAttribute('aria-label','Illustration agrandie');
  const close=document.createElement('button');close.type='button';
  close.className='biblelab-image-lightbox-close';close.textContent='Fermer ×';
  close.addEventListener('click',()=>dialog.close());
  const full=document.createElement('img');
  full.src=image.src;full.alt=image.alt;full.decoding='async';
  full.referrerPolicy='no-referrer';
  dialog.append(close,full);
  if(image.caption){
   const caption=document.createElement('p');caption.textContent=image.caption;
   dialog.appendChild(caption);
  }
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
  document.body.appendChild(dialog);dialog.showModal();close.focus();
 });
 parent.appendChild(figure);
 return figure;
}
