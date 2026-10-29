/**
 * Catálogo único de modelos 3D.
 * Novo modelo: 1) arquivo .mjs  2) uma linha em MODELOS abaixo.
 */
import { construirRoboEV3 } from './ev3.mjs';
import { construirRoboJacare } from './jacare.mjs';
import { construirRoboArara } from './arara.mjs';
import { construirRoboCapivara } from './capivara.mjs';
import { construirRoboCaranguejo } from './caranguejo.mjs';
import { construirRoboTubarao } from './tubarao.mjs';
import { construirRoboSapo } from './sapo.mjs';
import { construirRoboElefante } from './elefante.mjs';
import { construirRoboCamaleao } from './camaleao.mjs';
import { construirRoboEscorpiao } from './escorpiao.mjs';
import { construirRoboCoruja } from './coruja.mjs';
import { construirRoboCarroFusca } from './carro-fusca.mjs';
import { construirRoboOpala } from './Opala.mjs';
import { construirRoboCorcel } from './Cocel.mjs';
import { construirRoboCarro } from './carro.mjs';

export const MODELOS = [
  { id: 'ev3', label: 'LEGO EV3', construir: construirRoboEV3, ordem: 1 },
  { id: 'jacare', label: 'Jacaré', construir: construirRoboJacare, ordem: 2 },
  { id: 'arara', label: 'Arara', construir: construirRoboArara, ordem: 3 },
  { id: 'capivara', label: 'Capivara', construir: construirRoboCapivara, ordem: 4 },
  { id: 'caranguejo', label: 'Caranguejo', construir: construirRoboCaranguejo, ordem: 5 },
  { id: 'tubarao', label: 'Tubarão', construir: construirRoboTubarao, ordem: 6 },
  { id: 'sapo', label: 'Sapo', construir: construirRoboSapo, ordem: 7 },
  { id: 'elefante', label: 'Elefante', construir: construirRoboElefante, ordem: 8 },
  { id: 'camaleao', label: 'Camaleão', construir: construirRoboCamaleao, ordem: 9 },
  { id: 'escorpiao', label: 'Escorpião', construir: construirRoboEscorpiao, ordem: 10 },
  { id: 'coruja', label: 'Coruja', construir: construirRoboCoruja, ordem: 11 },
  { id: 'fusca', label: 'Fusca', construir: construirRoboCarroFusca, ordem: 12 },
  { id: 'opala', label: 'Opala', construir: construirRoboOpala, ordem: 13 },
  { id: 'corcel', label: 'Corcel', construir: construirRoboCorcel, ordem: 14 },
  { id: 'carro', label: 'Carro', construir: construirRoboCarro, ordem: 15 },
];

export const ROBOS = Object.fromEntries(MODELOS.map((m) => [m.id, m.construir]));

export function listarModelos() {
  return [...MODELOS].sort((a, b) => (a.ordem ?? 99) - (b.ordem ?? 99));
}

export function preencherSelectModelos(selectOrId, opts = {}) {
  const el = typeof selectOrId === 'string' ? document.getElementById(selectOrId) : selectOrId;
  if (!el || el.tagName !== 'SELECT') return;
  const prefixo = opts.prefixo ?? 'Robô: ';
  const atual = el.value;
  const lista = listarModelos();
  el.innerHTML = '';
  for (const m of lista) {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = prefixo + m.label;
    el.appendChild(opt);
  }
  const padrao = opts.valorPadrao || 'ev3';
  if (atual && ROBOS[atual]) el.value = atual;
  else if (ROBOS[padrao]) el.value = padrao;
  else if (lista[0]) el.value = lista[0].id;
}

export function idsModelos() {
  return listarModelos().map((m) => m.id);
}
