import { Cena3D } from './cena3d.mjs';
import { Jacare } from './animais/Jacare.mjs';
import { Cobra } from './animais/Cobra.mjs';
import { Escorpiao } from './animais/Escorpiao.mjs';

class App {
    constructor() {
        this.cenaContainer = document.getElementById('canvas-container');
        this.cena3d = new Cena3D(this.cenaContainer);
        
        this.animais = [];
        this.init();
    }

    init() {
        // Instancia o Jacaré na posição central
        const jacare = new Jacare(this.cena3d.cena);
        jacare.mesh.position.set(0, 0.3, 0);

        // Instancia a Cobra na lateral
        const cobra = new Cobra(this.cena3d.cena);
        cobra.mesh.position.set(0, 0.15, -2.5);

        // Instancia o Escorpião na outra lateral
        const escorpiao = new Escorpiao(this.cena3d.cena);
        escorpiao.mesh.position.set(0, 0.2, 2.5);

        this.animais.push(jacare, cobra, escorpiao);

        this.loop();
    }

    loop = (tempo) => {
        requestAnimationFrame(this.loop);
        const tempoSegundos = (tempo || 0) * 0.001;

        // Atualiza animações de todos os animais
        this.animais.forEach(animal => animal.atualizar(0.016, tempoSegundos));

        this.cena3d.renderizar();
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new App();
});
