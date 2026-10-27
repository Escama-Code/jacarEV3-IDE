// =====================================================================
//  ROBÔ — "Opala Clássico" (Chevrolet Opala Coupe)
// =====================================================================
import * as THREE from 'three';
import {
  M, pronto, posicionar, caixa, cil, chanfrada, cone,
  construirRoda, olhoUltra, sensorCor, criarFeixe,
  CM_POR_GRAU, RAIO_RODA,
} from './helpers.mjs';

export function construirRoboOpala() {
  const root = new THREE.Group(); root.name = 'opala';

  // Paleta — Azul Báltico metálico (cor clássica do Opala)
  const corLataria    = M(0x1a3a5c, { roughness: 0.12, metalness: 0.3 });
  const corLatariaEsc = M(0x112840, { roughness: 0.15, metalness: 0.2 });
  const cromado       = M(0xe8e8e8, { roughness: 0.04, metalness: 0.97 });
  const pretoMatte    = M(0x111111, { roughness: 0.95 });
  const vidro         = M(0x334455, { roughness: 0.05, transparent: true, opacity: 0.6 });
  const farolAceso    = M(0xfffaed, { emissive: 0xfff0cc, emissiveIntensity: 1.5 });
  const farolRim      = M(0xf0f0f0, { roughness: 0.08, metalness: 0.85 });
  const lanternaR     = M(0xdd1100, { emissive: 0xaa0000, emissiveIntensity: 0.8 });
  const lanternaAmb   = M(0xffaa00, { emissive: 0xcc7700, emissiveIntensity: 0.6 });
  const borracha      = M(0x151515, { roughness: 1.0 });
  const aroCal        = M(0xd0d0d0, { roughness: 0.08, metalness: 0.92 });

  // Rodas físicas (ocultas)
  const rodaB = construirRoda('ev3', +1); rodaB.visible = false;
  const rodaC = construirRoda('ev3', -1); rodaC.visible = false;
  root.add(rodaB, rodaC);

  const corpo = new THREE.Group(); corpo.name = 'carroceria';

  // CHASSI
  corpo.add(caixa(9.0, 0.55, 14.0, pretoMatte, 0, 2.5, -0.5));

  // SOLEIRAS
  for (const sx of [-1, 1]) {
    corpo.add(caixa(0.3, 0.4, 11.5, pretoMatte, sx * 4.65, 2.75, -0.5));
  }

  // PARALAMAS DIANTEIROS — Opala tem paralamas largos e marcados
  for (const sx of [-1, 1]) {
    corpo.add(chanfrada(1.8, 1.6, 3.8, 0.4, corLataria, sx * 4.0, 3.4, 4.2));
    const arco = pronto(new THREE.Mesh(
      new THREE.TorusGeometry(1.5, 0.2, 12, 32, Math.PI), pretoMatte));
    arco.rotation.z = Math.PI / 2;
    arco.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
    arco.position.set(sx * 4.8, 3.1, 4.2);
    corpo.add(arco);
  }

  // PARALAMAS TRASEIROS
  for (const sx of [-1, 1]) {
    corpo.add(chanfrada(1.8, 1.7, 4.0, 0.4, corLataria, sx * 4.0, 3.45, -4.5));
    const arco = pronto(new THREE.Mesh(
      new THREE.TorusGeometry(1.5, 0.2, 12, 32, Math.PI), pretoMatte));
    arco.rotation.z = Math.PI / 2;
    arco.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
    arco.position.set(sx * 4.8, 3.1, -4.5);
    corpo.add(arco);
  }

  // PAINÉIS LATERAIS
  for (const sx of [-1, 1]) {
    corpo.add(chanfrada(1.1, 2.0, 5.0, 0.2, corLataria, sx * 4.55, 3.5, -0.5));
    // Friso lateral cromado (detalhe Opala)
    corpo.add(caixa(0.06, 0.18, 10.5, cromado, sx * 4.7, 3.55, -0.5));
  }

  // CAPÔ LONGO (Opala tem motor na frente — capô comprido e plano)
  corpo.add(chanfrada(8.2, 0.8, 5.5, 0.5, corLataria,  0, 3.6, 4.5));
  corpo.add(chanfrada(7.8, 0.2, 5.3, 0.3, corLatariaEsc, 0, 4.05, 4.5));
  // Nervura central do capô
  corpo.add(caixa(0.25, 0.18, 5.2, corLatariaEsc, 0, 4.2, 4.5));

  // PORTA-MALAS TRASEIRO (Opala Coupe tem traseira fastback)
  corpo.add(chanfrada(8.0, 1.1, 3.2, 0.45, corLataria, 0, 3.6, -4.8));

  // CABINE — Cupê: teto baixo, linha fastback
  const cabGeo = new THREE.SphereGeometry(1, 28, 22);
  const cabine = pronto(new THREE.Mesh(cabGeo, corLataria));
  cabine.scale.set(4.2, 1.2, 4.8);
  cabine.position.set(0, 4.5, -0.3);
  corpo.add(cabine);

  // TETO PLANO (Opala Coupe tem teto reto)
  corpo.add(chanfrada(7.8, 0.2, 4.6, 0.3, corLatariaEsc, 0, 5.35, -0.3));

  // PARA-BRISA inclinado (estilo fastback)
  const pb = pronto(new THREE.Mesh(new THREE.PlaneGeometry(6.5, 1.8), vidro));
  pb.rotation.x = -0.45; pb.position.set(0, 4.6, 2.1); corpo.add(pb);
  corpo.add(caixa(6.6, 0.1, 0.1, cromado, 0, 5.55, 2.1));

  // VIGIA TRASEIRO (inclinado, fastback)
  const vt = pronto(new THREE.Mesh(new THREE.PlaneGeometry(5.5, 1.5), vidro));
  vt.rotation.x = 0.55; vt.position.set(0, 4.5, -2.7); corpo.add(vt);

  // JANELAS LATERAIS
  for (const sx of [-1, 1]) {
    const jl = pronto(new THREE.Mesh(new THREE.PlaneGeometry(4.0, 1.1), vidro));
    jl.rotation.y = Math.PI / 2 * sx;
    jl.position.set(sx * 4.25, 4.5, -0.3);
    corpo.add(jl);
  }

  // PARA-CHOQUES — Opala tem para-choques largos e cromados
  corpo.add(caixa(10.0, 0.55, 0.55, cromado, 0, 2.9, 7.1));
  corpo.add(caixa(9.5,  0.28, 0.35, cromado, 0, 3.45, 7.05));
  for (const sx of [-1, 1]) {
    corpo.add(caixa(0.5, 0.55, 1.0, cromado, sx * 4.5, 2.9, 6.7));
  }
  corpo.add(caixa(10.0, 0.55, 0.55, cromado, 0, 2.9, -7.6));
  corpo.add(caixa(9.5,  0.28, 0.35, cromado, 0, 3.45, -7.55));
  for (const sx of [-1, 1]) {
    corpo.add(caixa(0.5, 0.55, 1.0, cromado, sx * 4.5, 2.9, -7.2));
  }

  // GRADE DIANTEIRA (Opala tem grade retangular marcante)
  corpo.add(chanfrada(7.5, 1.5, 0.5, 0.3, corLatariaEsc, 0, 3.6, 6.8));
  for (let i = -2; i <= 2; i++) {
    corpo.add(caixa(0.08, 1.3, 0.6, cromado, i * 1.4, 3.6, 6.85));
  }
  corpo.add(caixa(7.5, 0.1, 0.6, cromado, 0, 4.3, 6.85));
  corpo.add(caixa(7.5, 0.1, 0.6, cromado, 0, 2.95, 6.85));

  // FARÓIS DUPLOS RETANGULARES (característica do Opala)
  for (const sx of [-1, 1]) {
    for (const fz of [0, 1.2]) {
      corpo.add(caixa(1.4, 0.9, 0.15, farolRim,   sx * 3.2 - sx * fz * 0.0, 3.9, 7.0 - fz * 0.05));
      corpo.add(caixa(1.2, 0.7, 0.12, farolAceso, sx * 3.2, 3.9, 7.12));
    }
    // Pisca dianteiro âmbar
    corpo.add(caixa(0.9, 0.6, 0.15, lanternaAmb, sx * 4.5, 3.6, 6.9));
  }

  // LANTERNAS TRASEIRAS RETANGULARES
  for (const sx of [-1, 1]) {
    corpo.add(caixa(2.2, 0.9, 0.2, lanternaR,   sx * 3.5, 3.8, -7.45));
    corpo.add(caixa(0.8, 0.9, 0.2, lanternaAmb, sx * 4.5, 3.8, -7.45));
    corpo.add(caixa(0.08, 0.9, 0.2, cromado,    sx * 2.35, 3.8, -7.45));
  }
  // Friso traseiro cromado
  corpo.add(caixa(9.8, 0.15, 0.2, cromado, 0, 4.28, -7.45));

  // EMBLEMA CHEVROLET (gravata borboleta)
  corpo.add(caixa(1.2, 0.4, 0.15, cromado, 0, 3.8, 7.15));

  // PLACA
  corpo.add(caixa(3.0, 0.9, 0.1, M(0xf0f0e0), 0, 3.0, 7.18));
  corpo.add(caixa(3.0, 0.9, 0.1, M(0xf0f0e0), 0, 3.0, -7.7));

  // 4 RODAS VISUAIS
  const posRodas = [
    [+5.0, 2.85,  4.2],
    [-5.0, 2.85,  4.2],
    [+5.0, 2.85, -4.5],
    [-5.0, 2.85, -4.5],
  ];
  for (const [rx, ry, rz] of posRodas) {
    const g = new THREE.Group(); g.position.set(rx, ry, rz);
    const pneu = pronto(new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.58, 18, 36), borracha));
    pneu.rotation.y = Math.PI / 2; g.add(pneu);
    const calota = pronto(new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.14, 24), aroCal));
    calota.rotation.z = Math.PI / 2; g.add(calota);
    // Raios em Y (estilo esportivo Opala)
    for (let i = 0; i < 5; i++) {
      const raio = pronto(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.68, 0.07), aroCal));
      raio.rotation.z = (i * Math.PI * 2) / 5;
      raio.position.x = rx > 0 ? 0.12 : -0.12;
      g.add(raio);
    }
    const centro = pronto(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.22, 12), cromado));
    centro.rotation.z = Math.PI / 2; g.add(centro);
    corpo.add(g);
  }

  root.add(corpo);

  // SENSORES OCULTOS
  const ultra = olhoUltra(0.65, 0, 3.0, 7.0); ultra.visible = false; root.add(ultra);
  const sensorGnd = sensorCor(0xe6e7e8); posicionar(sensorGnd, 0, 2.2, 4.5); root.add(sensorGnd);
  const feixe = criarFeixe(1.4); posicionar(feixe.grupo, 0, 0, 4.5); root.add(feixe.grupo);
  root.add(cil(0.45, 1.3, pretoMatte, 'y', 0, 2.4, -4.5, 12));
  const bola = pronto(new THREE.Mesh(new THREE.SphereGeometry(1.2, 18, 12), M(0xd7d9db, { metalness: 0.6, roughness: 0.25 })));
  posicionar(bola, 0, 1.2, -4.5); root.add(bola);

  // ANIMAÇÃO
  let tAnt = null, encAnt = null, trepida = 0, balanço = 0;
  function animar(est) {
    let dt = 0, velB = 0, velC = 0;
    if (tAnt !== null) {
      dt = est.t - tAnt;
      if (dt > 0 && dt < 0.25) {
        velB = (est.encB - encAnt[0]) / dt;
        velC = (est.encC - encAnt[1]) / dt;
      }
    }
    tAnt = est.t; encAnt = [est.encB, est.encC];
    trepida += dt * 38;
    corpo.position.y = 0.015 * Math.sin(trepida) + 0.006 * Math.sin(trepida * 2.1);
    balanço += (((velB - velC) * 0.004) - balanço) * Math.min(1, (dt || 0.05) * 5);
    corpo.rotation.z = balanço;
    corpo.position.z = est.bip ? 0.12 * Math.sin(est.t * 65) : 0;
  }

  const lcdMock = { desenhar: () => {} };
  const ledMatMock = M(0x1a1d1f);

  return {
    nome: 'opala',
    grupo: root,
    rodaB, rodaC,
    leds: [ledMatMock],
    feixe,
    lcd: lcdMock,
    partes: { corpoCarro: corpo, ultra },
    animar,
  };
}