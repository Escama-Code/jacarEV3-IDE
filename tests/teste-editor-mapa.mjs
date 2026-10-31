// node tests/teste-editor-mapa.mjs
// Testes da lógica do Construtor JacarEV3 v2, sem dependências externas.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const src=fs.readFileSync(path.join(root,'src/js/editor/mapaEditorCore.js'),'utf8');
const ctx={module:{exports:{}},globalThis:{}};
vm.runInNewContext(src,ctx);
const M=ctx.module.exports;
assert(M,'Core carregado');
const d=M.criarDocumento(260,180);
assert.equal(d.versao,2);
assert.equal(d.tracos.length,0);
assert(M.validar(d));
assert.throws(()=>M.validar({...d,basePNG:'javascript:alert(1)'}),/Imagem base inválida/);
const v1=JSON.parse(JSON.stringify({...d,versao:1}));
delete v1.areas;delete v1.salas;delete v1.perfil;delete v1.nivel;
assert.equal(M.migrar(v1).versao,2,'Abre .jmap da versão 1');

// Snap só se a ponta está dentro do raio.
d.tracos.push({tipo:'reta',espessura:1.5,pontos:[[20,40],[80,40]]});
assert.equal(JSON.stringify(M.snapPonto([81.5,40.7],d.tracos,3)),JSON.stringify([80,40]));
assert.equal(JSON.stringify(M.snapPonto([87,43],d.tracos,3)),JSON.stringify([87,43]));

// Traço suavizado preserva pontos extremos e reduz ângulos abruptos.
const ruidoso=[[0,0],[2,3],[5,-2],[8,3],[10,0],[12,2],[15,0]];
const suave=M.suavizar(ruidoso);
assert.equal(suave[0][0],0);
assert.equal(suave.at(-1)[0],15);
assert(suave.length>ruidoso.length);
assert(M.reconhecer([[1,1],[5,5.02],[9,9],[13,13.1],[17,17.02],[21,21]]),'Detecta reta aproximada');

// Sala de resgate independente de qualquer arquivo externo.
d.salas.push({x:100,y:50,w:90,h:90,entrada:27});
const walls=M.caixasDasSalas(d.salas),generated=M.elementosDasSalas(d.salas);
assert.equal(walls.length,5);
assert.equal(generated.areas.length,2);
assert.equal(generated.objetos.length,3);
assert(walls.every(b=>b.altura>=10));
assert.equal(walls.filter(b=>b.x===100&&b.w===1.8).length,2);

// Verificador OBR avisa sobre linha fora de 1–2 cm e entrada fora da faixa.
d.perfil='regional';d.tracos[0].espessura=3;d.salas[0].entrada=40;
let messages=M.validaOBR(d).map(x=>x.texto).join(' | ');
assert.match(messages,/Traço 1/);assert.match(messages,/entrada precisa/);
d.tracos[0].espessura=1.5;d.salas[0].entrada=27;
messages=M.validaOBR(d).map(x=>x.texto).join(' | ');
assert(!messages.includes('Traço 1'));assert(!messages.includes('entrada precisa'));
assert(M.validar(d));

// Confere a separação de camadas: a borracha usa 'destination-out'
// e o raster de base recebe APENAS o resultado da camada de linha.
const calls=[];
function fakeCtx() {
  const p={};
  for (const method of ['save','restore','beginPath','moveTo','lineTo','arc','ellipse','rect','stroke','fill','drawImage','setTransform','quadraticCurveTo','closePath']) {
    p[method]=(...args)=>calls.push([method,p.globalCompositeOperation,...args]);
  }
  return p;
}
const layer=fakeCtx(),target=fakeCtx();
const drawCanvas=()=>({width:1300,height:900,getContext:()=>layer});
M.pintarTracosSeparados(target,d,[
  {tipo:'reta',espessura:1.5,pontos:[[20,40],[80,40]]},
  {tipo:'borracha',espessura:5,pontos:[[50,35],[50,45]]}
],drawCanvas);
assert(calls.some(c=>c[0]==='stroke'&&c[1]==='destination-out'));
assert(calls.some(c=>c[0]==='drawImage'),'Camada transparente vai sobre o fundo');
console.log('OK: versão 1, snap, suavização, sala, regras OBR e borracha em camada separada.');
