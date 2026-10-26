// ============================================================
// elefante.mjs — modelo 3D: Elefante (Robô EV3)
// ============================================================
import * as THREE from 'three';
import {
  M, pronto, posicionar, caixa, cil, chanfrada, cone,
  criarLCD, planoLCD, construirRoda, olhoUltra, sensorCor, criarFeixe,
  CM_POR_GRAU, RAIO_RODA,
} from './helpers.mjs';

export function construirRoboElefante() {
  const root = new THREE.Group(); root.name = 'elefante';
  const cinzaElefante = M(0x7f8c8d, { roughness: 0.6 });
  const cinzaEscuro = M(0x34495e, { roughness: 0.7 });
  const marfim = M(0xfffdf0, { roughness: 0.3 });
  const cinzaEsc = M(0x3b3f43);

  const rodaB = construirRoda('elefante', +1), rodaC = construirRoda('elefante', -1);
  root.add(rodaB, rodaC);

  // Corpo Robusto e Alto
  root.add(chanfrada(9.2, 5.8, 11.0, 0.9, cinzaElefante, 0, 5.2, -0.2));

  // Display LCD no Dorso
  root.add(chanfrada(5.2, 0.4, 5.0, 0.15, cinzaEsc, 0, 8.2, -0.4));
  const lcd = criarLCD(); root.add(planoLCD(2.8, 1.9, lcd, 0, 8.45, 0.2));
  const ledMat = new THREE.MeshStandardMaterial({ color: 0x1a1d1f, emissive: 0x000000, emissiveIntensity: 1.5 });
  root.add(caixa(1.2, 0.14, 0.4, ledMat, -1.6, 8.4, -1.8), caixa(1.2, 0.14, 0.4, ledMat, 1.6, 8.4, -1.8));

  // Patas Grossas em Forma de Colunas
  for (const s of [+1, -1]) for (const z of [3.6, -4.0]) {
    root.add(chanfrada(2.2, 3.2, 2.2, 0.3, cinzaEscuro, s * 4.2, 2.8, z));
  }

  // Cabeça com Orelhas Grandes
  const cabeca = new THREE.Group(); posicionar(cabeca, 0, 6.4, 4.4);
  cabeca.add(chanfrada(5.2, 3.8, 3.6, 0.5, cinzaElefante, 0, 0.4, 1.2));

  // Olhos Ultrassônicos
  for (const s of [-1, 1]) {
    const olho = olhoUltra(0.85, s * 2.0, 1.0, 2.2);
    cabeca.add(olho);
  }

  // Orelhas Grandes em Placas
  const orelhas = [];
  for (const s of [+1, -1]) {
    const orelha = new THREE.Group(); posicionar(orelha, s * 2.8, 0.8, 0.8);
    orelha.add(chanfrada(0.5, 4.2, 3.2, 0.3, cinzaEscuro, s * 1.2, 0, -0.4));
    cabeca.add(orelha); orelhas.push({ orelha, s });
  }

  // Presas de Marfim
  for (const s of [-1, 1]) {
    const presa = cone(0.3, 1.6, marfim, 4, s * 1.4, -0.8, 2.6, Math.PI / 3);
    cabeca.add(presa);
  }

  // Tromba Articulada em Cadeia (4 segmentos)
  const trombaSegs = [];
  const trombaBase = new THREE.Group(); posicionar(trombaBase, 0, -0.2, 2.8); cabeca.add(trombaBase);
  let pai = trombaBase;
  for (let i = 0; i < 4; i++) {
    const seg = new THREE.Group(); seg.position.z = i === 0 ? 0 : 1.2;
    seg.add(chanfrada(1.4 - i * 0.2, 1.2 - i * 0.2, 1.4, 0.2, cinzaElefante, 0, -i * 0.2, 0.6));
    pai.add(seg); trombaSegs.push(seg); pai = seg;
  }
  root.add(cabeca);

  // Apoio Traseiro e Feixe
  root.add(cil(0.45, 1.3, cinzaEsc, 'y', 0, 2.2, -3.8, 12));
  const bola = pronto(new THREE.Mesh(new THREE.SphereGeometry(1.2, 18, 12), M(0xd7d9db, { metalness: 0.6 })));
  posicionar(bola, 0, 1.0, -3.8); root.add(bola);
  const sensorGrounded = sensorCor(0x27ae60); posicionar(sensorGrounded, 0, 2.2, 5.2); root.add(sensorGrounded);
  const feixe = criarFeixe(1.4); posicionar(feixe.grupo, 0, 0, 5.6); root.add(feixe.grupo);

  let tAnt = null, encAnt = null, fase = 0, amp = 0, trombeta = 0;
  function animar(est) {
    if (lcd) lcd.desenhar(est);
    let dist = 0, dt = 0;
    if (tAnt !== null) {
      dt = est.t - tAnt;
      if (dt > 0 && dt < 0.25) dist = (Math.abs(est.encB - encAnt[0]) + Math.abs(est.encC - encAnt[1])) / 2 * CM_POR_GRAU;
    }
    tAnt = est.t; encAnt = [est.encB, est.encC];
    const vel = dt > 0 ? dist / dt : 0;
    amp += ((Math.min(vel / 20, 1) * 0.3) - amp) * Math.min(1, (dt || 0.05) * 8);
    fase += dist * 0.8;

    trombeta += ((est.bip ? 0.6 : 0) - trombeta) * Math.min(1, (dt || 0.05) * 14);

    // Elevação da tromba no Bip / Movimento ao andar
    trombaSegs.forEach((seg, i) => {
      seg.rotation.x = -0.15 - trombeta * 0.3 + Math.sin(fase + i * 0.5) * amp * 0.1;
    });

    // Orelhas abanam suavemente
    orelhas.forEach(o => { o.orelha.rotation.y = o.s * (Math.sin(est.t * 2.0) * 0.15 + trombeta * 0.3); });
  }

  return { nome: 'elefante', grupo: root, rodaB, rodaC, leds: [ledMat], feixe, lcd, partes: { cabeca, orelhas, trombaSegs }, animar };
}