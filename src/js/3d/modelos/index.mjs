// ============================================================
// modelos/index.mjs — ponto único de import dos modelos 3D
// Para adicionar um novo animal:
//   1. Crie src/js/3d/modelos/meu-animal.mjs com construirRoboMeuAnimal()
//   2. Exporte-o abaixo
//   3. Registre em cena3d.mjs no mapa ROBOS
//   4. Adicione a opção no <select id="robo3d"> do HTML
// ============================================================
export { DEG, CM_POR_GRAU, COR_LED } from './helpers.mjs';
export { construirRoboEV3 } from './ev3.mjs';
export { construirRoboJacare } from './jacare.mjs';
export { construirRoboArara } from './arara.mjs';
export { construirRoboCapivara } from './capivara.mjs';
export { construirRoboCaranguejo } from './caranguejo.mjs';
export { construirRoboTubarao } from './tubarao.mjs';
export { construirRoboSapo } from './sapo.mjs';
export { construirRoboElefante } from './elefante.mjs';
export { construirRoboCamaleao } from './camaleao.mjs';
export { construirRoboEscorpiao} from './escorpiao.mjs';
export { construirRoboCoruja } from './coruja.mjs';
export { construirRoboCarroFusca} from './carro-fusca.mjs'
export { aplicarEstado } from './aplicar-estado.mjs';
export { construirRoboOpala } from './Opala.mjs';
export { construirRoboCarro } from './carro.mjs';
export { construirRoboCorcel } from './Cocel.mjs';
