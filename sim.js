// ============================================================
// SimEV3 — EV3 virtual. Recebe os bytes REAIS (Direct Commands) que a
// jacarev3 gerou, decodifica o bytecode e move um robô 2D.
// Não depende de DOM: roda no navegador e no Node (testes).
// ============================================================
const OP = {
  SOUND: 0x94, UI_WRITE: 0x82, INPUT_DEVICE: 0x99,
  OUT_RESET: 0xA2, OUT_STOP: 0xA3, OUT_SPEED: 0xA5, OUT_START: 0xA6,
  OUT_TEST: 0xA9, OUT_READY: 0xAA,
  OUT_STEP_SPEED: 0xAE, OUT_TIME_SPEED: 0xAF,
  OUT_STEP_SYNC: 0xB0, OUT_TIME_SYNC: 0xB1,
  OUT_CLR_COUNT: 0xB2, OUT_GET_COUNT: 0xB3,
};
// opcode -> [nome, quantidade de parâmetros codificados]
const OPCODES = {
  [OP.SOUND]: ['som', 4], [OP.UI_WRITE]: ['LED', 2], [OP.INPUT_DEVICE]: ['sensor ler', 7],
  [OP.OUT_RESET]: ['motor reset', 2], [OP.OUT_STOP]: ['motor parar', 3],
  [OP.OUT_SPEED]: ['motor velocidade', 3], [OP.OUT_START]: ['motor ligar', 2],
  [OP.OUT_TEST]: ['motor ocupado?', 3], [OP.OUT_READY]: ['motor pronto', 2],
  [OP.OUT_STEP_SPEED]: ['motor graus', 7], [OP.OUT_TIME_SPEED]: ['motor tempo', 7],
  [OP.OUT_STEP_SYNC]: ['base graus', 6], [OP.OUT_TIME_SYNC]: ['base tempo', 6],
  [OP.OUT_CLR_COUNT]: ['encoder zerar', 2], [OP.OUT_GET_COUNT]: ['encoder ler', 3],
};
const CORES_LED = ['DESLIGADO', 'VERDE', 'VERMELHO', 'AMBAR', 'VERDE_PISCA',
  'VERMELHO_PISCA', 'AMBAR_PISCA', 'VERDE_PULSA', 'VERMELHO_PULSA', 'AMBAR_PULSA'];

// ---- decodificação de parâmetros (formato LC0/LC1/LC2/LC4/LCS/GV0) ----
function lerParam(b, i) {
  const x = b[i];
  if ((x & 0x80) === 0) {
    if ((x & 0xC0) === 0x40) return { tipo: 'var', valor: x & 0x1F, prox: i + 1 };
    let v = x & 0x3F; if (v & 0x20) v -= 0x40;
    return { tipo: 'const', valor: v, prox: i + 1 };
  }
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  switch (x) {
    case 0x81: return { tipo: 'const', valor: dv.getInt8(i + 1), prox: i + 2 };
    case 0x82: return { tipo: 'const', valor: dv.getInt16(i + 1, true), prox: i + 3 };
    case 0x83: return { tipo: 'const', valor: dv.getInt32(i + 1, true), prox: i + 5 };
    case 0x84: { let j = i + 1, s = ''; while (b[j] !== 0) s += String.fromCharCode(b[j++]);
      return { tipo: 'str', valor: s, prox: j + 1 }; }
    default: throw new Error('parâmetro desconhecido 0x' + x.toString(16));
  }
}
function decodificar(pacote) {
  const b = pacote instanceof Uint8Array ? pacote : new Uint8Array(pacote);
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const r = {
    contador: dv.getUint16(2, true), resposta: b[4] === 0x00,
    bytesGlobais: b[5] | ((b[6] & 0x03) << 8), ops: [],
  };
  let i = 7;
  while (i < b.length) {
    const op = b[i++]; const def = OPCODES[op];
    if (!def) { r.ops.push({ op, nome: 'opcode 0x' + op.toString(16), params: [] }); break; }
    const params = [];
    for (let k = 0; k < def[1]; k++) { const q = lerParam(b, i); params.push(q.valor); i = q.prox; }
    r.ops.push({ op, nome: def[0], params });
  }
  return r;
}
const hex = (b) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join(' ');
const MASK_PORTAS = (m) => ['A', 'B', 'C', 'D'].filter((_, k) => m & (1 << k));

// ---- cenários: vêm de cenarios.js (navegador: global `Cenarios`; Node: require) ----
const _Cen = (typeof Cenarios !== 'undefined') ? Cenarios : require('./cenarios.js');
const CENARIOS = _Cen.lista;                   // { treino, fll } — cada um com w, h (cm), caixas, inicios
const STRIDE = 8;                              // frames: [t, x, y, th, encA, encB, encC, encD] (enc em graus)

class SimEV3 {
  /** cenario: 'treino' | 'fll'. cfg.inicio: chave de CENARIOS[...].inicios (padrão: 'padrao') */
  constructor(cenario = 'treino', cfg = {}) {
    this.cfg = Object.assign({
      grausPorPct: 10,          // 100% ≈ 1000 °/s (motor grande EV3)
      cmPorGrau: Math.PI * 5.6 / 360,  // roda de 5,6 cm
      bitola: 12, raio: 7, passo: 0.01,
      latEnvio: 0.005, latResposta: 0.02,   // tempo virtual gasto por pacote (Bluetooth)
      sensores: { 1: 'cor', 2: 'toque', 3: 'cor', 4: 'ultrassonico' },
      inicio: 'padrao',
      amostragem: 'area',       // 'area' (média 3×3 num quadrado de ±raioSensorCm) | 'pixel' (1 pixel exato)
      raioSensorCm: 0.35,
      modoLuz: 'luminancia',    // 'luminancia' (Rec.709) | 'vermelho' (LED vermelho do sensor real)
    }, cfg);
    this.reset(cenario);
  }
  reset(cenario = this.cenarioNome) {
    if (!CENARIOS[cenario]) throw new Error('cenário desconhecido: ' + cenario);
    this.cenarioNome = cenario; this.cen = CENARIOS[cenario];
    this.tapete = _Cen.obterTapete(cenario);      // imagem + pixels (a mesma que o aluno vê)
    const s = _Cen.inicioDe(this.cen, this.cfg.inicio);
    this.x = s.x; this.y = s.y; this.th = s.th; this.t = 0;
    this.motores = {}; for (const p of 'ABCD') this.motores[p] = { v: 0, setv: 0, modo: 'ocioso', rest: 0, enc: 0 };
    this.led = 'DESLIGADO';
    this.frames = [];
    this._gravar();
    this.eventos = []; this.pacotes = []; this.dist = 0;
  }
  agora() { return this.t; }

  // ---------- física ----------
  avancar(dt) {
    let falta = dt; const h = this.cfg.passo;
    while (falta > 1e-9) { const d = Math.min(h, falta); this._passo(d); falta -= d; }
  }
  _passo(h) {
    const c = this.cfg, dm = {};
    for (const p of 'ABCD') {
      const m = this.motores[p]; let d = 0;
      if (m.modo !== 'ocioso') {
        d = m.modo === 'tempo' ? Math.min(h, Math.max(m.rest, 0)) : h;
        const graus = m.v * c.grausPorPct * d; m.enc += graus; dm[p] = graus * c.cmPorGrau;
        if (m.modo === 'tempo') { m.rest -= h; if (m.rest <= 1e-9) { m.v = 0; m.modo = 'ocioso'; } }
      } else dm[p] = 0;
    }
    const dl = dm.B, dr = dm.C, ds = (dl + dr) / 2, dth = -(dr - dl) / c.bitola;
    const nx = this.x + ds * Math.cos(this.th + dth / 2);
    const ny = this.y + ds * Math.sin(this.th + dth / 2);
    // colisão com deslizamento: se bater, tenta andar só em x ou só em y (resvala na quina/parede)
    let px = nx, py = ny;
    if (this._colide(px, py)) { if (!this._colide(nx, this.y)) py = this.y; else if (!this._colide(this.x, ny)) px = this.x; else { px = this.x; py = this.y; } }
    this.dist += Math.hypot(px - this.x, py - this.y); this.x = px; this.y = py;
    this.th += dth; this.t += h;
    this._gravar();
  }
  _gravar() {                                     // um quadro por passo: pose + encoders reais
    const M = this.motores;
    this.frames.push(this.t, this.x, this.y, this.th, M.A.enc, M.B.enc, M.C.enc, M.D.enc);
  }
  _colide(x, y) {
    const r = this.cfg.raio;
    if (x < r || y < r || x > this.cen.w - r || y > this.cen.h - r) return true;
    return this.cen.caixas.some((b) => {          // círculo do robô vs retângulo (quina arredondada)
      const cx = Math.max(b.x, Math.min(x, b.x + b.w)), cy = Math.max(b.y, Math.min(y, b.y + b.h));
      return Math.hypot(x - cx, y - cy) < r;
    });
  }

  // ---------- sensores ----------
  // Sensor de cor: lê PIXELS do tapete (mesma imagem do 2D/3D), 5,5 cm à frente do centro do robô
  rgbEm(x, y, th) {
    const sx = x + 5.5 * Math.cos(th), sy = y + 5.5 * Math.sin(th);
    return this.cfg.amostragem === 'pixel' ? _Cen.lerPixel(this.tapete, sx, sy) : _Cen.lerArea(this.tapete, sx, sy, this.cfg.raioSensorCm);
  }
  refletidaEm(x, y, th) { return _Cen.intensidade(this.rgbEm(x, y, th), this.cfg.modoLuz); }   // 0-100
  corEm(x, y, th) { const [r, g, b] = this.rgbEm(x, y, th); return _Cen.classificarCor(r, g, b); }  // id EV3 0-7
  refletida() { return this.refletidaEm(this.x, this.y, this.th); }
  ultrassonico() {                                // feixe de ~30°: menor distância entre 7 raios
    const ox = this.x + 7 * Math.cos(this.th), oy = this.y + 7 * Math.sin(this.th);
    let best = 255;
    const caixas = this.cen.caixas;
    for (let k = -3; k <= 3; k++) {
      const a = this.th + k * (15 * Math.PI / 180) / 3, dx = Math.cos(a), dy = Math.sin(a);
      const hit = (x0, y0, x1, y1) => {           // raio vs retângulo (slab)
        let tmin = 0, tmax = Infinity;
        for (const [o, dd, lo, hi] of [[ox, dx, x0, x1], [oy, dy, y0, y1]]) {
          if (Math.abs(dd) < 1e-9) { if (o < lo || o > hi) return Infinity; }
          else { let t1 = (lo - o) / dd, t2 = (hi - o) / dd; if (t1 > t2) [t1, t2] = [t2, t1];
            tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2); if (tmin > tmax) return Infinity; }
        }
        return tmin;
      };
      for (const b of caixas) best = Math.min(best, hit(b.x, b.y, b.x + b.w, b.y + b.h));
      const ts = [];                              // paredes da arena = ponto de saída do raio
      if (dx > 1e-9) ts.push((this.cen.w - ox) / dx); if (dx < -1e-9) ts.push(-ox / dx);
      if (dy > 1e-9) ts.push((this.cen.h - oy) / dy); if (dy < -1e-9) ts.push(-oy / dy);
      best = Math.min(best, ...ts);
    }
    return Math.max(0, Math.min(255, best));
  }
  lerSensor(porta, modo) {
    const tipo = this.cfg.sensores[porta + 1];
    if (!tipo) return null;                       // porta sem sensor -> EV3 responde erro
    if (tipo === 'cor') return modo === 0 ? this.refletida() : modo === 1 ? 10 : this.corEm(this.x, this.y, this.th);   // 0 refletida · 1 ambiente · 2 cor
    if (tipo === 'toque') return this.ultrassonico() < 1.5 ? 1 : 0;
    return this.ultrassonico();
  }

  // ---------- recebe um pacote Direct Command real ----------
  processar(pacote) {
    const b = pacote instanceof Uint8Array ? pacote : new Uint8Array(pacote);
    const dec = decodificar(b);
    this.pacotes.push({ t: this.t, hex: hex(b), desc: dec.ops.map((o) => this._descrever(o)).join(' + '),
      resposta: dec.resposta });
    let saida = dec.resposta ? new Uint8Array(dec.bytesGlobais) : null;
    let erro = false;
    for (const o of dec.ops) { const r = this._executar(o, saida); if (r === 'erro') erro = true; }
    this.avancar(this.cfg.latEnvio + (dec.resposta ? this.cfg.latResposta : 0));
    return erro ? false : saida;                  // false -> resposta de erro; null -> sem resposta
  }
  _descrever(o) {
    const q = o.params, P = (m) => MASK_PORTAS(m).join('');
    switch (o.op) {
      case OP.OUT_SPEED: return `velocidade ${q[2]}% porta ${P(q[1])}`;
      case OP.OUT_START: return `ligar porta ${P(q[1])}`;
      case OP.OUT_STOP: return `parar porta ${P(q[1])}`;
      case OP.OUT_TIME_SPEED: return `motor ${P(q[1])} ${q[2]}% por ${q[4]} ms`;
      case OP.OUT_STEP_SPEED: return `motor ${P(q[1])} ${q[2]}% por ${q[4]}°`;
      case OP.OUT_TIME_SYNC: return `base ${P(q[1])} ${q[2]}% curva ${q[3]} por ${q[4]} ms`;
      case OP.OUT_STEP_SYNC: return `base ${P(q[1])} ${q[2]}% curva ${q[3]} por ${q[4]}°`;
      case OP.SOUND: return `bip ${q[2]} Hz ${q[3]} ms`;
      case OP.UI_WRITE: return `LED ${CORES_LED[q[1]] || q[1]}`;
      case OP.INPUT_DEVICE: return `ler sensor porta ${q[2] + 1} modo ${q[4]}`;
      case OP.OUT_TEST: return `motor ${P(q[1])} ocupado?`;
      case OP.OUT_GET_COUNT: return `ler encoder ${'ABCD'[q[1]]}`;
      default: return o.nome;
    }
  }
  _executar(o, saida) {
    const q = o.params, M = this.motores, c = this.cfg;
    const dv = saida ? new DataView(saida.buffer) : null;
    const portas = (m) => MASK_PORTAS(m);
    switch (o.op) {
      case OP.OUT_SPEED: portas(q[1]).forEach((p) => { M[p].setv = q[2]; }); break;
      case OP.OUT_START: portas(q[1]).forEach((p) => { M[p].v = M[p].setv; M[p].modo = 'continuo'; }); break;
      case OP.OUT_STOP: portas(q[1]).forEach((p) => { M[p].v = 0; M[p].modo = 'ocioso'; }); break;
      case OP.OUT_RESET: case OP.OUT_CLR_COUNT: portas(q[1]).forEach((p) => { M[p].enc = 0; }); break;
      case OP.OUT_TIME_SPEED: case OP.OUT_STEP_SPEED: {
        const v = q[2], rest = o.op === OP.OUT_TIME_SPEED ? q[4] / 1000
          : (v === 0 ? 0 : q[4] / (Math.abs(v) * c.grausPorPct));
        portas(q[1]).forEach((p) => { Object.assign(M[p], { v, modo: 'tempo', rest }); }); break;
      }
      case OP.OUT_TIME_SYNC: case OP.OUT_STEP_SYNC: {
        const ps = portas(q[1]); if (ps.length !== 2) break;
        const v = q[2], t = q[3];                 // o menor porta é a esquerda (firmware)
        const vl = t < 0 ? v * (1 + t / 100) : v, vr = t > 0 ? v * (1 - t / 100) : v;
        const vmax = Math.max(Math.abs(vl), Math.abs(vr));
        const rest = o.op === OP.OUT_TIME_SYNC ? q[4] / 1000 : (vmax === 0 ? 0 : q[4] / (vmax * c.grausPorPct));
        Object.assign(M[ps[0]], { v: vl, modo: 'tempo', rest });
        Object.assign(M[ps[1]], { v: vr, modo: 'tempo', rest }); break;
      }
      case OP.OUT_TEST: if (dv) dv.setInt8(0, portas(q[1]).some((p) => M[p].modo === 'tempo') ? 1 : 0); break;
      case OP.OUT_GET_COUNT: if (dv) dv.setInt32(0, Math.round(M['ABCD'[q[1]]].enc), true); break;
      case OP.SOUND: this.eventos.push({ t: this.t, tipo: 'bip', freq: q[2], ms: q[3] }); break;
      case OP.UI_WRITE: this.led = CORES_LED[q[1]] || 'DESLIGADO';
        this.eventos.push({ t: this.t, tipo: 'led', cor: this.led }); break;
      case OP.INPUT_DEVICE: {
        const v = this.lerSensor(q[2], q[4]); if (v === null) return 'erro';
        if (dv) for (let k = 0; k + 4 <= saida.length; k += 4) dv.setFloat32(k, v, true); break;
      }
    }
    return 'ok';
  }
}
if (typeof module !== 'undefined') module.exports = { SimEV3, decodificar, hex, CENARIOS, STRIDE };
