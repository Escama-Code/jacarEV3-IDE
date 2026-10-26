// ============================================================
// jacare.mjs — modelo 3D: Jacaré
// Cada construtor devolve um "rig":
//   { grupo, rodaB, rodaC, leds, feixe, animar?, lcd?, partes? }
// ============================================================
import * as THREE from 'three';
import {
  M, pronto, posicionar, caixa, cil, chanfrada, cone, cabo, viga,
  criarLCD, planoLCD, construirRoda, olhoUltra, sensorCor, criarFeixe,
  DEG, CM_POR_GRAU, RAIO_RODA, LARG_RODA, SEMI_BITOLA, COR_LED,
} from './helpers.mjs';

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
