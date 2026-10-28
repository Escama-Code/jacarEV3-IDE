/**
 * Carrega a campanha a partir de JSON em dados/.
 * Para acrescentar tema: crie dados/temas/meu-tema.json e registre em campanha.json.
 */

const BASE = new URL('./dados/', import.meta.url);

async function fetchJson(rel) {
  const url = new URL(rel, BASE);
  const res = await fetch(url);
  if (!res.ok) throw new Error('Falha ao carregar ' + rel + ' (' + res.status + ')');
  return res.json();
}

/**
 * @returns {{ CAMPANHA: object, MISSOES: object[] }}
 */
export async function carregarCatalogo() {
  const meta = await fetchJson('campanha.json');
  const missoes = [];
  const temas = [];

  for (const tema of meta.temas || []) {
    const arquivo = tema.arquivo;
    if (!arquivo) {
      console.warn('[campanha] tema sem arquivo:', tema.id);
      temas.push({ ...tema });
      continue;
    }
    const pack = await fetchJson(arquivo);
    const lista = pack.missoes || [];
    for (const m of lista) {
      // garante temaId e normaliza referencias
      m.temaId = m.temaId || tema.id || pack.id;
      if (!m.codigosReferencia && m.codigoReferencia) {
        m.codigosReferencia = [m.codigoReferencia];
      }
      if (!Array.isArray(m.codigosReferencia)) m.codigosReferencia = [];
      missoes.push(m);
    }
    temas.push({
      id: tema.id,
      titulo: tema.titulo,
      descricao: tema.descricao,
      cor: tema.cor,
      arquivo: tema.arquivo,
    });
  }

  missoes.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

  const CAMPANHA = {
    id: meta.id,
    titulo: meta.titulo,
    descricao: meta.descricao,
    temas,
  };

  return { CAMPANHA, MISSOES: missoes };
}
