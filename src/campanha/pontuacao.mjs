/**
 * pontuacao.mjs — único responsável por medir proximidade do código
 * e converter isso em estrelas (0–5).
 *
 * Não avalia objetivos de simulação (distância, região, etc.).
 * Aceita VÁRIAS respostas válidas e usa a melhor similaridade.
 */

/** Remove comentários e normaliza espaços/aspas. */
export function normalizarCodigo(src) {
  let s = String(src || '');
  s = s.replace(/#.*$/gm, '');
  s = s.replace(/"""[\s\S]*?"""/g, '');
  s = s.replace(/'''[\s\S]*?'''/g, '');
  s = s.replace(/\r\n/g, '\n');
  s = s.replace(/[ \t]+/g, ' ');
  s = s.replace(/\n+/g, '\n');
  s = s.replace(/['"]/g, '"');
  return s.toLowerCase().trim();
}

export function tokensCodigo(src) {
  return normalizarCodigo(src)
    .split(/[^a-z0-9_\.]+/)
    .filter((t) => t && t.length > 1);
}

/**
 * Similaridade 0..1 entre dois códigos.
 * Jaccard de tokens + cobertura da referência + bigramas (ordem).
 */
export function similaridadeCodigo(aluno, referencia) {
  if (!referencia || !String(referencia).trim()) return 0;
  const ta = tokensCodigo(aluno);
  const tr = tokensCodigo(referencia);
  if (!tr.length || !ta.length) return 0;

  const setA = new Set(ta);
  const setR = new Set(tr);
  let inter = 0;
  for (const t of setR) if (setA.has(t)) inter++;
  const union = new Set([...setA, ...setR]).size || 1;
  const jaccard = inter / union;
  const cobertura = inter / setR.size;

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

  return Math.max(0, Math.min(1, 0.35 * jaccard + 0.4 * cobertura + 0.25 * ordem));
}

/**
 * Melhor similaridade entre o código do aluno e uma lista de respostas válidas.
 * @param {string} aluno
 * @param {string[]} referencias
 */
export function melhorSimilaridade(aluno, referencias) {
  const refs = (referencias || []).filter((r) => r && String(r).trim());
  if (!refs.length) return 0;
  let best = 0;
  let bestIdx = -1;
  refs.forEach((ref, i) => {
    const s = similaridadeCodigo(aluno, ref);
    if (s > best) {
      best = s;
      bestIdx = i;
    }
  });
  return { similaridade: best, indiceReferencia: bestIdx };
}

/**
 * Converte similaridade + flags em 0–5 estrelas.
 * - objetivosOk === false → sempre 0
 * - senão, faixas de similaridade (ou regras extras opcionais)
 *
 * @param {{ objetivosOk: boolean, similaridade: number, tempoSim?: number, tempoSimMaxS?: number }} opts
 */
export function estrelasDePrecisao({ objetivosOk, similaridade, tempoSim, tempoSimMaxS }) {
  if (!objetivosOk) return 0;

  let estrelas = 1;
  if (similaridade >= 0.88) estrelas = 5;
  else if (similaridade >= 0.72) estrelas = 4;
  else if (similaridade >= 0.52) estrelas = 3;
  else if (similaridade >= 0.32) estrelas = 2;
  else estrelas = 1;

  // bônus leve de tempo se o código já está razoável
  if (
    tempoSimMaxS &&
    tempoSim > 0 &&
    tempoSim <= tempoSimMaxS * 0.35 &&
    similaridade >= 0.5 &&
    estrelas < 5
  ) {
    estrelas = Math.min(5, estrelas + 1);
  }

  return estrelas;
}

/**
 * API principal: pontua o código do aluno contra as alternativas da missão.
 * @returns {{ similaridade: number, estrelas: number, indiceReferencia: number, maxEstrelas: 5 }}
 */
export function pontuarResposta(codigoAluno, missao, { objetivosOk, tempoSim } = {}) {
  const refs =
    missao.codigosReferencia ||
    (missao.codigoReferencia ? [missao.codigoReferencia] : []) ||
    [];

  const { similaridade, indiceReferencia } = melhorSimilaridade(codigoAluno, refs);
  const estrelas = estrelasDePrecisao({
    objetivosOk: !!objetivosOk,
    similaridade,
    tempoSim: tempoSim ?? 0,
    tempoSimMaxS: missao.limites?.tempoSimMaxS,
  });

  return {
    similaridade,
    estrelas,
    indiceReferencia,
    maxEstrelas: 5,
    totalAlternativas: refs.length,
  };
}
