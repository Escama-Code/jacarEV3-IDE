// =====================================================================
// ROBÔ — Ônibus Importado (.glb) baseado nas proporções do LEGO EV3
// =====================================================================
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  M, pronto, posicionar, construirRoda, criarFeixe, sensorCor, olhoUltra, cil
} from './helpers.mjs';

export function construirRoboOnibus() {
  const root = new THREE.Group();
  root.name = 'onibus-glb';

  // 1. CONTAINER INTERNO PARA O MODELO ASSÍNCRONO
  const modeloContainer = new THREE.Group();
  modeloContainer.name = 'modelo_container';
  root.add(modeloContainer);

  // 2. RODAS FUNCIONAIS OBRIGATÓRIAS (Invisíveis, usadas pelo motor de física)
  const rodaB = construirRoda('ev3', +1); rodaB.visible = false;
  const rodaC = construirRoda('ev3', -1); rodaC.visible = false;
  root.add(rodaB, rodaC);

  // 3. MATERIAL DE LED (Contrato do simulador)
  const ledMat = new THREE.MeshStandardMaterial({
    color: 0x1a1d1f, emissive: 0x000000, emissiveIntensity: 1.5, roughness: 0.3
  });

  // 4. SENSORES FÍSICOS — mesma configuração do EV3
  const sensorGnd = sensorCor(0xe6e7e8); sensorGnd.visible = false;
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

  // Roda boba traseira (apoio físico, igual ao EV3)
  root.add(cil(1.0, 0.9, M(0x1c1e20), 'y', 0, 2.95, -6.2));
  const bola = pronto(new THREE.Mesh(
    new THREE.SphereGeometry(1.25, 20, 14),
    M(0xd7d9db, { metalness: 0.6, roughness: 0.25 })
  ));
  posicionar(bola, 0, 1.25, -6.2);
  root.add(bola);

  // Arrays para rodas encontradas no .glb
  const rodasEsquerdas = [];
  const rodasDireitas = [];

  // 5. CARREGAMENTO DO .GLB
  const loader = new GLTFLoader();
  loader.load('../src/assets/models/onibus.glb', function (gltf) {
    const busModel = gltf.scene;

busModel.scale.set(1.5, 1.5, 1.5);

const box = new THREE.Box3().setFromObject(busModel);
const center = new THREE.Vector3();
box.getCenter(center);
busModel.position.set(-center.x, -box.min.y, -center.z);

busModel.rotation.set(0, Math.PI / 2, 0);

    busModel.traverse((child) => {
      if (child.isMesh || child.isGroup) {
        const nome = child.name.toLowerCase();

        // Rodas esquerdas
        if (
          nome.includes('wheel_l') || nome.includes('wheel_fl') ||
          nome.includes('wheel_rl') || nome.includes('esquerda') ||
          nome.includes('rod_esq')
        ) {
          rodasEsquerdas.push(child);
        }
        // Rodas direitas
        if (
          nome.includes('wheel_r') || nome.includes('wheel_fr') ||
          nome.includes('wheel_rr') || nome.includes('direita') ||
          nome.includes('rod_dir')
        ) {
          rodasDireitas.push(child);
        }

        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      }
    });

    modeloContainer.add(busModel);
    console.log('[jacarEV3] Ônibus carregado com sucesso!');
  }, undefined, function (error) {
    console.error('[jacarEV3] Erro ao carregar o .glb do ônibus:', error);
  });

  // 6. ANIMAÇÃO — transmite física para o visual
  function animar(est) {
    rodasEsquerdas.forEach(roda => {
      roda.rotation.x = rodaB.rotation.x;
    });
    rodasDireitas.forEach(roda => {
      roda.rotation.x = rodaC.rotation.x;
    });
  }

  const lcdMock = { desenhar: () => {} };

  // CONTRATO DO RIG
  return {
    nome: 'onibus',
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
