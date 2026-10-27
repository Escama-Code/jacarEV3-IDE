const KEY = 'jacar-campanha-save-v2';

export function carregarSave(campanhaId) {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || '{}');
    if (all[campanhaId]) return all[campanhaId];
  } catch (_) {}
  return {
    campanhaId,
    xp: 0,
    missoes: {
      'cb01-led': { status: 'disponivel', estrelas: 0, tentativas: 0 },
    },
    desbloqueios: ['cb01-led'],
    dicasUsadas: {},
  };
}

export function gravarSave(save) {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || '{}');
    all[save.campanhaId] = save;
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch (e) {
    console.warn('save campanha', e);
  }
}

export function resetSave(campanhaId) {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || '{}');
    delete all[campanhaId];
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch (_) {}
}
