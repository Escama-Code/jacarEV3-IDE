/**
 * motor.mjs — objetivos de simulação + orquestra a pontuação de código.
 * A precisão do código fica em pontuacao.mjs.
 */
import { carregarSave, gravarSave } from './save.mjs';
import { pontuarResposta } from './pontuacao.mjs';

export function detectarApis(codigo) {
  const apis = [];
  if (/\.led\s*\(/.test(codigo)) apis.push('led');
  if (/\.ler_sensor\s*\(/.test(codigo)) apis.push('ler_sensor');
  if (/\.mover_continuo\s*\(/.test(codigo)) apis.push('mover_continuo');
  if (/\.parar_motor\s*\(/.test(codigo)) apis.push('parar_motor');
  if (/\.apitar\s*\(/.test(codigo)) apis.push('apitar');
  if (/gamepadPonte/.test(codigo)) apis.push('teleop');
  if (/\btime\.sleep\s*\(/.test(codigo)) apis.push('sleep');
  return apis;
}

function checarObjetivo(obj, sim, m) {
  switch (obj.tipo) {
    case 'regiao': {
      const r = obj.regiao;
      return sim.x >= r.x && sim.x <= r.x + r.w && sim.y >= r.y && sim.y <= r.y + r.h;
    }
    case 'dist_min':
      return m.dist >= (obj.cm || 0);
    case 'tempo_sim':
      return m.tempoSim <= (obj.maxS ?? Infinity) && m.tempoSim > 0;
    case 'api_usada':
      return (obj.metodos || []).every((met) => m.apiUsada.includes(met));
    case 'sem_colisao':
      return (m.colisoes || 0) <= (obj.max ?? 0);
    default:
      return false;
  }
}

export function avaliar(sim, codigo, missao) {
  const metricas = {
    tempoSim: sim?.t || 0,
    dist: sim?.dist || 0,
    pacotes: (sim?.pacotes || []).length,
    colisoes: sim?.colisoes || 0,
    apiUsada: detectarApis(codigo || ''),
    x: sim?.x ?? 0,
    y: sim?.y ?? 0,
  };

  const objetivos = {};
  for (const obj of missao.objetivos || []) {
    objetivos[obj.id] = checarObjetivo(obj, sim, metricas);
  }

  const obrig = (missao.objetivos || []).filter((o) => o.obrigatorio !== false);
  const ok = obrig.length === 0 ? false : obrig.every((o) => objetivos[o.id]);

  const score = pontuarResposta(codigo || '', missao, {
    objetivosOk: ok,
    tempoSim: metricas.tempoSim,
  });

  metricas.similaridade = score.similaridade;
  metricas.indiceReferencia = score.indiceReferencia;
  metricas.totalAlternativas = score.totalAlternativas;

  return {
    ok,
    estrelas: score.estrelas,
    objetivos,
    metricas,
    codigo: codigo || '',
    similaridade: score.similaridade,
    maxEstrelas: score.maxEstrelas,
    indiceReferencia: score.indiceReferencia,
  };
}

export function aplicarResultado(save, missao, resultado) {
  const prev = save.missoes[missao.id] || { tentativas: 0, estrelas: 0, status: 'disponivel' };
  const next = {
    status: resultado.ok ? 'concluida' : (prev.status === 'concluida' ? 'concluida' : 'disponivel'),
    estrelas: Math.max(prev.estrelas || 0, resultado.estrelas || 0),
    melhorSimilaridade: Math.max(prev.melhorSimilaridade || 0, resultado.similaridade || 0),
    melhorTempoSim:
      resultado.ok
        ? Math.min(prev.melhorTempoSim ?? Infinity, resultado.metricas.tempoSim)
        : prev.melhorTempoSim,
    tentativas: (prev.tentativas || 0) + 1,
    ultimoCodigo: resultado.codigo,
  };
  if (next.melhorTempoSim === Infinity) delete next.melhorTempoSim;
  save.missoes[missao.id] = next;

  if (resultado.ok) {
    save.xp = (save.xp || 0) + (missao.recompensas?.xp || 0);
    if (!save.desbloqueios) save.desbloqueios = [];
    for (const id of missao.recompensas?.desbloqueia || []) {
      if (!save.desbloqueios.includes(id)) save.desbloqueios.push(id);
      if (!save.missoes[id]) {
        save.missoes[id] = { status: 'disponivel', estrelas: 0, tentativas: 0 };
      } else if (save.missoes[id].status === 'bloqueada') {
        save.missoes[id].status = 'disponivel';
      }
    }
  }
  gravarSave(save);
  return save;
}

export function statusMissao(save, missaoId, primeiraId) {
  const m = save.missoes[missaoId];
  if (m?.status) return m.status;
  if (missaoId === primeiraId || (save.desbloqueios || []).includes(missaoId)) return 'disponivel';
  return 'bloqueada';
}

export function temaCompleto(save, temaId, missoes) {
  const doTema = missoes.filter((m) => m.temaId === temaId);
  if (!doTema.length) return false;
  return doTema.every((m) => (save.missoes[m.id]?.status) === 'concluida');
}

export function temaLiberado(save, tema, temas, missoes) {
  const idx = temas.findIndex((t) => t.id === tema.id);
  if (idx <= 0) return true;
  const anterior = temas[idx - 1];
  return temaCompleto(save, anterior.id, missoes);
}

export { carregarSave, gravarSave };
