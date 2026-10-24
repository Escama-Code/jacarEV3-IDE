// ============================================================
// cena3d.mjs — Cena Three.js: arena 120×80 cm, luzes, sombras, câmeras.
// É só o ESPELHO visual do sim.js: a física e o sensor continuam lá.
// ============================================================
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { construirRoboEV3, construirRoboJacare, aplicarEstado } from './modelos3d.mjs';

const ROBOS = { ev3: construirRoboEV3, jacare: construirRoboJacare };

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

/** arena do cenário: mesa, chão (com o tapete), paredes e caixas — tudo no tamanho cen.w × cen.h */
export function construirArena(cen, tapete, renderer = null) {
  const g = new THREE.Group(); g.name = 'arena';
  const cx = cen.w / 2, cz = cen.h / 2;
  const mesa = new THREE.Mesh(new THREE.BoxGeometry(cen.w + 60, 3, cen.h + 50), new THREE.MeshStandardMaterial({ color: 0x6d5a48, roughness: 0.9 }));
  mesa.position.set(cx, -1.6, cz); mesa.receiveShadow = true; g.add(mesa);
  const chao = new THREE.Mesh(new THREE.PlaneGeometry(cen.w, cen.h).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ map: texturaDoTapete(tapete, renderer), roughness: 0.9 }));
  chao.position.set(cx, 0, cz); chao.receiveShadow = true; chao.name = 'chao'; g.add(chao);
  const parede = new THREE.MeshStandardMaterial({ color: 0x8c96a0, roughness: 0.7 });
  for (const [w, d, x, z] of [[cen.w + 3, 1.5, cx, -0.75], [cen.w + 3, 1.5, cx, cen.h + 0.75], [1.5, cen.h, -0.75, cz], [1.5, cen.h, cen.w + 0.75, cz]]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(w, 5, d), parede); p.position.set(x, 2.5, z); p.castShadow = p.receiveShadow = true; g.add(p);
  }
  for (const b of cen.caixas) {                                    // MESMAS caixas que o sim.js usa na colisão/ultrassônico
    const alt = b.altura || 10, cor = new THREE.Color(b.cor || '#5f86a6');
    const m = new THREE.Mesh(new THREE.BoxGeometry(b.w, alt, b.h), new THREE.MeshStandardMaterial({ color: cor, roughness: 0.6 }));
    m.position.set(b.x + b.w / 2, alt / 2, b.y + b.h / 2); m.castShadow = m.receiveShadow = true; m.name = b.nome || 'caixa'; g.add(m);
    const topo = new THREE.Mesh(new THREE.BoxGeometry(b.w + 0.3, 0.8, b.h + 0.3), new THREE.MeshStandardMaterial({ color: cor.clone().offsetHSL(0, 0, 0.14), roughness: 0.6 }));
    topo.position.set(b.x + b.w / 2, alt + 0.4, b.y + b.h / 2); topo.castShadow = true; g.add(topo);
  }
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

  const S = { cen: null, arena: null, rig: null, tipo: 'ev3', modo: 'livre', ultimo: null, ativo: false, raf: 0, alvoCam: new THREE.Vector3(), dist: 100 };

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
    if (S.arena) { scene.remove(S.arena); S.arena.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.map) o.material.map.dispose(); }); }
    S.cen = cen; centro.set(cen.w / 2, 0, cen.h / 2);
    S.arena = construirArena(cen, novoTapete, renderer); scene.add(S.arena);
    ajustarLuz(); setModoCamera(S.modo);
  }
  function setRobo(tipo) {
    if (!ROBOS[tipo]) throw new Error('robô desconhecido: ' + tipo);
    if (S.rig) { scene.remove(S.rig.grupo); S.rig.grupo.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
    S.tipo = tipo; S.rig = ROBOS[tipo](); scene.add(S.rig.grupo);
    if (S.ultimo) aplicarEstado(S.rig, S.ultimo);
  }
  function setModoCamera(modo) {
    if (!MODOS_CAMERA.includes(modo)) return;
    S.modo = modo; controls.enabled = modo === 'livre';
    if (modo === 'livre') enquadrarLivre();
    if (modo === 'topo') enquadrarCantos(1, 0.0001, new THREE.Vector3(0, 0, -1));
  }
  function atualizarCamera() {
    if (S.modo === 'seguir' && S.ultimo) {                          // câmera de perseguição atrás do robô
      const { x, y, th } = S.ultimo, fx = Math.cos(th), fz = Math.sin(th);
      const desejada = new THREE.Vector3(x - fx * 30, 20, y - fz * 30);
      camera.up.set(0, 1, 0); camera.position.lerp(desejada, 0.12);
      S.alvoCam.lerp(new THREE.Vector3(x + fx * 8, 3, y + fz * 8), 0.2); camera.lookAt(S.alvoCam);
    } else if (S.modo === 'livre') controls.update();
  }
  function aplicar(est) { S.ultimo = est; if (S.rig) aplicarEstado(S.rig, est); }
  function desenhar() { atualizarCamera(); renderer.render(scene, camera); }
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
  return { renderer, scene, camera, controls, setRobo, setCenario, setModoCamera, aplicar, desenhar, mostrar, redimensionar,
    get rig() { return S.rig; }, get tipo() { return S.tipo; }, get modo() { return S.modo; } };
}
