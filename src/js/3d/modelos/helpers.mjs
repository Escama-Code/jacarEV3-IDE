// ============================================================
// helpers.mjs — utilitários compartilhados pelos modelos 3D
// Convenção: 1 unidade = 1 cm · Y pra cima · robô olha para +Z
// origem = centro do eixo das rodas, no chão
//   roda esquerda (porta B) em x = +6 · roda direita (porta C) em x = -6
// ============================================================
import * as THREE from 'three';

export const DEG = Math.PI / 180;
export const CM_POR_GRAU = Math.PI * 5.6 / 360;         // igual ao sim.js (roda de 5,6 cm)
export const RAIO_RODA = 2.8;
export const LARG_RODA = 2.2;
export const SEMI_BITOLA = 6;
export const COR_LED = { VERDE: 0x22ff44, VERMELHO: 0xff2a1a, AMBAR: 0xffa000, DESLIGADO: 0x000000 };

// ---------- helpers de geometria ----------
export const M = (cor, o = {}) => new THREE.MeshStandardMaterial({ color: cor, roughness: 0.55, metalness: 0.04, ...o });
export const pronto = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };
export const posicionar = (o, x = 0, y = 0, z = 0) => { o.position.set(x, y, z); return o; };
export const caixa = (w, h, d, mat, x = 0, y = 0, z = 0) => posicionar(pronto(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)), x, y, z);

/** cilindro com eixo em 'x' | 'y' | 'z' */
export function cil(r, h, mat, eixo = 'y', x = 0, y = 0, z = 0, seg = 28) {
  const g = new THREE.CylinderGeometry(r, r, h, seg);
  if (eixo === 'x') g.rotateZ(Math.PI / 2); else if (eixo === 'z') g.rotateX(Math.PI / 2);
  return posicionar(pronto(new THREE.Mesh(g, mat)), x, y, z);
}

/** caixa com bordas chanfradas (ExtrudeGeometry com bevel); dimensões finais = w × h × d */
export function chanfrada(w, h, d, b, mat, x = 0, y = 0, z = 0) {
  const sh = new THREE.Shape(), a = (w - 2 * b) / 2, c = (h - 2 * b) / 2;
  sh.moveTo(-a, -c); sh.lineTo(a, -c); sh.lineTo(a, c); sh.lineTo(-a, c); sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: Math.max(0.001, d - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 2 });
  g.center();
  return posicionar(pronto(new THREE.Mesh(g, mat)), x, y, z);
}

/** cone/pirâmide com a ponta pra +Y (rotação opcional da geometria) */
export function cone(r, h, mat, seg = 4, x = 0, y = 0, z = 0, rotX = 0) {
  const g = new THREE.ConeGeometry(r, h, seg); if (rotX) g.rotateX(rotX);
  return posicionar(pronto(new THREE.Mesh(g, mat)), x, y, z);
}

export const cabo = (pontos, cor = 0x15171a, r = 0.13) => pronto(new THREE.Mesh(
  new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pontos.map((p) => new THREE.Vector3(...p))), 24, r, 6, false), M(cor, { roughness: 0.8 })));

/** viga/liftarm Lego Technic com furos, ao longo de Z */
export function viga(comp, mat, x, y, z) {
  const g = new THREE.Group(); g.add(caixa(0.8, 0.8, comp, mat));
  const furo = M(0x111111);
  for (let i = 0; i < Math.floor(comp / 1.0); i++) g.add(cil(0.22, 0.86, furo, 'x', 0, 0, -comp / 2 + 0.5 + i * 1.0, 12));
  return posicionar(g, x, y, z);
}

// ---------- LCD (canvas) — só no navegador; em Node devolve null ----------
export function criarLCD() {
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

/** plano do LCD deitado, com o "topo" do texto apontando pra +Z */
export function planoLCD(w, h, lcd, x, y, z) {
  const g = new THREE.PlaneGeometry(w, h); g.rotateX(-Math.PI / 2); g.rotateY(Math.PI);
  return posicionar(new THREE.Mesh(g, materialLCD(lcd)), x, y, z);
}

// ---------- peças compartilhadas ----------
/** Roda FUNCIONAL: eixo ao longo de X (gira em rotation.x). tema: 'ev3' | 'jacare'. lado: +1 esq (B), -1 dir (C) */
export function construirRoda(tema, lado) {
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
export function olhoUltra(r, x, y, z) {
  const g = new THREE.Group();
  g.add(cil(r, 0.5, M(0x16181a), 'z'));
  g.add(cil(r * 0.74, 0.54, M(0xc9ced2, { metalness: 0.5, roughness: 0.3 }), 'z', 0, 0, 0.02));
  g.add(cil(r * 0.3, 0.58, M(0x0c0d0e), 'z', 0, 0, 0.04));
  return posicionar(g, x, y, z);
}
/** sensor de cor virado pra baixo; origem no centro da caixa; a lente fica em y = -altura/2 */
export function sensorCor(corCorpo) {
  const g = new THREE.Group();
  g.add(chanfrada(3.0, 2.4, 2.2, 0.3, M(corCorpo)));
  g.add(cil(0.72, 0.12, M(0x050505, { roughness: 0.15, metalness: 0.4 }), 'y', 0, -1.22, 0));                 // lente
  g.add(cil(0.2, 0.14, M(0xff2020, { emissive: 0xff1010, emissiveIntensity: 1.2 }), 'y', 0.95, -1.22, 0.1, 12)); // LED vermelho do emissor
  g.add(caixa(1.0, 0.5, 0.9, M(0x2a2d30), 0, 1.3, 0));                                                          // conector
  return g;
}
/** feixe do sensor de cor: cone translúcido + mancha no chão. Origem: ponto do chão sob a lente */
export function criarFeixe(altura) {
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

