import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSArena, TILE_CM, BASE_CM, NIVEL_CM } from '../src/js/arena/sArenaParser.mjs';

const raiz = dirname(fileURLToPath(import.meta.url));
const {cenario, tapete} = parseSArena(JSON.parse(
  readFileSync(join(raiz, 'fixtures/arenanova.sArena'), 'utf8')
));

// O sim.js é um script clássico usado no navegador. A VM dá a ele a mesma
// API global Cenarios, sem precisar instalar dependências no projeto.
const Cenarios = {
  lista: {sarena:cenario},
  obterTapete: () => tapete,
  inicioDe: (cen) => cen.inicios[cen.inicioPadrao],
};
const ambiente = {
  Cenarios, module: {exports:{}},
  require: () => Cenarios,
  console,
};
<<<<<<< HEAD
vm.runInNewContext(readFileSync(join(raiz, '../src/js/sim.js'), 'utf8'), ambiente);
=======
vm.runInNewContext(readFileSync(join(raiz, '../src/js/core/sim.js'), 'utf8'), ambiente);
>>>>>>> ebe5f226f8c18e9f1d296621ded67aa7bdc8a36e
const { SimEV3 } = ambiente.module.exports;
const sim = new SimEV3('sarena');

// Trilhas abertas devem permanecer transitáveis, inclusive sobre as rampas.
sim.x = 15; sim.y = 45;
assert.equal(sim._colide(15,45.3), false, 'pista inferior sem obstáculo');
sim.x = 15; sim.y = 89.8;
assert.equal(sim._colide(15,90.2), false, 'entrada da rampa');
sim.x = 15; sim.y = 104.8;
assert.equal(sim._colide(15,105.2), false, 'meio da rampa');
sim.x = 15; sim.y = 119.8;
assert.equal(sim._colide(15,120.2), false, 'saída da rampa');

// Não se pode dirigir para fora das plataformas ou vencer um degrau lateral.
sim.x = 105; sim.y = 104;
assert.equal(sim._colide(135,105), true, 'degrau direto sem rampa');
sim.x = 105; sim.y = 45;
assert.equal(sim._colide(135,45), true, 'célula vazia');
sim.x = 15; sim.y = 45;
assert.equal(sim._colide(4,45), true, 'roda para fora da borda');

// Paredes do patamar elevado bloqueiam no próprio piso, não em outro piso.
const caixa = {x:50,y:50,w:5,h:5,pisoCm:BASE_CM+NIVEL_CM};
sim.cen.caixas.push(caixa);
sim.x = 45; sim.y = 52;
assert.equal(sim._colide(48,52), false, 'obstáculo de outro piso não deve bloquear');
caixa.pisoCm = BASE_CM;
assert.equal(sim._colide(48,52), true, 'obstáculo do piso atual deve bloquear');
sim.cen.caixas.pop();

// Sem propriedades sArena, o comportamento original deve continuar igual.
const plano = {
  w:100,h:100,caixas:[{x:45,y:45,w:10,h:10}],
  inicios:{padrao:{x:20,y:20,th:0}},inicioPadrao:'padrao'
};
Cenarios.lista['simples'] = plano;
const simOriginal = new SimEV3('simples');
assert.equal(simOriginal._colide(50,50),true);
assert.equal(simOriginal._colide(20,20),false);

console.log('OK: passagens abertas, rampas, bordas, patamares e colisões antigas');
