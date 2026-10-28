// =====================================================================
//  ROBÔ — "Opala Comodoro" (Chevrolet Opala Cupê — Cinza Metálico)
// =====================================================================
import * as THREE from 'three';
import {
  M, pronto, posicionar, caixa, cil, chanfrada, cone,
  construirRoda, olhoUltra, sensorCor, criarFeixe,
  CM_POR_GRAU, RAIO_RODA,
} from './helpers.mjs';

export function construirRoboOpala() {
  const root = new THREE.Group(); root.name = 'opala-comodoro';

  const cinzaMet     = M(0x4a5f6e, { roughness: 0.1,  metalness: 0.45 });
  const cinzaEsc     = M(0x2e3d47, { roughness: 0.15, metalness: 0.35 });
  const pretoCarro   = M(0x0e0e0e, { roughness: 0.5,  metalness: 0.1  }); // teto vinílico preto
  const cromado      = M(0xe0e0e0, { roughness: 0.04, metalness: 0.97 });
  const pretoMatte   = M(0x111111, { roughness: 0.95 });
  const vidro        = M(0x1a2530, { roughness: 0.05, transparent: true, opacity: 0.58 });
  const farolAceso   = M(0xfffaed, { emissive: 0xfff0cc, emissiveIntensity: 1.5 });
  const farolRim     = M(0xf0f0f0, { roughness: 0.06, metalness: 0.88 });
  const lanternaR    = M(0x990000, { emissive: 0x660000, emissiveIntensity: 0.7 });
  const lanternaAmb  = M(0xffaa00, { emissive: 0xcc7700, emissiveIntensity: 0.5 });
  const borracha     = M(0x131313, { roughness: 1.0 });
  const aroCal       = M(0xc8c8c8, { roughness: 0.06, metalness: 0.95 });

  const rodaB = construirRoda('ev3', +1); rodaB.visible = false;
  const rodaC = construirRoda('ev3', -1); rodaC.visible = false;
  root.add(rodaB, rodaC);

  const corpo = new THREE.Group(); corpo.name = 'carroceria';

  // CHASSI
  corpo.add(caixa(9.2, 0.55, 14.5, pretoMatte, 0, 2.5, -0.5));

  // SOLEIRAS
  for (const sx of [-1, 1]) {
    corpo.add(caixa(0.3, 0.4, 12.0, pretoMatte, sx * 4.72, 2.72, -0.5));
  }

  // PARALAMAS DIANTEIROS — largos e marcados (Opala tem muscle car vibe)
  for (const sx of [-1, 1]) {
    corpo.add(chanfrada(1.85, 1.65, 3.9, 0.42, cinzaMet, sx * 4.08, 3.42, 4.2));
    const arco = pronto(new THREE.Mesh(
      new THREE.TorusGeometry(1.52, 0.21, 12, 32, Math.PI), pretoMatte));
    arco.rotation.z = Math.PI / 2;
    arco.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
    arco.position.set(sx * 4.9, 3.12, 4.2);
    corpo.add(arco);
  }

  // PARALAMAS TRASEIROS
  for (const sx of [-1, 1]) {
    corpo.add(chanfrada(1.85, 1.7, 4.2, 0.42, cinzaMet, sx * 4.08, 3.45, -4.6));
    const arco = pronto(new THREE.Mesh(
      new THREE.TorusGeometry(1.52, 0.21, 12, 32, Math.PI), pretoMatte));
    arco.rotation.z = Math.PI / 2;
    arco.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
    arco.position.set(sx * 4.9, 3.12, -4.6);
    corpo.add(arco);
  }

  // PAINÉIS LATERAIS
  for (const sx of [-1, 1]) {
    corpo.add(chanfrada(1.1, 2.05, 5.5, 0.2, cinzaMet, sx * 4.65, 3.52, -0.5));
    // Friso fino (Opala Comodoro tem friso discreto)
    corpo.add(caixa(0.05, 0.1, 11.8, cromado, sx * 4.82, 3.62, -0.5));
  }

  // CAPÔ LONGO (motor V6/V8 na frente — capô comprido e levemente abaulado)
  corpo.add(chanfrada(8.4, 0.85, 5.8, 0.52, cinzaMet, 0, 3.62, 4.6));
  corpo.add(chanfrada(8.0, 0.2, 5.6, 0.35, cinzaEsc, 0, 4.1, 4.6));

  // TRASEIRA FASTBACK SUAVE (característica do Opala Cupê)
  corpo.add(chanfrada(8.4, 1.4, 3.5, 0.48, cinzaMet, 0, 3.65, -5.0));

  // CABINE — teto vinílico preto (muito comum no Opala), perfil baixo fastback
  const cabGeo = new THREE.SphereGeometry(1, 28, 22);
  const cabine = pronto(new THREE.Mesh(cabGeo, cinzaMet));
  cabine.scale.set(4.35, 1.18, 5.0);
  cabine.position.set(0, 4.48, -0.5);
  corpo.add(cabine);

  // TETO VINÍLICO PRETO (característica marcante do Comodoro)
  corpo.add(chanfrada(8.2, 0.22, 4.8, 0.32, pretoCarro, 0, 5.32, -0.5));

  // COLUNAS B pretas (bicolor)
  for (const sx of [-1, 1]) {
    corpo.add(caixa(0.22, 1.1, 0.28, pretoCarro, sx * 4.3, 4.75, -0.5));
  }

  // PARA-BRISA (inclinado, fastback)
  const pb = pronto(new THREE.Mesh(new THREE.PlaneGeometry(7.0, 1.75), vidro));
  pb.rotation.x = -0.5; pb.position.set(0, 4.58, 2.1); corpo.add(pb);
  corpo.add(caixa(7.1, 0.1, 0.1, cromado, 0, 5.52, 2.1));
  corpo.add(caixa(7.1, 0.1, 0.1, cromado, 0, 3.68, 2.2));

  // VIGIA TRASEIRO (fastback — bem inclinado)
  const vt = pronto(new THREE.Mesh(new THREE.PlaneGeometry(6.2, 1.6), vidro));
  vt.rotation.x = 0.6; vt.position.set(0, 4.48, -2.85); corpo.add(vt);

  // JANELAS LATERAIS
  for (const sx of [-1, 1]) {
    const jl = pronto(new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.08), vidro));
    jl.rotation.y = Math.PI / 2 * sx;
    jl.position.set(sx * 4.68, 4.48, -0.5);
    corpo.add(jl);
  }

  // PARA-CHOQUES LARGOS (Opala tem para-choque integrado grande)
  corpo.add(caixa(10.2, 0.6, 0.58, cromado, 0, 2.92, 7.3));
  corpo.add(caixa(9.8,  0.3, 0.35, cromado, 0, 3.52, 7.25));
  for (const sx of [-1, 1]) {
    corpo.add(caixa(0.52, 0.6, 1.0, cromado, sx * 4.65, 2.92, 6.88));
  }
  corpo.add(caixa(10.2, 0.6, 0.58, cromado, 0, 2.92, -7.85));
  corpo.add(caixa(9.8,  0.3, 0.35, cromado, 0, 3.52, -7.8));
  for (const sx of [-1, 1]) {
    corpo.add(caixa(0.52, 0.6, 1.0, cromado, sx * 4.65, 2.92, -7.45));
  }

  // GRADE FRONTAL PRETA com listras horizontais (muito fiel ao Opala)
  corpo.add(chanfrada(8.6, 1.55, 0.5, 0.28, pretoMatte, 0, 3.62, 7.12));
  // Listras horizontais cromadas na grade
  for (let i = 0; i < 6; i++) {
    corpo.add(caixa(8.4, 0.07, 0.52, M(0x333333), 0, 2.98 + i * 0.26, 7.12));
  }
  // Moldura cromada da grade
  corpo.add(caixa(8.65, 0.08, 0.52, cromado, 0, 4.38, 7.12));
  corpo.add(caixa(8.65, 0.08, 0.52, cromado, 0, 2.88, 7.12));
  corpo.add(caixa(0.08, 1.55, 0.52, cromado, -4.35, 3.62, 7.12));
  corpo.add(caixa(0.08, 1.55, 0.52, cromado,  4.35, 3.62, 7.12));

  // LOGO CHEVROLET centralizado na grade (gravata)
  corpo.add(caixa(1.4, 0.5, 0.15, cromado, 0, 3.62, 7.35));
  corpo.add(caixa(0.5, 0.5, 0.12, pretoMatte, 0, 3.62, 7.38)); // vazado central

  // FARÓIS RETANGULARES DUPLOS (2 por lado, embutidos na grade)
  for (const sx of [-1, 1]) {
    // Farol externo (maior)
    corpo.add(caixa(1.5, 1.0, 0.18, farolRim,   sx * 3.28, 3.82, 7.28));
    corpo.add(caixa(1.3, 0.82, 0.12, farolAceso, sx * 3.28, 3.82, 7.42));
    // Farol interno (menor, para longa distância)
    corpo.add(caixa(1.1, 1.0, 0.18, farolRim,   sx * 1.88, 3.82, 7.28));
    corpo.add(caixa(0.9, 0.82, 0.12, farolAceso, sx * 1.88, 3.82, 7.42));
    // Divisor entre os dois faróis
    corpo.add(caixa(0.08, 1.0, 0.18, pretoMatte, sx * 2.55, 3.82, 7.28));
  }

  // LANTERNAS TRASEIRAS HORIZONTAIS ESCURAS (estilo anos 80)
  for (const sx of [-1, 1]) {
    // Lanterna principal (longa e baixa)
    corpo.add(caixa(3.5, 0.75, 0.22, lanternaR,   sx * 3.0, 3.68, -7.72));
    corpo.add(caixa(1.0, 0.75, 0.22, lanternaAmb, sx * 4.28, 3.68, -7.72));
    // Divisores
    corpo.add(caixa(0.07, 0.75, 0.22, cromado, sx * 1.22, 3.68, -7.72));
    corpo.add(caixa(0.07, 0.75, 0.22, cromado, sx * 4.82, 3.68, -7.72));
  }
  // Friso traseiro cromado horizontal (longo — característica Opala)
  corpo.add(caixa(10.0, 0.14, 0.22, cromado, 0, 4.06, -7.72));
  corpo.add(caixa(10.0, 0.14, 0.22, cromado, 0, 3.32, -7.72));
  // Escrita "CHEVROLET" traseira
  corpo.add(caixa(3.2, 0.28, 0.1, cromado, 0, 4.3, -7.8));

  // PLACAS
  corpo.add(caixa(3.0, 0.9, 0.1, M(0xf0f0e0), 0, 3.0, 7.45));
  corpo.add(caixa(3.0, 0.9, 0.1, M(0xf0f0e0), 0, 3.0, -7.9));

  // 4 RODAS — calota "teia de aranha" estilo Opala Comodoro
  const posRodas = [
    [+5.1, 2.88,  4.2],
    [-5.1, 2.88,  4.2],
    [+5.1, 2.88, -4.6],
    [-5.1, 2.88, -4.6],
  ];
  for (const [rx, ry, rz] of posRodas) {
    const g = new THREE.Group(); g.position.set(rx, ry, rz);
    // Pneu
    const pneu = pronto(new THREE.Mesh(new THREE.TorusGeometry(1.42, 0.56, 18, 36), borracha));
    pneu.rotation.y = Math.PI / 2; g.add(pneu);
    // Calota cromada (maior, mais vistosa)
    const calota = pronto(new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.14, 32), aroCal));
    calota.rotation.z = Math.PI / 2; g.add(calota);
    // Aro externo
    const aro = pronto(new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.05, 10, 32), cromado));
    aro.rotation.y = Math.PI / 2; g.add(aro);
    // Raios finos estilo "teia" (8 raios)
    for (let i = 0; i < 8; i++) {
      const raio = pronto(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.78, 0.04), aroCal));
      raio.rotation.z = (i * Math.PI) / 8;
      raio.position.x = rx > 0 ? 0.1 : -0.1;
      g.add(raio);
    }
    // Aro intermediário (calota teia tem aro no meio)
    const aroMeio = pronto(new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.04, 8, 24), aroCal));
    aroMeio.rotation.y = Math.PI / 2; g.add(aroMeio);
    const centro = pronto(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.2, 12), cromado));
    centro.rotation.z = Math.PI / 2; g.add(centro);
    corpo.add(g);
  }

  root.add(corpo);

  // SENSORES OCULTOS
  const ultra = olhoUltra(0.65, 0, 3.0, 7.2); ultra.visible = false; root.add(ultra);
  const sensorGnd = sensorCor(0xe6e7e8); posicionar(sensorGnd, 0, 2.2, 4.8); root.add(sensorGnd);
  const feixe = criarFeixe(1.4); posicionar(feixe.grupo, 0, 0, 4.8); root.add(feixe.grupo);
  root.add(cil(0.45, 1.3, pretoMatte, 'y', 0, 2.4, -4.8, 12));
  const bola = pronto(new THREE.Mesh(new THREE.SphereGeometry(1.2, 18, 12), M(0xd7d9db, { metalness: 0.6, roughness: 0.25 })));
  posicionar(bola, 0, 1.2, -4.8); root.add(bola);

  let tAnt = null, encAnt = null, trepida = 0, balanço = 0;
  function animar(est) {
    let dt = 0, velB = 0, velC = 0;
    if (tAnt !== null) {
      dt = est.t - tAnt;
      if (dt > 0 && dt < 0.25) { velB = (est.encB - encAnt[0]) / dt; velC = (est.encC - encAnt[1]) / dt; }
    }
    tAnt = est.t; encAnt = [est.encB, est.encC];
    // Motor V6 — vibração mais grave e forte
    trepida += dt * 35;
    corpo.position.y = 0.02 * Math.sin(trepida) + 0.008 * Math.sin(trepida * 1.8);
    balanço += (((velB - velC) * 0.002) - balanço) * Math.min(1, (dt || 0.05) * 5);
    corpo.rotation.z = 0; // nunca rotaciona
    corpo.position.x = Math.max(-0.4, Math.min(0.4, balanço * 8)); // desloca lateral
  }

  const lcdMock = { desenhar: () => {} };
  return { nome: 'opalaComodoro', grupo: root, rodaB, rodaC, leds: [M(0x1a1d1f)], feixe, lcd: lcdMock, partes: { corpoCarro: corpo, ultra }, animar };
}