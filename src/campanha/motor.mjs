import { carregarSave, gravarSave } from './save.mjs';

export function detectarApis(codigo) {
  const apis = [];
  if (/\.led\s*\(/.test(codigo)) apis.push('led');
  if (/\.ler_sensor\s*\(/.test(codigo)) apis.push('ler_sensor');
  if (/\.mover_continuo\s*\(/.test(codigo)) apis.push('mover_continuo');
  if (/\.parar_motor\s*\(/.test(codigo)) apis.push('parar_motor');
  if (/\.apitar\s*\(/.test(codigo)) apis.push('apitar');
  if (/gamepadPonte/.test(codigo)) apis.push('teleop');
  if (/\btime\.sleep\s*\(/.test(codigo)) apis.push('sleep');
  if (/\bprint\s*\(/.test(codigo)) apis.push('print');
  return apis;
}

/** Normaliza código Python para comparação (ignora comentários, espaços, aspas). */
export function normalizarCodigo(src) {
  let s = String(src || '');
  s = s.replace(/#.*$/gm, '');
  s = s.replace(/"""[\s\S]*?"""/g, '');
  s = s.replace(/'''[\s\S]*?'''/g, '');
  s = s.replace(/\r\n/g, '\n');
  s = s.replace(/[ \t]+/g, ' ');
  s = s.replace(/\n+/g, '\n');
  s = s.replace(/['"]/g, '"');
  s = s.toLowerCase().trim();
  return s;
}

/** Tokens significativos para similaridade. */
export function tokensCodigo(src) {
  const n = normalizarCodigo(src);
  const parts = n.split(/[^a-z0-9_\.]+/).filter((t) => t && t.length > 1);
  return parts;
}

/**
 * Similaridade 0..1 entre código do aluno e referência.
 * Combina Jaccard de tokens + cobertura de “frases” da referência.
 */
export function similaridadeCodigo(aluno, referencia) {
  if (!referencia || !String(referencia).trim()) return 0;
  const ta = tokensCodigo(aluno);
  const tr = tokensCodigo(referencia);
  if (!tr.length) return 0;
  if (!ta.length) return 0;

  const setA = new Set(ta);
  const setR = new Set(tr);
  let inter = 0;
  for (const t of setR) if (setA.has(t)) inter++;
  const union = new Set([...setA, ...setR]).size || 1;
  const jaccard = inter / union;
  const cobertura = inter / setR.size; // quanto da referência apareceu

  // bigramas de tokens (ordem aproximada)
  const big = (arr) => {
    const o = [];
    for (let i = 0; i < arr.length - 1; i++) o.push(arr[i] + '>' + arr[i + 1]);
    return o;
  };
  const ba = new Set(big(ta));
  const br = big(tr);
  let hit = 0;
  for (const b of br) if (ba.has(b)) hit++;
  const ordem = br.length ? hit / br.length : 0;

  // média ponderada
  const score = 0.35 * jaccard + 0.4 * cobertura + 0.25 * ordem;
  return Math.max(0, Math.min(1, score));
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

/**
 * Estrelas 0–5:
 * - 0 se objetivos obrigatórios falharem
 * - 1..5 conforme proximidade do código de referência (+ bônus leve de tempo)
 */
export function calcularEstrelas5(missao, metricas, ok, similaridade) {
  if (!ok) return 0;

  let estrelas = 1; // passou nos objetivos

  // mapa similaridade → estrelas (base)
  if (similaridade >= 0.88) estrelas = 5;
  else if (similaridade >= 0.72) estrelas = 4;
  else if (similaridade >= 0.52) estrelas = 3;
  else if (similaridade >= 0.32) estrelas = 2;
  else estrelas = 1;

  // se não há referência, usa regras de tempo da missão
  if (!missao.codigoReferencia) {
    estrelas = 2;
    const regras = missao.avaliacao?.estrelas || [];
    for (const regra of regras) {
      if (regra.quando === 'vitoria') estrelas = Math.max(estrelas, Math.min(5, regra.estrelas || 2));
      if (regra.quando === 'tempoSim' && metricas.tempoSim <= (regra.maxS ?? 0)) {
        estrelas = Math.max(estrelas, Math.min(5, regra.estrelas || 3));
      }
    }
  } else {
    // bônus de tempo: +0 ou +1 se muito rápido (sem passar de 5)
    const tMax = missao.limites?.tempoSimMaxS;
    if (tMax && metricas.tempoSim > 0 && metricas.tempoSim <= tMax * 0.35 && estrelas < 5) {
      if (similaridade >= 0.5) estrelas = Math.min(5, estrelas + 1);
    }
  }

  return Math.max(0, Math.min(5, estrelas));
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

  const similaridade = similaridadeCodigo(codigo || '', missao.codigoReferencia || '');
  metricas.similaridade = similaridade;

  const estrelas = calcularEstrelas5(missao, metricas, ok, similaridade);

  return {
    ok,
    estrelas,
    objetivos,
    metricas,
    codigo: codigo || '',
    similaridade,
    maxEstrelas: 5,
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

/** Tema completo = todas as missões do tema com status concluida */
export function temaCompleto(save, temaId, missoes) {
  const doTema = missoes.filter((m) => m.temaId === temaId);
  if (!doTema.length) return false;
  return doTema.every((m) => (save.missoes[m.id]?.status) === 'concluida');
}

/** Tema desbloqueado: o primeiro sempre; demais exigem o anterior completo */
export function temaLiberado(save, tema, temas, missoes) {
  const idx = temas.findIndex((t) => t.id === tema.id);
  if (idx <= 0) return true;
  const anterior = temas[idx - 1];
  return temaCompleto(save, anterior.id, missoes);
}

export { carregarSave, gravarSave };
