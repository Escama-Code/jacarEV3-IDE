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
  construirRoboOnibus,
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
  carro: construirRoboCarro,
  onibus: construirRoboOnibus
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
const MODELOS_BLOCO = { torre: blocoTorre, plataforma: blocoPlataforma, conteiner: blocoConteiner, parede: blocoParede };
/** bloco rígido na MESMA pegada (x, y, w, h) que o sim.js usa na colisão e no ultrassônico */
function construirBloco(b) {
  const cor = new THREE.Color(b.cor || '#5f86a6'), g = (MODELOS_BLOCO[b.modelo] || ((bb, cc) => {
    const gg = new THREE.Group(); gg.add(caixaC(bb.w, bb.altura || 10, bb.h, matC(cc), 0, (bb.altura || 10) / 2, 0)); return gg; }))(b, cor);
  g.position.set(b.x + b.w / 2, 0, b.y + b.h / 2); g.name = b.nome || 'bloco'; return g;
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
  const mesa = new THREE.Mesh(new THREE.BoxGeometry(cen.w + 60, 3, cen.h + 50), new THREE.MeshStandardMaterial({ color: 0x6d5a48, roughness: 0.9 }));
  mesa.position.set(cx, -1.6, cz); mesa.receiveShadow = true; g.add(mesa);
  const mapa = texturaDoTapete(tapete, renderer);
  // Cenários de seguidor de linha podem optar por textura sem luz: preto/ branco
  // permanecem iguais aos pixels realmente usados pelo sensor de refletância.
  const materialPiso = cen.linhaAltaContraste
    ? new THREE.MeshBasicMaterial({ map: mapa, color: 0xffffff })
    : new THREE.MeshStandardMaterial({ map: mapa, roughness: 0.9 });
  const chao = new THREE.Mesh(new THREE.PlaneGeometry(cen.w, cen.h).rotateX(-Math.PI / 2), materialPiso);
  chao.position.set(cx, 0, cz); chao.receiveShadow = true; chao.name = 'chao'; g.add(chao);
  const parede = new THREE.MeshStandardMaterial({ color: 0x8c96a0, roughness: 0.7 });
  for (const [w, d, x, z] of [[cen.w + 3, 1.5, cx, -0.75], [cen.w + 3, 1.5, cx, cen.h + 0.75], [1.5, cen.h, -0.75, cz], [1.5, cen.h, cen.w + 0.75, cz]]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(w, 5, d), parede); p.position.set(x, 2.5, z); p.castShadow = p.receiveShadow = true; g.add(p);
  }
  for (const r of cen.rampas || []) g.add(construirRampa(r, cen, mapa));
  for (const b of cen.caixas) g.add(construirBloco(b));
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

  const S = { cen: null, arena: null, tapete: null, versaoTapete: 0, rig: null, tipo: 'ev3', modo: 'livre', ultimo: null, snap: true, ativo: false, raf: 0, alvoCam: new THREE.Vector3(), dist: 100, seguirDist: 30, seguirAlt: 20, peers: new Map() };

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
    scene.background = new THREE.Color(cen.tilesOriginais ? 0x528fa0 : 0xcfd8e2);
    S.ultimo = null; S.snap = true;                 // não herda a pose do cenário anterior; câmera de perseguição reposiciona sem deslizar
    S.arena = construirArena(cen, novoTapete, renderer); scene.add(S.arena);
    S.tapete = novoTapete; S.versaoTapete = novoTapete?.versao || 0;
    ajustarLuz(); setModoCamera(S.modo);
  }
  function setRobo(tipo) {
    if (!ROBOS[tipo]) throw new Error('robô desconhecido: ' + tipo);
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
    S.modo = modo; controls.enabled = modo === 'livre';
    if (modo === 'livre') enquadrarLivre();
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
    if (S.cen && Math.abs(antes - camera.aspect) > 0.01) setModoCamera(S.modo);
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
