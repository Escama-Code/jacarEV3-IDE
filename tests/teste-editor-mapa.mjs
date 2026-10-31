// node tests/teste-editor-mapa.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'src/js/editor/mapaEditor.js'), 'utf8');

class Element {
  constructor(id = '') {
    this.id = id; this.value = ''; this.files = []; this.hidden = true;
    this.listeners = {}; this.style = {}; this.dataset = {};
    this.attributes = {}; this.children = []; this.options = []; this.disabled = false;
    this.textContent = ''; this.classList = {toggle() {},contains() {return false;}};
  }
  addEventListener(type, f) { this.listeners[type] ||= []; this.listeners[type].push(f); }
  click() { this.emit('click',{}); }
  emit(type, data = {}) {
    const event = {target:this,currentTarget:this, preventDefault(){},button:0,
      pointerId:1, clientX:400, clientY:200, ...data};
    return Promise.all((this.listeners[type] || []).map(fn => fn(event)));
  }
  setAttribute(k,v) { this.attributes[k] = v; }
  getBoundingClientRect() { return {left:0,top:0,width:1040,height:720}; }
  setPointerCapture() {}
  closest() {return null;}
  appendChild(child) { this.children.push(child); }
  add(option) {this.options.push(option);}
  remove() {}
}

class FakeContext {
  constructor() {
    this.actions = []; this.lineWidth = 1; this.strokeStyle = '';
  }
  setTransform(...args) {this.actions.push(['setTransform',...args]);}
  fillRect(...args) {this.actions.push(['fillRect',...args]);}
  drawImage(...args) {this.actions.push(['drawImage',...args.slice(1)]);}
  save(){this.actions.push(['save']);}
  restore(){this.actions.push(['restore']);}
  beginPath(){this.actions.push(['beginPath']);}
  arc(...args){this.actions.push(['arc',...args]);}
  fill(){this.actions.push(['fill',this.fillStyle]);}
  stroke(){this.actions.push(['stroke',this.strokeStyle,this.lineWidth]);}
  moveTo(...args){this.actions.push(['moveTo',...args]);}
  lineTo(...args){this.actions.push(['lineTo',...args]);}
  translate(){}
  rotate(){}
  closePath(){}
}
class Canvas extends Element {
  constructor(id=''){ super(id); this.width=1040; this.height=720; this.context = new FakeContext();}
  getContext() {return this.context;}
  toDataURL(){return 'data:image/png;base64,iVBORw0KGgo=';}
}

const elements = new Map();
function get(id) {if (!elements.has(id)) elements.set(id, id==='mapEditorCanvas'?new Canvas(id):new Element(id));return elements.get(id);}
const docEvents = new Element('document');
const doc = {
  getElementById: get,
  createElement(type) {return type==='canvas'?new Canvas('snapshot'):new Element(type);},
  addEventListener:docEvents.addEventListener.bind(docEvents),
  querySelectorAll(q) {return q === '[data-map-tool]' ? tools : [];},
  body:{classList:{contains(){return false;}},appendChild(){}}
};
const tools=['caneta','borracha','reta','inicio'].map(t=>{const e=new Element(t);e.dataset.mapTool=t;return e;});
get('cenario').value='treino';
get('mapEditorHeading').value='-90';
get('mapEditorBrush').value='3';
get('mapEditorNome').value='Meu circuito';
const applied=[];
const defaultScenario={id:'treino',nome:'Pista de treino',w:120,h:80,pxPorCm:5,
  caixas:[], rampas:[], decoracoes3d:[], inicioPadrao:'padrao',
  inicios:{padrao:{x:20,y:55,th:0,rotulo:'Treino'}}};
const scenarioList={treino:defaultScenario};
let lastSelected=null;
const Cenarios={
  lista:scenarioList,
  obterTapete(id){assert.equal(id,'treino'); return {canvas:new Canvas('tapete')};},
  inicioDe(cen,id){return cen.inicios[id];},
  registrarCenario(cen){scenarioList[cen.id]=cen;}
};
const context={
  document:doc, Cenarios,
  Playback:{prepararEdicao(){},escolher(id){lastSelected=id;}},
  window:{}, console,
  Image:class {set src(v){this._src=v;}async decode(){}},
  Option:class {constructor(text,value){this.textContent=text;this.value=value;}},
  Blob:class{constructor(){}},
  URL:{createObjectURL(){return 'blob:arquivo';},revokeObjectURL(){}},
  setTimeout(){}, alert(message){throw new Error(message);}
};
vm.runInNewContext(source,context,{filename:'mapaEditor.js'});
await docEvents.emit('DOMContentLoaded');
const API=context.window.JacarEditorMapa;
assert(API);
assert.throws(()=>API.validar({}),/não é um mapa/);
assert.equal(API.criarDocumento(260,180).tracos.length,0);
assert.throws(()=>API.validar({...API.criarDocumento(),basePNG:'javascript:alert(1)'}),/Imagem base inválida/);

// Abrir a partir do cenário existente. A imagem original é copiada.
await get('btnEditorMapa').emit('click');
await new Promise(resolve=>setTimeout(resolve,0));
assert.equal(get('mapEditorModal').hidden,false);
assert.match(get('mapEditorStatus').textContent,/120 × 80/);

// Começar com tapete branco, desenhar em preto.
await get('mapEditorBlank').emit('click');
get('mapEditorNome').value='Novo circuito';
await get('mapEditorCanvas').emit('pointerdown',{clientX:130,clientY:600});
await get('mapEditorCanvas').emit('pointermove',{clientX:320,clientY:490});
await get('mapEditorCanvas').emit('pointerup',{clientX:320,clientY:490});
assert.match(get('mapEditorStatus').textContent,/1 traço/);
assert.equal(get('mapEditorUndo').disabled,false);

// Desfazer e refazer.
await get('mapEditorUndo').emit('click');
assert.match(get('mapEditorStatus').textContent,/0 traço/);
await get('mapEditorRedo').emit('click');
assert.match(get('mapEditorStatus').textContent,/1 traço/);

// Ferramenta de posicionar o robô.
await tools[3].emit('click');
await get('mapEditorCanvas').emit('pointerdown',{clientX:500,clientY:400});
await get('mapEditorApply').emit('click');
assert(lastSelected?.startsWith('autoral-'));
const registered=scenarioList[lastSelected];
assert.equal(registered.nome,'Novo circuito');
assert.equal(registered.editorDocumento.tracos.length,1);
assert.equal(registered.inicios.padrao.x,57.69);
assert.equal(registered.inicios.padrao.y,44.44);
const ctx=new FakeContext();
registered.desenhar(ctx,registered);
assert(ctx.actions.some(a=>a[0]==='stroke'&&a[1]==='#050505'),'A textura deve conter linha preta para o sensor');

// Reabrir o cenário editado e apagar com borracha.
get('cenario').value=lastSelected;
await get('btnEditorMapa').emit('click');
await tools[1].emit('click');
await get('mapEditorCanvas').emit('pointerdown',{clientX:100,clientY:250});
await get('mapEditorCanvas').emit('pointermove',{clientX:200,clientY:250});
await get('mapEditorCanvas').emit('pointerup',{clientX:200,clientY:250});
assert.match(get('mapEditorStatus').textContent,/2 traço/);
await get('mapEditorApply').emit('click');
const repainted=new FakeContext();
scenarioList[lastSelected].desenhar(repainted);
assert(repainted.actions.some(a=>a[0]==='stroke'&&a[1]==='#ffffff'),'Borracha deve pintar branco');

// Editor não depende de .sArena e mantém o mesmo objeto de cenário usado pela simulação.
assert.equal(scenarioList[lastSelected].editorDocumento.formato,'jacarev3-mapa');
console.log('OK: abrir, desenhar, desfazer/refazer, posição, aplicar, reabrir e apagar.');
