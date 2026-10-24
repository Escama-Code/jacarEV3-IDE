// ============================================================
// modelos3d.mjs — robôs PROCEDURAIS (só geometrias nativas do Three.js).
// Convenção: 1 unidade = 1 cm · Y pra cima · o robô "olha" para +Z ·
// origem = centro do eixo das rodas, no chão (x,y do sim.js).
//   roda esquerda (porta B) em x = +6 · roda direita (porta C) em x = -6
//   roda gira em rotation.x  (positivo = rola pra frente)
// Cada construtor devolve um "rig": { grupo, rodaB, rodaC, leds, feixe, animar }.
// ============================================================
import * as THREE from 'three';

export const DEG = Math.PI / 180;
export const CM_POR_GRAU = Math.PI * 5.6 / 360;         // igual ao sim.js (roda de 5,6 cm)
const RAIO_RODA = 2.8, LARG_RODA = 2.2, SEMI_BITOLA = 6;
const COR_LED = { VERDE: 0x22ff44, VERMELHO: 0xff2a1a, AMBAR: 0xffa000, DESLIGADO: 0x000000 };

// ---------- helpers ----------
const M = (cor, o = {}) => new THREE.MeshStandardMaterial({ color: cor, roughness: 0.55, metalness: 0.04, ...o });
const pronto = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };
const posicionar = (o, x = 0, y = 0, z = 0) => { o.position.set(x, y, z); return o; };
const caixa = (w, h, d, mat, x = 0, y = 0, z = 0) => posicionar(pronto(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)), x, y, z);
/** cilindro com eixo em 'x' | 'y' | 'z' */
function cil(r, h, mat, eixo = 'y', x = 0, y = 0, z = 0, seg = 28) {
  const g = new THREE.CylinderGeometry(r, r, h, seg);
  if (eixo === 'x') g.rotateZ(Math.PI / 2); else if (eixo === 'z') g.rotateX(Math.PI / 2);
  return posicionar(pronto(new THREE.Mesh(g, mat)), x, y, z);
}
/** caixa com bordas chanfradas (ExtrudeGeometry com bevel); dimensões finais = w × h × d */
function chanfrada(w, h, d, b, mat, x = 0, y = 0, z = 0) {
  const sh = new THREE.Shape(), a = (w - 2 * b) / 2, c = (h - 2 * b) / 2;
  sh.moveTo(-a, -c); sh.lineTo(a, -c); sh.lineTo(a, c); sh.lineTo(-a, c); sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: Math.max(0.001, d - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 2 });
  g.center();
  return posicionar(pronto(new THREE.Mesh(g, mat)), x, y, z);
}
/** cone/pirâmide com a ponta pra +Y (rotação opcional da geometria) */
function cone(r, h, mat, seg = 4, x = 0, y = 0, z = 0, rotX = 0) {
  const g = new THREE.ConeGeometry(r, h, seg); if (rotX) g.rotateX(rotX);
  return posicionar(pronto(new THREE.Mesh(g, mat)), x, y, z);
}
const cabo = (pontos, cor = 0x15171a, r = 0.13) => pronto(new THREE.Mesh(
  new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pontos.map((p) => new THREE.Vector3(...p))), 24, r, 6, false), M(cor, { roughness: 0.8 })));
/** viga/liftarm Lego Technic com furos, ao longo de Z */
function viga(comp, mat, x, y, z) {
  const g = new THREE.Group(); g.add(caixa(0.8, 0.8, comp, mat));
  const furo = M(0x111111);
  for (let i = 0; i < Math.floor(comp / 1.0); i++) g.add(cil(0.22, 0.86, furo, 'x', 0, 0, -comp / 2 + 0.5 + i * 1.0, 12));
  return posicionar(g, x, y, z);
}

// ---------- LCD (canvas) — só no navegador; em Node devolve null ----------
function criarLCD() {
  if (typeof document === 'undefined') return null;
  const cv = document.createElement('canvas'); cv.width = 178; cv.height = 128;
  const ctx = cv.getContext && cv.getContext('2d'); if (!ctx) return null;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.NearestFilter;
  const lcd = { tex, ultimoT: -1 };
  lcd.desenhar = (est) => {
    if (Math.abs(est.t - lcd.ultimoT) < 0.1 && est.t >= lcd.ultimoT) return;   // ~10 quadros/s bastam
    lcd.ultimoT = est.t;
    ctx.fillStyle = '#c4cfae'; ctx.fillRect(0, 0, 178, 128);
    ctx.fillStyle = '#1d2a14'; ctx.font = 'bold 16px monospace'; ctx.fillText('jacarEV3', 8, 20);
    ctx.fillRect(8, 26, 162, 2);
    ctx.font = '14px monospace';
    ctx.fillText('B: ' + Math.round(est.encB) + '°', 8, 50);
    ctx.fillText('C: ' + Math.round(est.encC) + '°', 8, 70);
    ctx.fillText('luz: ' + Math.round(est.refletida), 8, 90);
    ctx.fillText('t: ' + est.t.toFixed(1) + ' s', 8, 110);
    tex.needsUpdate = true;
  };
  return lcd;
}
const materialLCD = (lcd) => (lcd ? new THREE.MeshBasicMaterial({ map: lcd.tex }) : new THREE.MeshBasicMaterial({ color: 0xb9c6a3 }));
/** plano do LCD deitado, com o "topo" do texto apontando pra +Z (legível por quem olha de trás) */
function planoLCD(w, h, lcd, x, y, z) {
  const g = new THREE.PlaneGeometry(w, h); g.rotateX(-Math.PI / 2); g.rotateY(Math.PI);
  return posicionar(new THREE.Mesh(g, materialLCD(lcd)), x, y, z);
}

// ---------- peças compartilhadas ----------
/** Roda FUNCIONAL: eixo ao longo de X (gira em rotation.x). tema: 'ev3' | 'jacare'. lado: +1 esq (B), -1 dir (C) */
function construirRoda(tema, lado) {
  const g = new THREE.Group(); g.name = 'roda' + (lado > 0 ? 'B' : 'C');
  const R = RAIO_RODA, W = LARG_RODA, pneu = M(0x151515, { roughness: 0.95 });
  const Rt = R - 0.27;                                                  // pneu + frisos (0,34 cm) = raio efetivo exato de 2,8 cm
  g.add(cil(Rt, W, pneu, 'x', 0, 0, 0, 44));
  for (let i = 0; i < 24; i++) {                                        // frisos do pneu
    const a = (i / 24) * Math.PI * 2, b = caixa(W * 0.96, 0.34, 0.55, pneu);
    b.position.set(0, Math.cos(a) * (Rt + 0.1), Math.sin(a) * (Rt + 0.1)); b.rotation.x = a; g.add(b);
  }
  const jac = tema === 'jacare';
  g.add(cil(R * 0.66, W * 1.04, M(jac ? 0x2e7d32 : 0xeceded), 'x'));       // aro
  const fx = lado * (W / 2 + 0.07);
  g.add(cil(R * 0.44, 0.14, M(jac ? 0x1b5e20 : 0x4a4e52), 'x', fx));       // disco do cubo
  for (let i = 0; i < 5; i++) {                                           // raios (mostram a rotação)
    const a = (i / 5) * Math.PI * 2, s = caixa(0.12, R * 0.52, 0.34, M(jac ? 0x0d3b12 : 0x2a2d30));
    s.position.set(lado * (W / 2 + 0.16), Math.cos(a) * R * 0.3, Math.sin(a) * R * 0.3); s.rotation.x = a; g.add(s);
  }
  g.add(caixa(0.14, 0.5, 0.5, M(0xff7a00), lado * (W / 2 + 0.14), R * 0.5, 0.2));   // marcador laranja
  if (jac) {                                                              // PATA que gira: 5 garras
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.3, c = cone(0.3, 1.5, M(0xf0e2b6), 6);
      c.position.set(lado * (W / 2 + 0.4), Math.cos(a) * R * 0.5, Math.sin(a) * R * 0.5); c.rotation.x = a; g.add(c);
    }
    g.add(cil(0.5, 0.5, M(0x1b5e20), 'x', lado * (W / 2 + 0.3)));
  } else {
    g.add(cil(0.46, 0.4, M(0x1e2023), 'x', lado * (W / 2 + 0.25)));          // tampa do eixo
    g.add(caixa(0.12, 0.62, 0.14, M(0x000000), lado * (W / 2 + 0.47)));      // furo em cruz
    g.add(caixa(0.12, 0.14, 0.62, M(0x000000), lado * (W / 2 + 0.47)));
  }
  g.position.set(lado * SEMI_BITOLA, RAIO_RODA, 0);
  return g;
}
/** "olho" do sensor ultrassônico (face voltada pra +Z) */
function olhoUltra(r, x, y, z) {
  const g = new THREE.Group();
  g.add(cil(r, 0.5, M(0x16181a), 'z'));
  g.add(cil(r * 0.74, 0.54, M(0xc9ced2, { metalness: 0.5, roughness: 0.3 }), 'z', 0, 0, 0.02));
  g.add(cil(r * 0.3, 0.58, M(0x0c0d0e), 'z', 0, 0, 0.04));
  return posicionar(g, x, y, z);
}
/** sensor de cor virado pra baixo; origem no centro da caixa; a lente fica em y = -altura/2 */
function sensorCor(corCorpo) {
  const g = new THREE.Group();
  g.add(chanfrada(3.0, 2.4, 2.2, 0.3, M(corCorpo)));
  g.add(cil(0.72, 0.12, M(0x050505, { roughness: 0.15, metalness: 0.4 }), 'y', 0, -1.22, 0));                 // lente
  g.add(cil(0.2, 0.14, M(0xff2020, { emissive: 0xff1010, emissiveIntensity: 1.2 }), 'y', 0.95, -1.22, 0.1, 12)); // LED vermelho do emissor
  g.add(caixa(1.0, 0.5, 0.9, M(0x2a2d30), 0, 1.3, 0));                                                          // conector
  return g;
}
/** feixe do sensor de cor: cone translúcido + mancha no chão. Origem: ponto do chão sob a lente */
function criarFeixe(altura) {
  const grupo = new THREE.Group();
  const matCone = new THREE.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide });
  const cone3d = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.95, altura, 20, 1, true), matCone);
  cone3d.position.y = altura / 2;
  const matMancha = new THREE.MeshBasicMaterial({ color: 0xf0f0f0 });
  const mancha = new THREE.Mesh(new THREE.CircleGeometry(0.95, 28).rotateX(-Math.PI / 2), matMancha); mancha.position.y = 0.05;
  const matAnel = new THREE.MeshBasicMaterial({ color: 0xff3020, transparent: true, opacity: 0.55, depthWrite: false });
  const anel = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.2, 28).rotateX(-Math.PI / 2), matAnel); anel.position.y = 0.06;
  grupo.add(cone3d, mancha, anel);
  return { grupo, matCone, matMancha };
}

// =====================================================================
//  ROBÔ 1 — "Estilo LEGO EV3"
// =====================================================================
export function construirRoboEV3() {
  const root = new THREE.Group(); root.name = 'ev3';
  const cinzaClaro = M(0xe6e7e8), cinzaMed = M(0x9aa0a6), cinzaEsc = M(0x4b4f54), preto = M(0x1c1e20);

  const rodaB = construirRoda('ev3', +1), rodaC = construirRoda('ev3', -1);
  root.add(rodaB, rodaC);

  // motores grandes (embaixo do bloco) + eixos até as rodas
  for (const s of [+1, -1]) {
    root.add(chanfrada(4.6, 4.2, 8.8, 0.35, cinzaMed, s * 2.7, 2.95, -0.5));
    root.add(caixa(4.0, 0.4, 5.2, cinzaEsc, s * 2.7, 5.15, -0.5));                  // tampa superior escura
    root.add(cil(1.0, 0.5, cinzaEsc, 'x', s * 5.1, RAIO_RODA, 0));                    // flange do eixo
    root.add(cil(0.38, 1.4, M(0x222426), 'x', s * 5.6, RAIO_RODA, 0, 12));            // eixo
    root.add(caixa(1.2, 0.9, 0.9, preto, s * 2.7, 3.4, -5.1));                        // conector traseiro do motor
  }

  // bloco EV3
  const brick = new THREE.Group(); brick.name = 'bloco'; posicionar(brick, 0, 8.1, -1.0);
  brick.add(chanfrada(7.2, 6.2, 11.2, 0.4, cinzaClaro));
  brick.add(chanfrada(7.3, 1.5, 11.3, 0.35, M(0x6a6f74), 0, -2.35, 0));              // faixa cinza inferior
  const topo = 3.1;
  brick.add(caixa(5.4, 0.12, 3.7, preto, 0, topo + 0.02, 1.8));                       // moldura da tela
  const lcd = criarLCD();
  brick.add(planoLCD(4.6, 3.3, lcd, 0, topo + 0.1, 1.8));                             // tela
  brick.add(caixa(1.0, 0.26, 1.0, cinzaEsc, 0, topo + 0.08, -3.0));                   // botão central
  const setas = [[0, 1.2, 0], [0, -1.2, Math.PI], [1.2, 0, -Math.PI / 2], [-1.2, 0, Math.PI / 2]];   // [dx,dz,giro]
  for (const [dx, dz, rot] of setas) {
    brick.add(caixa(1.0, 0.24, 1.0, cinzaEsc, dx, topo + 0.07, -3.0 + dz));
    const seta = cone(0.3, 0.14, M(0xd0d3d6), 3, dx, topo + 0.24, -3.0 + dz); seta.rotation.y = rot; brick.add(seta);   // setinha em relevo
  }
  brick.add(caixa(1.1, 0.24, 0.8, M(0x7a7f84), 2.4, topo + 0.07, -1.7));              // botão "voltar"
  const ledMat = new THREE.MeshStandardMaterial({ color: 0x1a1d1f, emissive: 0x000000, emissiveIntensity: 1.5, roughness: 0.3 });
  for (const [x, z, w, d] of [[2.15, -3.0, 0.38, 2.9], [-2.15, -3.0, 0.38, 2.9], [0, -4.65, 3.2, 0.34]]) brick.add(caixa(w, 0.14, d, ledMat, x, topo + 0.05, z));  // LEDs em volta dos botões
  for (let i = 0; i < 4; i++) {                                                       // portas de entrada 1-4 (frente) e saída A-D (trás)
    brick.add(caixa(1.2, 0.9, 0.3, preto, -2.4 + i * 1.6, 0.6, 5.65));
    brick.add(caixa(1.2, 0.9, 0.3, preto, -2.4 + i * 1.6, 0.6, -5.65));
  }
  root.add(brick);

  // suporte frontal: vigas + sensores
  const vigaMat = M(0x2f3236);
  root.add(viga(3.4, vigaMat, 2.4, 4.2, 5.4), viga(3.4, vigaMat, -2.4, 4.2, 5.4));
  root.add(caixa(7.0, 0.8, 0.8, vigaMat, 0, 4.2, 6.9));
  const cor = sensorCor(0xe6e7e8); posicionar(cor, 0, 2.6, 5.5); root.add(cor);       // lente em y = 1.4 → o sim lê 5,5 cm à frente
  const ultra = new THREE.Group(); posicionar(ultra, 0, 6.2, 7.0);
  ultra.add(chanfrada(6.2, 3.0, 2.2, 0.3, M(0xeceded)));
  ultra.add(olhoUltra(1.15, 1.6, 0, 1.2), olhoUltra(1.15, -1.6, 0, 1.2));
  root.add(ultra);
  root.add(cabo([[0.6, 3.8, 5.5], [0.9, 5.2, 5.0], [0.8, 7.0, 4.7]]));                // cor → porta 3
  root.add(cabo([[0, 7.6, 6.0], [0.2, 8.4, 5.2], [-0.4, 8.7, 4.7]]));                 // ultrassônico → porta 4
  for (const s of [+1, -1]) root.add(cabo([[s * 2.7, 3.4, -5.4], [s * 2.5, 3.0, -6.4], [s * 1.2, 7.0, -6.4], [s * 0.8, 8.2, -6.7]]));   // motores → portas B/C

  // roda boba traseira
  root.add(caixa(3.0, 0.8, 2.3, cinzaEsc, 0, 3.7, -5.9));
  root.add(cil(1.0, 0.9, preto, 'y', 0, 2.95, -6.2));
  const bola = pronto(new THREE.Mesh(new THREE.SphereGeometry(1.25, 20, 14), M(0xd7d9db, { metalness: 0.6, roughness: 0.25 })));
  posicionar(bola, 0, 1.25, -6.2); root.add(bola);

  const feixe = criarFeixe(1.4); posicionar(feixe.grupo, 0, 0, 5.5); root.add(feixe.grupo);
  return { nome: 'ev3', grupo: root, rodaB, rodaC, leds: [ledMat], feixe, lcd, animar(est) { if (lcd) lcd.desenhar(est); } };
}

// =====================================================================
//  ROBÔ 2 — "Jacaré Robótico"
// =====================================================================
export function construirRoboJacare() {
  const root = new THREE.Group(); root.name = 'jacare';
  const verde = M(0x2f8a37, { roughness: 0.6 }), verdeEsc = M(0x1b5e20), verdeClaro = M(0x9ccc65), barriga = M(0xd9e8a6);
  const dente = M(0xfffdf0, { roughness: 0.4 }), garra = M(0xf0e2b6), cinzaEsc = M(0x3b3f43), preto = M(0x111111);

  const rodaB = construirRoda('jacare', +1), rodaC = construirRoda('jacare', -1);
  root.add(rodaB, rodaC);

  // chassi
  root.add(chanfrada(8.6, 4.4, 11.5, 0.9, verde, 0, 4.6, -0.5));
  root.add(chanfrada(7.0, 1.2, 10.4, 0.4, barriga, 0, 2.55, -0.5));
  for (let z = -5.4; z <= 4.0; z += 1.0) for (const x of [-3.6, 3.6]) root.add(cone(0.42, 0.95, verdeEsc, 4, x, 7.1, z));      // escamas laterais
  for (let z = 1.6; z <= 4.2; z += 1.0) root.add(cone(0.42, 0.95, verdeEsc, 4, 0, 7.1, z));                                     // escamas centrais
  // painel dorsal: LCD + LEDs
  root.add(chanfrada(5.4, 0.5, 5.2, 0.15, cinzaEsc, 0, 7.0, -1.9));
  const lcd = criarLCD(); root.add(planoLCD(3.0, 2.1, lcd, 0, 7.31, -1.0));
  const ledMat = new THREE.MeshStandardMaterial({ color: 0x1a1d1f, emissive: 0x000000, emissiveIntensity: 1.5, roughness: 0.3 });
  root.add(caixa(1.3, 0.14, 0.45, ledMat, -1.8, 7.3, -3.7), caixa(1.3, 0.14, 0.45, ledMat, 1.8, 7.3, -3.7));
  // "coxas" ligando o chassi aos eixos das rodas
  for (const s of [+1, -1]) {
    root.add(chanfrada(0.9, 3.4, 3.6, 0.3, verdeEsc, s * 4.65, 4.2, 0));
    root.add(cil(0.5, 1.6, M(0x222426), 'x', s * 5.4, RAIO_RODA, 0, 12));
  }
  // patas decorativas (fixas): 2 por lado
  for (const s of [+1, -1]) for (const z of [4.1, -4.3]) {
    const pata = new THREE.Group(); posicionar(pata, s * 4.0, 3.9, z);
    const sup = chanfrada(2.6, 1.1, 1.5, 0.3, verde, s * 1.2, -0.1, 0); sup.rotation.z = -s * 0.35; pata.add(sup);
    pata.add(chanfrada(1.9, 0.5, 2.0, 0.2, verdeEsc, s * 2.7, -1.2, 0.2));
    for (const dx of [-0.6, 0, 0.6]) pata.add(cone(0.2, 0.9, garra, 6, s * 2.7 + dx, -1.2, 1.5, Math.PI / 2));
    root.add(pata);
  }

  // cabeça articulada
  const cabeca = new THREE.Group(); cabeca.name = 'cabeca'; posicionar(cabeca, 0, 5.3, 4.2);
  cabeca.add(chanfrada(5.4, 2.6, 3.4, 0.5, verde, 0, 0.2, 1.4));                       // crânio
  cabeca.add(chanfrada(4.4, 1.5, 2.4, 0.4, verde, 0, -0.1, 3.9));                      // focinho
  for (const s of [-1, 1]) {
    cabeca.add(cil(0.14, 0.2, preto, 'y', s * 0.9, 0.66, 4.9, 10));                    // narinas
    const olho = olhoUltra(0.95, s * 1.5, 1.7, 2.2); olho.name = 'olho_ultrassonico'; cabeca.add(olho);   // OLHOS = sensor ultrassônico
    const palpebra = pronto(new THREE.Mesh(new THREE.SphereGeometry(1.08, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), verdeEsc));
    posicionar(palpebra, s * 1.5, 1.85, 1.65); cabeca.add(palpebra);
    cabeca.add(chanfrada(1.5, 0.35, 0.8, 0.12, verdeEsc, s * 1.5, 1.55, 3.0));        // sobrancelha
  }
  for (let i = 0; i < 5; i++) for (const s of [-1, 1]) {                               // dentes de cima (pontas pra baixo)
    const d = cone(0.16, 0.45, dente, 4, s * 2.0, -1.0, 2.9 + i * 0.5); d.rotation.z = Math.PI; cabeca.add(d);
  }
  const mandibula = new THREE.Group(); mandibula.name = 'mandibula'; posicionar(mandibula, 0, -0.8, 0.3);
  mandibula.add(chanfrada(4.0, 0.8, 4.4, 0.3, verdeClaro, 0, -0.45, 2.3));
  for (let i = 0; i < 6; i++) for (const s of [-1, 1]) mandibula.add(cone(0.15, 0.4, dente, 4, s * 1.75, 0.15, 1.0 + i * 0.6));   // dentes de baixo
  cabeca.add(mandibula);
  root.add(cabeca);

  // sensor de cor = "língua" vermelha pendurada sob o queixo
  const lingua = sensorCor(0xd8392b); posicionar(lingua, 0, 2.6, 5.5); root.add(lingua);
  root.add(caixa(2.2, 0.5, 1.0, verdeEsc, 0, 3.95, 5.0));

  // cauda articulada (5 segmentos em cadeia)
  const larg = [4.4, 3.6, 2.9, 2.2, 1.5], alt = [3.4, 2.8, 2.3, 1.8, 1.4], comp = [1.9, 1.8, 1.7, 1.5, 1.3];
  const caudaRaiz = new THREE.Group(); caudaRaiz.name = 'cauda'; posicionar(caudaRaiz, 0, 4.3, -6.0); root.add(caudaRaiz);
  const cauda = []; let pai = caudaRaiz;
  for (let i = 0; i < 5; i++) {
    const seg = new THREE.Group(); seg.position.z = i === 0 ? 0 : -comp[i - 1];
    seg.add(chanfrada(larg[i], alt[i], comp[i], 0.3, i % 2 ? verdeEsc : verde, 0, 0, -comp[i] / 2));
    seg.add(cone(0.36, 0.8, verdeEsc, 4, 0, alt[i] / 2 + 0.25, -comp[i] / 2));
    pai.add(seg); cauda.push(seg); pai = seg;
  }
  // apoio traseiro (esfera)
  root.add(cil(0.45, 1.3, cinzaEsc, 'y', 0, 2.4, -4.2, 12));
  const bola = pronto(new THREE.Mesh(new THREE.SphereGeometry(1.2, 18, 12), M(0xd7d9db, { metalness: 0.6, roughness: 0.25 })));
  posicionar(bola, 0, 1.2, -4.2); root.add(bola);

  const feixe = criarFeixe(1.4); posicionar(feixe.grupo, 0, 0, 5.5); root.add(feixe.grupo);

  // animação: cauda balança com o deslocamento, mandíbula abre no bip, cabeça balança de leve
  let tAnt = null, encAnt = null, fase = 0, amp = 0, abre = 0;
  function animar(est) {
    if (lcd) lcd.desenhar(est);
    let dist = 0, dt = 0;
    if (tAnt !== null) { dt = est.t - tAnt; if (dt > 0 && dt < 0.25) dist = (Math.abs(est.encB - encAnt[0]) + Math.abs(est.encC - encAnt[1])) / 2 * CM_POR_GRAU; else dt = 0; }
    tAnt = est.t; encAnt = [est.encB, est.encC];
    const vel = dt > 0 ? dist / dt : 0;
    amp += ((Math.min(vel / 25, 1) * 0.38) - amp) * Math.min(1, (dt || 0.05) * 8);
    fase += dist * 0.9;
    cauda.forEach((s, i) => { s.rotation.y = amp * Math.sin(fase - i * 0.8) * (0.7 + 0.15 * i); });
    abre += ((est.bip ? 0.42 : 0) - abre) * Math.min(1, (dt || 0.05) * 14);
    mandibula.rotation.x = abre;
    cabeca.rotation.x = 0.03 * Math.sin(fase * 2) - abre * 0.25;
  }
  return { nome: 'jacare', grupo: root, rodaB, rodaC, leds: [ledMat], feixe, lcd, partes: { cabeca, mandibula, cauda }, animar };
}

// =====================================================================
//  Aplica o estado de UM instante do playback no rig
//  est = { x, y, th, t, encA..encD, led, ledAlpha, refletida, bip }
// =====================================================================
export function aplicarEstado(rig, est) {
  rig.grupo.position.set(est.x, est.z || 0, est.y);             // sim (x,y) → mundo (X,Z); z = altura do terreno (rampa)
  rig.grupo.rotation.order = 'YXZ';                             // 1º rumo (Y), depois inclinação e rolagem nos eixos do próprio robô
  rig.grupo.rotation.set(-(est.pitch || 0), Math.PI / 2 - est.th, est.roll || 0);   // +Z local → (cosθ, 0, sinθ); pitch>0 = nariz pra cima; roll>0 = lado esquerdo mais alto
  rig.rodaB.rotation.x = est.encB * DEG;                        // encoder REAL do sim.js
  rig.rodaC.rotation.x = est.encC * DEG;
  const base = String(est.led || 'DESLIGADO').split('_')[0];
  const cor = COR_LED[base] ?? 0, a = est.ledAlpha ?? 1;
  for (const m of rig.leds) {
    m.emissive.setHex(cor); m.emissiveIntensity = 1.8 * a;
    m.color.setHex(cor ? cor : 0x1a1d1f);
  }
  const k = Math.max(0, Math.min(1, (est.refletida - 5) / 65));   // 0 = linha preta, 1 = fundo branco
  rig.feixe.matMancha.color.setRGB(0.08 + 0.87 * k, 0.08 + 0.87 * k, 0.08 + 0.87 * k);   // cor da superfície lida
  rig.feixe.matCone.color.setRGB(1, 0.16 + 0.2 * k, 0.1 + 0.15 * k);
  rig.feixe.matCone.opacity = 0.22 + 0.4 * k;
  if (rig.animar) rig.animar(est);
}
