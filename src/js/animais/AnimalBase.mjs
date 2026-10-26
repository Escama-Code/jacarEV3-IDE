import * as THREE from 'three';

export class AnimalBase {
    constructor(cena, cor = 0x228b22) {
        this.cena = cena;
        this.cor = cor;
        this.mesh = new THREE.Group();
        this.motores = {};
        this.sensores = {};
        
        this.cena.add(this.mesh);
    }

    // Método obrigatório para construir o modelo 3D
    build() {
        throw new Error("O método build() deve ser implementado na classe filha.");
    }

    // Atualização de física/animação a cada frame
    atualizar(delta, tempoGlobal) {
        // Lógica padronizada de atualização
    }

    destruir() {
        this.cena.remove(this.mesh);
    }
}
