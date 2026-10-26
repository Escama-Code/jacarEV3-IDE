// ============================================================
// caranguejo.mjs — modelo 3D: Caranguejo (Robô EV3)
// Cada construtor devolve um "rig":
//   { grupo, rodaB, rodaC, leds, feixe, animar?, lcd?, partes? }
// ============================================================
import * as THREE from 'three';
import {
  M, pronto, posicionar, caixa, cil, chanfrada, cone, cabo, viga,
  criarLCD, planoLCD, construirRoda, olhoUltra, sensorCor, criarFeixe,
  DEG, CM_POR_GRAU, RAIO_RODA, LARG_RODA, SEMI_BITOLA, COR_LED,
} from './_helpers.mjs';

export function construirRoboCaranguejo() {
  const root = new THREE.Group(); root.name = 'caranguejo';

  // Paleta de cores (vermelhos e laranjas mecânicos estilo LEGO/EV3)
  const vermelho = M(0xc9362b, { roughness: 0.58 });
  const vermelhoEsc = M(0x84251f, { roughness: 0.62 });
  const laranja = M(0xf07835, { roughness: 0.55 });
  const barriga = M(0xe0ca9e, { roughness: 0.6 });
  const cinzaEsc = M(0x3b3f43), preto = M(0x111111);

  // Rodas de tração (Motores B e C)
  const rodaB = construirRoda('caranguejo', +1), rodaC = construirRoda('caranguejo', -1);
  root.add(rodaB, rodaC);

  // ------------------------------------------------------------
  // CHASSI / CARAPAÇA (Bloco Largo Estilo EV3)
  // ------------------------------------------------------------
  // Carapaça principal larga e chanfrada
  root.add(chanfrada(10.2, 4.2, 8.8, 0.8, vermelho, 0, 4.5, -0.4));
  // Placa inferior (barriga)
  root.add(chanfrada(8.8, 1.2, 7.6, 0.4, barriga, 0, 2.3, -0.4));
  // Placa dorsal superior estilizada
  root.add(chanfrada(7.0, 0.8, 6.0, 0.4, laranja, 0, 6.8, -0.4));

  // Escamas / Segmentos nas bordas laterais do casco
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      root.add(chanfrada(0.8, 1.2, 1.6, 0.2, vermelhoEsc, sx * 5.2, 4.4, -2.2 + i * 1.8));
    }
  }

  // Painel Dorsal: Display LCD + LEDs
  root.add(chanfrada(5.4, 0.5, 5.2, 0.15, cinzaEsc, 0, 7.3, -0.4));
  const lcd = criarLCD();
  root.add(planoLCD(3.0, 2.1, lcd, 0, 7.61, 0.5));

  const ledMat = new THREE.MeshStandardMaterial({
    color: 0x1a1d1f, emissive: 0x000000, emissiveIntensity: 1.5, roughness: 0.3
  });
  root.add(caixa(1.3, 0.14, 0.45, ledMat, -1.8, 7.6, -2.2), caixa(1.3, 0.14, 0.45, ledMat, 1.8, 7.6, -2.2));

  // "Coxas" de suporte ligando o chassi aos eixos das rodas
  for (const s of [+1, -1]) {
    root.add(chanfrada(0.9, 3.4, 3.6, 0.3, vermelhoEsc, s * 4.65, 4.2, 0));
    root.add(cil(0.5, 1.6, M(0x222426), 'x', s * 5.4, RAIO_RODA, 0, 12));
  }

  // ------------------------------------------------------------
  // PATAS DECOLATIVAS LATERAIS (6 patas articuláveis/fixas)
  // ------------------------------------------------------------
  const patas = [];
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const z = 1.8 - i * 1.9;
      const pata = new THREE.Group();
      posicionar(pata, sx * 4.6, 3.8, z);

      // Segmento 1: junta externa
      const seg1 = chanfrada(2.0, 0.5, 0.6, 0.2, vermelhoEsc, sx * 0.9, 0, 0);
      seg1.rotation.y = sx * -0.2;
      pata.add(seg1);

      // Segmento 2: curvatura para baixo
      const seg2 = chanfrada(1.6, 0.4, 0.5, 0.15, vermelho, sx * 2.1, -0.6, 0.2);
      seg2.rotation.z = sx * 0.35;
      pata.add(seg2);

      // Ponta/Garra da pata
      pata.add(cone(0.3, 0.8, laranja, 4, sx * 2.8, -0.9, 0.3, Math.PI / 2));

      root.add(pata);
      patas.push({ grupo: pata, sx, i });
    }
  }

  // ------------------------------------------------------------
  // OLHOS (Sensor Ultrassônico erguido em Hastes/Periscópios)
  // ------------------------------------------------------------
  const hastesOlhos = [];
  for (const sx of [-1, 1]) {
    const haste = new THREE.Group();
    posicionar(haste, sx * 1.6, 6.6, 3.2);

    // Cilindro da haste
    haste.add(cil(0.2, 1.6, vermelhoEsc, 'y', 0, 0.8, 0, 10));

    // Olho ultrassônico no topo
    const olho = olhoUltra(0.85, 0, 1.8, 0.2);
    olho.name = 'olho_ultrassonico';
    haste.add(olho);

    // Pálpebra/Proteção traseira
    haste.add(chanfrada(1.1, 1.1, 0.6, 0.2, vermelho, 0, 1.8, -0.1));

    root.add(haste);
    hastesOlhos.push(haste);
  }

  // ------------------------------------------------------------
  // GARRAS / PINÇAS FRONTAIS (Articuláveis e animadas)
  // ------------------------------------------------------------
  const garras = [];
  for (const sx of [-1, 1]) {
    const garraRaiz = new THREE.Group();
    garraRaiz.name = sx < 0 ? 'garra_esquerda' : 'garra_direita';
    posicionar(garraRaiz, sx * 4.2, 4.4, 3.4);

    // Braço extensor
    const braco = chanfrada(2.2, 0.8, 0.9, 0.25, vermelhoEsc, sx * 1.0, 0, 0.4);
    braco.rotation.y = sx * -0.3;
    garraRaiz.add(braco);

    // Palma da pinça
    garraRaiz.add(chanfrada(1.8, 1.2, 1.5, 0.3, vermelho, sx * 2.1, 0.1, 1.1));

    // Dente Fixo da Pinça
    const denteFixo = cone(0.45, 1.4, laranja, 4, sx * 2.6, 0.25, 2.1, Math.PI / 2);
    denteFixo.rotation.y = sx * -0.4;
    garraRaiz.add(denteFixo);

    // Dente Movel da Pinça
    const denteMovelGroup = new THREE.Group();
    posicionar(denteMovelGroup, sx * 1.8, -0.2, 1.6);
    const denteMovel = cone(0.4, 1.3, laranja, 4, sx * 0.6, 0, 0.5, Math.PI / 2);
    denteMovel.rotation.y = sx * 0.4;
    denteMovelGroup.add(denteMovel);

    garraRaiz.add(denteMovelGroup);
    root.add(garraRaiz);

    garras.push({ raiz: garraRaiz, movel: denteMovelGroup, sx });
  }

  // ------------------------------------------------------------
  // SENSORES E APOIOS
  // ------------------------------------------------------------
  // Sensor de Cor ("língua"/escâner inferior)
  const sensorGrounded = sensorCor(0xd8392b);
  posicionar(sensorGrounded, 0, 2.2, 4.2);
  root.add(sensorGrounded);
  root.add(caixa(2.2, 0.4, 1.0, cinzaEsc, 0, 3.0, 3.6));

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
  posicionar(feixe.grupo, 0, 0, 4.4);
  root.add(feixe.grupo);

  // ------------------------------------------------------------
  // ANIMAÇÃO DE COMPORTAMENTO
  // Movimento lateral das garras, abrir/fechar no BIP e oscilação das hastes
  // ------------------------------------------------------------
  let tAnt = null, encAnt = null, fase = 0, amp = 0, abrirPinca = 0;

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
    amp += ((Math.min(vel / 20, 1) * 0.35) - amp) * Math.min(1, (dt || 0.05) * 8);
    fase += dist * 0.9;

    // Ação do BIP: Abre bem as pinças frontais
    abrirPinca += ((est.bip ? 0.45 : 0) - abrirPinca) * Math.min(1, (dt || 0.05) * 14);

    // Animação das Garras (balançam ao andar e abrem na reação sonora)
    garras.forEach((g, i) => {
      const dir = g.sx;
      const oscilacaoAndar = Math.sin(fase + i * Math.PI) * amp * 0.2;
      g.raiz.rotation.y = dir * -0.1 + oscilacaoAndar;
      g.movel.rotation.y = dir * (abrirPinca + Math.sin(est.t * 2.0) * 0.05);
    });

    // Movimento sutil das hastes dos olhos (efeito periscópio)
    hastesOlhos[0].rotation.z = Math.sin(est.t * 2.5) * 0.05 + amp * 0.1;
    hastesOlhos[1].rotation.z = -Math.sin(est.t * 2.5) * 0.05 - amp * 0.1;

    // Movimento das patas laterais
    patas.forEach((p) => {
      p.grupo.rotation.z = Math.sin(fase + p.i * 0.6) * amp * 0.15 * p.sx;
    });
  }

  return {
    nome: 'caranguejo',
    grupo: root,
    rodaB,
    rodaC,
    leds: [ledMat],
    feixe,
    lcd,
    partes: { garras, hastesOlhos, patas },
    animar
  };
}