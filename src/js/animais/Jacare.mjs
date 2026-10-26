import * as THREE from 'three';
import { AnimalBase } from './AnimalBase.mjs';

export class Jacare extends AnimalBase {
    constructor(cena) {
        super(cena, 0x2e8b57);
        this.angBoca = 0;
        this.build();
    }

    build() {
        const mat = new THREE.MeshLambertMaterial({ color: this.cor });

        // Corpo Principal
        const corpoGeo = new THREE.BoxGeometry(2, 0.6, 1);
        this.corpo = new THREE.Mesh(corpoGeo, mat);
        this.mesh.add(this.corpo);

        // Cabeça
        const cabecaGeo = new THREE.BoxGeometry(0.8, 0.4, 0.8);
        this.cabeca = new THREE.Mesh(cabecaGeo, mat);
        this.cabeca.position.set(1.2, 0.1, 0);
        this.mesh.add(this.cabeca);

        // Mandíbula Articulada (Boca)
        const bocaGeo = new THREE.BoxGeometry(0.7, 0.15, 0.7);
        this.mandibula = new THREE.Mesh(bocaGeo, mat);
        this.mandibula.position.set(0.35, -0.15, 0);
        
        this.pivoBoca = new THREE.Group();
        this.pivoBoca.position.set(1.2, -0.1, 0);
        this.pivoBoca.add(this.mandibula);
        this.mesh.add(this.pivoBoca);

        // Patas
        this.patas = [];
        const pataGeo = new THREE.BoxGeometry(0.3, 0.4, 0.3);
        const posicoes = [
            [0.8, -0.3, 0.6], [0.8, -0.3, -0.6],
            [-0.8, -0.3, 0.6], [-0.8, -0.3, -0.6]
        ];

        posicoes.forEach(pos => {
            const pata = new THREE.Mesh(pataGeo, mat);
            pata.position.set(...pos);
            this.mesh.add(pata);
            this.patas.push(pata);
        });
    }

    atualizar(delta, tempoGlobal) {
        const velocidade = 3;
        
        // Animação das patas
        this.patas.forEach((pata, i) => {
            const defasagem = i % 2 === 0 ? 0 : Math.PI;
            pata.rotation.z = Math.sin(tempoGlobal * velocidade + defasagem) * 0.3;
        });

        // Controle da boca
        this.pivoBoca.rotation.z = Math.sin(tempoGlobal * 2) * 0.2 + 0.2;
    }
}
