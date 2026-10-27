// ============================================================
// arara.mjs — modelo 3D: Arara-Azul Adulta em Voo (Robô EV3)
// ============================================================
import * as THREE from 'three';
import {
  M, pronto, posicionar, caixa, cil, chanfrada, cone,
  criarLCD, planoLCD, construirRoda, olhoUltra, sensorCor, criarFeixe,
  CM_POR_GRAU, RAIO_RODA,
} from './_helpers.mjs';

export function construirRoboArara() {
  const root = new THREE.Group(); root.name = 'arara';  

  // Paleta de cores da Arara-Azul Adulta
  const azulCobalto = M(0x0047ab, { roughness: 0.4 });
  const azulEscuro = M(0x0a1e36, { roughness: 0.5 });
  const amareloPenumbra = M(0xfdca00, { roughness: 0.3 });
  const bicoPreto = M(0x111111, { roughness: 0.2 });
  const cinzaEsc = M(0x3b3f43);

  // Rodas de tração (Motores B e C)
  const rodaB = construirRoda('arara', +1), rodaC = construirRoda('arara', -1);
  root.add(rodaB, rodaC);

  // ------------------------------------------------------------
  // CHASSI / CORPO EXTENDIDO (Postura Aerodinâmica de Voo)
  // ------------------------------------------------------------
  // Tronco Principal (Mais longo e robusto)
  root.add(chanfrada(8.5, 5.5, 12.0, 0.9, azulCobalto, 0, 5.2, -0.5));
  // Peitoral / Barriga projetada
  root.add(chanfrada(7.0, 3.8, 10.0, 0.5, azulCobalto, 0, 4.2, 0.5));

  // Display LCD no Dorso Superior
  root.add(chanfrada(5.0, 0.4, 4.8, 0.15, cinzaEsc, 0, 8.0, -1.0));
  const lcd = criarLCD();
  root.add(planoLCD(3.0, 2.1, lcd, 0, 8.25, -0.2));

  // LEDs Dorsais
  const ledMat = new THREE.MeshStandardMaterial({
    color: 0x1a1d1f, emissive: 0x000000, emissiveIntensity: 1.5, roughness: 0.3
  });
  root.add(caixa(1.2, 0.14, 0.4, ledMat, -1.8, 8.2, -2.8), caixa(1.2, 0.14, 0.4, ledMat, 1.8, 8.2, -2.8));

  // Coxas / Eixos de Roda
  for (const s of [+1, -1]) {
    root.add(chanfrada(0.9, 3.4, 3.6, 0.3, azulEscuro, s * 4.65, 4.2, 0));
    root.add(cil(0.5, 1.6, M(0x222426), 'x', s * 5.4, RAIO_RODA, 0, 12));
  }

  // ------------------------------------------------------------
  // ASAS GRANDES DE AVE ADULTA (Articuladas na Horizontal)
  // ------------------------------------------------------------
  const asas = [];
  for (const s of [+1, -1]) {
    const asaOmbro = new THREE.Group();
    posicionar(asaOmbro, s * 4.2, 6.2, 1.0);

    // Braço interno da asa
    const braco = chanfrada(4.5, 0.6, 3.2, 0.2, azulCobalto, s * 2.2, 0, -0.5);
    braco.rotation.y = s * 0.1;
    asaOmbro.add(braco);

    // Ponta da Asa (Antebraço articulado com grandes penas primárias)
    const asaPonta = new THREE.Group();
    posicionar(asaPonta, s * 4.4, 0, -0.2);

    // Penas Primárias Longas
    const penasPrimarias = chanfrada(6.0, 0.4, 4.8, 0.3, azulEscuro, s * 3.0, -0.1, -1.2);
    penasPrimarias.rotation.y = s * -0.25;
    asaPonta.add(penasPrimarias);

    // Borda Amarela/Azul de destaque
    const penaDestaque = chanfrada(4.2, 0.3, 2.8, 0.2, azulCobalto, s * 2.0, 0.1, -0.4);
    asaPonta.add(penaDestaque);

    asaOmbro.add(asaPonta);
    root.add(asaOmbro);

    asas.push({ ombro: asaOmbro, ponta: asaPonta, s });
  }

  // ------------------------------------------------------------
  // CABEÇA E BICO IMPONENTE
  // ------------------------------------------------------------
  const cabeca = new THREE.Group(); cabeca.name = 'cabeca';
  posicionar(cabeca, 0, 6.4, 5.8);

  // Crânio robusto
  cabeca.add(chanfrada(5.6, 3.8, 4.6, 0.6, azulCobalto, 0, 0.6, 0));

  // Bico Maciço Curvado
  const bicoSup = chanfrada(2.6, 4.2, 3.8, 0.5, bicoPreto, 0, -0.2, 3.6);
  bicoSup.rotation.x = 0.55;
  cabeca.add(bicoSup);

  const bicoInf = chanfrada(2.2, 1.8, 2.4, 0.3, bicoPreto, 0, -1.2, 2.8);
  cabeca.add(bicoInf);

  // Detalhe Amarelo Característico dos Olhos/Bico da Arara-Azul
  for (const s of [-1, 1]) {
    cabeca.add(caixa(0.25, 1.6, 2.0, amareloPenumbra, s * 2.2, 0.6, 2.0));
    
    // Sensor Ultrassônico nos Olhos
    const olho = olhoUltra(0.9, s * 2.3, 0.8, 1.8);
    olho.rotation.y = s * 0.4;
    olho.name = 'olho_ultrassonico';
    cabeca.add(olho);
  }
  root.add(cabeca);

  // ------------------------------------------------------------
  // CAUDA LONGA E IMPONENTE
  // ------------------------------------------------------------
  const caudaGrupo = new THREE.Group();
  posicionar(caudaGrupo, 0, 5.2, -6.5);

  // Penas Centrais Longas
  const penaCentral = chanfrada(2.8, 0.4, 9.5, 0.2, azulCobalto, 0, 0, -4.5);
  penaCentral.rotation.x = -0.15;
  caudaGrupo.add(penaCentral);

  // Penas Laterais
  for (const s of [-1, 1]) {
    const penaLat = chanfrada(1.8, 0.3, 7.5, 0.2, azulEscuro, s * 1.6, -0.2, -3.5);
    penaLat.rotation.x = -0.12;
    penaLat.rotation.y = s * -0.12;
    caudaGrupo.add(penaLat);
  }
  root.add(caudaGrupo);

  // ------------------------------------------------------------
  // SENSORES E BASE DE APOIO
  // ------------------------------------------------------------
  const sensorGrounded = sensorCor(0xf1c40f);
  posicionar(sensorGrounded, 0, 2.0, 5.2);
  root.add(sensorGrounded);

  // Esfera de apoio traseiro
  root.add(cil(0.45, 1.3, cinzaEsc, 'y', 0, 2.2, -4.2, 12));
  const bola = pronto(new THREE.Mesh(
    new THREE.SphereGeometry(1.2, 18, 12),
    M(0xd7d9db, { metalness: 0.6, roughness: 0.25 })
  ));
  posicionar(bola, 0, 1.0, -4.2);
  root.add(bola);

  const feixe = criarFeixe(1.4);
  posicionar(feixe.grupo, 0, 0, 6.2);
  root.add(feixe.grupo);

  // ------------------------------------------------------------
  // ANIMAÇÃO DE VOO (Bater de Asas Dinâmico)
  // ------------------------------------------------------------
  let tAnt = null, encAnt = null, fase = 0, amp = 0, turbulencia = 0;

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
    amp += ((Math.min(vel / 20, 1) * 0.4) - amp) * Math.min(1, (dt || 0.05) * 8);
    fase += dist * 0.9;

    // Aceleração no bater de asas quando ocorre bip/sinal sonoro
    turbulencia += ((est.bip ? 1.2 : 0) - turbulencia) * Math.min(1, (dt || 0.05) * 12);

    // Frequência do bater de asas (ritmo constante de voo + impulso do movimento)
    const freqVoo = est.t * 6.0 + fase;
    const anguloBatida = Math.sin(freqVoo) * (0.35 + amp * 0.25 + turbulencia * 0.3);

    // Movimento das Asas (Ombro + Dobra da Ponta)
    asas.forEach(a => {
      // Ombro bate na vertical (eixo Z)
      a.ombro.rotation.z = a.s * anguloBatida;
      // Leve recuo do ombro para trás na subida (eixo Y)
      a.ombro.rotation.y = a.s * (Math.cos(freqVoo) * 0.1);

      // A ponta da asa flexiona com um pequeno atraso de fase
      a.ponta.rotation.z = a.s * Math.sin(freqVoo - 0.4) * 0.3;
    });

    // Movimento do corpo e cabeça acompanhando o ritmo do voo
    cabeca.position.y = 6.4 + Math.sin(freqVoo) * 0.3;
    cabeca.rotation.x = Math.cos(freqVoo) * 0.08;

    // Cauda estabiliza o voo
    caudaGrupo.rotation.x = Math.sin(freqVoo - 0.2) * 0.1;
    caudaGrupo.rotation.y = Math.sin(fase * 0.5) * amp * 0.15;
  }

  return {
    nome: 'arara',
    grupo: root,
    rodaB,
    rodaC,
    leds: [ledMat],
    feixe,
    lcd,
    partes: { cabeca, asas, caudaGrupo },
    animar
  };
}