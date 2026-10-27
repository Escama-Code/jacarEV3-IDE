// =====================================================================
//  ROBÔ — "Fuscão Clássico Brasileiro" v2 — Melhorado
// =====================================================================
import * as THREE from 'three';
import {
  M, pronto, posicionar, caixa, cil, chanfrada, cone,
  criarLCD, planoLCD, construirRoda, olhoUltra, sensorCor, criarFeixe,
  CM_POR_GRAU, RAIO_RODA,
} from './helpers.mjs';

export function construirRoboCarroFusca() {
  const root = new THREE.Group(); root.name = 'carro-fusca';

  // --- PALETA ---
  const corLataria    = M(0xd9b44a, { roughness: 0.15, metalness: 0.15 }); // Amarelo Colonial
  const corLatariaEsc = M(0xb8922a, { roughness: 0.2,  metalness: 0.1  }); // Amarelo escuro (detalhes)
  const cromado       = M(0xe0e0e0, { roughness: 0.05, metalness: 0.95 });
  const pretoPlastico = M(0x111111, { roughness: 0.8 });
  const pretoMatte    = M(0x1a1a1a, { roughness: 0.95 });
  const vidroVidraça  = M(0x223344, { roughness: 0.05, transparent: true, opacity: 0.65 });
  const farolAceso    = M(0xfffaed, { emissive: 0xfff0cc, emissiveIntensity: 1.5 });
  const farolRim      = M(0xf0f0f0, { roughness: 0.1,  metalness: 0.8 });
  const lanternaR     = M(0xdd1100, { emissive: 0xaa0000, emissiveIntensity: 0.8 });
  const lanternaAmb   = M(0xffaa00, { emissive: 0xcc7700, emissiveIntensity: 0.6 }); // pisca
  const borracha      = M(0x151515, { roughness: 1.0 });
  const aroCal        = M(0xd0d0d0, { roughness: 0.1,  metalness: 0.9 });

  // --- RODAS FÍSICAS (ocultas) ---
  const rodaB = construirRoda('ev3', +1); rodaB.visible = false;
  const rodaC = construirRoda('ev3', -1); rodaC.visible = false;
  root.add(rodaB, rodaC);

  // ================================================================
  //  CARROCERIA
  // ================================================================
  const corpo = new THREE.Group(); corpo.name = 'carroceria';

  // CHASSI PLANO
  corpo.add(caixa(8.6, 0.55, 13.0, pretoMatte, 0, 2.5, -0.3));

  // SOLEIRAS LATERAIS
  for (const sx of [-1, 1]) {
    corpo.add(caixa(0.35, 0.4, 10.5, pretoPlastico, sx * 4.45, 2.75, -0.3));
  }

  // PARALAMAS DIANTEIROS (mais redondos, estilo Fusca)
  for (const sx of [-1, 1]) {
    corpo.add(chanfrada(1.5, 1.5, 3.5, 0.45, corLataria, sx * 3.9, 3.3,  3.8));
    // Arco de roda visual (decorativo)
    const arco = pronto(new THREE.Mesh(
      new THREE.TorusGeometry(1.45, 0.18, 12, 32, Math.PI),
      pretoPlastico
    ));
    arco.rotation.z = Math.PI / 2;
    arco.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
    arco.position.set(sx * 4.55, 3.1, 3.8);
    corpo.add(arco);
  }

  // PARALAMAS TRASEIROS
  for (const sx of [-1, 1]) {
    corpo.add(chanfrada(1.5, 1.6, 3.8, 0.45, corLataria, sx * 3.9, 3.35, -4.0));
    const arco = pronto(new THREE.Mesh(
      new THREE.TorusGeometry(1.45, 0.18, 12, 32, Math.PI),
      pretoPlastico
    ));
    arco.rotation.z = Math.PI / 2;
    arco.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
    arco.position.set(sx * 4.55, 3.1, -4.0);
    corpo.add(arco);
  }

  // PAINEL LATERAL (carroceria entre paralamas)
  for (const sx of [-1, 1]) {
    corpo.add(chanfrada(1.0, 1.8, 4.5, 0.25, corLataria, sx * 4.3, 3.4, -0.2));
  }

  // CAPÔ DIANTEIRO (porta-malas — Fusca tem motor atrás)
  corpo.add(chanfrada(7.2, 1.3, 4.2, 0.5, corLataria,  0, 3.5,  4.2));
  corpo.add(chanfrada(6.8, 0.25, 4.0, 0.2, corLatariaEsc, 0, 4.15, 4.2)); // Tampa capô
  // Friso do capô
  corpo.add(caixa(0.08, 0.05, 3.8, cromado, 0, 4.28, 4.2));

  // TAMPA TRASEIRA (motor)
  corpo.add(chanfrada(7.2, 1.6, 3.8, 0.5, corLataria, 0, 3.6, -4.4));
  corpo.add(chanfrada(6.8, 0.25, 3.6, 0.2, corLatariaEsc, 0, 4.45, -4.4));
  corpo.add(caixa(0.08, 0.05, 3.4, cromado, 0, 4.58, -4.4));

  // CABINE — formato oval clássico do Fusca (mais fiel)
  const geo = new THREE.SphereGeometry(1, 28, 22);
  const cabine = pronto(new THREE.Mesh(geo, corLataria));
  cabine.scale.set(3.5, 1.5, 4.6);
  cabine.position.set(0, 4.55, -0.5);
  corpo.add(cabine);

  // FRISO CROMADO LATERAL (detalhe clássico)
  for (const sx of [-1, 1]) {
    corpo.add(caixa(0.08, 0.12, 11.0, cromado, sx * 4.5, 3.85, -0.3));
  }

  // FRISO CROMADO AO REDOR DAS JANELAS
  corpo.add(caixa(7.05, 0.1, 0.1, cromado, 0, 5.15, 1.75)); // topo para-brisa
  corpo.add(caixa(7.05, 0.1, 0.1, cromado, 0, 5.15, -2.8));

  // PARA-BRISA DIANTEIRO
  const pb = pronto(new THREE.Mesh(new THREE.PlaneGeometry(5.5, 1.6), vidroVidraça));
  pb.rotation.x = -0.28; pb.position.set(0, 4.52, 1.75); corpo.add(pb);

  // VIGIA TRASEIRO
  const vt = pronto(new THREE.Mesh(new THREE.PlaneGeometry(4.8, 1.4), vidroVidraça));
  vt.rotation.x = 0.3; vt.position.set(0, 4.48, -2.8); corpo.add(vt);

  // JANELAS LATERAIS
  for (const sx of [-1, 1]) {
    const jl = pronto(new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.1), vidroVidraça));
    jl.rotation.y = Math.PI / 2 * sx;
    jl.position.set(sx * 3.52, 4.5, -0.6);
    corpo.add(jl);
  }

  // TETO METÁLICO (sobre a cabine)
  corpo.add(chanfrada(6.2, 0.22, 4.8, 0.3, corLatariaEsc, 0, 5.78, -0.5));

  // ================================================================
  //  PARA-CHOQUES CROMADOS (lâmina dupla estilo retrô)
  // ================================================================
  // Dianteiro
  corpo.add(caixa(9.4, 0.35, 0.5, cromado, 0, 2.85, 6.1));
  corpo.add(caixa(9.0, 0.25, 0.3, cromado, 0, 3.25, 6.05));
  // Ponteiras do para-choque
  for (const sx of [-1, 1]) {
    corpo.add(caixa(0.4, 0.35, 0.8, cromado, sx * 4.3, 2.85, 5.8));
  }

  // Traseiro
  corpo.add(caixa(9.4, 0.35, 0.5, cromado, 0, 2.85, -6.7));
  corpo.add(caixa(9.0, 0.25, 0.3, cromado, 0, 3.25, -6.65));
  for (const sx of [-1, 1]) {
    corpo.add(caixa(0.4, 0.35, 0.8, cromado, sx * 4.3, 2.85, -6.45));
  }

  // ================================================================
  //  FARÓIS REDONDOS CLÁSSICOS (estilo Fusca 1970s)
  // ================================================================
  for (const sx of [-1, 1]) {
    // Carcaça cromada do farol
    corpo.add(cil(0.75, 0.45, farolRim,  'z', sx * 2.6, 3.95, 5.95));
    // Lente acesa
    corpo.add(cil(0.60, 0.12, farolAceso,'z', sx * 2.6, 3.95, 6.22));
    // Aro externo
    const aF = pronto(new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.08, 10, 28), cromado));
    aF.rotation.y = Math.PI / 2; aF.position.set(sx * 2.6, 3.95, 6.0);
    corpo.add(aF);
    // Pisca dianteiro (âmbar)
    corpo.add(cil(0.38, 0.2, lanternaAmb, 'z', sx * 3.85, 3.5, 5.95));
  }

  // ================================================================
  //  LANTERNAS TRASEIRAS ("gotinha" / teardrop estilo anos 70)
  // ================================================================
  for (const sx of [-1, 1]) {
    corpo.add(chanfrada(0.6, 1.1, 0.3, 0.18, lanternaR,  sx * 3.3, 3.75, -6.45));
    corpo.add(chanfrada(0.5, 0.55, 0.2, 0.12, lanternaAmb, sx * 3.3, 4.9,  -6.45));
    // Aro
    const aT = pronto(new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.07, 8, 22), cromado));
    aT.rotation.x = Math.PI / 2; aT.position.set(sx * 3.3, 3.75, -6.45);
    corpo.add(aT);
  }

  // ================================================================
  //  PLACA DE IDENTIFICAÇÃO
  // ================================================================
  corpo.add(caixa(2.8, 0.9, 0.1, M(0xf0f0e0), 0, 2.9, 6.35));  // Dianteira
  corpo.add(caixa(2.8, 0.9, 0.1, M(0xf0f0e0), 0, 2.9, -6.95)); // Traseira

  // ================================================================
  //  4 RODAS VISUAIS DO FUSCA
  // ================================================================
  const posRodas = [
    [+4.6, 2.85,  3.6],  // Dianteira Esq
    [-4.6, 2.85,  3.6],  // Dianteira Dir
    [+4.6, 2.85, -4.0],  // Traseira Esq
    [-4.6, 2.85, -4.0],  // Traseira Dir
  ];

  for (const [rx, ry, rz] of posRodas) {
    const grupoRoda = new THREE.Group();
    grupoRoda.position.set(rx, ry, rz);

    // Pneu
    const pneu = pronto(new THREE.Mesh(
      new THREE.TorusGeometry(1.35, 0.55, 18, 36),
      borracha
    ));
    pneu.rotation.y = Math.PI / 2;
    grupoRoda.add(pneu);

    // Calota cromada
    const calota = pronto(new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 0.85, 0.12, 24),
      aroCal
    ));
    calota.rotation.z = Math.PI / 2;
    grupoRoda.add(calota);

    // Centro da calota (parafuso central)
    const centro = pronto(new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.2, 12),
      cromado
    ));
    centro.rotation.z = Math.PI / 2;
    centro.position.x = rx > 0 ? 0.16 : -0.16;
    grupoRoda.add(centro);

    // Raios simples (4 raios)
    for (let i = 0; i < 4; i++) {
      const raio = pronto(new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.62, 0.06),
        aroCal
      ));
      raio.rotation.z = (i * Math.PI) / 2;
      raio.position.x = rx > 0 ? 0.1 : -0.1;
      grupoRoda.add(raio);
    }

    corpo.add(grupoRoda);
  }

  // ================================================================
  //  DETALHE DO MOTOR A AR (grade traseira decorativa)
  // ================================================================
  for (let i = -1; i <= 1; i++) {
    corpo.add(caixa(5.5, 0.08, 0.4, cromado, 0, 3.8 + i * 0.32, -6.2));
  }

  root.add(corpo);

  // ================================================================
  //  SENSORES OCULTOS (físicos, obrigatórios)
  // ================================================================
  const ultra = olhoUltra(0.65, 0, 3.0, 5.8);
  ultra.add(olhoUltra(0.4, -1.4, 0, 0.1), olhoUltra(0.4, 1.4, 0, 0.1));
  ultra.visible = false;
  root.add(ultra);

  const sensorGnd = sensorCor(0xe6e7e8);
  posicionar(sensorGnd, 0, 2.2, 4.0); root.add(sensorGnd);

  const feixe = criarFeixe(1.4);
  posicionar(feixe.grupo, 0, 0, 4.0); root.add(feixe.grupo);

  // Rodinha boba
  root.add(cil(0.45, 1.3, pretoPlastico, 'y', 0, 2.4, -4.0, 12));
  const bola = pronto(new THREE.Mesh(
    new THREE.SphereGeometry(1.2, 18, 12),
    M(0xd7d9db, { metalness: 0.6, roughness: 0.25 })
  ));
  posicionar(bola, 0, 1.2, -4.0); root.add(bola);

  // ================================================================
  //  ANIMAÇÃO
  // ================================================================
  let tAnt = null, encAnt = null, trepidaMotor = 0, balançoCurva = 0;

  function animar(est) {
    let dist = 0, dt = 0;
    if (tAnt !== null) {
      dt = est.t - tAnt;
      if (dt > 0 && dt < 0.25) {
        dist = (Math.abs(est.encB - encAnt[0]) + Math.abs(est.encC - encAnt[1])) / 2 * CM_POR_GRAU;
      }
    }
    tAnt = est.t; encAnt = [est.encB, est.encC];

    
// Por isso:
let velB = 0, velC = 0;
if (tAnt !== null && dt > 0 && dt < 0.25) {
  velB = (est.encB - encAnt[0]) / dt;
  velC = (est.encC - encAnt[1]) / dt;
}
const diferencaRodas = velB - velC;

    // Tremor do motor a ar (característico do Fusca)
    trepidaMotor += dt * 42;
    corpo.position.y = 0.018 * Math.sin(trepidaMotor) + 0.008 * Math.sin(trepidaMotor * 2.3);

    // Inclinação nas curvas
    balançoCurva += ((diferencaRodas * 0.004) - balançoCurva) * Math.min(1, (dt || 0.05) * 5);
    corpo.rotation.z = balançoCurva;

    // Buzina
    corpo.position.z = est.bip ? 0.12 * Math.sin(est.t * 65) : 0;
  }

  const lcdMock = { desenhar: () => {} };
  const ledMatMock = M(0x1a1d1f);

  return {
    nome: 'carroBrasileiro',
    grupo: root,
    rodaB,
    rodaC,
    leds: [ledMatMock],
    feixe,
    lcd: lcdMock,
    partes: { corpoCarro: corpo, ultra },
    animar,
  };
}