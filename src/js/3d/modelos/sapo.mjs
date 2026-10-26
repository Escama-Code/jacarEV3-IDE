// ============================================================
// sapo.mjs — modelo 3D: Sapo / Rã (Robô EV3)
// ============================================================
import * as THREE from 'three';
import {
  M, pronto, posicionar, caixa, cil, chanfrada, cone,
  criarLCD, planoLCD, construirRoda, olhoUltra, sensorCor, criarFeixe,
  CM_POR_GRAU, RAIO_RODA,
} from './_helpers.mjs';

export function construirRoboSapo() {
  const root = new THREE.Group(); root.name = 'sapo';
  const verdeSapo = M(0x27ae60, { roughness: 0.6 });
  const verdeMusgo = M(0x1e8449, { roughness: 0.7 });
  const amareloBarriga = M(0xf4d03f, { roughness: 0.5 });
  const cinzaEsc = M(0x3b3f43);

  const rodaB = construirRoda('sapo', +1), rodaC = construirRoda('sapo', -1);
  root.add(rodaB, rodaC);

  // Corpo Curto, Largo e Atarracado
  root.add(chanfrada(9.6, 4.6, 9.0, 0.8, verdeSapo, 0, 4.4, -0.2));
  root.add(chanfrada(8.0, 1.2, 8.0, 0.4, amareloBarriga, 0, 2.4, -0.2));

  // Display LCD Dorsal
  root.add(chanfrada(5.2, 0.4, 4.8, 0.15, cinzaEsc, 0, 6.9, -0.4));
  const lcd = criarLCD(); root.add(planoLCD(2.8, 1.9, lcd, 0, 7.15, 0.2));
  const ledMat = new THREE.MeshStandardMaterial({ color: 0x1a1d1f, emissive: 0x000000, emissiveIntensity: 1.5 });
  root.add(caixa(1.0, 0.14, 0.4, ledMat, -1.6, 7.1, -1.8), caixa(1.0, 0.14, 0.4, ledMat, 1.6, 7.1, -1.8));

  // Patas Traseiras Dobradas em Ângulo "Z"
  for (const s of [+1, -1]) {
    const pataT = new THREE.Group(); posicionar(pataT, s * 4.8, 3.6, -3.2);
    const coxa = chanfrada(1.2, 3.8, 1.8, 0.3, verdeMusgo, s * 0.6, 0.2, 0); coxa.rotation.z = -s * 0.5;
    const canela = chanfrada(1.0, 3.2, 1.4, 0.2, verdeSapo, s * 1.2, -1.0, 1.2); canela.rotation.x = 0.6;
    pataT.add(coxa, canela); root.add(pataT);
  }

  // Cabeça Larga com Boca Articulada
  const cabeca = new THREE.Group(); posicionar(cabeca, 0, 5.0, 3.8);
  cabeca.add(chanfrada(6.8, 2.2, 3.8, 0.6, verdeSapo, 0, 0.2, 1.2));

  // Olhos Ultrassônicos Bem Salientes no Topo
  for (const s of [-1, 1]) {
    const olho = olhoUltra(0.95, s * 2.0, 1.6, 1.4);
    cabeca.add(olho);
  }

  // Mandíbula Inferior (Abre no Bip)
  const boca = new THREE.Group(); posicionar(boca, 0, -0.6, 0.4);
  boca.add(chanfrada(6.2, 0.8, 3.6, 0.4, M(0xc0392b), 0, -0.2, 1.2));
  cabeca.add(boca); root.add(cabeca);

  // Sensor de Cor ("Língua") sob a boca
  const linguaSensor = sensorCor(0xe74c3c);
  posicionar(linguaSensor, 0, 2.4, 4.8); root.add(linguaSensor);

  // Apoio Traseiro e Feixe
  root.add(cil(0.45, 1.3, cinzaEsc, 'y', 0, 2.2, -3.8, 12));
  const bola = pronto(new THREE.Mesh(new THREE.SphereGeometry(1.2, 18, 12), M(0xd7d9db, { metalness: 0.6 })));
  posicionar(bola, 0, 1.0, -3.8); root.add(bola);
  const feixe = criarFeixe(1.4); posicionar(feixe.grupo, 0, 0, 5.2); root.add(feixe.grupo);

  let tAnt = null, encAnt = null, fase = 0, amp = 0, abriBoca = 0;
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
    fase += dist * 1.2;

    abriBoca += ((est.bip ? 0.45 : 0) - abriBoca) * Math.min(1, (dt || 0.05) * 14);
    boca.rotation.x = abriBoca;

    // "Pulo/Balanço" vertical sutil ao se mover
    cabeca.position.y = 5.0 + Math.abs(Math.sin(fase)) * amp * 0.8;
  }

  return { nome: 'sapo', grupo: root, rodaB, rodaC, leds: [ledMat], feixe, lcd, partes: { cabeca, boca }, animar };
}