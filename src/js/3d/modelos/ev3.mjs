// ============================================================
// ev3.mjs — modelo 3D: LEGO EV3
// Cada construtor devolve um "rig":
//   { grupo, rodaB, rodaC, leds, feixe, animar?, lcd?, partes? }
// ============================================================
import * as THREE from 'three';
import {
  M, pronto, posicionar, caixa, cil, chanfrada, cone, cabo, viga,
  criarLCD, planoLCD, construirRoda, olhoUltra, sensorCor, criarFeixe,
  DEG, CM_POR_GRAU, RAIO_RODA, LARG_RODA, SEMI_BITOLA, COR_LED,
} from './helpers.mjs';

// =====================================================================
//  ROBÔ 1 — "Estilo LEGO EV3"
// =====================================================================

function construirGarraLocal(THREE, M, caixa, posicionar) {
  const grupo = new THREE.Group(); grupo.name = 'garra';
  const cinza = M(0x5a6066), preto = M(0x1c1e20), amarelo = M(0xe8b923);
  grupo.add(caixa(3.2, 1.2, 2.0, cinza, 0, 0, 0));
  grupo.add(caixa(1.4, 0.8, 1.4, preto, 0, 0.9, -0.2));
  const esq = new THREE.Group(); posicionar(esq, -1.1, -0.2, 0.9);
  const dir = new THREE.Group(); posicionar(dir, 1.1, -0.2, 0.9);
  for (const [pai, s] of [[esq, -1], [dir, 1]]) {
    pai.add(caixa(0.55, 0.7, 3.2, cinza, 0, 0, 1.4));
    pai.add(caixa(0.7, 0.5, 1.0, amarelo, 0, -0.15, 3.0));
    pai.add(caixa(0.35, 0.9, 0.5, preto, s * 0.15, -0.35, 3.3));
  }
  grupo.add(esq, dir);
  esq.rotation.y = -0.55; dir.rotation.y = 0.55;
  return { grupo, esq, dir };
}
function aplicarGarraLocal(garra, encA) {
  if (!garra) return;
  const f = Math.max(0, Math.min(1, Math.abs(Number(encA) || 0) / 85));
  const ang = 0.55 - f * 0.47;
  garra.esq.rotation.y = -ang;
  garra.dir.rotation.y = ang;
}

export function construirRoboEV3() {
  const root = new THREE.Group(); root.name = 'ev3';
  const cinzaClaro = M(0xe6e7e8), cinzaMed = M(0x9aa0a6), cinzaEsc = M(0x4b4f54), preto = M(0x1c1e20);

  const rodaB = construirRoda('ev3', +1), rodaC = construirRoda('ev3', -1);
  root.add(rodaB, rodaC);

  // motores grandes (embaixo do bloco) + eixos até as rodas
  for (const s of [+1, -1]) {
    root.add(chanfrada(4.6, 4.2, 8.8, 0.35, cinzaMed, s * 2.7, 2.95, -0.5));
    root.add(caixa(4.0, 0.4, 5.2, cinzaEsc, s * 2.7, 5.15, -0.5));                  // tampa superior escura
    root.add(cil(1.0, 0.5, cinzaEsc, 'x', s * 5.1, RAIO_RODA, 0));                    // flange do eixo
    root.add(cil(0.38, 1.4, M(0x222426), 'x', s * 5.6, RAIO_RODA, 0, 12));            // eixo
    root.add(caixa(1.2, 0.9, 0.9, preto, s * 2.7, 3.4, -5.1));                        // conector traseiro do motor
  }

  // bloco EV3
  const brick = new THREE.Group(); brick.name = 'bloco'; posicionar(brick, 0, 8.1, -1.0);
  brick.add(chanfrada(7.2, 6.2, 11.2, 0.4, cinzaClaro));
  brick.add(chanfrada(7.3, 1.5, 11.3, 0.35, M(0x6a6f74), 0, -2.35, 0));              // faixa cinza inferior
  const topo = 3.1;
  brick.add(caixa(5.4, 0.12, 3.7, preto, 0, topo + 0.02, 1.8));                       // moldura da tela
  const lcd = criarLCD();
  brick.add(planoLCD(4.6, 3.3, lcd, 0, topo + 0.1, 1.8));                             // tela
  brick.add(caixa(1.0, 0.26, 1.0, cinzaEsc, 0, topo + 0.08, -3.0));                   // botão central
  const setas = [[0, 1.2, 0], [0, -1.2, Math.PI], [1.2, 0, -Math.PI / 2], [-1.2, 0, Math.PI / 2]];   // [dx,dz,giro]
  for (const [dx, dz, rot] of setas) {
    brick.add(caixa(1.0, 0.24, 1.0, cinzaEsc, dx, topo + 0.07, -3.0 + dz));
    const seta = cone(0.3, 0.14, M(0xd0d3d6), 3, dx, topo + 0.24, -3.0 + dz); seta.rotation.y = rot; brick.add(seta);   // setinha em relevo
  }
  brick.add(caixa(1.1, 0.24, 0.8, M(0x7a7f84), 2.4, topo + 0.07, -1.7));              // botão "voltar"
  const ledMat = new THREE.MeshStandardMaterial({ color: 0x1a1d1f, emissive: 0x000000, emissiveIntensity: 1.5, roughness: 0.3 });
  for (const [x, z, w, d] of [[2.15, -3.0, 0.38, 2.9], [-2.15, -3.0, 0.38, 2.9], [0, -4.65, 3.2, 0.34]]) brick.add(caixa(w, 0.14, d, ledMat, x, topo + 0.05, z));  // LEDs em volta dos botões
  for (let i = 0; i < 4; i++) {                                                       // portas de entrada 1-4 (frente) e saída A-D (trás)
    brick.add(caixa(1.2, 0.9, 0.3, preto, -2.4 + i * 1.6, 0.6, 5.65));
    brick.add(caixa(1.2, 0.9, 0.3, preto, -2.4 + i * 1.6, 0.6, -5.65));
  }
  root.add(brick);

  // suporte frontal: vigas + sensores
  const vigaMat = M(0x2f3236);
  root.add(viga(3.4, vigaMat, 2.4, 4.2, 5.4), viga(3.4, vigaMat, -2.4, 4.2, 5.4));
  root.add(caixa(7.0, 0.8, 0.8, vigaMat, 0, 4.2, 6.9));
  {
    const esq = sensorCor(0xe6e7e8); esq.name = 'sensor_cor_esq'; posicionar(esq, -2.0, 2.6, 5.5); root.add(esq);
    const cen = sensorCor(0xe6e7e8); cen.name = 'sensor_cor_cen'; posicionar(cen, 0, 2.6, 5.5); root.add(cen);
    const dir = sensorCor(0xe6e7e8); dir.name = 'sensor_cor_dir'; posicionar(dir, 2.0, 2.6, 5.5); root.add(dir);
  }
  const garra = construirGarraLocal(THREE, M, caixa, posicionar);
  posicionar(garra.grupo, 0, 6.8, 7.2); root.add(garra.grupo);
  const ultra = new THREE.Group(); posicionar(ultra, 0, 6.2, 7.0);
  ultra.add(chanfrada(6.2, 3.0, 2.2, 0.3, M(0xeceded)));
  ultra.add(olhoUltra(1.15, 1.6, 0, 1.2), olhoUltra(1.15, -1.6, 0, 1.2));
  root.add(ultra);
  root.add(cabo([[0.6, 3.8, 5.5], [0.9, 5.2, 5.0], [0.8, 7.0, 4.7]]));                // cor → porta 3
  root.add(cabo([[0, 7.6, 6.0], [0.2, 8.4, 5.2], [-0.4, 8.7, 4.7]]));                 // ultrassônico → porta 4
  for (const s of [+1, -1]) root.add(cabo([[s * 2.7, 3.4, -5.4], [s * 2.5, 3.0, -6.4], [s * 1.2, 7.0, -6.4], [s * 0.8, 8.2, -6.7]]));   // motores → portas B/C

  // roda boba traseira
  root.add(caixa(3.0, 0.8, 2.3, cinzaEsc, 0, 3.7, -5.9));
  root.add(cil(1.0, 0.9, preto, 'y', 0, 2.95, -6.2));
  const bola = pronto(new THREE.Mesh(new THREE.SphereGeometry(1.25, 20, 14), M(0xd7d9db, { metalness: 0.6, roughness: 0.25 })));
  posicionar(bola, 0, 1.25, -6.2); root.add(bola);

  const feixe = criarFeixe(1.4); posicionar(feixe.grupo, 0, 0, 5.5); root.add(feixe.grupo);
  return {
    nome: 'ev3', grupo: root, rodaB, rodaC, leds: [ledMat], feixe, lcd, garra,
    animar(est) {
      if (lcd) lcd.desenhar(est);
      aplicarGarraLocal(garra, est.encA);
    },
  };
}
