import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const require = createRequire(import.meta.url);

const Cenarios = require(path.join(root, 'src/js/cenarios.js'));
globalThis.Cenarios = Cenarios;
const { SimEV3 } = require(path.join(root, 'src/js/sim.js'));

const sim = new SimEV3('treino', { acelMotor: 280, freioMotor: 420 });
sim.motores.B.v = 50;
sim.motores.B.modo = 'continuo';
sim.motores.C.v = 50;
sim.motores.C.modo = 'continuo';

sim.avancar(0.05);
const v1 = sim.motores.B.vel;
sim.avancar(0.2);
const v2 = sim.motores.B.vel;

if (!(v1 > 0 && v1 < 50)) {
  console.error('FALHA: após 50ms esperava 0 < vel < 50, veio', v1);
  process.exit(1);
}
if (!(v2 > v1)) {
  console.error('FALHA: velocidade deveria subir', v1, v2);
  process.exit(1);
}
console.log('OK física inércia', { v1: +v1.toFixed(1), v2: +v2.toFixed(1) });
