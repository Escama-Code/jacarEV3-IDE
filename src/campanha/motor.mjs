/**
 * motor.mjs — objetivos de simulação + orquestra a pontuação de código.
 * Inclui feedback pedagógico, skills e tipos de objetivo avançados.
 */
import { carregarSave, gravarSave } from './save.mjs';
import { pontuarResposta } from './pontuacao.mjs';

/** APIs reconhecidas no código do aluno (para api_usada e skills). */
const API_PADROES = [
  ['led', /\.led\s*\(/],
  ['ler_sensor', /\.ler_sensor\s*\(/],
  ['mover_continuo', /\.mover_continuo\s*\(/],
  ['parar_motor', /\.parar_motor\s*\(/],
  ['apitar', /\.apitar\s*\(/],
  ['mover_base', /\.mover_base\s*\(/],
  ['mover_base_graus', /\.mover_base_graus\s*\(/],
  ['parar_base', /\.parar_base\s*\(/],
  ['girar_motor', /\.girar_motor\s*\(/],
  ['girar_motor_graus', /\.girar_motor_graus\s*\(/],
  ['girar_exato', /\.girar_exato\s*\(/],
  ['ler_angulo_giro', /\.ler_angulo_giro\s*\(/],
  ['ler_taxa_giro', /\.ler_taxa_giro\s*\(/],
  ['ler_giro', /\.ler_giro\s*\(/],
  ['resetar_giro', /\.resetar_giro\s*\(/],
  ['definir_base', /\.definir_base\s*\(/],
  ['teleop', /gamepadPonte/],
  ['sleep', /\btime\.sleep\s*\(/],
];

export function detectarApis(codigo) {
  const src = codigo || '';
  const apis = [];
  for (const [nome, re] of API_PADROES) {
    if (re.test(src)) apis.push(nome);
  }
  return apis;
}

/** Ordem aproximada das primeiras ocorrências de cada método no código. */
export function ordemApisNoCodigo(codigo) {
  const src = codigo || '';
  const hits = [];
  for (const [nome, re] of API_PADROES) {
    const m = re.exec(src);
    if (m) hits.push({ nome, idx: m.index });
  }
  hits.sort((a, b) => a.idx - b.idx);
  return hits.map((h) => h.nome);
}

function mensagemPadrao(obj, metricas) {
  switch (obj.tipo) {
    case 'api_usada':
      return `Faltou usar: ${(obj.metodos || []).join(', ')}.`;
    case 'dist_min':
      return `Andou ${Math.round(metricas.dist || 0)} cm; precisa de pelo menos ${obj.cm || 0} cm.`;
    case 'regiao':
      return 'O robô não chegou na região marcada no mapa.';
    case 'tempo_sim':
      return `Tempo de simulação: ${(metricas.tempoSim || 0).toFixed(1)} s (limite da missão).`;
    case 'sem_colisao':
      return `Colisões: ${metricas.colisoes || 0} (máximo permitido: ${obj.max ?? 0}).`;
    case 'angulo_final':
      return `Ângulo final ≈ ${Math.round(metricas.angulo ?? 0)}°; alvo entre ${obj.min ?? '?'}° e ${obj.max ?? '?'}°.`;
    case 'heading_perto':
      return `Orientação final longe do alvo (${obj.graus ?? 0}° ± ${obj.tolerancia ?? 10}°).`;
    case 'passou_linha':
      return `Tempo sobre a linha: ${(metricas.tempoNaLinha || 0).toFixed(1)} s (mínimo ${obj.minS || 0} s).`;
    case 'parou_antes_obstaculo':
      return 'O robô não parou a tempo perto do obstáculo (ultrassom / distância).';
    case 'sem_sair_pista':
      return 'O robô saiu dos limites da pista.';
    case 'ordem_apis':
      return `Ordem esperada das APIs: ${(obj.metodos || []).join(' → ')}.`;
    case 'api_proibida':
      return `Não use: ${(obj.metodos || []).join(', ')}.`;
    default:
      return `Objetivo "${obj.id}" não cumprido.`;
  }
}

/**
 * Gera lista de feedbacks para objetivos que falharam.
 * Prioriza missao.feedback[id], senão mensagem automática.
 */
export function gerarFeedback(missao, objetivos, metricas) {
  const out = [];
  const mapa = missao.feedback || {};
  for (const obj of missao.objetivos || []) {
    if (objetivos[obj.id]) continue;
    const custom = mapa[obj.id];
    out.push({
      id: obj.id,
      tipo: obj.tipo,
      mensagem: custom || mensagemPadrao(obj, metricas),
    });
  }
  return out;
}

function normalizarAngulo(a) {
  let x = Number(a) || 0;
  while (x > 180) x -= 360;
  while (x < -180) x += 360;
  return x;
}

function checarObjetivo(obj, sim, m, codigo) {
  switch (obj.tipo) {
    case 'regiao': {
      const r = obj.regiao || {};
      return (
        m.x >= (r.x ?? 0) &&
        m.x <= (r.x ?? 0) + (r.w ?? 0) &&
        m.y >= (r.y ?? 0) &&
        m.y <= (r.y ?? 0) + (r.h ?? 0)
      );
    }
    case 'dist_min':
      return m.dist >= (obj.cm || 0);
    case 'tempo_sim':
      return m.tempoSim <= (obj.maxS ?? Infinity) && m.tempoSim > 0;
    case 'api_usada': {
      const mets = obj.metodos || [];
      if (!mets.length) return true;
      // qualquer: true → basta uma das APIs; senão exige todas
      if (obj.qualquer) return mets.some((met) => m.apiUsada.includes(met));
      return mets.every((met) => m.apiUsada.includes(met));
    }
    case 'api_proibida':
      return (obj.metodos || []).every((met) => !m.apiUsada.includes(met));
    case 'sem_colisao':
      return (m.colisoes || 0) <= (obj.max ?? 0);
    case 'angulo_final': {
      const ang = normalizarAngulo(m.angulo);
      const min = obj.min ?? -Infinity;
      const max = obj.max ?? Infinity;
      return ang >= min && ang <= max;
    }
    case 'heading_perto': {
      const alvo = obj.graus ?? 0;
      const tol = obj.tolerancia ?? 10;
      const dif = Math.abs(normalizarAngulo((m.angulo || 0) - alvo));
      return dif <= tol;
    }
    case 'passou_linha':
      return (m.tempoNaLinha || 0) >= (obj.minS || 0);
    case 'parou_antes_obstaculo': {
      const distObs = m.distObstaculo ?? sim?.distObstaculo ?? Infinity;
      const parado = (m.velocidadeAbs || 0) <= (obj.velMax ?? 5);
      return distObs <= (obj.maxCm ?? 25) && parado;
    }
    case 'sem_sair_pista': {
      const b = obj.bounds || sim?.boundsPista;
      if (!b) return (m.saiuPista || 0) === 0;
      return (
        m.x >= b.x &&
        m.x <= b.x + b.w &&
        m.y >= b.y &&
        m.y <= b.y + b.h &&
        (m.saiuPista || 0) === 0
      );
    }
    case 'ordem_apis': {
      const esperada = obj.metodos || [];
      if (!esperada.length) return true;
      const ordem = ordemApisNoCodigo(codigo);
      let i = 0;
      for (const nome of ordem) {
        if (nome === esperada[i]) i++;
        if (i >= esperada.length) return true;
      }
      return i >= esperada.length;
    }
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
    angulo: sim?.angulo ?? sim?.heading ?? sim?.theta ?? 0,
    tempoNaLinha: sim?.tempoNaLinha || 0,
    distObstaculo: sim?.distObstaculo,
    velocidadeAbs: Math.abs(sim?.v ?? sim?.velocidade ?? 0),
    saiuPista: sim?.saiuPista || 0,
  };

  const objetivos = {};
  for (const obj of missao.objetivos || []) {
    objetivos[obj.id] = checarObjetivo(obj, sim, metricas, codigo || '');
  }

  const obrig = (missao.objetivos || []).filter((o) => o.obrigatorio !== false);
  const ok = obrig.length === 0 ? false : obrig.every((o) => objetivos[o.id]);

  const score = pontuarResposta(codigo || '', missao, {
    objetivosOk: ok,
    tempoSim: metricas.tempoSim,
  });

  const feedback = gerarFeedback(missao, objetivos, metricas);
  const skillsGanhas = ok ? [...(missao.skills || [])] : [];

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
    feedback,
    skillsGanhas,
    narrativaDinamica: ok
      ? null
      : feedback[0]?.mensagem || null,
  };
}

export function aplicarResultado(save, missao, resultado) {
  const prev = save.missoes[missao.id] || { tentativas: 0, estrelas: 0, status: 'disponivel' };
  const next = {
    status: resultado.ok
      ? 'concluida'
      : prev.status === 'concluida'
        ? 'concluida'
        : 'disponivel',
    estrelas: Math.max(prev.estrelas || 0, resultado.estrelas || 0),
    melhorSimilaridade: Math.max(
      prev.melhorSimilaridade || 0,
      resultado.similaridade || 0
    ),
    melhorTempoSim: resultado.ok
      ? Math.min(prev.melhorTempoSim ?? Infinity, resultado.metricas.tempoSim)
      : prev.melhorTempoSim,
    tentativas: (prev.tentativas || 0) + 1,
    ultimoCodigo: resultado.codigo,
    ultimoFeedback: resultado.feedback || [],
  };
  if (next.melhorTempoSim === Infinity) delete next.melhorTempoSim;
  save.missoes[missao.id] = next;

  if (!save.skills) save.skills = {};
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
    for (const sk of resultado.skillsGanhas || missao.skills || []) {
      save.skills[sk] = (save.skills[sk] || 0) + 1;
    }
  }
  gravarSave(save);
  return save;
}

export function statusMissao(save, missaoId, primeiraId) {
  const m = save.missoes[missaoId];
  if (m?.status) return m.status;
  if (missaoId === primeiraId || (save.desbloqueios || []).includes(missaoId)) {
    return 'disponivel';
  }
  return 'bloqueada';
}

export function temaCompleto(save, temaId, missoes) {
  const doTema = missoes.filter((m) => m.temaId === temaId);
  if (!doTema.length) return false;
  return doTema.every((m) => save.missoes[m.id]?.status === 'concluida');
}

export function temaLiberado(save, tema, temas, missoes) {
  const idx = temas.findIndex((t) => t.id === tema.id);
  if (idx <= 0) return true;
  const anterior = temas[idx - 1];
  return temaCompleto(save, anterior.id, missoes);
}

/** Resumo de skills para UI (mapa de habilidades). */
export function resumoSkills(save, catalogoSkills) {
  const skills = save.skills || {};
  const lista = catalogoSkills || Object.keys(skills);
  return lista.map((id) => ({
    id,
    nivel: skills[id] || 0,
    dominada: (skills[id] || 0) >= 1,
  }));
}

export { carregarSave, gravarSave };
