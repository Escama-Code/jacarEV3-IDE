import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  parseSArena, tipoImagem, posicaoGlobal, TILE_CM, NIVEL_CM, BASE_CM
} from '../src/js/arena/sArenaParser.mjs';

const aqui = dirname(fileURLToPath(import.meta.url));
const caminho = process.argv[2] || join(aqui, 'fixtures/arenanova.sArena');
const fonte = JSON.parse(readFileSync(caminho, 'utf8'));
const { cenario, tapete, tiles, objetosSBotics } = parseSArena(fonte);

assert.equal(tiles.length, 40, 'Os 5 metadados não são tiles');
assert.equal(objetosSBotics.length, 19);
assert.equal(cenario.w, 7 * TILE_CM);
assert.equal(cenario.h, 9 * TILE_CM);
assert.equal(tapete.W, Math.round(cenario.w * cenario.pxPorCm));
assert.equal(tapete.H, Math.round(cenario.h * cenario.pxPorCm));
assert.equal(cenario.objetosSBotics, objetosSBotics);
assert.equal(tiles.filter(t => t.y === 0).length, 16);
assert.equal(tiles.filter(t => t.y === 1).length, 24);
assert.equal(tiles.filter(t => t.properties?.is_ramp).length, 4);
assert.equal(typeof cenario.terreno, 'function');
assert.equal(cenario.solidoEm(15, 15), true);
assert.equal(cenario.solidoEm(170, 30), false);
assert.equal(cenario.alturaEm(15, 15), BASE_CM);
assert.equal(cenario.alturaEm(15, 4.5 * TILE_CM), BASE_CM + NIVEL_CM);
assert.ok(Math.abs(cenario.alturaEm(15, 3.5 * TILE_CM) - (BASE_CM + NIVEL_CM / 2)) < 0.01);
assert.ok(cenario.caixas.length >= 10, 'Paredes devem alimentar colisões e ultrassônico');
assert.equal(cenario.terreno(15, 15, 0).z, BASE_CM,
  'O robô deve apoiar sobre o primeiro piso, não no solo azul');
assert.ok(Math.abs(cenario.terreno(15, 3.5*TILE_CM, Math.PI/2).z - (BASE_CM + NIVEL_CM/2)) < .01);
assert.equal(cenario.podeTransitar(15, 15, 15, 15.1), true);
assert.equal(cenario.podeTransitar(15, 2.99*TILE_CM, 15, 3.01*TILE_CM), true,
  'A entrada de rampa não pode impedir a passagem');
assert.equal(cenario.podeTransitar(3.5*TILE_CM, 2.99*TILE_CM, 4.5*TILE_CM, 3.01*TILE_CM), false,
  'Não pode atravessar a parede lateral de um patamar elevado');
assert.equal(cenario.solidoEm(190, 15), false);
assert.equal(cenario.podeTransitar(4.5*TILE_CM, 3.01*TILE_CM,
  3.5*TILE_CM, 2.99*TILE_CM), false,
  'Não pode cair diretamente de um patamar elevado para outro piso');
assert.equal(tipoImagem(tiles.find(t => t.properties?.image?.includes('fls2_VGlsZXMvc3RhcnQ'))), 'start-line');

const tile = { x: 2, z: 3, y: 1, rotation: 0 };
const objeto = { position: { x: 1, y: 2, z: -3 }, rotation: { y: 0 } };
const p = posicaoGlobal(tile, objeto);
assert.ok(Math.abs(p.x - (2.5*TILE_CM + 3)) < .01);
assert.equal(p.y, BASE_CM + NIVEL_CM + 6);
assert.ok(Math.abs(p.z - (3.5*TILE_CM - 9)) < .01);

console.log(`OK: ${tiles.length} tiles, ${objetosSBotics.length} objetos, ` +
  `${cenario.caixas.length} colisores, ${cenario.w}×${cenario.h} cm, ` +
  `${NIVEL_CM} cm entre níveis.`);
