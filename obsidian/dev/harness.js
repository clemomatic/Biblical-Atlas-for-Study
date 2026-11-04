// Development-only host. It loads the actual CJS artifact; none of this is shipped.
import bundle from '../dist/atlas-biblique/main.js?raw';
import { parse, stringify } from 'yaml';
import * as codeMirrorView from '@codemirror/view';
import { EditorState } from '@codemirror/state';

const element = (tag, options = {}) => {
  const el = document.createElement(tag);
  if (options.text) el.textContent = options.text;
  if (options.cls) el.className = options.cls;
  for (const [key, value] of Object.entries(options.attr ?? {})) el.setAttribute(key, value);
  return el;
};
HTMLElement.prototype.empty = function () { this.replaceChildren(); };
HTMLElement.prototype.addClass = function (...names) { this.classList.add(...names); };
HTMLElement.prototype.setText = function (text) { this.textContent = text; };
HTMLElement.prototype.createEl = function (tag, options) { const child = element(tag, options); this.append(child); return child; };
HTMLElement.prototype.createDiv = function (options) { return this.createEl('div', options); };
HTMLElement.prototype.createSpan = function (options) { return this.createEl('span', options); };

class Emitter {
  listeners = new Map();
  on(name, callback) { const callbacks = this.listeners.get(name) ?? new Set(); callbacks.add(callback); this.listeners.set(name, callbacks); return { off: () => callbacks.delete(callback) }; }
  trigger(name, ...args) { this.listeners.get(name)?.forEach(callback => callback(...args)); }
}
class TFile {
  constructor(path, content) { this.path = path; this.content = content; }
  get name() { return this.path.split('/').pop(); }
  get basename() { return this.name.replace(/\.[^.]+$/, ''); }
  get extension() { return this.name.split('.').pop(); }
}
class TFolder { constructor(path) { this.path = path; } }
const parseFile = content => {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(content);
  return { frontmatter: match ? parse(match[1]) ?? {} : {}, body: match ? content.slice(match[0].length) : content };
};
class Vault extends Emitter {
  files = new Map();
  getName() { return 'Étude & méditation'; }
  getAbstractFileByPath(path) { return this.files.get(path) ?? null; }
  getMarkdownFiles() { return [...this.files.values()].filter(file => file instanceof TFile && file.extension === 'md'); }
  getFiles() { return [...this.files.values()].filter(file => file instanceof TFile); }
  async createFolder(path) { if (this.files.has(path)) throw Error('exists'); const folder = new TFolder(path); this.files.set(path, folder); return folder; }
  async create(path, content) { if (this.files.has(path)) throw Error('exists'); const file = new TFile(path, content); this.files.set(path, file); this.trigger('create', file); app.metadataCache.trigger('changed', file); return file; }
  async read(file) { return file.content; }
  async cachedRead(file) { return file.content; }
  async readBinary(file) { return file.content; }
  async createBinary(path, data) { return this.create(path, data); }
  async trash(file) { return this.delete(file); }
  async modify(file, content) { file.content = content; this.trigger('modify', file); app.metadataCache.trigger('changed', file); }
  async process(file, callback) { const content = callback(file.content); await this.modify(file, content); return content; }
  async rename(file, path) {
    const oldPath = file.path;
    for (const [key, item] of [...this.files]) if (key === oldPath || key.startsWith(oldPath + '/')) { this.files.delete(key); item.path = path + key.slice(oldPath.length); this.files.set(item.path, item); }
    this.trigger('rename', file, oldPath);
    if (file instanceof TFile) app.metadataCache.trigger('changed', file);
  }
  async delete(file) { for (const path of [...this.files.keys()]) if (path === file.path || path.startsWith(file.path + '/')) this.files.delete(path); this.trigger('delete', file); }
}
class MarkdownView {}
class ItemView {
  constructor(leaf) { this.leaf = leaf; this.app = app; this.containerEl = leaf.containerEl; this.contentEl = this.containerEl.createDiv({ cls: 'view-content' }); }
}
class Leaf {
  constructor() { this.containerEl = element('div', { cls: 'workspace-leaf-content' }); this.containerEl.style.height = '100%'; }
  async setViewState(state) {
    if (!this.view || this.type !== state.type) { await this.view?.onClose?.(); this.type = state.type; this.containerEl.dataset.type = state.type; this.view = factories.get(state.type)(this); document.querySelector('#surface').append(this.containerEl); await this.view.onOpen(); }
    if (state.state) await this.view.setState(state.state, {});
  }
  async openFile(file) { app.workspace.activeFile = file; app.workspace.lastOpened = file.path; }
  detach() { void this.view?.onClose?.(); this.containerEl.remove(); app.workspace.leaves=app.workspace.leaves.filter(leaf=>leaf!==this); }
}
const factories = new Map();
// Mock only the Obsidian core Web viewer's public view state. Real Obsidian
// hosts the live page in Chromium; the test harness never contacts WOL.
class CoreWebViewer extends ItemView {
  state={url:'',navigate:false};
  getViewType(){ return 'webviewer'; }
  getDisplayText(){ return 'WOL — navigateur'; }
  getState(){ return this.state; }
  async onOpen(){
    this.contentEl.classList.add('mock-core-webviewer');
    this.webview=document.createElement('webview');
    this.webview.className='mock-electron-webview';
    this.webview.getURL=()=>this.state.url;
    this.webview.executeJavaScript=async()=>{
      return this.mockSnapshot||{
        title:'Article WOL de démonstration',url:this.state.url,
        paragraphUrl:'',selectionText:''
      };
    };
    this.contentEl.append(this.webview);
  }
  async setState(value){
    this.state={url:value.url,navigate:value.navigate===true};
    for(const node of [...this.contentEl.children])if(node!==this.webview)node.remove();
    this.contentEl.createDiv({cls:'mock-webviewer-address',text:value.url});
    this.contentEl.createEl('a',{text:'Ouvrir la page WOL',href:value.url});
    (window.atlasWebviewerUrls??=[]).push(value.url);
  }
}
factories.set('webviewer',leaf=>new CoreWebViewer(leaf));
class Plugin {
  constructor(application, manifest) { this.app = application; this.manifest = manifest; this.cleanups = []; this.commands = new Map(); }
  async loadData() { return window.__savedSettings ?? null; }
  async saveData(data) { window.__savedSettings = structuredClone(data); }
  registerView(type, factory) { factories.set(type, factory); }
  addRibbonIcon() {}
  addCommand(command) { this.commands.set(command.id, command); }
  addSettingTab(tab) { this.settingTab = tab; }
  registerObsidianProtocolHandler(action, callback) { this.protocol = callback; }
  registerMarkdownCodeBlockProcessor(language, callback) { this.codeBlock = callback; }
  registerMarkdownPostProcessor(callback) { this.markdownPostProcessor = callback; }
  registerEditorExtension(extension) { this.editorExtension = extension; }
  register(callback) { this.cleanups.push(callback); }
  registerEvent(reference) { this.cleanups.push(() => reference.off()); }
  async unload() { for (const leaf of app.workspace.leaves) await leaf.view?.onClose?.(); this.cleanups.forEach(callback => callback()); this.onunload(); }
}
class PluginSettingTab { constructor(application, plugin) { this.app = application; this.plugin = plugin; this.containerEl = element('div'); } }
class Menu {
  constructor(){this.entries=[];}
  addItem(configure){
    const item={
      title:'',icon:'',
      setTitle(value){this.title=value;return this;},
      setIcon(value){this.icon=value;return this;},
      onClick(callback){this.callback=callback;return this;}
    };
    configure(item);
    this.entries.push(item);
    return this;
  }
  showAtPosition(){
    document.querySelector('.mock-context-menu')?.remove();
    const menu=document.createElement('div');
    menu.className='mock-context-menu';
    menu.setAttribute('role','menu');
    for(const item of this.entries){
      const action=menu.createEl('button',{text:item.title});
      action.type='button';action.addEventListener('click',()=>{
        menu.remove();item.callback?.();
      });
    }
    document.body.append(menu);
    window.atlasLastMenu=this;
  }
}
class Modal {
  constructor(application) { this.app = application; this.contentEl = element('div', { cls: 'modal-content' }); }
  open() { this.wrapper = element('div', { cls: 'modal-container' }); const modal = this.wrapper.createDiv({ cls: 'modal' }); this.modalEl = modal; modal.setAttribute('role', 'dialog'); modal.append(this.contentEl); document.body.append(this.wrapper); this.onOpen?.(); }
  close() { this.onClose?.(); this.wrapper?.remove(); }
}
class FuzzySuggestModal extends Modal {
  setPlaceholder(text) { this.placeholder = text; }
  onOpen() { const input = this.contentEl.createEl('input', { attr: { placeholder: this.placeholder, 'aria-label': this.placeholder } }); const list = this.contentEl.createDiv(); const update = () => { list.empty(); for (const item of this.getItems().filter(item => this.getItemText(item).toLowerCase().includes(input.value.toLowerCase()))) { const button = list.createEl('button', { text: this.getItemText(item), cls: 'suggestion-item' }); button.onclick = () => { this.onChooseItem(item); this.close(); }; } }; input.oninput = update; update(); }
}
class Setting {
  constructor(container) { this.settingEl = container.createDiv({ cls: 'setting-item' }); this.info = this.settingEl.createDiv(); this.name = this.info.createDiv(); this.control = this.settingEl.createDiv({ cls: 'setting-item-control' }); }
  setName(text) { this.name.textContent = text; this.label = text; return this; }
  setDesc(text) { this.info.createDiv({ text, cls: 'setting-item-description' }); return this; }
  input(tag, type, configure) {
    const input = this.control.createEl(tag, { attr: { 'aria-label': this.label ?? '' } }); if (type) input.type = type;
    const component = { inputEl: input, setPlaceholder: value => { input.placeholder = value; return component; }, setValue: value => { if (type === 'checkbox') input.checked = value; else input.value = value; return component; }, onChange: callback => { input.addEventListener(type === 'checkbox' || tag === 'select' ? 'change' : 'input', () => callback(type === 'checkbox' ? input.checked : input.value)); return component; }, addOption: (value, text) => { const option=input.createEl('option',{text});option.value=value;return component; }, addOptions: options => { for (const [value, text] of Object.entries(options)) { const option = input.createEl('option', { text }); option.value = value; } return component; } };
    configure(component); return this;
  }
  addText(configure) { return this.input('input', 'text', configure); }
  addTextArea(configure) { return this.input('textarea', null, configure); }
  addDropdown(configure) { return this.input('select', null, configure); }
  addToggle(configure) { return this.input('input', 'checkbox', configure); }
  addButton(configure) { const button = this.control.createEl('button'); const component = { setButtonText: value => { button.textContent = value; return component; }, setCta: () => { button.classList.add('mod-cta'); return component; }, setDisabled: value => { button.disabled = value; return component; }, onClick: callback => { button.onclick = callback; return component; } }; configure(component); return this; }
}
const notices = [];
class Notice { constructor(text) { notices.push(text); } }
class Component { load() {} unload() {} }
class MarkdownRenderer { static async render(application, markdown, target) { target.textContent = markdown; } }
const requestUrl = async parameters => {
  window.atlasNetworkRequests ??= []; window.atlasNetworkRequests.push(parameters);
  const response = await fetch(parameters.url);
  const arrayBuffer = await response.arrayBuffer();
  const text = new TextDecoder().decode(arrayBuffer);
  return { status: response.status, headers: Object.fromEntries(response.headers), arrayBuffer, text, get json() { return JSON.parse(text); } };
};
const vault = new Vault();
const metadataCache = new Emitter(); metadataCache.getFileCache = file => ({ frontmatter: parseFile(file.content).frontmatter });
const workspace = new Emitter();
Object.assign(workspace, {
  leaves: [], activeFile: null, lastOpened: null, requestSaveLayout() {}, onLayoutReady(callback) { callback(); },
  getLeavesOfType(type) { return this.leaves.filter(leaf => leaf.type === type); },
  getLeaf() { const leaf = new Leaf(); this.leaves.push(leaf); return leaf; },
  getRightLeaf() { return this.getLeaf('right'); },
  getActiveFile() { return this.activeFile; }, async revealLeaf() {}
});
const app = { vault, metadataCache, workspace, fileManager: { async processFrontMatter(file, callback) {
  const { frontmatter, body } = parseFile(file.content); callback(frontmatter);
  await vault.modify(file, `---\n${stringify(frontmatter)}---\n${body}`);
} } };
const setIcon = (element, name) => { element.dataset.icon = name; element.createSpan({ text: '◈' }); };
const debounce = (callback, delay) => { let timer; return (...args) => { clearTimeout(timer); timer = setTimeout(() => callback(...args), delay); }; };
const api = { ItemView, MarkdownView, Notice, Plugin, PluginSettingTab, Setting, TFile, TFolder, Modal, Menu, FuzzySuggestModal, Component, MarkdownRenderer, parseYaml: parse, stringifyYaml: stringify, requestUrl, setIcon, debounce };
if (new URLSearchParams(location.search).get('theme') === 'dark') document.body.classList.add('theme-dark');
await vault.createFolder('Mes notes');
await vault.create('Mes notes/Une idée précieuse.md', '---\ntags: [personnel]\npriorite: 3\n---\nMon texte personnel **à conserver**.\n\nUne seconde ligne.\n');
const module = { exports: {} };
new Function('module', 'exports', 'require', bundle)(module, module.exports, id => { if (id === '@codemirror/view') return codeMirrorView; if (id !== 'obsidian') throw Error(`Unexpected runtime dependency: ${id}`); return api; });
const PluginClass = module.exports.default ?? module.exports;
let plugin = new PluginClass(app, { id: 'atlas-biblique', version: '0.3.0', name: 'Bible Lab — Atlas et recherche biblique' });
await plugin.onload();
await plugin.openAtlas();
window.atlasTest = {
  plugin, app, notices, ready: true,
  triggerWolContext({selectionText,pageURL,frameURL,isEditable=false}){
    const viewer=app.workspace.getLeavesOfType('webviewer')[0]?.view;
    if(!viewer?.webview)throw Error('No webviewer found');
    const event=new Event('context-menu',{bubbles:false,cancelable:true});
    event.params={selectionText,pageURL:pageURL||viewer.state.url,
      frameURL:frameURL||pageURL||viewer.state.url,x:12,y:18,isEditable};
    viewer.webview.dispatchEvent(event);
    return event.defaultPrevented;
  },
  file(path) { return vault.files.get(path)?.content; },
  mountInlineEditor(text) {
    this.editorView?.destroy();
    document.querySelector('#test-inline-editor')?.remove();
    const root=document.createElement('div');
    root.id='test-inline-editor';
    document.body.appendChild(root);
    this.editorView=new codeMirrorView.EditorView({
      state:EditorState.create({doc:text,extensions:[plugin.editorExtension]}),
      parent:root
    });
  },
  typeIntoInlineEditor(text) {
    const view=this.editorView;
    if(!view)throw Error('Editor is not mounted');
    view.dispatch({changes:{from:view.state.doc.length,insert:text}});
  },
  openMarkdownEditor(path) {
    const file=vault.files.get(path);
    if(!(file instanceof TFile))throw Error('Not a Markdown file: '+path);
    const view=new MarkdownView();
    view.file=file;
    view.editor={replaceSelection(text){file.content+=text;}};
    const leaf={type:'markdown',view};
    workspace.leaves.push(leaf);
    workspace.activeFile=file;
    workspace.trigger('file-open',file);
    return leaf;
  },

  files() { return [...vault.files.values()].filter(file => file instanceof TFile).map(file => ({ path: file.path, content: file.content })); },
  async metadata(path, changes) { const file = vault.files.get(path); await app.fileManager.processFrontMatter(file, data => Object.assign(data, changes)); },
  async rename(path, nextPath) { await vault.rename(vault.files.get(path), nextPath); },
  async remove(path) { await vault.delete(vault.files.get(path)); },
  async restart() {
    await plugin.unload(); workspace.leaves = []; document.querySelector('#surface').empty();
    plugin = new PluginClass(app, { id: 'atlas-biblique', version: '0.3.0', name: 'Bible Lab — Atlas et recherche biblique' });
    await plugin.onload(); await plugin.openAtlas(); this.plugin = plugin;
  }
};
