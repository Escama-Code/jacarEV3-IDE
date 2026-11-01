/*
 * Monitor do Robô — visualização dos sensores e motores sincronizada com o replay.
 * Não modifica o motor de física, a biblioteca jacarev3, o código Python ou o mapa.
 */
(function (raiz, fabrica) {
  const api = fabrica();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (raiz) raiz.JacarMonitorRobo = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const PASSO_FRAME = 8;
  const NOMES_COR = {
    1: 'Preto', 2: 'Azul', 3: 'Verde', 4: 'Amarelo',
    5: 'Vermelho', 6: 'Branco', 7: 'Marrom'
  };

  function numero(valor, padrao = 0) {
    const n = Number(valor);
    return Number.isFinite(n) ? n : padrao;
  }

  function indiceFrame(frames, tempo) {
    const n = Math.floor((frames?.length || 0) / PASSO_FRAME);
    if (!n) return -1;
    let lo = 0, hi = n - 1;
    const t = numero(tempo);
    while (lo < hi) {
      const meio = (lo + hi + 1) >> 1;
      if (frames[meio * PASSO_FRAME] <= t) lo = meio;
      else hi = meio - 1;
    }
    return lo;
  }

  function velocidadeMotor(frames, atual, offset, grausPorPct) {
    if (atual < 1) return 0;
    // Duas amostras de 10 ms, evitando atrasos artificiais nas paradas.
    const anterior = Math.max(0, atual - 2);
    const a = atual * PASSO_FRAME;
    const b = anterior * PASSO_FRAME;
    const dt = frames[a] - frames[b];
    if (!(dt > 0)) return 0;
    const v = (frames[a + offset] - frames[b + offset]) / (dt * grausPorPct);
    return Math.abs(v) < 0.05 ? 0 : Math.max(-100, Math.min(100, v));
  }

  function movimento(b, c) {
    if (Math.max(Math.abs(b), Math.abs(c)) < 0.5) return 'Parado';
    if (b * c < -0.25) return 'Girando no lugar';
    if (b < -0.5 && c < -0.5) return 'Movendo para trás';
    if (Math.abs(b - c) > 2.5) return 'Fazendo curva';
    return 'Seguindo em frente';
  }

  function leituraSensor(sim, x, y, th, t) {
    let refletida = null, cor = null;
    try {
      if (typeof sim.refletidaEm === 'function') {
        refletida = numero(sim.refletidaEm(x, y, th, t), NaN);
        if (!Number.isFinite(refletida)) refletida = null;
      }
    } catch (_) {}
    try {
      if (typeof sim.corEm === 'function') {
        const cod = Number(sim.corEm(x, y, th, t));
        cor = NOMES_COR[cod] || (Number.isFinite(cod) ? `Código ${cod}` : null);
      }
    } catch (_) {}
    return { refletida, cor };
  }

  function estadoEm(sim, tempo) {
    const frames = sim?.frames;
    const indice = indiceFrame(frames, tempo);
    if (indice < 0) return null;
    const o = indice * PASSO_FRAME;
    const t = frames[o], x = frames[o + 1], y = frames[o + 2], th = frames[o + 3];
    const grausPorPct = numero(sim.cfg?.grausPorPct, 10) || 10;
    const b = velocidadeMotor(frames, indice, 5, grausPorPct);
    const c = velocidadeMotor(frames, indice, 6, grausPorPct);
    return { t, x, y, th, motorB: b, motorC: c, movimento: movimento(b, c),
      ...leituraSensor(sim, x, y, th, tempo) };
  }

  function estadoAoVivo(sim) {
    if (!sim) return null;
    const b = sim.motores?.B, c = sim.motores?.C;
    const vel = (m) => m?.modo === 'ocioso' ? 0 : numero(m?.v);
    const vb = vel(b), vc = vel(c);
    return { t: numero(sim.t), motorB: vb, motorC: vc,
      movimento: movimento(vb, vc),
      ...leituraSensor(sim, sim.x, sim.y, sim.th, sim.t) };
  }

  function criar(els) {
    let aba = 'educacao';
    const { abaEducacao, abaMonitor, painelEducacao, painelMonitor,
      movimento: elMovimento, tempo: elTempo, cor: elCor,
      refletida: elRefletida, motorB: elB, motorC: elC, vazio } = els;

    function mudarAba(proxima) {
      aba = proxima === 'monitor' ? 'monitor' : 'educacao';
      const ativaMonitor = aba === 'monitor';
      abaMonitor.setAttribute('aria-selected', String(ativaMonitor));
      abaEducacao.setAttribute('aria-selected', String(!ativaMonitor));
      abaMonitor.tabIndex = ativaMonitor ? 0 : -1;
      abaEducacao.tabIndex = ativaMonitor ? -1 : 0;
      painelMonitor.hidden = !ativaMonitor;
      painelEducacao.hidden = ativaMonitor;
    }

    function fmt(valor, casas = 0) {
      return numero(valor).toFixed(casas).replace('.', ',');
    }

    function atualizar(estado) {
      if (!estado) {
        vazio.hidden = false;
        elMovimento.textContent = 'Aguardando execução';
        elTempo.textContent = '—';
        elCor.textContent = '—';
        elRefletida.textContent = '—';
        elB.textContent = '—';
        elC.textContent = '—';
        return;
      }
      vazio.hidden = true;
      elMovimento.textContent = estado.movimento;
      elTempo.textContent = fmt(estado.t, 1) + ' s';
      elCor.textContent = estado.cor ?? 'Indisponível';
      elRefletida.textContent = estado.refletida === null
        ? 'Indisponível' : fmt(estado.refletida, 1);
      elB.textContent = fmt(estado.motorB, 0) + '%';
      elC.textContent = fmt(estado.motorC, 0) + '%';
    }

    abaEducacao.addEventListener('click', () => mudarAba('educacao'));
    abaMonitor.addEventListener('click', () => mudarAba('monitor'));
    mudarAba('educacao');
    atualizar(null);
    return { mudarAba, atualizar, abaAtual: () => aba };
  }

  return { indiceFrame, velocidadeMotor, movimento, leituraSensor,
    estadoEm, estadoAoVivo, criar };
});
