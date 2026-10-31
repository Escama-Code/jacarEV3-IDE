// =====================================================================
// ROBÔ — Carro Importado (.glb) baseado nas proporções exatas do LEGO EV3
// =====================================================================
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  M, pronto, posicionar, construirRoda, criarFeixe, sensorCor, olhoUltra, cil
} from './helpers.mjs';

export function construirRoboCarro() {
  const root = new THREE.Group();
  root.name = 'carro-glb';

  // 1. CONTAINER INTERNO PARA O MODELO ASSÍNCRONO
  const modeloContainer = new THREE.Group();
  modeloContainer.name = 'modelo_container';
  root.add(modeloContainer);

  // 2. RODAS FUNCIONAIS OBRIGATÓRIAS (Invisíveis, usadas pelo motor de física)
  const rodaB = construirRoda('ev3', +1); rodaB.visible = false;
  const rodaC = construirRoda('ev3', -1); rodaC.visible = false;
  root.add(rodaB, rodaC);

  // 3. MATERIAIS DE CONFIGURAÇÃO PARA COMPATIBILIDADE (Contrato do simulador)
  const ledMat = new THREE.MeshStandardMaterial({
    color: 0x1a1d1f, emissive: 0x000000, emissiveIntensity: 1.5, roughness: 0.3
  });

  // 4. SENSORES FÍSICOS - CONFIGURADOS EXATAMENTE IGUAL AO LEGO EV3
  const sensorGnd = sensorCor(0xe6e7e8);  sensorGnd.visible = false;
  posicionar(sensorGnd, 0, 2.6, 5.5); 
  root.add(sensorGnd);

  const ultra = new THREE.Group(); 
  posicionar(ultra, 0, 6.2, 7.0);
  ultra.add(olhoUltra(1.15, 1.6, 0, 1.2), olhoUltra(1.15, -1.6, 0, 1.2));
  ultra.visible = false; 
  root.add(ultra);

  const feixe = criarFeixe(1.4); 
  posicionar(feixe.grupo, 0, 0, 5.5); 
  root.add(feixe.grupo);

  // Roda boba traseira simulada para suporte de apoio físico (Igual ao EV3)
  root.add(cil(1.0, 0.9, M(0x1c1e20), 'y', 0, 2.95, -6.2));
  const bola = pronto(new THREE.Mesh(new THREE.SphereGeometry(1.25, 20, 14), M(0xd7d9db, { metalness: 0.6, roughness: 0.25 })));
  posicionar(bola, 0, 1.25, -6.2); 
  root.add(bola);

  // Arrays para guardar as referências das rodas encontradas no .glb
  const rodasEsquerdas = [];
  const rodasDireitas = [];

  // 5. CARREGAMENTO ASSÍNCRONO DO ARQUIVO .GLB
  const loader = new GLTFLoader();
  loader.load('../src/assets/models/carro.glb', function (gltf) {
    const carModel = gltf.scene;

    // --- NOVA CALIBRAÇÃO DE ESCALA MÉDIA ---
    // Como 12.5 ficou grande e 0.18 sumiu, 5.5 é o ponto de equilíbrio perfeito
    carModel.scale.set(5.5, 5.5, 5.5);

    // Altura ideal para a escala de 5.5 não afundar no chão
    carModel.position.set(0, 0.15, 0);
    
    // Força o alinhamento correto dos eixos caso o modelo tenha importado rotacionado
    carModel.rotation.set(0, 0, 0);
    // ---------------------------------------------------

    // Varre as malhas internas para rastrear e vincular a animação das rodas
    carModel.traverse((child) => {
      if (child.isMesh || child.isGroup) {
        const nome = child.name.toLowerCase();
        
        // Critério para mapear rodas do lado esquerdo
        if (nome.includes('wheel_l') || nome.includes('wheel_fl') || nome.includes('wheel_rl') || nome.includes('esquerda') || nome.includes('rod_esq')) {
          rodasEsquerdas.push(child);
        }
        // Critério para mapear rodas do lado direito
        if (nome.includes('wheel_r') || nome.includes('wheel_fr') || nome.includes('wheel_rr') || nome.includes('direita') || nome.includes('rod_dir')) {
          rodasDireitas.push(child);
        }
      }
    });

    modeloContainer.add(carModel);
    console.log('[jacarEV3] Carro recalibrado com sucesso na escala 5.5!');
  }, undefined, function (error) {
    console.error('[jacarEV3] Erro catastrófico ao carregar o .glb do carro:', error);
  });

  // 6. FUNÇÃO DE ANIMAÇÃO (Transmite o movimento físico para o visual importado)
  function animar(est) {
    // Rotaciona as rodas do lado esquerdo com base na física do motor B
    rodasEsquerdas.forEach(roda => {
      roda.rotation.x = rodaB.rotation.x;
    });
    // Rotaciona as rodas do lado direito com base na física do motor C
    rodasDireitas.forEach(roda => {
      roda.rotation.x = rodaC.rotation.x;
    });
  }

  const lcdMock = { desenhar: () => {} };

  // Retorna a assinatura exata exigida pelo rig de simulação da cena3d
  return {
    nome: 'carro',
    grupo: root,
    rodaB,
    rodaC,
    leds: [ledMat],
    feixe,
    lcd: lcdMock,
    partes: { corpoCarro: modeloContainer, ultra },
    animar
  };
}
