// =====================================================================
//  ROBÔ — "Corcel GT" (Ford Corcel GT 1974 — Amarelo com faixas pretas)
// =====================================================================
import * as THREE from 'three';
import {
  M, pronto, posicionar, caixa, cil, chanfrada, cone,
  construirRoda, olhoUltra, sensorCor, criarFeixe,
  CM_POR_GRAU, RAIO_RODA,
} from './helpers.mjs';

export function construirRoboCorcel() {
  const root = new THREE.Group(); root.name = 'corcel-gt';

  const amarelo     = M(0xe8b800, { roughness: 0.12, metalness: 0.15 });
  const amareloEsc  = M(0xc49a00, { roughness: 0.15, metalness: 0.1  });
  const pretoFaixa  = M(0x080808, { roughness: 0.4,  metalness: 0.05 });
  const cromado     = M(0xe2e2e2, { roughness: 0.04, metalness: 0.97 });
  const pretoMatte  = M(0x111111, { roughness: 0.95 });
  const vidro       = M(0x1a2a1a, { roughness: 0.05, transparent: true, opacity: 0.6 });
  const farolAceso  = M(0xfffaed, { emissive: 0xfff0cc, emissiveIntensity: 1.5 });
  const farolRim    = M(0xf0f0f0, { roughness: 0.06, metalness: 0.88 });
  const lanternaR   = M(0xcc1100, { emissive: 0x990000, emissiveIntensity: 0.8 });
  const lanternaAmb = M(0xffaa00, { emissive: 0xcc7700, emissiveIntensity: 0.6 });
  const borracha    = M(0x131313, { roughness: 1.0 });
  const calotaPreta = M(0x1a1a1a, { roughness: 0.6,  metalness: 0.3  });

  const rodaB = construirRoda('ev3', +1); rodaB.visible = false;
  const rodaC = construirRoda('ev3', -1); rodaC.visible = false;
  root.add(rodaB, rodaC);

  const corpo = new THREE.Group(); corpo.name = 'carroceria';

  // CHASSI
  corpo.add(caixa(8.0, 0.55, 12.5, pretoMatte, 0, 2.5, -0.2));

  // SOLEIRAS
  for (const sx of [-1, 1]) {
    corpo.add(caixa(0.28, 0.38, 10.2, pretoMatte, sx * 4.12, 2.72, -0.2));
  }

  // PARALAMAS DIANTEIROS
  for (const sx of [-1, 1]) {
    corpo.add(chanfrada(1.55, 1.55, 3.4, 0.38, amarelo, sx * 3.65, 3.35, 3.5));
    const arco = pronto(new THREE.Mesh(
      new THREE.TorusGeometry(1.38, 0.19, 12, 32, Math.PI), pretoMatte));
    arco.rotation.z = Math.PI / 2;
    arco.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
    arco.position.set(sx * 4.35, 3.05, 3.5);
    corpo.add(arco);
  }

  // PARALAMAS TRASEIROS
  for (const sx of [-1, 1]) {
    corpo.add(chanfrada(1.55, 1.6, 3.5, 0.38, amarelo, sx * 3.65, 3.38, -3.8));
    const arco = pronto(new THREE.Mesh(
      new THREE.TorusGeometry(1.38, 0.19, 12, 32, Math.PI), pretoMatte));
    arco.rotation.z = Math.PI / 2;
    arco.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
    arco.position.set(sx * 4.35, 3.05, -3.8);
    corpo.add(arco);
  }

  // PAINÉIS LATERAIS
  for (const sx of [-1, 1]) {
    corpo.add(chanfrada(0.95, 1.95, 4.6, 0.18, amarelo, sx * 4.1, 3.48, -0.2));
    corpo.add(caixa(0.05, 0.12, 10.0, cromado, sx * 4.28, 3.95, -0.2));
  }

  // CAPÔ PLANO (Corcel GT tem capô mais reto que o Fusca)
  corpo.add(chanfrada(7.6, 0.65, 4.6, 0.35, amarelo, 0, 3.52, 3.7));
  // Tampa do capô levemente elevada
  corpo.add(caixa(7.4, 0.12, 4.4, amareloEsc, 0, 3.87, 3.7));

  // FAIXAS PRETAS no capô — elevadas acima do capô para não ter Z-fighting
  corpo.add(caixa(1.15, 0.16, 4.35, pretoFaixa, -0.9, 3.96, 3.7));
  corpo.add(caixa(1.15, 0.16, 4.35, pretoFaixa,  0.9, 3.96, 3.7));
  // Faixas continuam na cabine (teto)
  corpo.add(caixa(1.15, 0.12, 3.6, pretoFaixa, -0.9, 5.22, -0.3));
  corpo.add(caixa(1.15, 0.12, 3.6, pretoFaixa,  0.9, 5.22, -0.3));

  // TRASEIRA QUASE VERTICAL
  corpo.add(chanfrada(7.6, 2.0, 2.0, 0.38, amarelo, 0, 3.6, -4.3));

  // CABINE — mais reta e baixa (cupê real, não bolhuda)
  // Base da cabine (caixa achatada)
  corpo.add(chanfrada(7.6, 1.05, 4.2, 0.35, amarelo, 0, 4.12, -0.3));
  // Teto reto e baixo
  corpo.add(chanfrada(7.2, 0.35, 3.8, 0.28, amareloEsc, 0, 4.95, -0.3));
  // Topo do teto (faixas pretas já adicionadas acima)
  corpo.add(caixa(7.0, 0.1, 3.6, amareloEsc, 0, 5.15, -0.3));

  // COLUNA A (dianteira) e B (traseira)
  for (const sx of [-1, 1]) {
    corpo.add(caixa(0.2, 1.0, 0.25, amareloEsc, sx * 3.7, 4.55, 1.85));  // A
    corpo.add(caixa(0.2, 1.0, 0.25, amareloEsc, sx * 3.7, 4.55, -2.4));  // B
  }

  // PARA-BRISA (mais inclinado — cupê esportivo)
  const pb = pronto(new THREE.Mesh(new THREE.PlaneGeometry(6.8, 1.55), vidro));
  pb.rotation.x = -0.52; pb.position.set(0, 4.6, 1.72); corpo.add(pb);
  corpo.add(caixa(6.9, 0.09, 0.09, cromado, 0, 5.18, 1.72));
  corpo.add(caixa(6.9, 0.09, 0.09, cromado, 0, 4.05, 1.85));

  // VIGIA TRASEIRO (mais vertical)
  const vt = pronto(new THREE.Mesh(new THREE.PlaneGeometry(5.5, 1.45), vidro));
  vt.rotation.x = 0.32; vt.position.set(0, 4.52, -2.4); corpo.add(vt);
  corpo.add(caixa(5.6, 0.09, 0.09, cromado, 0, 5.16, -2.4));

  // JANELAS LATERAIS
  for (const sx of [-1, 1]) {
    const jl = pronto(new THREE.Mesh(new THREE.PlaneGeometry(3.8, 0.95), vidro));
    jl.rotation.y = Math.PI / 2 * sx;
    jl.position.set(sx * 4.12, 4.55, -0.3);
    corpo.add(jl);
    // Moldura da janela
    corpo.add(caixa(0.06, 0.95, 0.09, cromado, sx * 4.2, 4.55, 1.82));
    corpo.add(caixa(0.06, 0.95, 0.09, cromado, sx * 4.2, 4.55, -2.38));
  }

  // PARA-CHOQUES CROMADOS FINOS
  corpo.add(caixa(8.4, 0.42, 0.48, cromado, 0, 2.85, 6.05));
  corpo.add(caixa(8.0, 0.2,  0.28, cromado, 0, 3.28, 6.0 ));
  for (const sx of [-1, 1]) {
    corpo.add(caixa(0.42, 0.42, 0.65, cromado, sx * 3.95, 2.85, 5.78));
  }
  corpo.add(caixa(8.4, 0.42, 0.48, cromado, 0, 2.85, -6.45));
  corpo.add(caixa(8.0, 0.2,  0.28, cromado, 0, 3.28, -6.4 ));

  // GRADE FRONTAL ESCURA com moldura cromada bem visível
  corpo.add(caixa(7.2, 1.55, 0.55, pretoMatte, 0, 3.52, 5.88));
  // Moldura cromada grossa ao redor
  corpo.add(caixa(7.4, 0.14, 0.56, cromado, 0,     4.32, 5.88)); // topo
  corpo.add(caixa(7.4, 0.14, 0.56, cromado, 0,     2.75, 5.88)); // base
  corpo.add(caixa(0.14, 1.55, 0.56, cromado, -3.65, 3.52, 5.88)); // esq
  corpo.add(caixa(0.14, 1.55, 0.56, cromado,  3.65, 3.52, 5.88)); // dir
  // Listras horizontais internas
  for (let i = 0; i < 4; i++) {
    corpo.add(caixa(6.9, 0.07, 0.56, M(0x252525), 0, 2.95 + i * 0.34, 5.88));
  }

  // FARÓIS QUADRADOS DUPLOS (2 por lado)
  for (const sx of [-1, 1]) {
    // Externo
    corpo.add(caixa(1.38, 1.0, 0.18, farolRim,    sx * 2.72, 3.88, 6.08));
    corpo.add(caixa(1.18, 0.82, 0.13, farolAceso,  sx * 2.72, 3.88, 6.22));
    // Interno
    corpo.add(caixa(1.05, 1.0, 0.18, farolRim,    sx * 1.42, 3.88, 6.08));
    corpo.add(caixa(0.85, 0.82, 0.13, farolAceso,  sx * 1.42, 3.88, 6.22));
    // Divisor
    corpo.add(caixa(0.09, 1.0, 0.18, pretoMatte, sx * 2.02, 3.88, 6.08));
    // Pisca abaixo
    corpo.add(caixa(1.38, 0.5, 0.16, lanternaAmb, sx * 2.72, 3.15, 6.02));
  }

  // LANTERNAS TRASEIRAS HORIZONTAIS LARGAS
  for (const sx of [-1, 1]) {
    corpo.add(caixa(2.85, 0.95, 0.22, lanternaR,   sx * 2.75, 3.75, -6.36));
    corpo.add(caixa(0.95, 0.95, 0.22, lanternaAmb, sx * 3.98, 3.75, -6.36));
    corpo.add(caixa(0.09, 0.95, 0.22, cromado, sx * 1.3,  3.75, -6.36));
    corpo.add(caixa(0.09, 0.95, 0.22, cromado, sx * 4.48, 3.75, -6.36));
  }
  corpo.add(caixa(9.1, 0.09, 0.22, cromado, 0, 4.25, -6.36));
  corpo.add(caixa(9.1, 0.09, 0.22, cromado, 0, 3.28, -6.36));

  // EMBLEMA "GT" nos paralamas
  for (const sx of [-1, 1]) {
    corpo.add(caixa(0.55, 0.28, 0.09, cromado, sx * 4.18, 3.98, 1.8));
  }

  // PLACAS
  corpo.add(caixa(2.8, 0.85, 0.1, M(0xf0f0e0), 0, 2.95, 6.22));
  corpo.add(caixa(2.8, 0.85, 0.1, M(0xf0f0e0), 0, 2.95, -6.5));

  // 4 RODAS — calota esportiva preta + aro cromado
  const posRodas = [
    [+4.42, 2.82,  3.5],
    [-4.42, 2.82,  3.5],
    [+4.42, 2.82, -3.8],
    [-4.42, 2.82, -3.8],
  ];
  for (const [rx, ry, rz] of posRodas) {
    const g = new THREE.Group(); g.position.set(rx, ry, rz);
    const pneu = pronto(new THREE.Mesh(new THREE.TorusGeometry(1.32, 0.54, 18, 36), borracha));
    pneu.rotation.y = Math.PI / 2; g.add(pneu);
    const calota = pronto(new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.88, 0.13, 24), calotaPreta));
    calota.rotation.z = Math.PI / 2; g.add(calota);
    const aro = pronto(new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.07, 10, 28), cromado));
    aro.rotation.y = Math.PI / 2; g.add(aro);
    for (let i = 0; i < 5; i++) {
      const raio = pronto(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.7, 0.05), cromado));
      raio.rotation.z = (i * Math.PI * 2) / 5;
      raio.position.x = rx > 0 ? 0.1 : -0.1;
      g.add(raio);
    }
    const centro = pronto(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.2, 12), cromado));
    centro.rotation.z = Math.PI / 2; g.add(centro);
    corpo.add(g);
  }

  root.add(corpo);

  // SENSORES OCULTOS
  const ultra = olhoUltra(0.65, 0, 3.0, 5.9); ultra.visible = false; root.add(ultra);
  const sensorGnd = sensorCor(0xe6e7e8); posicionar(sensorGnd, 0, 2.2, 4.0); root.add(sensorGnd);
  const feixe = criarFeixe(1.4); posicionar(feixe.grupo, 0, 0, 4.0); root.add(feixe.grupo);
  root.add(cil(0.45, 1.3, pretoMatte, 'y', 0, 2.4, -4.2, 12));
  const bola = pronto(new THREE.Mesh(new THREE.SphereGeometry(1.2, 18, 12),
    M(0xd7d9db, { metalness: 0.6, roughness: 0.25 })));
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
    trepida += dt * 48;
    corpo.position.y = 0.012 * Math.sin(trepida) + 0.005 * Math.sin(trepida * 2.8);
    balanço += (((velB - velC) * 0.002) - balanço) * Math.min(1, (dt || 0.05) * 5);
    corpo.rotation.z = 0;
    corpo.position.x = Math.max(-0.4, Math.min(0.4, balanço * 8));
    corpo.position.z = est.bip ? 0.12 * Math.sin(est.t * 65) : 0;
  }

  const lcdMock = { desenhar: () => {} };
  return {
    nome: 'corcelGT', grupo: root, rodaB, rodaC,
    leds: [M(0x1a1d1f)], feixe, lcd: lcdMock,
    partes: { corpoCarro: corpo, ultra }, animar,
  };
}