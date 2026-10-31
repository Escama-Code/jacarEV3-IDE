/**
 * API pública da campanha.
 * Conteúdo = JSON em dados/. Lógica de nota = pontuacao.mjs. Objetivos = motor.mjs.
 */
export {
  carregarSave,
  gravarSave,
  resetSave,
  exportarSave,
  importarSave,
  consumirDica,
  custoDica,
} from './save.mjs';
export {
  avaliar,
  aplicarResultado,
  detectarApis,
  ordemApisNoCodigo,
  gerarFeedback,
  statusMissao,
  temaCompleto,
  temaLiberado,
  resumoSkills,
} from './motor.mjs';
export {
  pontuarResposta,
  similaridadeCodigo,
  melhorSimilaridade,
  estrelasDePrecisao,
  normalizarCodigo,
} from './pontuacao.mjs';
export { carregarCatalogo } from './loader.mjs';
<<<<<<< HEAD
export { Dialogo, falar as dialogoFalar, initDialogo } from './dialogo/dialogo.mjs';
=======
>>>>>>> ebe5f226f8c18e9f1d296621ded67aa7bdc8a36e

import { carregarCatalogo } from './loader.mjs';

/** Preenchidos após carregarCatalogo() / initCampanha() */
export let CAMPANHA = {
  id: 'carregando',
  titulo: 'Carregando…',
  descricao: '',
  temas: [],
};

export let MISSOES = [];

export const SKILLS_CATALOGO = [
  'led',
  'motores',
  'sensor_cor',
  'ultrassom',
  'giro',
  'seguir_linha',
  'desvio',
  'base',
  'teleop',
  'competicao',
];

export function getMissao(id) {
  return MISSOES.find((m) => m.id === id) || null;
}

export function missoesDoTema(temaId) {
  return MISSOES.filter((m) => m.temaId === temaId);
}

/**
 * Carrega todos os JSON e atualiza CAMPANHA / MISSOES.
 */
export async function initCampanha() {
  const cat = await carregarCatalogo();
  CAMPANHA = cat.CAMPANHA;
  MISSOES = cat.MISSOES;
  if (typeof window !== 'undefined') {
    window.__campanhaMissoes = MISSOES;
    window.__campanhaMeta = CAMPANHA;
  }
  return cat;
}
