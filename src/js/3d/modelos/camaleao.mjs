// ============================================================
// camaleao.mjs — modelo 3D: Camaleão (Robô EV3)
// ============================================================
import * as THREE from 'three';
import {
  M, pronto, posicionar, caixa, cil, chanfrada, cone,
  criarLCD, planoLCD, construirRoda, olhoUltra, sensorCor, criarFeixe,
  CM_POR_GRAU, RAIO_RODA,
} from './helpers.mjs';

export function construirRoboCamaleao() {
  const root = new THREE.Group(); root.name = 'camaleao';
  const verdeLimao = M(0x16a085, { roughness: 0.5 });
  const verdeTurquesa = M(0x1abc9c, { roughness: 0.5 });
  const amareloCrista = M(0xf1c40f, { roughness: 0.6 });
  const cinzaEsc = M(0x3b3f43);

  const rodaB = construirRoda('camaleao', +1), rodaC = construirRoda('camaleao', -1);
  root.add(rodaB, rodaC);

  // Corpo Alto e Comprido
  root.add(chanfrada(7.2, 5.8, 10.5, 0.8, verdeLimao, 0, 5.1, -0.2));
  root.add(chanfrada(5.8, 1.2, 9.2, 0.4, verdeTurquesa, 0, 2.5, -0.2));

  // Display LCD Lateral/Dorsal
  root.add(chanfrada(4.6, 0.4, 4.6, 0.15, cinzaEsc, 0, 8.2, -0.4));
  const lcd = criarLCD(); root.add(planoLCD(2.6, 1.8, lcd, 0, 8.45, 0.2));
  const ledMat = new THREE.MeshStandardMaterial({ color: 0x1a1d1f, emissive: 0x000000, emissiveIntensity: 1.5 });
  root.add(caixa(1.0, 0.14, 0.4, ledMat, -1.4, 8.4, -1.8), caixa(1.0, 0.14, 0.4, ledMat, 1.4, 8.4, -1.8));

  // Cabeça com Crista Triangular
  const cabeca = new THREE.Group(); posicionar(cabeca, 0, 6.2, 4.2);
  cabeca.add(chanfrada(5.0, 3.2, 3.6, 0.5, verdeLimao, 0, 0.2, 1.2));
  const crista = chanfrada(1.2, 2.2, 2.8, 0.3, amareloCrista, 0, 2.2, 0.4); crista.rotation.x = -0.4;
  cabeca.add(crista);

  // Olhos Ultrassônicos Independentes (Giram em eixos separados)
  const olhosIndep = [];
  for (const s of [-1, 1]) {
    const orbita = new THREE.Group(); posicionar(orbita, s * 2.3, 0.4, 1.4);
    const olho = olhoUltra(0.85, 0, 0, 0);
    orbita.add(olho); cabeca.add(orbita);
    olhosIndep.push({ orbita, s });
  }
  root.add(cabeca);

  // Cauda Enrolada em Espiral na Traseira
  const caudaEspiral = new THREE.Group(); posicionar(caudaEspiral, 0, 5.2, -5.5);
  for (let i = 0; i < 6; i++) {
    const seg = chanfrada(1.8 - i * 0.2, 1.6 - i * 0.2, 1.2, 0.2, i % 2 ? verdeTurquesa : verdeLimao, 0, -i * 0.5, -i * 0.4);
    seg.rotation.x = i * 0.35; caudaEspiral.add(seg);
  }
  root.add(caudaEspiral);

  // Apoio Traseiro e Sensor de Cor (Língua)
  root.add(cil(0.45, 1.3, cinzaEsc, 'y', 0, 2.2, -3.8, 12));
  const bola = pronto(new THREE.Mesh(new THREE.SphereGeometry(1.2, 18, 12), M(0xd7d9db, { metalness: 0.6 })));
  posicionar(bola, 0, 1.0, -3.8); root.add(bola);
  const sensorGrounded = sensorCor(0xe67e22); posicionar(sensorGrounded, 0, 2.4, 5.2); root.add(sensorGrounded);
  const feixe = criarFeixe(1.4); posicionar(feixe.grupo, 0, 0, 5.6); root.add(feixe.grupo);

  let tAnt = null, encAnt = null, fase = 0, amp = 0;
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

    // Rotação independente dos olhos do camaleão
    olhosIndep[0].orbita.rotation.y = Math.sin(est.t * 1.5) * 0.4;
    olhosIndep[0].orbita.rotation.x = Math.cos(est.t * 2.0) * 0.2;
    olhosIndep[1].orbita.rotation.y = -Math.cos(est.t * 1.8) * 0.4;
    olhosIndep[1].orbita.rotation.x = Math.sin(est.t * 1.2) * 0.2;

    // Passada pausada típica do camaleão
    cabeca.rotation.z = Math.sin(fase * 0.5) * amp * 0.1;
  }

  return { nome: 'camaleao', grupo: root, rodaB, rodaC, leds: [ledMat], feixe, lcd, partes: { cabeca, olhosIndep }, animar };
}