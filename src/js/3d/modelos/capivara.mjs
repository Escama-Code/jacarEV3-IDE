// ============================================================
// capivara.mjs — modelo 3D: Capivara (Robô EV3)
// Devuelve o rig completo com rodas, LCD, LEDs, feixe e animações.
// ============================================================
import * as THREE from 'three';
import {
  M, pronto, posicionar, caixa, cil, chanfrada, cone, cabo, viga,
  criarLCD, planoLCD, construirRoda, olhoUltra, sensorCor, criarFeixe,
  DEG, CM_POR_GRAU, RAIO_RODA, LARG_RODA, SEMI_BITOLA, COR_LED,
} from './_helpers.mjs';

export function construirRoboCapivara() {
  const root = new THREE.Group(); root.name = 'capivara';

  // Paleta de cores (tons de marrom e bege típicos da capivara)
  const marrom = M(0x8b5a2b, { roughness: 0.7 });
  const marromEsc = M(0x5c3a1e, { roughness: 0.8 });
  const marromClaro = M(0xb8860b, { roughness: 0.6 });
  const focinhoMat = M(0x3a2514, { roughness: 0.9 });
  const barriga = M(0xd2b48c, { roughness: 0.7 });
  const cinzaEsc = M(0x3b3f43), preto = M(0x111111), dente = M(0xfffdf0, { roughness: 0.3 });

  // Rodas de tração (Motores B e C)
  const rodaB = construirRoda('capivara', +1), rodaC = construirRoda('capivara', -1);
  root.add(rodaB, rodaC);

  // ------------------------------------------------------------
  // CHASSI / CORPO (Estilo EV3 Robusto)
  // ------------------------------------------------------------
  // Corpo principal (arredondado/chanfrado estilo bloco EV3)
  root.add(chanfrada(8.8, 5.0, 11.0, 0.9, marrom, 0, 4.8, -0.2));
  // Peitoral / Barriga
  root.add(chanfrada(7.2, 1.4, 10.0, 0.4, barriga, 0, 2.65, -0.2));

  // Detalhes dorsais (pêlos estilizados em pequenos cones na garupa)
  for (let z = -4.5; z <= 1.5; z += 1.2) {
    for (const x of [-2.5, 0, 2.5]) {
      root.add(cone(0.35, 0.6, marromEsc, 4, x, 7.5, z));
    }
  }

  // Painel Dorsal: LCD + LEDs
  root.add(chanfrada(5.4, 0.5, 5.2, 0.15, cinzaEsc, 0, 7.4, -1.5));
  const lcd = criarLCD(); 
  root.add(planoLCD(3.0, 2.1, lcd, 0, 7.71, -0.6));

  const ledMat = new THREE.MeshStandardMaterial({ 
    color: 0x1a1d1f, emissive: 0x000000, emissiveIntensity: 1.5, roughness: 0.3 
  });
  root.add(caixa(1.3, 0.14, 0.45, ledMat, -1.8, 7.7, -3.3), caixa(1.3, 0.14, 0.45, ledMat, 1.8, 7.7, -3.3));

  // "Coxas" de conexão aos eixos
  for (const s of [+1, -1]) {
    root.add(chanfrada(0.9, 3.4, 3.6, 0.3, marromEsc, s * 4.65, 4.2, 0));
    root.add(cil(0.5, 1.6, M(0x222426), 'x', s * 5.4, RAIO_RODA, 0, 12));
  }

  // Patas decorativas curtas e quadradas (característica da capivara)
  for (const s of [+1, -1]) {
    for (const z of [3.8, -4.0]) {
      const pata = new THREE.Group(); 
      posicionar(pata, s * 4.0, 3.6, z);
      pata.add(chanfrada(2.2, 2.2, 1.8, 0.3, marromEsc, s * 0.8, -0.6, 0));
      // Cascos/Patas semi-patadas
      pata.add(chanfrada(1.8, 0.5, 1.4, 0.2, marromClaro, s * 0.8, -1.8, 0.3));
      root.add(pata);
    }
  }

  // ------------------------------------------------------------
  // CABEÇA (Formato Retangular/Quadrado Robótico da Capivara)
  // ------------------------------------------------------------
  const cabeca = new THREE.Group(); cabeca.name = 'cabeca'; 
  posicionar(cabeca, 0, 5.8, 4.0);

  // Bloco do Crânio e Focinho (Alto e retangular)
  cabeca.add(chanfrada(5.0, 3.6, 4.8, 0.5, marrom, 0, 0.5, 1.8));      // Bloco principal da cabeça
  cabeca.add(chanfrada(4.6, 3.2, 2.0, 0.4, focinhoMat, 0, 0.3, 4.8));  // Focinho quadrado característico

  // Narinas pretas duplas no topo do focinho
  for (const s of [-1, 1]) {
    cabeca.add(cil(0.2, 0.3, preto, 'z', s * 0.8, 1.2, 5.8, 10));
  }

  // Dentes incisivos gigantes de roedor na parte frontal inferior
  for (const s of [-0.3, 0.3]) {
    cabeca.add(caixa(0.45, 1.0, 0.2, dente, s, -1.2, 5.2));
  }

  // Olhos Ultrassônicos posicionados no alto da cabeça
  for (const s of [-1, 1]) {
    const olho = olhoUltra(0.9, s * 1.8, 1.5, 2.5); 
    olho.name = 'olho_ultrassonico'; 
    cabeca.add(olho);
  }

  // Orelhas pequenas e arredondadas no topo da cabeça
  const orelhas = [];
  for (const s of [-1, 1]) {
    const orelha = new THREE.Group();
    posicionar(orelha, s * 2.3, 2.2, 0.2);
    orelha.add(chanfrada(0.8, 1.1, 0.4, 0.2, marromEsc, 0, 0, 0));
    cabeca.add(orelha);
    orelhas.push(orelha);
  }

  // Orelhas e cabeça no chassi principal
  root.add(cabeca);

  // ------------------------------------------------------------
  // SENSORES E ACESSÓRIOS
  // ------------------------------------------------------------
  // Sensor de cor montado sob o queixo
  const sensorGrounded = sensorCor(0x28a745); 
  posicionar(sensorGrounded, 0, 2.2, 5.8); 
  root.add(sensorGrounded);
  root.add(caixa(2.0, 0.4, 1.0, cinzaEsc, 0, 3.5, 5.2));

  // Apoio Traseiro (Caster Ball para estabilidade)
  root.add(cil(0.45, 1.3, cinzaEsc, 'y', 0, 2.4, -4.2, 12));
  const bola = pronto(new THREE.Mesh(
    new THREE.SphereGeometry(1.2, 18, 12), 
    M(0xd7d9db, { metalness: 0.6, roughness: 0.25 })
  ));
  posicionar(bola, 0, 1.2, -4.2); 
  root.add(bola);

  // Feixe de luz óptico frontal
  const feixe = criarFeixe(1.4); 
  posicionar(feixe.grupo, 0, 0, 5.8); 
  root.add(feixe.grupo);

  // ------------------------------------------------------------
  // ANIMAÇÃO DE COMPORTAMENTO
  // Movimentos suaves: mexe as orelhas, mastiga no bip e balança a cabeça ao andar
  // ------------------------------------------------------------
  let tAnt = null, encAnt = null, fase = 0, amp = 0, mastigar = 0;

  function animar(est) {
    if (lcd) lcd.desenhar(est);

    let dist = 0, dt = 0;
    if (tAnt !== null) { 
      dt = est.t - tAnt; 
      if (dt > 0 && dt < 0.25) {
        dist = (Math.abs(est.encB - encAnt[0]) + Math.abs(est.encC - encAnt[1])) / 2 * CM_POR_GRAU; 
      } else dt = 0; 
    }

    tAnt = est.t; 
    encAnt = [est.encB, est.encC];

    const vel = dt > 0 ? dist / dt : 0;
    amp += ((Math.min(vel / 20, 1) * 0.25) - amp) * Math.min(1, (dt || 0.05) * 8);
    fase += dist * 0.8;

    // Ação no Bip: a capivara "mastiga" com o focinho/cabeça
    mastigar += ((est.bip ? 0.2 : 0) - mastigar) * Math.min(1, (dt || 0.05) * 12);

    // Movimento da cabeça (ritmo tranquilo de andar + mastigação)
    cabeca.rotation.x = Math.sin(fase * 2) * amp * 0.15 + mastigar * 0.5;
    cabeca.rotation.y = Math.sin(fase) * amp * 0.1;

    // Mexer de orelhas involuntário e ao mastigar
    orelhas[0].rotation.z = Math.sin(est.t * 3) * 0.1 - mastigar * 0.3;
    orelhas[1].rotation.z = -Math.sin(est.t * 3) * 0.1 + mastigar * 0.3;
  }

  return { 
    nome: 'capivara', 
    grupo: root, 
    rodaB, 
    rodaC, 
    leds: [ledMat], 
    feixe, 
    lcd, 
    partes: { cabeca, orelhas }, 
    animar 
  };
}