// node tests/teste-editor-abas.mjs
// Teste leve da estrutura do editor agrupado, sem dependências externas.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'public/sandbox.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'src/js/editor/mapaEditor.js'), 'utf8');

const grupo = html.slice(html.indexOf('id="mapEditorModal"'), html.indexOf('<!-- Scripts de dependência externa -->'));
const ids = [...grupo.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
assert.equal(new Set(ids).size, ids.length, 'O editor não pode ter IDs duplicados');
const tabs = [...grupo.matchAll(/data-map-tab="([^"]+)"/g)].map(m=>m[1]);
const paineis = [...grupo.matchAll(/data-map-panel="([^"]+)"/g)].map(m=>m[1]);
assert.deepEqual(tabs, ['desenho','objetos','ajustes','obr','arquivo']);
assert.deepEqual(paineis, tabs);
for(const key of tabs) {
  assert.match(grupo, new RegExp(`id="mapEditorTab\\w+"[^>]*data-map-tab="${key}"`));
  assert.match(grupo, new RegExp(`data-map-panel="${key}"`));
}
for(const tool of [
  'caneta','borracha','reta','curva','circulo','retangulo',
  'parede','caixa','rampa','esfera','verde','vermelho','sala','mover','excluir','inicio'
]) {
  assert.match(grupo, new RegExp(`data-map-tool="${tool}"`), `Ferramenta ${tool} mantida`);
}
for (const id of [
  'mapEditorNome','mapEditorBrush','mapEditorBrushValor','mapEditorSmooth',
  'mapEditorRecognize','mapEditorSnap','mapEditorGrid','mapEditorSnapGrid',
  'mapEditorSnapDist','mapEditorRoomSize','mapEditorEntrance','mapEditorTriCorner',
  'mapEditorHeading','mapEditorPerfil','mapEditorNivel','mapEditorCheck',
  'mapEditorBlank','mapEditorCopy','mapEditorSurpresa','mapEditorUpload',
  'mapEditorFile','mapEditorUndo','mapEditorRedo','mapEditorDownload',
  'mapEditorApply','mapEditorCanvas','mapEditorValidacao','mapEditorCurrentTool'
]) {
  assert(ids.includes(id), `Controle obrigatório ausente: ${id}`);
}
assert(js.includes("function selecionarAba("), 'Navegação entre grupos não implementada');
assert(js.includes("function atualizarOpcoesFerramenta("), 'Opções contextuais não implementadas');
assert(js.includes("tab.addEventListener('keydown'"), 'Navegação de teclado ausente');
assert(js.includes("container.hidden="), 'Campos condicionais não controlados');
console.log('OK: 5 grupos, 16 ferramentas, controles e navegação preservados.');
