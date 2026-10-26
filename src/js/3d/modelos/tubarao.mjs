// ============================================================
// tubarao.mjs — modelo 3D: Tubarão (Robô EV3)
// ============================================================
import * as THREE from 'three';
import {
  M, pronto, posicionar, caixa, cil, chanfrada, cone,
  criarLCD, planoLCD, construirRoda, olhoUltra, sensorCor, criarFeixe,
  CM_POR_GRAU, RAIO_RODA,
} from './helpers.mjs';

export function construirRoboTubarao() {
  const root = new THREE.Group(); root.name = 'tubarao';
  const cinzaAzulado = M(0x4a6572, { roughness: 0.5 });
  const cinzaEsc = M(0x232f34, { roughness: 0.6 });
  const barriga = M(0xe0e6ed, { roughness: 0.4 });
  const vermelhoBoca = M(0x900c3f);
  const dente = M(0xfffdf0, { roughness: 0.3 });

  const rodaB = construirRoda('tubarao', +1), rodaC = construirRoda('tubarao', -1);
  root.add(rodaB, rodaC);

  // Corpo / Chassi Hidrodinâmico
  root.add(chanfrada(8.2, 5.2, 11.8, 0.9, cinzaAzulado, 0, 4.8, -0.2));
  root.add(chanfrada(6.8, 1.4, 10.2, 0.4, barriga, 0, 2.5, -0.2));

  // Barbatana Dorsal no Topo
  const barbatana = new THREE.Group();
  posicionar(barbatana, 0, 7.8, -1.0);
  barbatana.add(chanfrada(1.2, 3.4, 2.8, 0.3, cinzaEsc, 0, 1.2, 0));
  barbatana.rotation.x = -0.35;
  root.add(barbatana);

  // Barbatanas Peitorais Laterais
  for (const s of [+1, -1]) {
    const peitoral = new THREE.Group();
    posicionar(peitoral, s * 4.3, 4.2, 1.5);
    const aba = chanfrada(3.2, 0.5, 2.2, 0.2, cinzaEsc, s * 1.4, 0, -0.2);
    aba.rotation.z = -s * 0.3;
    aba.rotation.y = s * 0.25;
    peitoral.add(aba);
    root.add(peitoral);
  }

  // Painel Dorsal: LCD + LEDs
  root.add(chanfrada(4.8, 0.4, 4.8, 0.15, M(0x3b3f43), 0, 7.5, -0.2));
  const lcd = criarLCD(); root.add(planoLCD(2.8, 1.9, lcd, 0, 7.75, 0.4));
  const ledMat = new THREE.MeshStandardMaterial({ color: 0x1a1d1f, emissive: 0x000000, emissiveIntensity: 1.5 });
  root.add(caixa(1.2, 0.14, 0.4, ledMat, -1.6, 7.7, -1.8), caixa(1.2, 0.14, 0.4, ledMat, 1.6, 7.7, -1.8));

  // Cabeça e Boca Articulada
  const cabeca = new THREE.Group(); posicionar(cabeca, 0, 5.2, 4.2);
  cabeca.add(chanfrada(5.6, 2.8, 4.0, 0.5, cinzaAzulado, 0, 0.4, 1.6)); // Crânio
  cabeca.add(chanfrada(4.8, 1.6, 2.6, 0.4, cinzaAzulado, 0, 0.6, 3.8)); // Focinho elevado

  // Olhos Ultrassônicos nas laterais
  for (const s of [-1, 1]) {
    const olho = olhoUltra(0.85, s * 2.2, 0.4, 2.0);
    olho.rotation.y = s * 0.4;
    cabeca.add(olho);
  }

  // Mandíbula inferior (Boca que abre no Bip)
  const mandibula = new THREE.Group(); posicionar(mandibula, 0, -0.6, 0.8);
  mandibula.add(chanfrada(4.4, 0.8, 3.8, 0.3, vermelhoBoca, 0, -0.3, 1.8));
  for (let i = 0; i < 5; i++) for (const s of [-1, 1]) {
    mandibula.add(cone(0.15, 0.45, dente, 4, s * 1.8, 0.2, 0.8 + i * 0.6));
  }
  cabeca.add(mandibula); root.add(cabeca);

  // Cauda Articulada (4 segmentos)
  const caudaRaiz = new THREE.Group(); posicionar(caudaRaiz, 0, 4.8, -6.0); root.add(caudaRaiz);
  const cauda = []; let pai = caudaRaiz;
  const larg = [3.8, 2.8, 1.8, 1.0], comp = [2.0, 1.8, 1.6, 1.4];
  for (let i = 0; i < 4; i++) {
    const seg = new THREE.Group(); seg.position.z = i === 0 ? 0 : -comp[i - 1];
    seg.add(chanfrada(larg[i], 3.0 - i * 0.4, comp[i], 0.25, i % 2 ? cinzaEsc : cinzaAzulado, 0, 0, -comp[i] / 2));
    pai.add(seg); cauda.push(seg); pai = seg;
  }
  // Nadadeira Caudal Vertical
  pai.add(chanfrada(0.5, 4.2, 2.2, 0.2, cinzaEsc, 0, 0, -2.2));

  // Apoio Traseiro e Feixe
  root.add(cil(0.45, 1.3, M(0x3b3f43), 'y', 0, 2.4, -4.2, 12));
  const bola = pronto(new THREE.Mesh(new THREE.SphereGeometry(1.2, 18, 12), M(0xd7d9db, { metalness: 0.6, roughness: 0.25 })));
  posicionar(bola, 0, 1.2, -4.2); root.add(bola);
  const sensorGrounded = sensorCor(0x28a745); posicionar(sensorGrounded, 0, 2.2, 5.0); root.add(sensorGrounded);
  const feixe = criarFeixe(1.4); posicionar(feixe.grupo, 0, 0, 5.5); root.add(feixe.grupo);

  let tAnt = null, encAnt = null, fase = 0, amp = 0, mordida = 0;
  function animar(est) {
    if (lcd) lcd.desenhar(est);
    let dist = 0, dt = 0;
    if (tAnt !== null) {
      dt = est.t - tAnt;
      if (dt > 0 && dt < 0.25) dist = (Math.abs(est.encB - encAnt[0]) + Math.abs(est.encC - encAnt[1])) / 2 * CM_POR_GRAU;
    }
    tAnt = est.t; encAnt = [est.encB, est.encC];
    const vel = dt > 0 ? dist / dt : 0;
    amp += ((Math.min(vel / 20, 1) * 0.4) - amp) * Math.min(1, (dt || 0.05) * 8);
    fase += dist * 0.9;

    cauda.forEach((s, i) => { s.rotation.y = amp * Math.sin(fase - i * 0.7); });
    mordida += ((est.bip ? 0.5 : 0) - mordida) * Math.min(1, (dt || 0.05) * 14);
    mandibula.rotation.x = mordida;
    cabeca.rotation.y = Math.sin(fase * 0.5) * amp * 0.2;
  }

  return { nome: 'tubarao', grupo: root, rodaB, rodaC, leds: [ledMat], feixe, lcd, partes: { cabeca, mandibula, cauda }, animar };
}