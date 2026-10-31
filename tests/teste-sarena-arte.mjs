// Regressão da arte dos ladrilhos sBotics. Executável com Node.js puro.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  parseSArena, desenharArteTile, tipoImagem,
  LARGURA_LINHA_TILE, TAMANHO_TRIANGULO_RESGATE
} from '../src/js/arena/sArenaParser.mjs';

class ContextoRegistrador {
  constructor() { this.angulo = 0; this.eventos = []; this.caminhos = []; }
  save() { this._antigo = this.angulo; }
  restore() { this.angulo = this._antigo; }
  rotate(a) { this.angulo += a; this.eventos.push(['rotate', a]); }
  fillRect() {}
  beginPath() { this.atual = []; this.subcaminhos = []; }
  closePath() {}
  _p(x,z) {
    const c=Math.cos(this.angulo),s=Math.sin(this.angulo);
    return [Math.round((x*c-z*s)*100)/100, Math.round((x*s+z*c)*100)/100];
  }
  moveTo(x,z) { if (this.atual?.length) this.subcaminhos.push(this.atual); this.atual=[this._p(x,z)]; }
  lineTo(x,z) { this.atual.push(this._p(x,z)); }
  bezierCurveTo(a,b,c,d,x,z) { this.atual.push(this._p(x,z)); }
  arc(cx,cz,r,a,b) {
    this.atual.push(this._p(cx+r*Math.cos(a),cz+r*Math.sin(a)));
    this.atual.push(this._p(cx+r*Math.cos(b),cz+r*Math.sin(b)));
  }
  fill() { this.eventos.push(['fill',this.fillStyle]); }
  stroke() {
    this.eventos.push(['stroke',this.strokeStyle,this.lineWidth]);
    this.caminhos.push(...this.subcaminhos,this.atual);
  }
}

const aqui = dirname(fileURLToPath(import.meta.url));
const fonte = JSON.parse(readFileSync(join(aqui, 'fixtures/arenanova.sArena'), 'utf8'));
const { cenario, tiles } = parseSArena(fonte);
const mapa = new Map(tiles.map(t=>[`${t.x},${t.z}`,t]));

assert.equal(cenario.inicios.padrao.th, -Math.PI/2,
  'Robô inicial deve apontar para a linha e não para o lado');
assert.ok(LARGURA_LINHA_TILE >= 0.3, 'Linha precisa ter contraste e largura para o sensor');
assert.ok(TAMANHO_TRIANGULO_RESGATE >= 5,
  'As regiões de evacuação devem ocupar aproximadamente metade da tile');

const desenhar = (x,z) => {
  const t = mapa.get(`${x},${z}`);
  assert.ok(t);
  const ctx = new ContextoRegistrador();
  desenharArteTile(ctx,t);
  return ctx;
};

for (const [x,z,cor] of [[6,8,'#ea2323'],[6,6,'#159f39']]) {
  const ctx=desenhar(x,z);
  const idxRot = ctx.eventos.findIndex(e=>e[0]==='rotate');
  const idxCor = ctx.eventos.findIndex(e=>e[0]==='fill'&&e[1]===cor);
  assert.ok(idxCor > idxRot, 'Cor da evacuação deve ser girada JUNTO com o tile');
}
const simples=desenhar(0,1);
assert.ok(simples.caminhos[0].length >= 2, 'Curva simples deve ter percurso');
const longa=desenhar(2,8);
assert.ok(longa.caminhos[0].length >= 4, 'Curva longa deve ser contínua');

// Testa endpoints exatos (após a rotação) em cada junção entre imagens.
const conexoes = [
  [0,1,1,1], [1,1,2,1], [2,1,3,1],
  [3,1,3,2], [3,2,3,3], [3,3,3,4],
  [3,4,4,4], [4,4,4,5],
  [0,1,0,2], [0,2,0,3], [0,3,0,4],
  [2,5,2,6], [2,6,2,7], [2,7,2,8], [2,8,3,8]
];

function pontas(tile) {
  const ctx = new ContextoRegistrador();
  desenharArteTile(ctx,tile);
  return ctx.caminhos.flatMap(path=>[path[0],path[path.length-1]]).filter(Boolean);
}
function endpointNaBorda(tile,dx,dz) {
  const pts=pontas(tile);
  return pts.some(([x,z])=>{
    if(dx !== 0) return Math.abs(x-dx*5)<.02&&Math.abs(z)<.02;
    return Math.abs(z-dz*5)<.02&&Math.abs(x)<.02;
  });
}
for (const [ax,az,bx,bz] of conexoes) {
  const dx=bx-ax,dz=bz-az;
  const origem=mapa.get(`${ax},${az}`),destino=mapa.get(`${bx},${bz}`);
  assert.ok(tipoImagem(origem)&&tipoImagem(destino));
  assert.ok(endpointNaBorda(origem,dx,dz),
    `Traçado não chega à borda de ${ax},${az} rumo a ${bx},${bz}`);
  assert.ok(endpointNaBorda(destino,-dx,-dz),
    `Traçado não entra pela borda de ${bx},${bz} vindo de ${ax},${az}`);
}
console.log(`OK: ${conexoes.length} junções, orientação do sensor, espessura e áreas de evacuação.`);
