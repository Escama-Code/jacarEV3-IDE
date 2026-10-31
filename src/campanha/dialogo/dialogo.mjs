/**
 * Sistema de diálogo da campanha.
 *
 * Organização (fácil de estender):
 *   dialogo/personagens.json  — quem fala (nome, emoji, cor)
 *   dialogo/falas-padrao.json — frases genéricas por evento
 *   temas/*.json → missao.narrativa / missao.dialogos — falas da missão
 *
 * Eventos: intro | dica | fracasso | sucesso | referencia
 *
 * Na missão você pode usar:
 *   "narrativa": { "intro": [...], "sucesso": [...], "fracasso": [...] }
 *   ou "dialogos": { "intro": [...], "dica": [...], ... }
 * Cada fala: { "personagem": "instrutor"|"Instrutor"|"assistente", "texto": "..." }
 */

const BASE = new URL('./', import.meta.url);

async function fetchJson(name) {
  const res = await fetch(new URL(name, BASE));
  if (!res.ok) throw new Error('dialogo: falha ao carregar ' + name);
  return res.json();
}

let personagens = null;
let falasPadrao = null;
let pronto = false;
let fila = [];
let falando = false;
let el = null;

export async function initDialogo() {
  if (pronto) return;
  [personagens, falasPadrao] = await Promise.all([
    fetchJson('personagens.json'),
    fetchJson('falas-padrao.json'),
  ]);
  garantirDOM();
  pronto = true;
}

function garantirDOM() {
  if (document.getElementById('campDialogoOverlay')) {
    el = {
      overlay: document.getElementById('campDialogoOverlay'),
      avatar: document.getElementById('campDlgAvatar'),
      nome: document.getElementById('campDlgNome'),
      titulo: document.getElementById('campDlgTitulo'),
      texto: document.getElementById('campDlgTexto'),
      next: document.getElementById('campDlgNext'),
      skip: document.getElementById('campDlgSkip'),
    };
    return;
  }
  const css = document.createElement('style');
  css.id = 'camp-dialogo-css';
  css.textContent = `
#campDialogoOverlay {
  position: fixed; inset: 0; z-index: 120;
  display: flex; align-items: flex-end; justify-content: center;
  padding: 0 16px 24px;
  background: linear-gradient(transparent 40%, #0d1117cc 100%);
  pointer-events: none;
}
#campDialogoOverlay.ativo { pointer-events: auto; }
#campDialogoOverlay[hidden] { display: none !important; }
#campDialogoBox {
  width: min(640px, 100%);
  background: #161b22;
  border: 2px solid #30363d;
  border-radius: 16px;
  padding: 14px 16px 12px;
  box-shadow: 0 12px 40px #000a;
  display: grid;
  grid-template-columns: 64px 1fr;
  gap: 12px 14px;
  animation: campDlgIn .25s ease;
}
@keyframes campDlgIn {
  from { transform: translateY(24px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
#campDlgAvatar {
  width: 64px; height: 64px; border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  font-size: 32px; background: #21262d;
  border: 2px solid var(--dlg-cor, #3ecf8e);
}
#campDlgMeta { grid-column: 2; }
#campDlgNome { font-weight: 700; font-size: 15px; color: var(--dlg-cor, #3ecf8e); }
#campDlgTitulo { font-size: 11px; color: #8b949e; margin-left: 8px; }
#campDlgTexto {
  grid-column: 1 / -1;
  min-height: 3.2em;
  font-size: 15px; line-height: 1.45; color: #e6edf3;
  white-space: pre-wrap;
}
#campDlgTexto .cursor {
  display: inline-block; width: 8px; height: 1em;
  background: #3ecf8e; margin-left: 2px; vertical-align: text-bottom;
  animation: campBlink 0.8s step-end infinite;
}
@keyframes campBlink { 50% { opacity: 0; } }
#campDlgActions {
  grid-column: 1 / -1;
  display: flex; justify-content: flex-end; gap: 8px;
}
#campDlgActions button {
  border: 1px solid #30363d; background: #21262d; color: #e6edf3;
  border-radius: 8px; padding: 8px 14px; cursor: pointer; font-weight: 600;
}
#campDlgNext {
  background: #238636; border-color: #2ea043;
}
#campDlgNext:hover, #campDlgSkip:hover { filter: brightness(1.1); }
`;
  document.head.appendChild(css);

  const overlay = document.createElement('div');
  overlay.id = 'campDialogoOverlay';
  overlay.hidden = true;
  overlay.innerHTML = `
    <div id="campDialogoBox" role="dialog" aria-live="polite">
      <div id="campDlgAvatar">🐊</div>
      <div id="campDlgMeta">
        <span id="campDlgNome">Instrutor</span>
        <span id="campDlgTitulo">Mentor</span>
      </div>
      <div id="campDlgTexto"></div>
      <div id="campDlgActions">
        <button type="button" id="campDlgSkip">Pular</button>
        <button type="button" id="campDlgNext">Continuar</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  el = {
    overlay,
    avatar: overlay.querySelector('#campDlgAvatar'),
    nome: overlay.querySelector('#campDlgNome'),
    titulo: overlay.querySelector('#campDlgTitulo'),
    texto: overlay.querySelector('#campDlgTexto'),
    next: overlay.querySelector('#campDlgNext'),
    skip: overlay.querySelector('#campDlgSkip'),
  };
  el.next.onclick = () => avancar();
  el.skip.onclick = () => fechar();
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) avancar();
  });
  document.addEventListener('keydown', (e) => {
    if (overlay.hidden) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); avancar(); }
    if (e.key === 'Escape') fechar();
  });
}

function resolverPersonagem(chave) {
  if (!personagens) return { nome: String(chave || 'Instrutor'), emoji: '🐊', cor: '#3ecf8e', titulo: '' };
  const raw = String(chave || 'instrutor').trim();
  const id = raw.toLowerCase()
    .normalize('NFD').replace(/\p{M}/gu, '')
    .replace(/\s+/g, '');
  // aliases
  const map = {
    instrutor: 'instrutor',
    mentor: 'instrutor',
    professor: 'instrutor',
    jacare: 'instrutor',
    luz: 'assistente',
    assistente: 'assistente',
    dica: 'assistente',
    arbitro: 'arbitro',
    avaliador: 'arbitro',
  };
  const pid = map[id] || (personagens[id] ? id : 'instrutor');
  return personagens[pid] || personagens.instrutor;
}

function normalizarFala(f) {
  if (!f) return null;
  if (typeof f === 'string') return { personagem: 'instrutor', texto: f };
  const texto = f.texto || f.text || f.fala || '';
  if (!texto) return null;
  return { personagem: f.personagem || f.speaker || 'instrutor', texto: String(texto) };
}

/**
 * Coleta falas da missão para um evento, com fallback padrão.
 * @param {object|null} missao
 * @param {'intro'|'dica'|'fracasso'|'sucesso'|'referencia'} evento
 * @param {string} [textoExtra] — ex.: texto da dica do JSON
 */
export function obterFalas(missao, evento, textoExtra) {
  const bloco =
    (missao && missao.dialogos && missao.dialogos[evento]) ||
    (missao && missao.narrativa && missao.narrativa[evento]) ||
    null;

  let falas = [];
  if (Array.isArray(bloco)) {
    falas = bloco.map(normalizarFala).filter(Boolean);
  } else if (bloco && typeof bloco === 'object' && (bloco.texto || bloco.text)) {
    falas = [normalizarFala(bloco)].filter(Boolean);
  }

  if (!falas.length && falasPadrao && falasPadrao[evento]) {
    falas = falasPadrao[evento].map(normalizarFala).filter(Boolean);
  }

  if (textoExtra && evento === 'dica') {
    // personagem de dica + conteúdo real da dica
    falas = [
      ...falas.filter((f) => !textoExtra.includes(f.texto)),
      { personagem: 'assistente', texto: textoExtra },
    ];
    // se já tinha só o padrão, troca pelo conteúdo
    if (falas.length > 1 && falas[0].texto && falasPadrao?.dica?.[0]) {
      const pad = falasPadrao.dica[0].texto;
      falas = falas.filter((f) => f.texto !== pad);
      falas.unshift(normalizarFala(falasPadrao.dica[0]));
    }
  }

  return falas.length ? falas : [{ personagem: 'instrutor', texto: '…' }];
}

let typeTimer = null;
let typeDone = true;
let falaAtual = null;
let onFim = null;

function notificarFim() {
  const cb = onFim;
  onFim = null;
  if (cb) cb();
}

function mostrarFala(fala) {
  falaAtual = fala;
  const p = resolverPersonagem(fala.personagem);
  el.overlay.style.setProperty('--dlg-cor', p.cor || '#3ecf8e');
  el.avatar.textContent = p.emoji || '🐊';
  el.nome.textContent = p.nome || 'Instrutor';
  el.titulo.textContent = p.titulo || '';
  el.texto.innerHTML = '';
  typeDone = false;
  if (typeTimer) clearInterval(typeTimer);
  const full = fala.texto;
  let i = 0;
  typeTimer = setInterval(() => {
    i += 1;
    el.texto.innerHTML = escapeHtml(full.slice(0, i)) + (i < full.length ? '<span class="cursor"></span>' : '');
    if (i >= full.length) {
      clearInterval(typeTimer);
      typeTimer = null;
      typeDone = true;
    }
  }, 16);
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function avancar() {
  if (!typeDone && falaAtual) {
    // completa o texto na hora
    if (typeTimer) clearInterval(typeTimer);
    el.texto.textContent = falaAtual.texto;
    typeDone = true;
    return;
  }
  if (fila.length) {
    mostrarFala(fila.shift());
    return;
  }
  fechar();
}

function fechar() {
  if (typeTimer) clearInterval(typeTimer);
  typeTimer = null;
  fila = [];
  falando = false;
  if (el?.overlay) {
    el.overlay.hidden = true;
    el.overlay.classList.remove('ativo');
  }
  notificarFim();
}

/**
 * Inicia diálogo para um evento.
 * @returns {Promise<void>} resolve quando o aluno fecha o diálogo
 */
export function falar(missao, evento, textoExtra) {
  return new Promise(async (resolve) => {
    try {
      await initDialogo();
    } catch (e) {
      console.warn(e);
      resolve();
      return;
    }
    onFim = resolve;
    const falas = obterFalas(missao, evento, textoExtra);
    fila = falas.slice();
    falando = true;
    el.overlay.hidden = false;
    el.overlay.classList.add('ativo');
    el.next.onclick = () => avancar();
    el.skip.onclick = () => fechar();
    const primeira = fila.shift();
    mostrarFala(primeira || { personagem: 'instrutor', texto: '…' });
  });
}

/** Atalhos */
export const Dialogo = {
  init: initDialogo,
  falar,
  obterFalas,
  intro: (m) => falar(m, 'intro'),
  dica: (m, texto) => falar(m, 'dica', texto),
  fracasso: (m) => falar(m, 'fracasso'),
  sucesso: (m) => falar(m, 'sucesso'),
  referencia: (m) => falar(m, 'referencia'),
};

export default Dialogo;
