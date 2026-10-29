const KEY = 'jacar-campanha-save-v2';

export function carregarSave(campanhaId) {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || '{}');
    if (all[campanhaId]) {
      const s = all[campanhaId];
      if (!s.skills) s.skills = {};
      if (!s.dicasUsadas) s.dicasUsadas = {};
      if (!s.desbloqueios) s.desbloqueios = [];
      return s;
    }
  } catch (_) {}
  return {
    campanhaId,
    xp: 0,
    missoes: {
      'cb01-led': { status: 'disponivel', estrelas: 0, tentativas: 0 },
    },
    desbloqueios: ['cb01-led'],
    dicasUsadas: {},
    skills: {},
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

export function exportarSave(campanhaId) {
  const save = carregarSave(campanhaId);
  return JSON.stringify(
    {
      versao: 2,
      exportadoEm: new Date().toISOString(),
      save,
    },
    null,
    2
  );
}

export function importarSave(jsonText) {
  try {
    const data = typeof jsonText === 'string' ? JSON.parse(jsonText) : jsonText;
    const save = data.save || data;
    if (!save || !save.campanhaId) {
      return { ok: false, erro: 'JSON sem campanhaId / save.' };
    }
    if (!save.skills) save.skills = {};
    if (!save.missoes) save.missoes = {};
    gravarSave(save);
    return { ok: true, save };
  } catch (e) {
    return { ok: false, erro: String(e.message || e) };
  }
}

export function custoDica(camadaIdx) {
  if (camadaIdx <= 0) return 0;
  if (camadaIdx === 1) return 5;
  return 10;
}

export function consumirDica(save, missao) {
  const raw = missao.dicas || [];
  if (!raw.length) {
    return { ok: false, mensagem: 'Sem dicas nesta missão.' };
  }

  const normalizadas = raw.map((d, i) => {
    if (typeof d === 'string') {
      return { camada: i, texto: d, custoXp: custoDica(i) };
    }
    return {
      camada: d.camada ?? i,
      texto: d.texto || d.dica || '',
      custoXp: d.custoXp ?? custoDica(d.camada ?? i),
    };
  });

  if (!save.dicasUsadas) save.dicasUsadas = {};
  const usadas = save.dicasUsadas[missao.id] || 0;
  const idx = Math.min(usadas, normalizadas.length - 1);
  const dica = normalizadas[idx];
  const custo = dica.custoXp || 0;

  if (custo > 0 && (save.xp || 0) < custo) {
    return {
      ok: false,
      mensagem: `Esta dica custa ${custo} XP (você tem ${save.xp || 0}).`,
      dica: null,
    };
  }

  if (custo > 0) save.xp = (save.xp || 0) - custo;
  save.dicasUsadas[missao.id] = Math.min(usadas + 1, normalizadas.length);
  gravarSave(save);

  return {
    ok: true,
    dica,
    indice: idx,
    total: normalizadas.length,
    custoXp: custo,
    esgotadas: save.dicasUsadas[missao.id] >= normalizadas.length,
  };
}
