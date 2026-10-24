// ============================================================
// cena3d.mjs — Cena Three.js: arena 120×80 cm, luzes, sombras, câmeras.
// É só o ESPELHO visual do sim.js: a física e o sensor continuam lá.
// ============================================================
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { construirRoboEV3, construirRoboJacare, aplicarEstado } from './modelos3d.mjs';

const ROBOS = { ev3: construirRoboEV3, jacare: construirRoboJacare };

/** textura do tapete: fundo claro com grade de 10 cm (só no navegador) */
function texturaTapete(arena) {
  if (typeof document === 'undefined') return null;
  const px = 10, cv = document.createElement('canvas'); cv.width = arena.w * px; cv.height = arena.h * px;
  const c = cv.getContext && cv.getContext('2d'); if (!c) return null;
  c.fillStyle = '#f4f3ee'; c.fillRect(0, 0, cv.width, cv.height);
  c.strokeStyle = '#dedbd0'; c.lineWidth = 2;
  for (let x = 0; x <= arena.w; x += 10) { c.beginPath(); c.moveTo(x * px, 0); c.lineTo(x * px, cv.height); c.stroke(); }
  for (let y = 0; y <= arena.h; y += 10) { c.beginPath(); c.moveTo(0, y * px); c.lineTo(cv.width, y * px); c.stroke(); }
  c.strokeStyle = '#b9b5a6'; c.lineWidth = 6; c.strokeRect(3, 3, cv.width - 6, cv.height - 6);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

/** faixa preta da pista: tira de triângulos ao longo da polilinha (largura em cm) */
function fitaDaTrilha(pts, largura) {
  const pos = [], idx = [], n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dz = b[1] - a[1]; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
    const nx = -dz * largura / 2, nz = dx * largura / 2;
    pos.push(pts[i][0] + nx, 0.04, pts[i][1] + nz, pts[i][0] - nx, 0.04, pts[i][1] - nz);
    if (i < n - 1) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/** arena: mesa, tapete, paredes, fita preta e caixas — espelha CENARIOS[...] do sim.js */
export function construirArena(arena, cen, larguraLinha = 2) {
  const g = new THREE.Group(); g.name = 'arena';
  const cx = arena.w / 2, cz = arena.h / 2;
  const mesa = new THREE.Mesh(new THREE.BoxGeometry(arena.w + 60, 3, arena.h + 50), new THREE.MeshStandardMaterial({ color: 0x6d5a48, roughness: 0.9 }));
  mesa.position.set(cx, -1.6, cz); mesa.receiveShadow = true; g.add(mesa);
  const tex = texturaTapete(arena);
  const chao = new THREE.Mesh(new THREE.PlaneGeometry(arena.w, arena.h).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial(tex ? { map: tex, roughness: 0.9 } : { color: 0xf4f3ee, roughness: 0.9 }));
  chao.position.set(cx, 0, cz); chao.receiveShadow = true; chao.name = 'chao'; g.add(chao);
  const parede = new THREE.MeshStandardMaterial({ color: 0x8c96a0, roughness: 0.7 });
  for (const [w, d, x, z] of [[arena.w + 3, 1.5, cx, -0.75], [arena.w + 3, 1.5, cx, arena.h + 0.75], [1.5, arena.h, -0.75, cz], [1.5, arena.h, arena.w + 0.75, cz]]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(w, 5, d), parede); p.position.set(x, 2.5, z); p.castShadow = p.receiveShadow = true; g.add(p);
  }
  if (cen.trilha.length > 1) {
    const fita = new THREE.Mesh(fitaDaTrilha(cen.trilha, larguraLinha), new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.95, side: THREE.DoubleSide }));
    fita.receiveShadow = true; fita.name = 'fita'; g.add(fita);
  }
  for (const b of cen.caixas) {                                    // obstáculos: mesmas caixas que o sim.js usa na colisão
    const m = new THREE.Mesh(new THREE.BoxGeometry(b.w, 10, b.h), new THREE.MeshStandardMaterial({ color: 0x5f86a6, roughness: 0.6 }));
    m.position.set(b.x + b.w / 2, 5, b.y + b.h / 2); m.castShadow = m.receiveShadow = true; g.add(m);
    const topo = new THREE.Mesh(new THREE.BoxGeometry(b.w + 0.3, 0.8, b.h + 0.3), new THREE.MeshStandardMaterial({ color: 0xf2b134, roughness: 0.6 }));
    topo.position.set(b.x + b.w / 2, 10.2, b.y + b.h / 2); topo.castShadow = true; g.add(topo);
  }
  return g;
}

const MODOS_CAMERA = ['livre', 'seguir', 'topo'];

/**
 * criarVista(container, { arena, cenario, renderer? })
 * `renderer` injetável só pra testes (GL headless); no navegador é criado aqui.
 */
export function criarVista(container, { arena, cenario, renderer: rInjetado = null, larguraLinha = 2 }) {
  const renderer = rInjetado || new THREE.WebGLRenderer({ antialias: true });
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  if (!rInjetado) container.appendChild(renderer.domElement);
  if (renderer.domElement.style) renderer.domElement.style.display = 'block';

  const scene = new THREE.Scene(); scene.background = new THREE.Color(0xcfd8e2);
  const camera = new THREE.PerspectiveCamera(42, 1.5, 1, 800);
  const centro = new THREE.Vector3(arena.w / 2, 0, arena.h / 2);

  // luzes: hemisférica (céu/chão) + sol com sombra cobrindo a arena inteira
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8b97a8, 0.85));
  const sol = new THREE.DirectionalLight(0xfff4e0, 1.5); sol.position.set(centro.x - 30, 110, centro.z + 70); sol.target.position.copy(centro);
  sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048); sol.shadow.bias = -0.0004; sol.shadow.normalBias = 0.05;
  Object.assign(sol.shadow.camera, { left: -85, right: 85, top: 65, bottom: -65, near: 10, far: 320 }); sol.shadow.camera.updateProjectionMatrix();
  scene.add(sol, sol.target);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.08; controls.maxPolarAngle = Math.PI / 2 - 0.04;
  controls.minDistance = 15; controls.maxDistance = 260;

  const S = { arena: null, rig: null, tipo: 'ev3', modo: 'livre', ultimo: null, ativo: false, raf: 0, alvoCam: new THREE.Vector3() };

  function enquadrarLivre() {
    camera.up.set(0, 1, 0); camera.position.set(centro.x, 82, centro.z + 78); controls.target.copy(centro); controls.update();
  }
  function setCenario(cen) {
    if (S.arena) { scene.remove(S.arena); S.arena.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
    S.arena = construirArena(arena, cen, larguraLinha); scene.add(S.arena);
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
    if (modo === 'topo') { camera.up.set(0, 0, -1); camera.position.set(centro.x, 135, centro.z + 0.01); camera.lookAt(centro); }
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
  function redimensionar() {
    const w = Math.max(10, container.clientWidth || 720), h = Math.max(10, container.clientHeight || 480);
    renderer.setPixelRatio(Math.min((typeof devicePixelRatio !== 'undefined' && devicePixelRatio) || 1, 2));
    renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  function loop() { if (!S.ativo) return; S.raf = requestAnimationFrame(loop); desenhar(); }
  function mostrar(v) {
    if (v === S.ativo) return; S.ativo = v;
    if (v) { redimensionar(); loop(); } else cancelAnimationFrame(S.raf);
  }
  if (typeof ResizeObserver !== 'undefined' && container.nodeType === 1) new ResizeObserver(() => { if (S.ativo) redimensionar(); }).observe(container);

  setCenario(cenario); setRobo('ev3'); enquadrarLivre(); redimensionar();
  return { renderer, scene, camera, controls, setRobo, setCenario, setModoCamera, aplicar, desenhar, mostrar, redimensionar,
    get rig() { return S.rig; }, get tipo() { return S.tipo; }, get modo() { return S.modo; } };
}
