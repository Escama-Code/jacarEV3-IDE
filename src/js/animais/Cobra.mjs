import * as THREE from 'three';
import { AnimalBase } from './AnimalBase.mjs';

export class Cobra extends AnimalBase {
    constructor(cena, numSegmentos = 6) {
        super(cena, 0x4682b4);
        this.numSegmentos = numSegmentos;
        this.segmentos = [];
        this.build();
    }

    build() {
        const segGeo = new THREE.BoxGeometry(0.5, 0.3, 0.4);
        const mat = new THREE.MeshStandardMaterial({ color: this.cor });

        for (let i = 0; i < this.numSegmentos; i++) {
            const seg = new THREE.Mesh(segGeo, mat);
            seg.position.x = -i * 0.55;
            this.mesh.add(seg);
            this.segmentos.push(seg);
        }
    }

    atualizar(delta, tempoGlobal) {
        // Movimento de onda senoidal transmitido ao longo do corpo
        this.segmentos.forEach((seg, i) => {
            seg.position.z = Math.sin(tempoGlobal * 4 - i * 0.5) * 0.4;
            seg.rotation.y = Math.cos(tempoGlobal * 4 - i * 0.5) * 0.3;
        });
    }
}
