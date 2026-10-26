// ============================================================
// escorpiao.mjs — modelo 3D: Escorpião (Robô EV3)
// ============================================================
import * as THREE from 'three';
import {
  M, pronto, posicionar, caixa, cil, chanfrada, cone,
  criarLCD, planoLCD, construirRoda, olhoUltra, sensorCor, criarFeixe,
  CM_POR_GRAU, RAIO_RODA,
} from './_helpers.mjs';

export function construirRoboEscorpiao() {
  const root = new THREE.Group(); root.name = 'escorpiao';
  const pretoCorpo = M(0x1c1d21, { roughness: 0.4 });
  const amareloAlerta = M(0xf5b041, { roughness: 0.5 });
  const cinzaMetal = M(0x4a4e51, { roughness: 0.6 });

  const rodaB = construirRoda('escorpiao', +1), rodaC = construirRoda('escorpiao', -1);
  root.add(rodaB, rodaC);

  // Chassi Baixo e Achatado
  root.add(chanfrada(9.2, 3.2, 9.6, 0.6, pretoCorpo, 0, 3.8, -0.2));
  root.add(chanfrada(7.5, 0.8, 8.0, 0.3, amareloAlerta, 0, 5.5, -0.2));

  // LCD no centro do dorso
  root.add(chanfrada(5.0, 0.4, 4.6, 0.15, cinzaMetal, 0, 5.9, -0.2));
  const lcd = criarLCD(); root.add(planoLCD(2.8, 1.9, lcd, 0, 6.15, 0.4));
  const ledMat = new THREE.MeshStandardMaterial({ color: 0x1a1d1f, emissive: 0x000000, emissiveIntensity: 1.5 });
  root.add(caixa(1.0, 0.14, 0.4, ledMat, -1.6, 6.1, -1.6), caixa(1.0, 0.14, 0.4, ledMat, 1.6, 6.1, -1.6));

  // Olhos Ultrassônicos na Frente
  for (const s of [-1, 1]) {
    const olho = olhoUltra(0.8, s * 1.6, 4.2, 4.2);
    root.add(olho);
  }

  // Garras Frontais Articuladas (Pedipalpos)
  const garras = [];
  for (const s of [-1, 1]) {
    const garraRaiz = new THREE.Group(); posicionar(garraRaiz, s * 4.2, 3.8, 3.2);
    const braco = chanfrada(2.4, 0.6, 0.8, 0.2, cinzaMetal, s * 1.0, 0, 0.5);
    braco.rotation.y = s * -0.3; garraRaiz.add(braco);

    const pinça1 = cone(0.4, 1.4, amareloAlerta, 4, s * 2.2, 0.2, 1.8, Math.PI / 2);
    const pinça2Group = new THREE.Group(); posicionar(pinça2Group, s * 1.6, 0, 1.2);
    const pinça2 = cone(0.35, 1.2, amareloAlerta, 4, s * 0.5, 0, 0.5, Math.PI / 2);
    pinça2Group.add(pinça2); garraRaiz.add(pinça1, pinça2Group);
    root.add(garraRaiz); garras.push({ raiz: garraRaiz, movel: pinça2Group, s });
  }

  // Cauda Curvada Arqueada sobre o Dorso (5 Segmentos)
  const caudaSegs = [];
  const caudaBase = new THREE.Group(); posicionar(caudaBase, 0, 4.2, -4.8); root.add(caudaBase);
  let pai = caudaBase;
  for (let i = 0; i < 5; i++) {
    const seg = new THREE.Group(); seg.position.z = i === 0 ? 0 : -1.4;
    seg.add(chanfrada(2.2 - i * 0.2, 1.8 - i * 0.2, 1.6, 0.3, i === 4 ? amareloAlerta : pretoCorpo, 0, 0, -0.8));
    pai.add(seg); caudaSegs.push(seg); pai = seg;
  }
  // Aguarrão / Farpão na ponta
  const farpao = cone(0.5, 1.4, amareloAlerta, 4, 0, 0, -2.0, -Math.PI / 2);
  pai.add(farpao);

  // Apoio Traseiro e Feixe
  root.add(cil(0.45, 1.3, cinzaMetal, 'y', 0, 2.2, -3.8, 12));
  const bola = pronto(new THREE.Mesh(new THREE.SphereGeometry(1.2, 18, 12), M(0xd7d9db, { metalness: 0.6 })));
  posicionar(bola, 0, 1.0, -3.8); root.add(bola);
  const sensorGrounded = sensorCor(0xd8392b); posicionar(sensorGrounded, 0, 2.0, 4.0); root.add(sensorGrounded);
  const feixe = criarFeixe(1.4); posicionar(feixe.grupo, 0, 0, 4.8); root.add(feixe.grupo);

  let tAnt = null, encAnt = null, fase = 0, amp = 0, ataque = 0;
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

    ataque += ((est.bip ? 0.6 : 0) - ataque) * Math.min(1, (dt || 0.05) * 14);

    // Arqueamento da cauda
    caudaSegs.forEach((seg, i) => {
      seg.rotation.x = 0.35 + ataque * 0.12 + Math.sin(fase + i * 0.4) * amp * 0.1;
    });

    garras.forEach(g => {
      g.raiz.rotation.y = g.s * (-0.2 + Math.sin(fase) * amp * 0.15);
      g.movel.rotation.y = g.s * (ataque * 0.5);
    });
  }

  return { nome: 'escorpiao', grupo: root, rodaB, rodaC, leds: [ledMat], feixe, lcd, partes: { garras, caudaSegs }, animar };
}