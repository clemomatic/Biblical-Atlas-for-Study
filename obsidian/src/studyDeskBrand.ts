import {Menu,setIcon} from 'obsidian';
import themeCss from './studyDeskTheme.css?inline';
import logo from './assets/jw-study-desk/logo.png?inline';
import panorama from './assets/jw-study-desk/dawn-valley.webp?inline';
import monoLogo from './assets/jw-study-desk/logo-monochrome.svg?raw';
import inter from '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?inline';
import interExtended from '@fontsource-variable/inter/files/inter-latin-ext-wght-normal.woff2?inline';
import montserrat from '@fontsource-variable/montserrat/files/montserrat-latin-wght-normal.woff2?inline';
import montserratExtended from '@fontsource-variable/montserrat/files/montserrat-latin-ext-wght-normal.woff2?inline';

export const STUDY_DESK_NAME='JW Study Desk';
export const STUDY_DESK_ICON='jw-study-desk';
export const STUDY_DESK_LOGO=logo;
export const STUDY_DESK_PANORAMA=panorama;
export const STUDY_DESK_ICON_SVG='<g transform="scale(.1953125)">'+monoLogo
  .replace(/<svg[^>]*>|<\/svg>/g,'').replace(/ color="#[0-9a-f]+"/gi,'')+'</g>';
const face=(family:string,url:string,range:string)=>
  `@font-face{font-family:"${family}";font-style:normal;font-weight:100 900;font-display:swap;src:url("${url}") format("woff2");unicode-range:${range};}`;
const latin='U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const extended='U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0300-0303,U+0305-0307,U+0309-0328,U+032A-036F,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';
export const STUDY_DESK_CSS=face('JWSD Inter',inter,latin)+face('JWSD Inter',interExtended,extended)+
  face('JWSD Montserrat',montserrat,latin)+face('JWSD Montserrat',montserratExtended,extended)+themeCss;

export type DeskDestination='home'|'library'|'search'|'notes'|'ideas'|'inbox'|'preparation'|'settings';
export interface DeskNavigation {navigate:(destination:DeskDestination)=>void}
const destinations:{id:DeskDestination;label:string;icon:string;tone:string}[]=[
  {id:'home',label:'Accueil',icon:'house',tone:'violet'},
  {id:'library',label:'Bibliothèque',icon:'library-big',tone:'violet'},
  {id:'search',label:'Recherche',icon:'search',tone:'petrol'},
  {id:'notes',label:'Mes notes',icon:'notebook-pen',tone:'sage'},
  {id:'ideas',label:'Fiches d’idées',icon:'lightbulb',tone:'amber'},
  {id:'inbox',label:'Bac à idées',icon:'inbox',tone:'coral'},
  {id:'preparation',label:'Préparation',icon:'calendar-days',tone:'sage'},
  {id:'settings',label:'Paramètres',icon:'settings-2',tone:'muted'}
];
export function applyStudyDeskTheme(root:HTMLElement):void {root.addClass('jwsd-theme');}
export function renderDeskBrand(parent:HTMLElement,compact=false):HTMLElement {
  const brand=parent.createDiv({cls:'jwsd-brand'+(compact?' is-compact':'')});
  brand.createEl('img',{cls:'jwsd-brand-image',attr:{src:logo,alt:'',width:'40',height:'40'}});
  const copy=brand.createDiv({cls:'jwsd-brand-copy'});
  copy.createEl('strong',{text:STUDY_DESK_NAME});
  if(!compact)copy.createEl('span',{text:'Votre espace d’étude'});
  return brand;
}
export function deskButton(parent:HTMLElement,label:string,icon:string,run:()=>void,cls=''):HTMLButtonElement {
  const b=parent.createEl('button',{cls:'jwsd-button '+cls,attr:{type:'button','aria-label':label}});
  const image=b.createSpan();setIcon(image,icon);b.createSpan({text:label});
  b.addEventListener('click',run);return b;
}
/** Shared, local navigation: no duplicated publication or research data. */
export function renderDeskShell(root:HTMLElement,active:DeskDestination,actions:DeskNavigation):HTMLElement {
  applyStudyDeskTheme(root);
  const shell=root.createDiv({cls:'jwsd-app-shell'});
  const rail=shell.createEl('aside',{cls:'jwsd-rail'});
  const brandButton=rail.createEl('button',{cls:'jwsd-brand-home',attr:{type:'button','aria-label':'Accueil JW Study Desk'}});
  renderDeskBrand(brandButton);brandButton.addEventListener('click',()=>actions.navigate('home'));
  rail.createEl('p',{cls:'jwsd-nav-kicker',text:'MON ESPACE'});
  const nav=rail.createEl('nav',{attr:{'aria-label':'Navigation JW Study Desk'}});
  for(const destination of destinations){
    const b=deskButton(nav,destination.label,destination.icon,()=>actions.navigate(destination.id),'jwsd-nav-item tone-'+destination.tone);
    b.setAttribute('aria-label','Ouvrir '+destination.label.toLocaleLowerCase('fr'));
    b.dataset.destination=destination.id;
    if(destination.id===active){b.addClass('is-active');b.setAttribute('aria-current','page');}
  }
  const foot=rail.createDiv({cls:'jwsd-rail-foot'});
  const lamp=foot.createSpan();setIcon(lamp,'lamp-desk');
  foot.createSpan({text:'La connaissance\nmise en lumière.'});
  const stage=shell.createEl('main',{cls:'jwsd-stage'});
  const bottom=shell.createEl('nav',{cls:'jwsd-mobile-nav',attr:{'aria-label':'Navigation mobile JW Study Desk'}});
  for(const id of ['home','library','search','notes'] as DeskDestination[]){
    const d=destinations.find(item=>item.id===id)!;
    const b=deskButton(bottom,d.label,d.icon,()=>actions.navigate(id),'jwsd-mobile-destination');
    b.setAttribute('aria-label','Ouvrir '+d.label.toLocaleLowerCase('fr'));
    if(id===active){b.addClass('is-active');b.setAttribute('aria-current','page');}
  }
  deskButton(bottom,'Plus','ellipsis',()=>{
    const menu=new Menu();
    for(const d of destinations.filter(item=>['ideas','inbox','preparation','settings'].includes(item.id)))
      menu.addItem(item=>item.setTitle(d.label).setIcon(d.icon).onClick(()=>actions.navigate(d.id)));
    const rect=bottom.getBoundingClientRect();menu.showAtPosition({x:Math.max(8,rect.right-245),y:Math.max(8,rect.top-180)});
  },'jwsd-mobile-destination');
  return stage;
}
