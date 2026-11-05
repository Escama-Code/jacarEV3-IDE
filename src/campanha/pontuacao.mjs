/**
 * pontuacao.mjs — proximidade do código + rank C · B · A · S
 *
 * Similaridade mais rígida:
 *  - ignora boilerplate (import, with, time.sleep genérico…)
 *  - foca em APIs e literais relevantes
 *  - exige cobertura alta da referência para A/S
 *  - penaliza códigos muito diferentes em tamanho/estrutura
 */

const STOP = new Set([
  'from', 'import', 'as', 'with', 'as', 'true', 'false', 'none', 'while', 'for',
  'if', 'else', 'elif', 'in', 'not', 'and', 'or', 'pass', 'break', 'continue',
  'return', 'print', 'range', 'int', 'float', 'str', 'max', 'min', 'abs',
  'time', 'sleep', 'robo', 'robot', 'r', 'p', 'protocolo', 'jacarev3',
  'roboev3', '00', '16', '53', '64', 'f8', 'b8',
]);

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
    .filter((t) => t && t.length > 1 && !STOP.has(t));
}

/** Chamadas de API e literais importantes (mais peso). */
export function tokensEssenciais(src) {
  const n = normalizarCodigo(src);
  const out = [];
  // métodos: .led( .mover_continuo( etc.
  const reMet = /\.([a-z_][a-z0-9_]*)\s*\(/g;
  let m;
  while ((m = reMet.exec(n))) out.push('m:' + m[1]);
  // portas de motor/sensor comuns
  const reLit = /"([abcd1-4]|verde|vermelho|laranja|ambar)"|\b([abcd])\b|\b([1-4])\b/g;
  while ((m = reLit.exec(n))) {
    const v = (m[1] || m[2] || m[3] || '').toLowerCase();
    if (v) out.push('l:' + v);
  }
  // modos protocolo
  const reModo = /modo_[a-z0-9_]+/g;
  while ((m = reModo.exec(n))) out.push('p:' + m[0]);
  // números de velocidade/tempo relevantes (agrupados)
  const reNum = /\b(\d{1,3}(?:\.\d+)?)\b/g;
  while ((m = reNum.exec(n))) {
    const v = parseFloat(m[1]);
    if (v >= 5 && v <= 100) out.push('n:' + Math.round(v / 5) * 5); // buckets de 5
  }
  return out;
}

function jaccard(a, b) {
  const A = new Set(a);
  const B = new Set(b);
  if (!A.size && !B.size) return 1;
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / new Set([...A, ...B]).size;
}

function cobertura(ref, aluno) {
  const R = new Set(ref);
  const A = new Set(aluno);
  if (!R.size) return 0;
  let hit = 0;
  for (const x of R) if (A.has(x)) hit++;
  return hit / R.size;
}

function bigrams(arr) {
  const o = [];
  for (let i = 0; i < arr.length - 1; i++) o.push(arr[i] + '>' + arr[i + 1]);
  return o;
}

function sequenciaMetodos(src) {
  const n = normalizarCodigo(src);
  const out = [];
  const re = /\.([a-z_][a-z0-9_]*)\s*\(/g;
  let m;
  while ((m = re.exec(n))) out.push(m[1]);
  return out;
}

/** Similaridade 0..1 — bem mais exigente que o Jaccard puro. */
export function similaridadeCodigo(aluno, referencia) {
  if (!referencia || !String(referencia).trim()) return 0;
  const ta = tokensCodigo(aluno);
  const tr = tokensCodigo(referencia);
  if (!tr.length || !ta.length) return 0;

  const ea = tokensEssenciais(aluno);
  const er = tokensEssenciais(referencia);
  if (!er.length) return 0;

  const covEss = cobertura(er, ea);
  const jacEss = jaccard(ea, er);
  const seqA = sequenciaMetodos(aluno);
  const seqR = sequenciaMetodos(referencia);
  const seqCov = cobertura(seqR, seqA);
  const bigHit = cobertura(bigrams(seqR), bigrams(seqA));

  // penalidade de tamanho: código muito diferente da ref
  const lenA = normalizarCodigo(aluno).length || 1;
  const lenR = normalizarCodigo(referencia).length || 1;
  const ratio = Math.min(lenA, lenR) / Math.max(lenA, lenR);
  const penTamanho = 0.55 + 0.45 * ratio; // 0.55..1

  // peso forte em APIs/ordem; tokens genéricos só um pouco
  const jacTok = jaccard(ta, tr);
  let s =
    0.38 * covEss +
    0.22 * jacEss +
    0.18 * seqCov +
    0.12 * bigHit +
    0.1 * jacTok;

  s *= penTamanho;

  // S só é realista com cobertura essencial alta
  if (covEss < 0.55) s = Math.min(s, 0.55);
  if (covEss < 0.72) s = Math.min(s, 0.70);
  if (covEss < 0.88) s = Math.min(s, 0.86);
  if (seqCov < 0.75) s = Math.min(s, 0.88);

  return Math.max(0, Math.min(1, s));
}

export function melhorSimilaridade(aluno, referencias) {
  const refs = (referencias || []).filter((r) => r && String(r).trim());
  if (!refs.length) return { similaridade: 0, indiceReferencia: -1 };
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

export const RANK_ORDEM = { C: 1, B: 2, A: 3, S: 4 };

export function rankMelhor(a, b) {
  const na = RANK_ORDEM[a] || 0;
  const nb = RANK_ORDEM[b] || 0;
  return nb >= na ? (b || a || null) : (a || b || null);
}

/**
 * Limiares (após similaridade endurecida):
 *  C  objetivos ok, s < 0.50
 *  B  s >= 0.50
 *  A  s >= 0.68
 *  S  s >= 0.90  (quase colado na referência)
 */
export function rankDePrecisao({
  objetivosOk,
  similaridade,
  tempoSim = 0,
  tempoSimMaxS,
  semReferencia = false,
} = {}) {
  if (!objetivosOk) return null;

  // Sem referência: no máximo B (não inventa S por tempo)
  if (semReferencia) {
    if (tempoSimMaxS && tempoSim > 0 && tempoSim <= tempoSimMaxS * 0.5) return 'B';
    return 'C';
  }

  const s = Math.max(0, Math.min(1, similaridade || 0));
  let rank = 'C';
  if (s >= 0.52) rank = 'B';
  if (s >= 0.72) rank = 'A';
  if (s >= 0.94) rank = 'S';  // quase idêntico à referência

  // Estourou tempo: desce um degrau
  if (tempoSimMaxS && tempoSim > tempoSimMaxS * 1.2) {
    if (rank === 'S') rank = 'A';
    else if (rank === 'A') rank = 'B';
    else if (rank === 'B') rank = 'C';
  }
  return rank;
}

export function rankParaNivel(rank) {
  return RANK_ORDEM[rank] || 0;
}

export function pontuarResposta(codigoAluno, missao, { objetivosOk, tempoSim } = {}) {
  const refs =
    missao.codigosReferencia ||
    (missao.codigoReferencia ? [missao.codigoReferencia] : []) ||
    [];
  const refsUteis = (refs || []).filter((r) => r && String(r).trim());
  const { similaridade, indiceReferencia } = melhorSimilaridade(codigoAluno, refsUteis);

  const rank = rankDePrecisao({
    objetivosOk: !!objetivosOk,
    similaridade,
    tempoSim: tempoSim ?? 0,
    tempoSimMaxS: missao.limites?.tempoSimMaxS,
    semReferencia: !refsUteis.length,
  });

  const labels = {
    C: 'C — cumprido',
    B: 'B — bom',
    A: 'A — ótimo',
    S: 'S — excelente',
  };

  return {
    similaridade,
    rank,
    rankLabel: rank ? labels[rank] : 'Sem rank (objetivos pendentes)',
    indiceReferencia,
    maxRank: 'S',
    totalAlternativas: refsUteis.length,
    estrelas: rankParaNivel(rank),
    maxEstrelas: 4,
  };
}

/** @deprecated */
export function estrelasDePrecisao(opts) {
  return rankParaNivel(rankDePrecisao(opts));
}
