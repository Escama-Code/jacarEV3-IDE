// ============================================================
// coruja.mjs — modelo 3D: Coruja (Robô EV3)
// ============================================================
import * as THREE from 'three';
import {
  M, pronto, posicionar, caixa, cil, chanfrada, cone,
  criarLCD, planoLCD, construirRoda, olhoUltra, sensorCor, criarFeixe,
  CM_POR_GRAU, RAIO_RODA,
} from './helpers.mjs';

export function construirRoboCoruja() {
  const root = new THREE.Group(); root.name = 'coruja';
  const marromPena = M(0x6e2c00, { roughness: 0.7 });
  const begePeito = M(0xedbb99, { roughness: 0.6 });
  const amareloBico = M(0xf39c12, { roughness: 0.4 });
  const cinzaEsc = M(0x3b3f43);

  const rodaB = construirRoda('coruja', +1), rodaC = construirRoda('coruja', -1);
  root.add(rodaB, rodaC);

  // Corpo Vertical e Compacto
  root.add(chanfrada(7.6, 6.8, 7.8, 0.8, marromPena, 0, 5.6, -0.4));
  root.add(chanfrada(5.8, 4.8, 1.2, 0.4, begePeito, 0, 5.2, 3.4)); // Peito fofo

  // Display LCD no Peitoral
  root.add(chanfrada(4.4, 0.4, 3.6, 0.15, cinzaEsc, 0, 5.5, 3.8));
  const lcd = criarLCD(); root.add(planoLCD(2.6, 1.8, lcd, 0, 5.5, 4.05));
  const ledMat = new THREE.MeshStandardMaterial({ color: 0x1a1d1f, emissive: 0x000000, emissiveIntensity: 1.5 });
  root.add(caixa(1.0, 0.14, 0.4, ledMat, -1.4, 7.4, 3.2), caixa(1.0, 0.14, 0.4, ledMat, 1.4, 7.4, 3.2));

  // Asas Laterais Dobradas
  const asas = [];
  for (const s of [+1, -1]) {
    const asa = new THREE.Group(); posicionar(asa, s * 4.0, 5.6, -0.2);
    asa.add(chanfrada(0.8, 5.2, 4.2, 0.3, marromPena, s * 0.4, 0, 0));
    root.add(asa); asas.push({ asa, s });
  }

  // Cabeça Articulada (Gira até 180°)
  const cabeca = new THREE.Group(); posicionar(cabeca, 0, 9.2, -0.2);
  cabeca.add(chanfrada(6.2, 3.2, 5.2, 0.6, marromPena, 0, 0.8, 0));

  // Olhos Ultrassônicos Redondos e Salientes
  for (const s of [-1, 1]) {
    const olho = olhoUltra(1.0, s * 1.8, 0.8, 2.4);
    cabeca.add(olho);
  }
  // Bico de Cone
  cabeca.add(cone(0.4, 1.0, amareloBico, 4, 0, 0.2, 2.8, Math.PI / 2));
  root.add(cabeca);

  // Apoio Traseiro e Feixe
  root.add(cil(0.45, 1.3, cinzaEsc, 'y', 0, 2.2, -3.8, 12));
  const bola = pronto(new THREE.Mesh(new THREE.SphereGeometry(1.2, 18, 12), M(0xd7d9db, { metalness: 0.6 })));
  posicionar(bola, 0, 1.0, -3.8); root.add(bola);
  const sensorGrounded = sensorCor(0xd35400); posicionar(sensorGrounded, 0, 2.2, 3.6); root.add(sensorGrounded);
  const feixe = criarFeixe(1.4); posicionar(feixe.grupo, 0, 0, 4.2); root.add(feixe.grupo);

  let tAnt = null, encAnt = null, fase = 0, amp = 0, susto = 0;
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

    susto += ((est.bip ? 0.4 : 0) - susto) * Math.min(1, (dt || 0.05) * 14);

    // Rotação de cabeça estilizada da coruja
    cabeca.rotation.y = Math.sin(est.t * 0.8) * 0.8 + susto * 1.2;

    // Asas se abrem levemente no bip
    asas.forEach(a => { a.asa.rotation.z = a.s * (susto * 0.4); });
  }

  return { nome: 'coruja', grupo: root, rodaB, rodaC, leds: [ledMat], feixe, lcd, partes: { cabeca, asas }, animar };
}