/**
 * Validação leve de mapas OBR / jcrv3map antes de exportar.
 */
export function validarMapa(doc) {
  const erros = [];
  const avisos = [];
  if (!doc || typeof doc !== 'object') {
    return { ok: false, erros: ['Documento vazio'], avisos };
  }
  const tiles = doc.tiles || doc.ladrilhos || [];
  const w = doc.w || doc.largura || 0;
  const h = doc.h || doc.altura || 0;
  if (w < 30 || h < 30) avisos.push('Arena muito pequena (< 30 cm).');
  if (!tiles.length && !(doc.tracos || []).length && !(doc.linhas || []).length) {
    avisos.push('Nenhuma linha/tile detectado — mapa pode estar vazio.');
  }
  // Verdes isolados
  const verdes = tiles.filter((t) => (t.tipo || t.id || '').toString().includes('verde'));
  if (verdes.length > 12) avisos.push('Muitos marcadores verdes (' + verdes.length + ').');
  // Sobreposição grosseira
  const chaves = new Set();
  for (const t of tiles) {
    const k = `${t.x}|${t.y}|${t.z || 0}`;
    if (chaves.has(k)) erros.push(`Sobreposição de tile em ${k}`);
    chaves.add(k);
  }
  // Início
  if (!doc.inicio && !doc.inicios) avisos.push('Defina uma pose de início do robô.');
  return { ok: erros.length === 0, erros, avisos };
}

export default validarMapa;
