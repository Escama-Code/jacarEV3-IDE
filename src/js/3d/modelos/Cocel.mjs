// =====================================================================
//  ROBÔ — "Corcel I" (Ford Corcel 1969-1977)
// =====================================================================
import * as THREE from 'three';
import {
  M, pronto, posicionar, caixa, cil, chanfrada, cone,
  construirRoda, olhoUltra, sensorCor, criarFeixe,
  CM_POR_GRAU, RAIO_RODA,
} from './helpers.mjs';

export function construirRoboCorcel() {
  const root = new THREE.Group(); root.name = 'corcel';

  // Paleta — Verde Floresta (cor clássica do Corcel I)
  const corLataria    = M(0x2d5a27, { roughness: 0.13, metalness: 0.2 });
  const corLatariaEsc = M(0x1e3d1a, { roughness: 0.18, metalness: 0.15 });
  const cromado       = M(0xe5e5e5, { roughness: 0.04, metalness: 0.97 });
  const pretoMatte    = M(0x111111, { roughness: 0.95 });
  const vidro         = M(0x2a4030, { roughness: 0.05, transparent: true, opacity: 0.62 });
  const farolAceso    = M(0xfffaed, { emissive: 0xfff0cc, emissiveIntensity: 1.5 });
  const farolRim      = M(0xf2f2f2, { roughness: 0.08, metalness: 0.85 });
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
  corpo.add(caixa(7.8, 0.55, 12.5, pretoMatte, 0, 2.5, -0.2));

  // SOLEIRAS
  for (const sx of [-1, 1]) {
    corpo.add(caixa(0.3, 0.38, 10.0, pretoMatte, sx * 4.05, 2.72, -0.2));
  }

  // PARALAMAS DIANTEIROS — Corcel tem linhas mais retas e europeias
  for (const sx of [-1, 1]) {
    corpo.add(chanfrada(1.6, 1.5, 3.4, 0.38, corLataria, sx * 3.6, 3.3, 3.6));
    const arco = pronto(new THREE.Mesh(
      new THREE.TorusGeometry(1.38, 0.18, 12, 32, Math.PI), pretoMatte));
    arco.rotation.z = Math.PI / 2;
    arco.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
    arco.position.set(sx * 4.3, 3.05, 3.6);
    corpo.add(arco);
  }

  // PARALAMAS TRASEIROS
  for (const sx of [-1, 1]) {
    corpo.add(chanfrada(1.6, 1.55, 3.6, 0.38, corLataria, sx * 3.6, 3.35, -3.8));
    const arco = pronto(new THREE.Mesh(
      new THREE.TorusGeometry(1.38, 0.18, 12, 32, Math.PI), pretoMatte));
    arco.rotation.z = Math.PI / 2;
    arco.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
    arco.position.set(sx * 4.3, 3.05, -3.8);
    corpo.add(arco);
  }

  // PAINÉIS LATERAIS
  for (const sx of [-1, 1]) {
    corpo.add(chanfrada(1.0, 1.9, 4.8, 0.2, corLataria, sx * 4.0, 3.45, -0.2));
    corpo.add(caixa(0.06, 0.15, 9.8, cromado, sx * 4.18, 3.5, -0.2));
  }

  // CAPÔ (Corcel tem capô médio — motor na frente)
  corpo.add(chanfrada(7.4, 0.75, 4.8, 0.45, corLataria, 0, 3.55, 3.8));
  corpo.add(chanfrada(7.0, 0.18, 4.6, 0.28, corLatariaEsc, 0, 3.95, 3.8));
  // Nervura dupla do capô (estilo europeu)
  for (const cx of [-0.8, 0.8]) {
    corpo.add(caixa(0.14, 0.12, 4.4, corLatariaEsc, cx, 4.1, 3.8));
  }

  // PORTA-MALAS (Corcel sedã tem traseira vertical com vigia grande)
  corpo.add(chanfrada(7.2, 1.6, 3.2, 0.42, corLataria, 0, 3.55, -4.2));
  corpo.add(chanfrada(6.8, 0.2, 3.0, 0.28, corLatariaEsc, 0, 4.4, -4.2));

  // CABINE — Sedã 3 volumes: linha de teto mais reta
  const cabGeo = new THREE.SphereGeometry(1, 28, 22);
  const cabine = pronto(new THREE.Mesh(cabGeo, corLataria));
  cabine.scale.set(3.9, 1.35, 4.2);
  cabine.position.set(0, 4.45, -0.2);
  corpo.add(cabine);

  // TETO
  corpo.add(chanfrada(7.2, 0.18, 4.0, 0.3, corLatariaEsc, 0, 5.28, -0.2));

  // PARA-BRISA
  const pb = pronto(new THREE.Mesh(new THREE.PlaneGeometry(5.8, 1.7), vidro));
  pb.rotation.x = -0.38; pb.position.set(0, 4.5, 1.9); corpo.add(pb);
  corpo.add(caixa(5.9, 0.1, 0.1, cromado, 0, 5.4, 1.9));

  // VIGIA
  const vt = pronto(new THREE.Mesh(new THREE.PlaneGeometry(5.0, 1.55), vidro));
  vt.rotation.x = 0.38; vt.position.set(0, 4.45, -2.5); corpo.add(vt);

  // JANELAS LATERAIS
  for (const sx of [-1, 1]) {
    const jl = pronto(new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.1), vidro));
    jl.rotation.y = Math.PI / 2 * sx;
    jl.position.set(sx * 4.02, 4.45, -0.2);
    corpo.add(jl);
  }

  // PARA-CHOQUES
  corpo.add(caixa(8.8, 0.5, 0.52, cromado, 0, 2.88, 6.2));
  corpo.add(caixa(8.4, 0.26, 0.32, cromado, 0, 3.38, 6.15));
  for (const sx of [-1, 1]) {
    corpo.add(caixa(0.45, 0.5, 0.9, cromado, sx * 4.1, 2.88, 5.85));
  }
  corpo.add(caixa(8.8, 0.5, 0.52, cromado, 0, 2.88, -6.6));
  corpo.add(caixa(8.4, 0.26, 0.32, cromado, 0, 3.38, -6.55));
  for (const sx of [-1, 1]) {
    corpo.add(caixa(0.45, 0.5, 0.9, cromado, sx * 4.1, 2.88, -6.3));
  }

  // GRADE DIANTEIRA (Corcel tem grade com listras horizontais finas)
  corpo.add(chanfrada(6.5, 1.3, 0.4, 0.25, corLatariaEsc, 0, 3.5, 6.05));
  for (let i = 0; i < 5; i++) {
    corpo.add(caixa(6.3, 0.08, 0.45, cromado, 0, 2.98 + i * 0.26, 6.1));
  }

  // FARÓIS RETANGULARES (estilo anos 70 europeu)
  for (const sx of [-1, 1]) {
    corpo.add(caixa(1.8, 1.0, 0.18, farolRim,   sx * 3.0, 3.85, 6.18));
    corpo.add(caixa(1.55, 0.78, 0.12, farolAceso, sx * 3.0, 3.85, 6.3));
    // Aro do farol
    corpo.add(caixa(1.82, 0.08, 0.18, cromado, sx * 3.0, 4.38, 6.18));
    corpo.add(caixa(1.82, 0.08, 0.18, cromado, sx * 3.0, 3.32, 6.18));
    // Pisca
    corpo.add(caixa(1.0, 0.7, 0.18, lanternaAmb, sx * 4.2, 3.6, 6.05));
  }

  // LANTERNAS TRASEIRAS (Corcel tem lanternas verticais com divisões)
  for (const sx of [-1, 1]) {
    corpo.add(caixa(0.7, 1.4, 0.2, lanternaR,   sx * 3.8, 3.85, -6.58));
    corpo.add(caixa(0.5, 0.65, 0.2, lanternaAmb, sx * 3.8, 4.58, -6.58));
    corpo.add(caixa(0.08, 1.4, 0.2, cromado,     sx * 3.42, 3.85, -6.58));
    corpo.add(caixa(0.08, 1.4, 0.2, cromado,     sx * 4.18, 3.85, -6.58));
  }
  // Friso traseiro
  corpo.add(caixa(8.5, 0.14, 0.2, cromado, 0, 4.6, -6.58));
  // Placa traseira centralizada com luz branca
  corpo.add(caixa(2.6, 0.85, 0.15, M(0xf0f0e0), 0, 3.1, -6.65));
  corpo.add(caixa(2.6, 0.85, 0.15, M(0xf0f0e0), 0, 3.0, 6.3));

  // EMBLEMA FORD (óvalo azul)
  const emblema = pronto(new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.1, 24), M(0x003580, { roughness: 0.1, metalness: 0.6 })));
  emblema.rotation.x = Math.PI / 2; emblema.position.set(0, 3.75, 6.35);
  corpo.add(emblema);
  corpo.add(caixa(0.6, 0.25, 0.12, M(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.3 }), 0, 3.75, 6.42));

  // 4 RODAS VISUAIS (Corcel tem rodas menores, estilo europeu)
  const posRodas = [
    [+4.5, 2.8,  3.6],
    [-4.5, 2.8,  3.6],
    [+4.5, 2.8, -3.8],
    [-4.5, 2.8, -3.8],
  ];
  for (const [rx, ry, rz] of posRodas) {
    const g = new THREE.Group(); g.position.set(rx, ry, rz);
    const pneu = pronto(new THREE.Mesh(new THREE.TorusGeometry(1.28, 0.5, 18, 36), borracha));
    pneu.rotation.y = Math.PI / 2; g.add(pneu);
    // Tampa de roda simples (Corcel base)
    const calota = pronto(new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.82, 0.12, 24), aroCal));
    calota.rotation.z = Math.PI / 2; g.add(calota);
    // 4 raios simples
    for (let i = 0; i < 4; i++) {
      const raio = pronto(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 0.06), aroCal));
      raio.rotation.z = (i * Math.PI) / 2;
      raio.position.x = rx > 0 ? 0.1 : -0.1;
      g.add(raio);
    }
    const centro = pronto(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.2, 12), cromado));
    centro.rotation.z = Math.PI / 2; g.add(centro);
    corpo.add(g);
  }

  root.add(corpo);

  // SENSORES OCULTOS
  const ultra = olhoUltra(0.65, 0, 3.0, 6.1); ultra.visible = false; root.add(ultra);
  const sensorGnd = sensorCor(0xe6e7e8); posicionar(sensorGnd, 0, 2.2, 4.0); root.add(sensorGnd);
  const feixe = criarFeixe(1.4); posicionar(feixe.grupo, 0, 0, 4.0); root.add(feixe.grupo);
  root.add(cil(0.45, 1.3, pretoMatte, 'y', 0, 2.4, -4.2, 12));
  const bola = pronto(new THREE.Mesh(new THREE.SphereGeometry(1.2, 18, 12), M(0xd7d9db, { metalness: 0.6, roughness: 0.25 })));
  posicionar(bola, 0, 1.2, -4.2); root.add(bola);

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
    trepida += dt * 50; // Motor a água — vibração mais suave
    corpo.position.y = 0.01 * Math.sin(trepida) + 0.004 * Math.sin(trepida * 3.1);
    balanço += (((velB - velC) * 0.004) - balanço) * Math.min(1, (dt || 0.05) * 5);
    corpo.rotation.z = balanço;
    corpo.position.z = est.bip ? 0.12 * Math.sin(est.t * 65) : 0;
  }

  const lcdMock = { desenhar: () => {} };
  const ledMatMock = M(0x1a1d1f);

  return {
    nome: 'corcel',
    grupo: root,
    rodaB, rodaC,
    leds: [ledMatMock],
    feixe,
    lcd: lcdMock,
    partes: { corpoCarro: corpo, ultra },
    animar,
  };
}