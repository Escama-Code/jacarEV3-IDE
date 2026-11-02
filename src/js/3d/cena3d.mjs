import { construirGrupoSArena } from '../arena/sArenaBuilder3d.mjs';
// ============================================================
// cena3d.mjs — Cena Three.js: arena 120×80 cm, luzes, sombras, câmeras.
// É só o ESPELHO visual do sim.js: a física e o sensor continuam lá.
// ============================================================
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  construirRoboEV3,
  construirRoboJacare,
  construirRoboArara,
  construirRoboCapivara,
  construirRoboCaranguejo,
  construirRoboTubarao,
  construirRoboSapo,
  construirRoboElefante,
  construirRoboCamaleao,
  construirRoboEscorpiao,
  construirRoboCoruja,
  construirRoboCarroFusca,
  construirRoboOpala,
  construirRoboCorcel,
  construirRoboCarro,
  aplicarEstado,
} from './modelos/index.mjs';

const ROBOS = {
  ev3: construirRoboEV3,
  jacare: construirRoboJacare,
  arara: construirRoboArara,
  capivara: construirRoboCapivara,
  caranguejo: construirRoboCaranguejo,
  tubarao: construirRoboTubarao,
  sapo: construirRoboSapo,
  elefante: construirRoboElefante,
  camaleao: construirRoboCamaleao,
  escorpiao: construirRoboEscorpiao,
  coruja: construirRoboCoruja,
  fusca: construirRoboCarroFusca,
  opala: construirRoboOpala,
  corcel: construirRoboCorcel,
  carro: construirRoboCarro
};

/** textura do chão = a MESMA imagem que o sensor lê (tapete.canvas / tapete.dados) */
function texturaDoTapete(tapete, renderer) {
  const ehCanvasReal = (typeof OffscreenCanvas !== 'undefined' && tapete.canvas instanceof OffscreenCanvas)
    || (typeof HTMLCanvasElement !== 'undefined' && tapete.canvas instanceof HTMLCanvasElement);
  let tex;
  if (ehCanvasReal) tex = new THREE.CanvasTexture(tapete.canvas);                         // navegador: usa o canvas direto
  else {                                                                                   // sem canvas (testes/Node): DataTexture com linhas invertidas (v=0 é o sul)
    const { W, H, dados } = tapete, buf = new Uint8Array(W * H * 4);
    for (let y = 0; y < H; y++) buf.set(dados.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
    tex = new THREE.DataTexture(buf, W, H, THREE.RGBAFormat);
  }
  tex.colorSpace = THREE.SRGBColorSpace;
  const web2 = !!(renderer && renderer.capabilities && renderer.capabilities.isWebGL2);
  tex.generateMipmaps = web2; tex.minFilter = web2 ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = web2 ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 1;
  tex.needsUpdate = true;
  return tex;
}

const matC = (cor, o = {}) => new THREE.MeshStandardMaterial({ color: cor, roughness: 0.6, ...o });
const sombraC = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };
const caixaC = (w, h, d, material, x, y, z) => { const m = sombraC(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material)); m.position.set(x, y, z); return m; };
const pinoC = (r, h, material, x, y, z) => { const m = sombraC(new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 16), material)); m.position.set(x, y, z); return m; };   // "stud" de LEGO

/** Missão 1 — torre de dois andares com pinos e bandeira */
function blocoTorre(b, cor) {
  const g = new THREE.Group(), escura = cor.clone().offsetHSL(0, 0, -0.1), clara = cor.clone().offsetHSL(0, 0, 0.12);
  g.add(caixaC(b.w, 4, b.h, matC(cor), 0, 2, 0));
  for (const dx of [-b.w / 4, b.w / 4]) for (const dz of [-b.h / 4, b.h / 4]) g.add(pinoC(0.9, 0.5, matC(clara), dx, 4.25, dz));
  g.add(caixaC(b.w - 4, 3.2, b.h - 4, matC(escura), 0, 5.6, 0));
  for (const dx of [-1.4, 1.4]) for (const dz of [-1.4, 1.4]) g.add(pinoC(0.7, 0.8, matC(clara), dx, 7.6, dz));
  g.add(pinoC(0.12, 3.2, matC(0xdddddd), 0, 9.2, 0));                                           // mastro
  const bandeira = sombraC(new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.1), matC(0xe53935, { side: THREE.DoubleSide }))); bandeira.position.set(0.95, 10.4, 0); g.add(bandeira);
  return g;
}
/** Missão 2 — plataforma com guarda-corpo, faixa de alerta e carga amarela */
function blocoPlataforma(b, cor) {
  const g = new THREE.Group(), clara = cor.clone().offsetHSL(0, 0, 0.15), amarelo = matC(0xf2c230);
  g.add(caixaC(b.w, 9, b.h, matC(cor), 0, 4.5, 0));
  for (const [w, d, x, z] of [[b.w + 0.1, 0.1, 0, b.h / 2], [b.w + 0.1, 0.1, 0, -b.h / 2], [0.1, b.h + 0.1, b.w / 2, 0], [0.1, b.h + 0.1, -b.w / 2, 0]]) g.add(caixaC(w, 0.9, d, amarelo, x, 3.2, z));   // faixa
  g.add(caixaC(b.w + 1, 0.8, b.h + 1, matC(clara), 0, 9.4, 0));                                   // deck
  const poste = matC(0xdddddd);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(pinoC(0.3, 2.4, poste, sx * (b.w / 2 + 0.2), 10.8, sz * (b.h / 2 + 0.2)));
  for (const sz of [-1, 1]) g.add(caixaC(b.w + 0.8, 0.25, 0.25, poste, 0, 11.8, sz * (b.h / 2 + 0.2)));
  for (const sx of [-1, 1]) g.add(caixaC(0.25, 0.25, b.h + 0.8, poste, sx * (b.w / 2 + 0.2), 11.8, 0));
  g.add(caixaC(4, 2.2, 4, amarelo, 0, 10.9, 0)); g.add(caixaC(4.1, 0.25, 0.4, matC(0x222222), 0, 10.9, 2.05));       // carga com cinta
  return g;
}
/** Missão 3 — contêiner corrugado com portas, cantoneiras e gancho */
function blocoConteiner(b, cor) {
  const g = new THREE.Group(), escura = cor.clone().offsetHSL(0, 0, -0.12), corte = matC(0x2b2b2b);
  g.add(caixaC(b.w, 5.6, b.h, matC(cor), 0, 2.8, 0));
  const n = Math.floor(b.w / 1.3);
  for (let i = 0; i < n; i++) for (const sz of [-1, 1]) g.add(caixaC(0.45, 5.0, 0.2, matC(escura), -b.w / 2 + 0.9 + i * ((b.w - 1.8) / (n - 1)), 2.8, sz * (b.h / 2 + 0.08)));   // corrugado
  g.add(caixaC(0.1, 5.2, b.h - 1, corte, b.w / 2 + 0.03, 2.8, 0)); g.add(caixaC(0.12, 5.0, 0.15, matC(0xcccccc), b.w / 2 + 0.06, 2.8, 0));   // portas
  g.add(caixaC(b.w + 0.3, 0.5, b.h + 0.3, matC(escura), 0, 5.85, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(caixaC(1, 1, 1, corte, sx * (b.w / 2 - 0.3), 5.85, sz * (b.h / 2 - 0.3)));       // cantoneiras
  const gancho = sombraC(new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.16, 8, 20), matC(0xcccccc, { metalness: 0.7, roughness: 0.3 }))); gancho.position.set(0, 7.0, 0); gancho.rotation.x = Math.PI / 2; g.add(gancho);
  return g;
}
/** parede do cenário de desvio: bloco com faixas de alerta no topo */
function blocoParede(b, cor) {
  const g = new THREE.Group(), alt = b.altura;
  g.add(caixaC(b.w, alt, b.h, matC(cor), 0, alt / 2, 0));
  g.add(caixaC(b.w + 0.4, 0.8, b.h + 0.4, matC(cor.clone().offsetHSL(0, 0, 0.14)), 0, alt + 0.4, 0));
  const n = Math.floor(b.h / 4);
  for (let i = 0; i < n; i++) for (const sx of [-1, 1]) g.add(caixaC(0.12, 1.4, 1.6, matC(i % 2 ? 0x222222 : 0xf2c230), sx * (b.w / 2 + 0.05), alt - 1.4, -b.h / 2 + 2.4 + i * 4));   // listras amarelo/preto
  return g;
}

/**
 * Elementos autorais da Cidade Educativa.
 * Compartilham a mesma pegada que o simulador usa nas colisões;
 * nenhum modelo ou textura externa é carregado.
 */
function blocoCidadePredio(b, cor) {
  const g = new THREE.Group(), h = Math.max(8, b.altura || 12);
  const escuro = cor.clone().offsetHSL(0, -0.03, -0.13);
  const telhado = cor.clone().offsetHSL(0, -0.04, 0.10);
  const parede = matC(cor), moldura = matC(escuro);
  const vidro = matC(0x9bcae5, { metalness: 0.08, roughness: 0.28 });
  g.add(caixaC(b.w, h, b.h, parede, 0, h / 2, 0));
  // Platibanda/telhado baixo (em vez dos blocos lisos da versão anterior).
  g.add(caixaC(b.w + 1.2, 1.15, b.h + 1.2, matC(telhado), 0, h + 0.55, 0));
  g.add(caixaC(b.w - 3, 0.24, b.h - 3, moldura, 0, h + 1.22, 0));
  // Fachadas com portas e janelas, deixando a identidade da cidade legível.
  const fachada = b.h / 2 + 0.11;
  const janelas = Math.max(2, Math.min(5, Math.floor(b.w / 8)));
  const passo = b.w / (janelas + 1);
  for (let k = 1; k <= janelas; k++) {
    const px = -b.w/2 + passo*k;
    g.add(caixaC(Math.min(4.5, passo*0.6), 3.8, 0.23, vidro, px, h*0.60, fachada));
    g.add(caixaC(Math.min(4.7, passo*0.62), 0.32, 0.35, moldura, px, h*0.60 + 1.9, fachada+0.1));
  }
  g.add(caixaC(Math.min(7, b.w*0.24), h*0.42, 0.3, matC(0x315064), 0, h*0.21, fachada+0.06));

  if (b.modelo === 'cidadeHospital') {
    const cruz = matC(0xd93c4e);
    g.add(caixaC(7, 0.55, 2.1, cruz, 0, h + 1.78, 0));
    g.add(caixaC(2.1, 0.56, 7, cruz, 0, h + 1.8, 0));
  } else if (b.modelo === 'cidadeEscola') {
    // Pátio sombreado e bandeira simples na cobertura.
    g.add(caixaC(10, 0.45, 5, matC(0xf5f0d7), -b.w*0.28, h+1.65, 0));
    g.add(pinoC(0.23, 5, matC(0xe2e8f0), b.w*0.3, h+3.5, 0));
    g.add(caixaC(3.2, 2, 0.3, matC(0x38a3a5), b.w*0.3+1.7, h+5, 0));
  } else if (b.modelo === 'cidadeMercado') {
    const toldo = matC(0xf2d6a6);
    g.add(caixaC(b.w * 0.76, 0.9, 3.5, toldo, 0, h*0.65, fachada+1.8));
    for (let k = -2; k <= 2; k++) {
      g.add(caixaC(1.6, 0.95, 3.7, matC(k%2 ? 0xffffff : 0xdb715b), k*b.w*0.115, h*0.65, fachada+1.85));
    }
  } else if (b.modelo === 'cidadeCasa') {
    // Cobertura de quatro águas low-poly, sem GLB de terceiros.
    const r = Math.sqrt(b.w*b.w + b.h*b.h) * 0.68;
    const teto = sombraC(new THREE.Mesh(
      new THREE.ConeGeometry(r, 5, 4),
      matC(escuro)
    ));
    teto.rotation.y = Math.PI / 4;
    teto.position.y = h + 3.1;
    g.add(teto);
  }
  return g;
}

function blocoCidadeArvore(b) {
  const g = new THREE.Group();
  const h = Math.max(9, b.altura || 13), folhagem = matC(0x4b9360);
  g.add(pinoC(0.7, h*0.55, matC(0x805d44), 0, h*0.275, 0));
  for (const [dx,dy,dz,r] of [
    [0,h*0.72,0,4.1], [-2,h*0.76,0.7,2.5], [1.8,h*0.83,-1,2.8]
  ]) {
    const copa = sombraC(new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), folhagem));
    copa.position.set(dx,dy,dz); g.add(copa);
  }
  return g;
}

function blocoCidadeAbrigo(b) {
  const g = new THREE.Group(), h = b.altura || 7;
  const metal = matC(0x375b69), cobertura = matC(0x2c8295);
  for (const x of [-b.w/2+1.2,b.w/2-1.2]) {
    g.add(caixaC(0.55,h,0.55,metal,x,h/2,0));
  }
  g.add(caixaC(b.w+1.5,0.85,b.h+2,cobertura,0,h+0.4,0));
  g.add(caixaC(b.w*0.65,0.8,1.4,matC(0xd7e4e5),0,1.7,0));
  return g;
}

/**
 * Obstáculos autorais de "A Jornada de Jofre".
 * A aparência corresponde à pegada de colisão definida em cen.caixas.
 * Não depende de GLB ou de licenças de modelos externos.
 */
function blocoPantanalTronco(b) {
  const g = new THREE.Group();
  const madeira = matC(0x493128);
  const casca = matC(0x322821);
  const brasaApagada = matC(0x77706a);
  const raio = Math.min(b.h * 0.30, b.altura * 0.48);
  const tronco = sombraC(new THREE.Mesh(
    new THREE.CylinderGeometry(raio * 0.82, raio, b.w, 12),
    madeira
  ));
  tronco.rotation.z = Math.PI / 2;
  tronco.position.y = raio + 0.15;
  g.add(tronco);
  for (const dx of [-b.w * 0.26, b.w * 0.08, b.w * 0.35]) {
    const anel = sombraC(new THREE.Mesh(
      new THREE.CylinderGeometry(raio * 1.02, raio * 1.02, 1.3, 12),
      casca
    ));
    anel.rotation.z = Math.PI / 2;
    anel.position.set(dx, raio + 0.16, 0);
    g.add(anel);
  }
  const galho = sombraC(new THREE.Mesh(
    new THREE.CylinderGeometry(1.5, 2.5, b.h * 0.45, 8),
    brasaApagada
  ));
  galho.position.set(b.w * 0.08, raio * 1.55, b.h * 0.10);
  galho.rotation.x = 0.6;
  g.add(galho);
  return g;
}

function blocoPantanalRochas(b) {
  const g = new THREE.Group();
  const rochas = [
    [-0.25, -0.18, 0.24, 0x72746d],
    [0.19, -0.12, 0.30, 0x5a5e59],
    [0.05, 0.20, 0.26, 0x8b8c82],
    [-0.28, 0.25, 0.20, 0x77766e]
  ];
  for (const [dx, dz, fator, cor] of rochas) {
    const raio = Math.min(b.w, b.h) * fator;
    const rocha = sombraC(new THREE.Mesh(
      new THREE.DodecahedronGeometry(raio, 0),
      matC(cor)
    ));
    rocha.scale.set(1.2, 0.9, 1.05);
    rocha.rotation.set(0.12, dx * 0.9, dz * 0.5);
    rocha.position.set(dx * b.w, raio * 0.86, dz * b.h);
    g.add(rocha);
  }
  return g;
}

const MODELOS_BLOCO = {
  torre: blocoTorre, plataforma: blocoPlataforma, conteiner: blocoConteiner, parede: blocoParede,
  troncoQueimado: blocoPantanalTronco, rochaSeca: blocoPantanalRochas,
  cidadeEscola: blocoCidadePredio, cidadeHospital: blocoCidadePredio,
  cidadeBiblioteca: blocoCidadePredio, cidadeMercado: blocoCidadePredio,
  cidadeCasa: blocoCidadePredio, cidadeBombeiro: blocoCidadePredio,
  cidadeArvore: blocoCidadeArvore, cidadeAbrigo: blocoCidadeAbrigo
};
/** bloco rígido na MESMA pegada (x, y, w, h) que o sim.js usa na colisão e no ultrassônico */
function construirBloco(b) {
  const cor = new THREE.Color(b.cor || '#5f86a6'), g = (MODELOS_BLOCO[b.modelo] || ((bb, cc) => {
    const gg = new THREE.Group(); gg.add(caixaC(bb.w, bb.altura || 10, bb.h, matC(cc), 0, (bb.altura || 10) / 2, 0)); return gg; }))(b, cor);
  g.position.set(b.x + b.w / 2, 0, b.y + b.h / 2); g.name = b.nome || 'bloco'; return g;
}


/**
 * Ambientação procedural exclusiva de Jofre.
 * São props visuais, sem colisão nem interferência nos pixels do sensor.
 * Madeiras, pedras, animais e vegetação são geometrias autorais Three.js.
 */
function construirAmbientacaoPantanal(cen) {
  const grupo = new THREE.Group();
  grupo.name = 'pantanal-ambientacao-3d';
  const tronco = matC(0x79553b), galho = matC(0x684d3b);
  const queimado = matC(0x433a34), cinza = matC(0x78736a);
  const verde = [0x3d8052, 0x4e985e, 0x69a969].map(c => matC(c));
  const capim = matC(0x478c54), palha = matC(0x9bad5b);
  const agua = new THREE.MeshStandardMaterial({
    color: 0x55c6b4, transparent: true, opacity: 0.83,
    roughness: 0.25, metalness: 0.05, depthWrite: false
  });
  const reflexo = new THREE.MeshBasicMaterial({
    color: 0xc8f4e5, transparent: true, opacity: 0.72,
    side: THREE.DoubleSide, depthWrite: false
  });

  // Cilindro entre pontos, com altura exata e orientação no espaço.
  function segmento(a, b, raio, material) {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
    const diferenca = vb.clone().sub(va);
    const m = sombraC(new THREE.Mesh(
      new THREE.CylinderGeometry(raio * 0.72, raio, diferenca.length(), 7),
      material
    ));
    m.position.copy(va.add(vb).multiplyScalar(0.5));
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), diferenca.normalize());
    return m;
  }
  function copa(g, x, y, z, r, material) {
    const m = sombraC(new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), material));
    m.position.set(x,y,z); g.add(m);
  }
  function arvoreSeca() {
    const g = new THREE.Group();
    g.add(segmento([0,0,0],[0,23,0],2.0,tronco));
    g.add(segmento([0,12,0],[-8,19,0],1.08,galho));
    g.add(segmento([0,16,0],[7,23,-3],1.12,galho));
    g.add(segmento([-8,19,0],[-11,26,1],0.65,galho));
    g.add(segmento([7,23,-3],[11,28,-5],0.65,galho));
    g.add(segmento([1,20,0],[1,31,2],0.86,tronco));
    g.add(segmento([1,25,1],[5,29,3],0.52,galho));
    return g;
  }
  function arvoreVerde() {
    const g = new THREE.Group();
    g.add(segmento([0,0,0],[0,22,0],2.1,tronco));
    g.add(segmento([0,16,0],[-5,23,-2],1.0,tronco));
    g.add(segmento([0,14,0],[5,22,3],1.0,tronco));
    copa(g, 0,25,0,10.2,verde[0]);
    copa(g,-6,22,-2,7.5,verde[1]);
    copa(g, 7,21,3,8.3,verde[1]);
    copa(g, 0,31,1,7.6,verde[2]);
    return g;
  }
  function toco() {
    const g = new THREE.Group();
    const m = sombraC(new THREE.Mesh(new THREE.CylinderGeometry(3.6,4.6,7.5,9),queimado));
    m.position.y=3.75; g.add(m);
    const corte = sombraC(new THREE.Mesh(new THREE.CylinderGeometry(3.7,3.7,0.45,9),cinza));
    corte.position.y=7.55;g.add(corte);
    g.add(segmento([1,4,0],[6,2,-2],1.1,queimado));
    return g;
  }
  function arbusto() {
    const g = new THREE.Group();
    copa(g,0,3.6,0,4.4,verde[0]);
    copa(g,-3,3,-1.3,3.3,verde[1]);
    copa(g,2.8,3.9,1.4,3.2,verde[2]);
    return g;
  }
  function rochas() {
    const g = new THREE.Group();
    for(const [x,z,r,cor] of [
      [-4,0,4.1,0x81786c],[1.6,2.5,5.5,0xaaa28b],[6,-1.8,3.7,0x76776f]
    ]) {
      const m=sombraC(new THREE.Mesh(new THREE.DodecahedronGeometry(r,0),matC(cor)));
      m.scale.set(1,0.65,0.8);
      m.position.set(x,r*0.55,z);g.add(m);
    }
    return g;
  }
  function lagoa(obj) {
    const g = new THREE.Group();
    const borda = sombraC(new THREE.Mesh(
      new THREE.TorusGeometry(1,0.08,7,56),matC(0x477e59)
    ));
    borda.rotation.x=-Math.PI/2;
    borda.scale.set(obj.sx+1.7,obj.sy+1.7,1);
    borda.position.y=0.23;g.add(borda);
    const superficie=new THREE.Mesh(new THREE.CircleGeometry(1,56),agua);
    superficie.rotation.x=-Math.PI/2;
    superficie.scale.set(obj.sx,obj.sy,1);
    superficie.position.y=0.15;g.add(superficie);
    for(let i=0;i<3;i++) {
      const r=new THREE.Mesh(new THREE.PlaneGeometry(4.5,0.32),reflexo);
      r.rotation.x=-Math.PI/2;
      r.position.set(-obj.sx*0.55 + i*obj.sx*0.40,0.26,-obj.sy*0.15+i*2.3);
      g.add(r);
    }
    return g;
  }
  function lagoaSeca(obj) {
    const g = new THREE.Group();
    const margem=sombraC(new THREE.Mesh(new THREE.TorusGeometry(1,0.075,7,64),matC(0x967b5c)));
    margem.rotation.x=-Math.PI/2;
    margem.scale.set(obj.sx,obj.sy,1);
    margem.position.y=0.22;g.add(margem);
    for(let i=0;i<5;i++){
      const z=-obj.sy*.50+i*obj.sy*.24, x=-obj.sx*.56+(i%3)*obj.sx*.27;
      g.add(segmento([x,.12,z],[x+7,.12,z+2],.24,matC(0xa88f73)));
    }
    return g;
  }
  function taboas() {
    const g = new THREE.Group();
    for(let i=0;i<7;i++) {
      const x=((i*7)%13)-6, z=((i*11)%11)-5;
      g.add(segmento([x,0,z],[x-1,8+(i%3)*2,z+1],0.38,capim));
      if (i%2===0) g.add(segmento([x-1,8,z+1],[x-1.2,12,z+1],0.9,palha));
    }
    return g;
  }
  function capivara() {
    const g = new THREE.Group(), pelo = matC(0x8d694b), focinho=matC(0x76533b), olho=matC(0x1d2020);
    const corpo=sombraC(new THREE.Mesh(new THREE.SphereGeometry(1,12,10),pelo));
    corpo.scale.set(6.5,3.7,3.3);corpo.position.y=5.2;g.add(corpo);
    const cabeca=sombraC(new THREE.Mesh(new THREE.SphereGeometry(1,12,10),pelo));
    cabeca.scale.set(3.5,3,3.05);cabeca.position.set(5.8,5.8,0);g.add(cabeca);
    const nariz=sombraC(new THREE.Mesh(new THREE.SphereGeometry(1,10,8),focinho));
    nariz.scale.set(1.6,1.3,2);nariz.position.set(8.8,5.0,0);g.add(nariz);
    for(const z of [-2.1,2.1]) {
      const o=new THREE.Mesh(new THREE.SphereGeometry(.35,8,6),olho);
      o.position.set(7.0,7.3,z);g.add(o);
      g.add(pinoC(.85,1.8,pelo,4.3,8.5,z*.9));
    }
    for(const x of [-3.8,3.8])for(const z of [-2.2,2.2])g.add(pinoC(1.1,3.5,pelo,x,1.75,z));
    return g;
  }
  function garca() {
    const g=new THREE.Group(), penas=matC(0xf1efe0), bico=matC(0xe6bb64), pernas=matC(0x9eab8a);
    for(const x of [-1.1,1.1])g.add(segmento([x,0,0],[x,8,0],.2,pernas));
    const corpo=sombraC(new THREE.Mesh(new THREE.SphereGeometry(1,12,10),penas));
    corpo.scale.set(3.0,2.5,2.0);corpo.position.set(0,9,0);g.add(corpo);
    g.add(segmento([1,10,0],[2.2,18,0],.62,penas));
    copa(g,2.4,18.8,0,1.6,penas);
    g.add(segmento([3.5,18.2,0],[7,17.3,0],.4,bico));
    return g;
  }

  // Fauna pantaneira autoral — geometrias procedurais sem modelos externos.
  // Os animais são decorativos: não entram em cen.caixas nem na física.
  function tuiuiu() {
    const g = new THREE.Group();
    const penas = matC(0xf0eee6), negro = matC(0x292c30);
    const vermelho = matC(0xb93e3a), bico = matC(0x44403a);
    const pernas = matC(0x555654);
    for (const z of [-1.7, 1.7]) {
      g.add(segmento([-1,0,z],[0,13,z],0.32,pernas));
      g.add(segmento([0,1,z],[3,1,z],0.27,pernas));
    }
    const corpo = sombraC(new THREE.Mesh(new THREE.SphereGeometry(1,16,12),penas));
    corpo.scale.set(5.7,4.4,3.6);
    corpo.position.set(0,17,0);
    g.add(corpo);
    // Pescoço preto, colar vermelho característico e cabeça.
    g.add(segmento([3.1,18,0],[4.3,26,0],1.08,negro));
    g.add(segmento([4.3,26,0],[3.7,31,0],1.10,vermelho));
    copa(g,3.8,32.5,0,2.05,negro);
    g.add(segmento([5.6,32.3,0],[11.5,31.6,0],0.72,bico));
    for (const z of [-1.8,1.8]) {
      const asa=sombraC(new THREE.Mesh(new THREE.SphereGeometry(1,12,10),penas));
      asa.scale.set(3.4,1.4,.75);
      asa.position.set(-.8,17,z);
      g.add(asa);
    }
    return g;
  }

  function araraAzul() {
    const g=new THREE.Group();
    const azul=matC(0x256cb1), asaAzul=matC(0x18518d);
    const amarelo=matC(0xe6b538), bico=matC(0x292b34), olho=matC(0xf4df8a);
    const corpo=sombraC(new THREE.Mesh(new THREE.SphereGeometry(1,16,12),azul));
    corpo.scale.set(3.3,6.1,3.0);
    corpo.position.set(0,10,0);
    g.add(corpo);
    copa(g,0.8,16.4,0,3.0,azul);
    for (const z of [-2.65,2.65]) {
      const asa=sombraC(new THREE.Mesh(new THREE.ConeGeometry(3.0,9.5,7),asaAzul));
      asa.rotation.z=0.32; asa.position.set(-1.1,9.6,z);g.add(asa);
      const olhoM=new THREE.Mesh(new THREE.SphereGeometry(.36,8,6),olho);
      olhoM.position.set(2.6,17,z*.65);g.add(olhoM);
    }
    g.add(segmento([3.0,15.8,0],[5.2,14.6,0],1.1,bico));
    g.add(segmento([-1,5.5,0],[-2,0,0],1.0,asaAzul));
    g.add(segmento([-2,5.5,1],[-3,0,1],.75,azul));
    return g;
  }

  function cervoPantaneiro() {
    const g=new THREE.Group();
    const pelo=matC(0xb47a45), claro=matC(0xd7ab72);
    const casco=matC(0x40382e), chifre=matC(0x66503d);
    const corpo=sombraC(new THREE.Mesh(new THREE.SphereGeometry(1,16,12),pelo));
    corpo.scale.set(7.0,4.1,3.5);corpo.position.set(0,13,0);g.add(corpo);
    const peito=sombraC(new THREE.Mesh(new THREE.SphereGeometry(1,12,10),claro));
    peito.scale.set(2.6,3.2,2.9);peito.position.set(5.0,13,0);g.add(peito);
    g.add(segmento([5,13,0],[8.5,21,0],1.75,pelo));
    const cab=sombraC(new THREE.Mesh(new THREE.SphereGeometry(1,12,10),pelo));
    cab.scale.set(3.2,2.1,2.0);cab.position.set(10,21,0);g.add(cab);
    for(const z of [-2.3,2.3]) {
      for(const x of [-4.8,4.6]) {
        g.add(segmento([x,11,z],[x+1,1.9,z+.25],.72,pelo));
        g.add(segmento([x+1,1.9,z+.25],[x+1.4,.45,z+.25],.88,casco));
      }
      g.add(segmento([8.7,22.7,z*.65],[7.7,28,z],.5,chifre));
      g.add(segmento([7.7,28,z],[5.9,31,z*1.3],.36,chifre));
      g.add(segmento([7.7,28,z],[9.1,32,z*1.4],.32,chifre));
    }
    return g;
  }

  function placaFauna() {
    const g=new THREE.Group();
    const metal=matC(0x6a6d68), borda=matC(0xe7b53e);
    g.add(pinoC(.65,18,metal,0,9,0));
    g.add(caixaC(18,12,0.9,borda,0,21,0));
    // Sem imagens externas: textura de letreiro criada localmente.
    if(typeof document!=='undefined') {
      const canvas=document.createElement('canvas');
      canvas.width=512;canvas.height=320;
      const ctx=canvas.getContext('2d');
      if(ctx) {
        ctx.fillStyle='#f5cf58';ctx.fillRect(0,0,512,320);
        ctx.strokeStyle='#493d24';ctx.lineWidth=15;ctx.strokeRect(8,8,496,304);
        ctx.fillStyle='#2d332a';ctx.textAlign='center';
        ctx.font='bold 85px sans-serif';ctx.fillText('FAUNA',256,137);
        ctx.font='bold 54px sans-serif';ctx.fillText('ATRAVESSANDO',256,221);
        ctx.font='bold 38px sans-serif';ctx.fillText('DEVAGAR!',256,285);
        const tex=new THREE.CanvasTexture(canvas);
        tex.colorSpace=THREE.SRGBColorSpace;
        const frente=new THREE.Mesh(
          new THREE.PlaneGeometry(16.8,10.8),
          new THREE.MeshBasicMaterial({ map:tex,side:THREE.DoubleSide })
        );
        frente.position.set(0,21,0.51);g.add(frente);
      }
    }
    return g;
  }
  function marcoRefugio() {
    const g=new THREE.Group(), verdeAlvo=matC(0x237e5b);
    g.add(pinoC(.65,21,matC(0xc3caba),0,10.5,0));
    g.add(caixaC(15,9,1.1,verdeAlvo,7,21,0));
    if(typeof document!=='undefined'){
      const canvas=document.createElement('canvas');
      canvas.width=512;canvas.height=256;
      const ctx=canvas.getContext('2d');
      if(ctx){
        ctx.fillStyle='#247c59';ctx.fillRect(0,0,512,256);
        ctx.fillStyle='#e7fce5';ctx.textAlign='center';
        ctx.font='bold 90px sans-serif';ctx.fillText('REFÚGIO',256,115);
        ctx.font='bold 56px sans-serif';ctx.fillText('DE JOFRE',256,195);
        const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
        const frente=new THREE.Mesh(
          new THREE.PlaneGeometry(14,7.5),
          new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide})
        );
        frente.position.set(7,21,0.7);g.add(frente);
      }
    }
    return g;
  }

  // Zona vermelha: desenho do fogo no piso + geometria em volume.
  // Não é uma caixa de colisão: a detecção vem do sensor de cor (vermelho=5).
  function focoFogo() {
    const g = new THREE.Group();
    const soloQueimado = new THREE.Mesh(
      new THREE.CircleGeometry(13.7, 32),
      new THREE.MeshStandardMaterial({ color: 0x453b30, roughness: 1 })
    );
    soloQueimado.rotation.x = -Math.PI / 2;
    soloQueimado.position.y = 0.18;
    g.add(soloQueimado);
    const brasa = matC(0xa74320);
    g.add(segmento([-8,1.0,4],[7,1.1,-3],1.3,queimado));
    g.add(segmento([-6,1.2,-5],[6,1.0,6],1.1,brasa));
    const cores = [0xed3a1d, 0xff7c18, 0xffbc35];
    for (const [i, [x,z,altura]] of [
      [-6,-3,12],[-1,4,16],[5,-3,13],[7,4,9],[-3,-7,10]
    ].entries()) {
      const material = new THREE.MeshStandardMaterial({
        color: cores[i%3], emissive: cores[i%3], emissiveIntensity: 0.35,
        roughness: 0.7, transparent: true, opacity: 0.95
      });
      const chama = new THREE.Mesh(new THREE.ConeGeometry(2.9,altura,7),material);
      chama.position.set(x,1.7+altura/2,z);
      chama.rotation.z = i%2 ? 0.18 : -0.16;
      g.add(chama);
    }
    const fumacaMat = new THREE.MeshStandardMaterial({
      color: 0x77736d, transparent: true, opacity: 0.27,
      roughness: 1, depthWrite: false
    });
    for (let i=0; i<4; i++) {
      const esfera = new THREE.Mesh(new THREE.SphereGeometry(1,10,8),fumacaMat);
      const r=3.8 + i*2.2;
      esfera.scale.set(r,r*0.78,r);
      esfera.position.set(-5+i*2,19+i*7,-1+i);
      g.add(esfera);
    }
    return g;
  }

  function fumaca() {
    const g=new THREE.Group();
    const fuma = new THREE.MeshStandardMaterial({
      color: 0x84817c, transparent: true, opacity: 0.19,
      depthWrite: false, roughness: 1
    });
    const chao = new THREE.Mesh(new THREE.CircleGeometry(7,20),matC(0x65584b));
    chao.rotation.x=-Math.PI/2; chao.position.y=0.2;g.add(chao);
    for(let i=0; i<3; i++){
      const esfera=new THREE.Mesh(new THREE.SphereGeometry(1,12,10),fuma);
      esfera.scale.set(4+i*2,3+i*2,4+i*2);
      esfera.position.set(i*1.7,10+i*7,0);
      g.add(esfera);
    }
    return g;
  }

  function placaPerigo() {
    // Placa retangular e discreta; evita o antigo triângulo em forma de cone.
    const g = new THREE.Group();
    const metal = matC(0x726b5e);
    g.add(pinoC(0.6, 15, metal, 0, 7.5, 0));
    g.add(caixaC(13, 10, 0.8, matC(0xf0bb52), 0, 18, 0));
    g.add(caixaC(11.8, 8.8, 0.2, matC(0x684638), 0, 18, 0.51));
    g.add(caixaC(0.8, 4.0, 0.35, matC(0xffe4a0), 0, 19, 0.7));
    const ponto = new THREE.Mesh(
      new THREE.SphereGeometry(0.65, 12, 8),
      matC(0xffe4a0)
    );
    ponto.position.set(0, 16, 0.75);
    g.add(ponto);
    return g;
  }

  const criadores = {
    arvoreSeca, arvoreVerde, tocoQueimado:toco, arbusto, rochas,
    lagoa, lagoaSeca, taboas, capivara, garca, tuiuiu, araraAzul, cervoPantaneiro,
    placaFauna, marcoRefugio, focoFogo, fumaca, placaPerigo
  };

  for(const obj of cen.ambientacao3d || []) {
    const criar=criadores[obj.tipo];
    if(!criar)continue;
    const g=criar(obj);
    g.name='decoracaoPantanal:'+obj.tipo;
    g.position.set(obj.x,0,obj.y);
    g.rotation.y=obj.rotacao || 0;
    if(obj.escala) g.scale.setScalar(obj.escala);
    grupo.add(g);
  }
  return grupo;
}

/** rampa 3D (cunha + platô). O topo usa a MESMA textura do chão, mapeada em planta, então o aluno vê o que o sensor lê. */
function construirRampa(r, cen, mapa) {
  const L = r.w, H = r.altura, run = r.subida, sh = new THREE.Shape();
  if (r.dir === '-x') { sh.moveTo(L, 0); sh.lineTo(0, 0); sh.lineTo(0, H); sh.lineTo(L - run, H); } else { sh.moveTo(0, 0); sh.lineTo(L, 0); sh.lineTo(L, H); sh.lineTo(run, H); }
  sh.closePath();
  const geo = new THREE.ExtrudeGeometry(sh, { depth: r.h, bevelEnabled: false });          // perfil em XY, largura em Z
  geo.translate(r.x, 0, r.y);
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / cen.w, 1 - pos.getZ(i) / cen.h);      // planta → textura do tapete
  uv.needsUpdate = true; geo.computeVertexNormals();
  const m = sombraC(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: mapa, roughness: 0.85 }))); m.name = r.nome || 'rampa';
  return m;
}

/** arena do cenário: mesa, chão (com o tapete), paredes, rampas e blocos — tudo no tamanho cen.w × cen.h */
export function construirArena(cen, tapete, renderer = null) {
  if (cen.tilesOriginais) return construirGrupoSArena(cen);
  const g = new THREE.Group(); g.name = 'arena';
  const cx = cen.w / 2, cz = cen.h / 2;
  const mesa = new THREE.Mesh(new THREE.BoxGeometry(cen.w + 60, 3, cen.h + 50), new THREE.MeshStandardMaterial({ color: cen.id === 'pantanalEcologico' ? 0x55473c : 0x6d5a48, roughness: 0.9 }));
  mesa.position.set(cx, -1.6, cz); mesa.receiveShadow = true; g.add(mesa);
  const mapa = texturaDoTapete(tapete, renderer);
  // Cenários de seguidor de linha podem optar por textura sem luz: preto/ branco
  // permanecem iguais aos pixels realmente usados pelo sensor de refletância.
  const materialPiso = cen.linhaAltaContraste
    ? new THREE.MeshBasicMaterial({ map: mapa, color: 0xffffff })
    : new THREE.MeshStandardMaterial({ map: mapa, roughness: 0.9 });
  const chao = new THREE.Mesh(new THREE.PlaneGeometry(cen.w, cen.h).rotateX(-Math.PI / 2), materialPiso);
  chao.position.set(cx, 0, cz); chao.receiveShadow = true; chao.name = 'chao'; g.add(chao);
  const parede = new THREE.MeshStandardMaterial({ color: cen.id === 'pantanalEcologico' ? 0x83775e : 0x8c96a0, roughness: 0.7 });
  for (const [w, d, x, z] of [[cen.w + 3, 1.5, cx, -0.75], [cen.w + 3, 1.5, cx, cen.h + 0.75], [1.5, cen.h, -0.75, cz], [1.5, cen.h, cen.w + 0.75, cz]]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(w, 5, d), parede); p.position.set(x, 2.5, z); p.castShadow = p.receiveShadow = true; g.add(p);
  }
  for (const r of cen.rampas || []) g.add(construirRampa(r, cen, mapa));
  for (const b of cen.caixas) g.add(construirBloco(b));
  // Props naturais exclusivos do Pantanal: não entram nas colisões.
  if (cen.id === 'pantanalEcologico' && cen.ambientacao3d?.length) {
    g.add(construirAmbientacaoPantanal(cen));
  }
  // Peças decorativas originais definidas diretamente pelo cenário nativo.
  // Não entram em cen.caixas: são referências visuais, não colisores.
  for (const obj of cen.decoracoes3d || []) {
    if (obj.tipo !== 'esfera') continue;
    const raio = Number(obj.raio);
    if (!Number.isFinite(raio) || raio <= 0 || !Number.isFinite(obj.x) || !Number.isFinite(obj.y)) continue;
    const esfera = new THREE.Mesh(
      new THREE.SphereGeometry(raio, 24, 16),
      new THREE.MeshStandardMaterial({ color: obj.cor || '#cccccc', roughness: 0.55 })
    );
    esfera.position.set(obj.x, raio, obj.y); // apoiada na superfície de altura 0
    esfera.name = obj.nome || 'esfera';
    esfera.castShadow = true;
    esfera.receiveShadow = true;
    g.add(esfera);
  }
  // Textura usada pelo piso e pelas rampas: sua versão muda junto ao semáforo.
  g.userData.texturaTapete = mapa;
  return g;
}

const MODOS_CAMERA = ['livre', 'seguir', 'topo'];

const TAN_FOV2 = Math.tan(21 * Math.PI / 180);                       // fov vertical de 42°

/**
 * criarVista(container, { cenario, tapete, renderer? })
 * `cenario` = CENARIOS[id] do sim.js (w, h, caixas…) · `tapete` = Cenarios.obterTapete(id)
 * `renderer` injetável só pra testes (GL headless); no navegador é criado aqui.
 */
export function criarVista(container, { cenario, tapete, renderer: rInjetado = null }) {
  const renderer = rInjetado || new THREE.WebGLRenderer({ antialias: true });
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  if (!rInjetado) container.appendChild(renderer.domElement);
  if (renderer.domElement.style) renderer.domElement.style.display = 'block';

  const scene = new THREE.Scene(); scene.background = new THREE.Color(0xcfd8e2);
  const camera = new THREE.PerspectiveCamera(42, 1.5, 1, 1200);
  const centro = new THREE.Vector3();

  // luzes: hemisférica + sol com sombra; o frustum da sombra é ajustado ao tamanho da arena em setCenario
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8b97a8, 0.85));
  const sol = new THREE.DirectionalLight(0xfff4e0, 1.5);
  sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048); sol.shadow.bias = -0.0004; sol.shadow.normalBias = 0.05;
  scene.add(sol, sol.target);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.08; controls.maxPolarAngle = Math.PI / 2 - 0.04; controls.minDistance = 15;

  const S = { cen: null, arena: null, tapete: null, versaoTapete: 0, rig: null, tipo: 'ev3', modo: 'livre', cameraLivreInicializada: false, poseLivre: null, ultimo: null, snap: true, ativo: false, raf: 0, alvoCam: new THREE.Vector3(), dist: 100, seguirDist: 30, seguirAlt: 20, peers: new Map() };

  /** estimativa inicial (câmera de topo): distância pra a arena caber no fov */
  const distanciaAjustada = () => Math.max(S.cen.h / 2, S.cen.w / (2 * camera.aspect)) / TAN_FOV2 * 1.06;
  /** posiciona a câmera olhando o centro da arena numa direção (dirY, dirZ) e AFASTA até os 4 cantos caberem no quadro */
  function enquadrarCantos(dirY, dirZ, up) {
    const cantos = [[0, 0], [S.cen.w, 0], [0, S.cen.h], [S.cen.w, S.cen.h]].map(([x, z]) => new THREE.Vector3(x, 0, z));
    let dist = distanciaAjustada();
    for (let i = 0; i < 6; i++) {
      camera.up.copy(up); camera.position.set(centro.x, dirY * dist, centro.z + dirZ * dist); camera.lookAt(centro);
      camera.updateMatrixWorld(true); camera.updateProjectionMatrix();
      let m = 0; for (const c of cantos) { const p = c.clone().project(camera); m = Math.max(m, Math.abs(p.x), Math.abs(p.y)); }
      if (Math.abs(m - 0.92) < 0.015) break;
      dist *= Math.max(0.5, Math.min(2, m / 0.92));
    }
    return dist;
  }
  function enquadrarLivre() {
    S.dist = enquadrarCantos(0.78, 0.72, new THREE.Vector3(0, 1, 0)); controls.maxDistance = S.dist * 2.6;
    controls.target.copy(centro); controls.update();
    S.cameraLivreInicializada = true;
  }
  function ajustarLuz() {
    const L = Math.max(S.cen.w, S.cen.h), r = Math.hypot(S.cen.w, S.cen.h) / 2 + 22;
    sol.position.set(centro.x - L * 0.25, L * 0.9, centro.z + L * 0.6); sol.target.position.copy(centro);
    Object.assign(sol.shadow.camera, { left: -r, right: r, top: r, bottom: -r, near: 10, far: L * 3 }); sol.shadow.camera.updateProjectionMatrix();
  }
  /** troca o cenário: reconstrói arena/textura e re-enquadra tudo no novo tamanho */
  function setCenario(cen, novoTapete) {
    if (S.arena) {
      scene.remove(S.arena);
      S.arena.traverse((o) => {
        o.geometry?.dispose();
        const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
        for (const material of mats) { material.map?.dispose(); material.dispose(); }
      });
    }
    S.cen = cen; centro.set(cen.w / 2, 0, cen.h / 2);
    scene.background = new THREE.Color(cen.id === 'pantanalEcologico' ? 0xc8d8cf : (cen.tilesOriginais ? 0x528fa0 : 0xcfd8e2));
    S.ultimo = null; S.snap = true;                 // não herda a pose do cenário anterior; câmera de perseguição reposiciona sem deslizar
    S.arena = construirArena(cen, novoTapete, renderer); scene.add(S.arena);
    S.tapete = novoTapete; S.versaoTapete = novoTapete?.versao || 0;
    S.cameraLivreInicializada = false; S.poseLivre = null;
    ajustarLuz(); setModoCamera(S.modo);
  }
  function setRobo(tipo) {
    if (!ROBOS[tipo]) {
      console.warn('[jacarEV3] Modelo 3D indisponível:', tipo, '— utilizando EV3.');
      tipo = 'ev3';
    }
    if (S.rig) { scene.remove(S.rig.grupo); S.rig.grupo.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
    S.tipo = tipo; S.rig = ROBOS[tipo](); scene.add(S.rig.grupo);
    if (S.ultimo) aplicarEstado(S.rig, S.ultimo);
  }

  function fantasmaMateriais(grupo) {
    grupo.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (!m) continue;
        m.transparent = true;
        m.opacity = 0.45;
        m.depthWrite = false;
        if (m.emissiveIntensity != null) m.emissiveIntensity *= 0.5;
      }
    });
  }
  /** Atualiza robôs fantasmas de outros jogadores (multiplayer). peers: [{alunoId,x,y,th,led,robo3d,nome}] */
  function setPeers(lista) {
    const ids = new Set();
    for (const p of lista || []) {
      if (!p || !p.alunoId || p.x == null || p.y == null) continue;
      ids.add(p.alunoId);
      let entry = S.peers.get(p.alunoId);
      const tipo = (p.robo3d && ROBOS[p.robo3d]) ? p.robo3d : (S.tipo || 'ev3');
      if (!entry || entry.tipo !== tipo) {
        if (entry) {
          scene.remove(entry.rig.grupo);
          entry.rig.grupo.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
        }
        const construtor = ROBOS[tipo] || ROBOS.ev3;
        const rig = construtor();
        fantasmaMateriais(rig.grupo);
        scene.add(rig.grupo);
        entry = { rig, tipo };
        S.peers.set(p.alunoId, entry);
      }
      const alturaPeer = S.cen?.tilesOriginais
        ? S.cen.terreno(p.x, p.y, p.th || 0)
        : { z: p.z || 0, pitch: p.pitch || 0, roll: p.roll || 0 };
      aplicarEstado(entry.rig, {
        x: p.x, y: p.y, th: p.th || 0, ...alturaPeer,
        pitch: p.pitch || 0, roll: p.roll || 0,
        encA: 0, encB: 0, encC: 0, encD: 0,
        led: p.led || 'DESLIGADO', ledAlpha: 0.55, refletida: 50,
      });
    }
    for (const [id, entry] of [...S.peers.entries()]) {
      if (!ids.has(id)) {
        scene.remove(entry.rig.grupo);
        entry.rig.grupo.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
        S.peers.delete(id);
      }
    }
  }

  function setModoCamera(modo) {
    if (!MODOS_CAMERA.includes(modo)) return;
    const anterior = S.modo;
    // Guardar o enquadramento definido pelo aluno ao sair da câmera livre.
    if (anterior === 'livre' && modo !== 'livre' && S.cameraLivreInicializada) {
      S.poseLivre = {
        posicao: camera.position.clone(),
        alvo: controls.target.clone(),
        acima: camera.up.clone(),
      };
    }
    S.modo = modo; controls.enabled = modo === 'livre';
    if (modo === 'livre') {
      if (!S.cameraLivreInicializada) enquadrarLivre();
      else if (anterior !== 'livre' && S.poseLivre) {
        camera.position.copy(S.poseLivre.posicao);
        camera.up.copy(S.poseLivre.acima);
        controls.target.copy(S.poseLivre.alvo);
        controls.update();
      }
    }
    if (modo === 'topo') enquadrarCantos(1, 0.0001, new THREE.Vector3(0, 0, -1));
  }
  function setDistanciaSeguir(d, alt) {
    if (d != null && isFinite(d)) S.seguirDist = Math.max(8, Math.min(120, +d));
    if (alt != null && isFinite(alt)) S.seguirAlt = Math.max(5, Math.min(80, +alt));
    S.snap = true;
  }
  function atualizarCamera() {
    if (S.modo === 'seguir' && S.ultimo) {                          // câmera de perseguição atrás do robô
      const { x, y, th } = S.ultimo, fx = Math.cos(th), fz = Math.sin(th);
      const altura = S.ultimo.z || 0;
      const d = S.seguirDist || 30, h = S.seguirAlt || 20;
      const desejada = new THREE.Vector3(x - fx * d, altura + h, y - fz * d);
      const alvo = new THREE.Vector3(x + fx * 8, altura + 3, y + fz * 8);
      camera.up.set(0, 1, 0);
      if (S.snap) { camera.position.copy(desejada); S.alvoCam.copy(alvo); S.snap = false; }
      else { camera.position.lerp(desejada, 0.12); S.alvoCam.lerp(alvo, 0.2); }
      camera.lookAt(S.alvoCam);
    } else if (S.modo === 'livre') controls.update();
  }
  function aplicar(est) {
    if (!est) return;
    // A geometria e o robô consultam a MESMA função de altura.
    // Cobre tanto playback quanto teleop e chamadas diretas da vista 3D.
    S.ultimo = S.cen?.tilesOriginais
      ? { ...est, ...S.cen.terreno(est.x, est.y, est.th || 0) }
      : est;
    if (S.rig) aplicarEstado(S.rig, S.ultimo);
  }
  function desenhar() {
    // CanvasTexture só atualiza na GPU quando needsUpdate é ativado.
    // O tapete tem nova versão apenas quando o sinal muda de cor.
    const versao = S.tapete?.versao || 0;
    if (versao !== S.versaoTapete) {
      const textura = S.arena?.userData?.texturaTapete;
      if (textura) textura.needsUpdate = true;
      S.versaoTapete = versao;
    }
    atualizarCamera();
    renderer.render(scene, camera);
  }
  /** acompanha o tamanho do contêiner (janela única): só reenquadra se o formato mudou */
  function redimensionar() {
    const w = Math.max(10, container.clientWidth || 720), h = Math.max(10, container.clientHeight || 480);
    renderer.setPixelRatio(Math.min((typeof devicePixelRatio !== 'undefined' && devicePixelRatio) || 1, 2));
    renderer.setSize(w, h); const antes = camera.aspect; camera.aspect = w / h; camera.updateProjectionMatrix();
    // Alterações de layout NÃO podem zerar a câmera livre escolhida pelo aluno.
    // Só a vista de topo necessita reenquadrar ao mudar a proporção do canvas.
    if (S.cen && S.modo === 'topo' && Math.abs(antes - camera.aspect) > 0.01) {
      enquadrarCantos(1, 0.0001, new THREE.Vector3(0, 0, -1));
    }
  }
  function loop() { if (!S.ativo) return; S.raf = requestAnimationFrame(loop); desenhar(); }
  function mostrar(v) {
    if (v === S.ativo) return; S.ativo = v;
    if (v) { redimensionar(); loop(); } else cancelAnimationFrame(S.raf);
  }
  if (typeof ResizeObserver !== 'undefined' && container.nodeType === 1) new ResizeObserver(() => { if (S.ativo) redimensionar(); }).observe(container);

  setCenario(cenario, tapete); setRobo('ev3'); redimensionar();
  return { renderer, scene, camera, controls, setRobo, setPeers, setCenario, setModoCamera, setDistanciaSeguir, aplicar, desenhar, mostrar, redimensionar,
    get rig() { return S.rig; }, get tipo() { return S.tipo; }, get modo() { return S.modo; }, get seguirDist() { return S.seguirDist; } };
}


// ---------------------------------------------------------------------------
// Expõe a API no window para os scripts não-módulo de public/index.html
// ---------------------------------------------------------------------------
if (typeof window !== 'undefined') {
  window.Vista3D = {
    criarVista,
    construirArena,
    construirRoboEV3,
    construirRoboJacare,
    construirRoboCapivara,
    construirRoboCaranguejo,
    construirRoboTubarao,
    construirRoboSapo,
    construirRoboElefante,
    construirRoboCamaleao,
    construirRoboEscorpiao,
    construirRoboCoruja,
    aplicarEstado,
  };
  window.dispatchEvent(new Event('vista3d-pronta'));
}
