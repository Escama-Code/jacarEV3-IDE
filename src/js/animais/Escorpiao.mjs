import * as THREE from 'three';
import { AnimalBase } from './AnimalBase.mjs';

export class Escorpiao extends AnimalBase {
    constructor(cena) {
        super(cena, 0x8b0000);
        this.build();
    }

    build() {
        const mat = new THREE.MeshStandardMaterial({ color: this.cor });

        // Corpo
        const corpoGeo = new THREE.BoxGeometry(1.2, 0.4, 0.8);
        this.corpo = new THREE.Mesh(corpoGeo, mat);
        this.mesh.add(this.corpo);

        // Cauda Articulada
        this.caudaPivo = new THREE.Group();
        this.caudaPivo.position.set(-0.6, 0.2, 0);
        
        const caudaGeo = new THREE.BoxGeometry(0.8, 0.2, 0.2);
        const caudaMesh = new THREE.Mesh(caudaGeo, mat);
        caudaMesh.position.set(-0.4, 0.3, 0);
        caudaMesh.rotation.z = Math.PI / 4;
        this.caudaPivo.add(caudaMesh);

        this.mesh.add(this.caudaPivo);
    }

    atualizar(delta, tempoGlobal) {
        // Movimento de ameaça da cauda
        this.caudaPivo.rotation.z = Math.sin(tempoGlobal * 3) * 0.2;
    }
}
