// Reexport — fonte única em ../sim.js
// SimEV3 — EV3 virtual
// ============================================================
const OP = {
  SOUND: 0x94, UI_WRITE: 0x82, INPUT_DEVICE: 0x99,
  OUT_RESET: 0xA2, OUT_STOP: 0xA3, OUT_SPEED: 0xA5, OUT_START: 0xA6,
  OUT_TEST: 0xA9, OUT_READY: 0xAA,
  OUT_STEP_SPEED: 0xAE, OUT_TIME_SPEED: 0xAF,
  OUT_STEP_SYNC: 0xB0, OUT_TIME_SYNC: 0xB1,
  OUT_CLR_COUNT: 0xB2, OUT_GET_COUNT: 0xB3,
};

const OPCODES = {
  [OP.SOUND]: ['som', 4], [OP.UI_WRITE]: ['LED', 2], [OP.INPUT_DEVICE]: ['sensor ler', 7],
  [OP.OUT_RESET]: ['motor reset', 2], [OP.OUT_STOP]: ['motor parar', 3],
  [OP.OUT_SPEED]: ['motor velocidade', 3], [OP.OUT_START]: ['motor ligar', 2],
  [OP.OUT_TEST]: ['motor ocupado?', 3], [OP.OUT_READY]: ['motor pronto', 2],
  [OP.OUT_STEP_SPEED]: ['motor graus', 7], [OP.OUT_TIME_SPEED]: ['motor tempo', 7],
  [OP.OUT_STEP_SYNC]: ['base graus', 6], [OP.OUT_TIME_SYNC]: ['base tempo', 6],
  [OP.OUT_CLR_COUNT]: ['encoder zerar', 2], [OP.OUT_GET_COUNT]: ['encoder ler', 3],
};
const CORES_LED = ['DESLIGADO', 'VERDE', 'VERMELHO', 'AMBAR', 'VERDE_PISCA', 'VERMELHO_PISCA', 'AMBAR_PISCA', 'VERDE_PULSA', 'VERMELHO_PULSA', 'AMBAR_PULSA'];

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
    case 0x84: { let j = i + 1, s = ''; while (b[j] !== 0) s += String.fromCharCode(b[j++]); return { tipo: 'str', valor: s, prox: j + 1 }; }
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

const _Cen = (typeof Cenarios !== 'undefined') ? Cenarios : (typeof require !== 'undefined' ? require('./cenarios.js') : null);
if (!_Cen) throw new Error('Cenarios não carregado — inclua cenarios.js antes de sim.js');
const CENARIOS = _Cen.lista;
const STRIDE = 8;

class SimEV3 {
  constructor(cenario = 'treino', cfg = {}) {
    this.cfg = Object.assign({
      grausPorPct: 10,
      cmPorGrau: Math.PI * 5.6 / 360,
      bitola: 12, raio: 7, passo: 0.01,
      latEnvio: 0.005, latResposta: 0.02,
      sensores: { 1: 'cor', 2: 'toque', 3: 'cor', 4: 'ultrassonico' },
      inicio: null,
      amostragem: 'area',
      raioSensorCm: 0.35,

      // Física mais realista (robô diferencial, não GTA)
      acelMotor: 280,          // % de potência por segundo (sobe/desce até o comando)
      freioMotor: 420,         // %/s ao parar (ocioso) — freio um pouco mais firme
      atritoLin: 0.18,         // perda de avanço por atrito (adimensional / s leve)
      maxOmega: 4.2,           // rad/s máximo de guinada (~240°/s)
      escorregaCurva: 0.32,    // reduz avanço em curva fechada (0=sem, 1=muito)
      modoLuz: 'luminancia',
    }, cfg);
    this.reset(cenario);
  }

  reset(cenario = this.cenarioNome) {
    if (!CENARIOS[cenario]) throw new Error('cenário desconhecido: ' + cenario);
    this.cenarioNome = cenario; this.cen = CENARIOS[cenario];
    this.tapete = _Cen.obterTapete(cenario);
    // O Sandbox embute seu próprio SimEV3: ele também deve reiniciar o semáforo.
    _Cen.atualizarTapete?.(this.cen, this.tapete, 0);
    const s = _Cen.inicioDe(this.cen, this.cfg.inicio);
    this.x = s.x; this.y = s.y; this.th = s.th; this.t = 0;
    this.motores = {}; for (const p of 'ABCD') this.motores[p] = { v: 0, setv: 0, vel: 0, modo: 'ocioso', rest: 0, enc: 0 };
    this.led = 'DESLIGADO';
    this.frames = [];
    this._gravar();
    this.eventos = []; this.pacotes = []; this.dist = 0;
  }

  agora() { return this.t; }

  avancar(dt) {
    let falta = dt; const h = this.cfg.passo;
    while (falta > 1e-9) { const d = Math.min(h, falta); this._passo(d); falta -= d; }
  }

  _passo(h) {
    const c = this.cfg, dm = {};
    const acel = (c.acelMotor != null ? c.acelMotor : 280) * h;
    const freio = (c.freioMotor != null ? c.freioMotor : 420) * h;
    for (const p of 'ABCD') {
      const m = this.motores[p];
      if (m.vel == null) m.vel = 0;
      let alvo = 0;
      let dAtivo = h;
      if (m.modo !== 'ocioso') {
        alvo = m.v;
        dAtivo = m.modo === 'tempo' ? Math.min(h, Math.max(m.rest, 0)) : h;
      }
      const maxStep = (m.modo === 'ocioso' || alvo === 0) ? freio : acel;
      if (m.vel < alvo) m.vel = Math.min(alvo, m.vel + maxStep);
      else if (m.vel > alvo) m.vel = Math.max(alvo, m.vel - maxStep);
      if (Math.abs(m.vel) < 0.4 && alvo === 0) m.vel = 0;
      const graus = m.vel * c.grausPorPct * dAtivo;
      m.enc += graus;
      dm[p] = graus * c.cmPorGrau;
      if (m.modo === 'tempo') {
        m.rest -= h;
        if (m.rest <= 1e-9) { m.v = 0; m.modo = 'ocioso'; }
      }
    }
    let dl = dm.B || 0, dr = dm.C || 0;
    const sumAbs = Math.abs(dl) + Math.abs(dr);
    const curv = sumAbs > 1e-9 ? Math.abs(dr - dl) / sumAbs : 0;
    const slip = Math.max(0, Math.min(1, c.escorregaCurva != null ? c.escorregaCurva : 0.32));
    let ds = (dl + dr) / 2 * (1 - slip * curv * 0.85);
    let dth = -(dr - dl) / c.bitola;
    const maxOm = c.maxOmega != null ? c.maxOmega : 4.2;
    const om = dth / (h || 1e-9);
    if (Math.abs(om) > maxOm) {
      const k = maxOm / Math.abs(om);
      dth *= k;
      ds *= 0.92 + 0.08 * k;
    }
    const atr = c.atritoLin != null ? c.atritoLin : 0.18;
    if (Math.abs(ds) > 0) ds *= Math.max(0, 1 - atr * h);
    const midTh = this.th + dth / 2;
    const nx = this.x + ds * Math.cos(midTh);
    const ny = this.y + ds * Math.sin(midTh);
    let px = nx, py = ny;
    if (this._colide(px, py)) {
      if (!this._colide(nx, this.y)) py = this.y;
      else if (!this._colide(this.x, ny)) px = this.x;
      else { px = this.x; py = this.y; }
      if (this.motores.B) this.motores.B.vel *= 0.35;
      if (this.motores.C) this.motores.C.vel *= 0.35;
      dth *= 0.4;
    }
    this.dist += Math.hypot(px - this.x, py - this.y);
    this.x = px; this.y = py;
    this.th += dth;
    if (this.th > Math.PI) this.th -= 2 * Math.PI;
    if (this.th < -Math.PI) this.th += 2 * Math.PI;
    this.t += h;
    this._gravar();
  }

  _gravar() {
    const M = this.motores;
    this.frames.push(this.t, this.x, this.y, this.th, M.A.enc, M.B.enc, M.C.enc, M.D.enc);
  }

  _colide(x, y) {
    const r = this.cfg.raio;
    if (x < r || y < r || x > this.cen.w - r || y > this.cen.h - r) return true;
    if (typeof this.cen.solidoEm === 'function') {
      // Testa toda a área circular de apoio, não só o centro do veículo.
      // Impede que metade do robô ultrapasse a borda de uma plataforma.
      if (!this.cen.solidoEm(x, y)) return true;
      for (let k = 0; k < 8; k++) {
        const a = k * Math.PI / 4;
        if (!this.cen.solidoEm(x + r * Math.cos(a), y + r * Math.sin(a))) return true;
      }
    }
    if (typeof this.cen.podeTransitar === 'function' &&
        !this.cen.podeTransitar(this.x, this.y, x, y)) return true;
    return this.cen.caixas.some((b) => {
      const cx = Math.max(b.x, Math.min(x, b.x + b.w)), cy = Math.max(b.y, Math.min(y, b.y + b.h));
      return Math.hypot(x - cx, y - cy) < r;
    });
  }

  concluirComandos(maxS = 30) {
    const t0 = this.t;
    while (Object.values(this.motores).some((m) => m.modo === 'tempo') && this.t - t0 < maxS) this.avancar(0.05);
    const ligados = Object.entries(this.motores).filter(([, m]) => m.modo === 'continuo' && m.v !== 0).map(([p]) => p);
    return { drenado: this.t - t0, ligados };
  }

  rgbEm(x, y, th, tempoS = this.t) {
    // Fonte da verdade: a cor do piso no instante da simulação.
    // Não usar um Canvas estático: o mesmo tapete alimenta o sensor e o 3D.
    _Cen.atualizarTapete?.(this.cen, this.tapete, tempoS);
    const sx = x + 5.5 * Math.cos(th), sy = y + 5.5 * Math.sin(th);
    return this.cfg.amostragem === 'pixel' ? _Cen.lerPixel(this.tapete, sx, sy) : _Cen.lerArea(this.tapete, sx, sy, this.cfg.raioSensorCm);
  }

  refletidaEm(x, y, th, tempoS = this.t) { return _Cen.intensidade(this.rgbEm(x, y, th, tempoS), this.cfg.modoLuz); }
  corEm(x, y, th, tempoS = this.t) { const [r, g, b] = this.rgbEm(x, y, th, tempoS); return _Cen.classificarCor(r, g, b); }
  refletida() { return this.refletidaEm(this.x, this.y, this.th); }

  ultrassonico() {
    const ox = this.x + 7 * Math.cos(this.th), oy = this.y + 7 * Math.sin(this.th);
    let best = 255;
    const caixas = this.cen.caixas;
    for (let k = -3; k <= 3; k++) {
      const a = this.th + k * (15 * Math.PI / 180) / 3, dx = Math.cos(a), dy = Math.sin(a);
      const hit = (x0, y0, x1, y1) => {
        let tmin = 0, tmax = Infinity;
        for (const [o, dd, lo, hi] of [[ox, dx, x0, x1], [oy, dy, y0, y1]]) {
          if (Math.abs(dd) < 1e-9) { if (o < lo || o > hi) return Infinity; }
          else { let t1 = (lo - o) / dd, t2 = (hi - o) / dd; if (t1 > t2) [t1, t2] = [t2, t1];
            tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2); if (tmin > tmax) return Infinity; }
        }
        return tmin;
      };
      for (const b of caixas) best = Math.min(best, hit(b.x, b.y, b.x + b.w, b.y + b.h));
      const ts = [];
      if (dx > 1e-9) ts.push((this.cen.w - ox) / dx); if (dx < -1e-9) ts.push(-ox / dx);
      if (dy > 1e-9) ts.push((this.cen.h - oy) / dy); if (dy < -1e-9) ts.push(-oy / dy);
      best = Math.min(best, ...ts);
    }
    return Math.max(0, Math.min(255, best));
  }

  lerSensor(porta, modo) {
    const tipo = this.cfg.sensores[porta + 1];
    if (!tipo) return null;
    if (tipo === 'cor') return modo === 0 ? this.refletida() : modo === 1 ? 10 : this.corEm(this.x, this.y, this.th);
    if (tipo === 'toque') return this.ultrassonico() < 1.5 ? 1 : 0;
    return this.ultrassonico();
  }

  processar(pacote) {
    const b = pacote instanceof Uint8Array ? pacote : new Uint8Array(pacote);
    const dec = decodificar(b);
    this.pacotes.push({ t: this.t, hex: hex(b), desc: dec.ops.map((o) => this._descrever(o)).join(' + '), resposta: dec.resposta });
    let saida = dec.resposta ? new Uint8Array(dec.bytesGlobais) : null;
    let erro = false;
    for (const o of dec.ops) { const r = this._executar(o, saida); if (r === 'erro') erro = true; }
    this.avancar(this.cfg.latEnvio + (dec.resposta ? this.cfg.latResposta : 0));
    return erro ? false : saida;
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
        const v = q[2], rest = o.op === OP.OUT_TIME_SPEED ? q[4] / 1000 : (v === 0 ? 0 : q[4] / (Math.abs(v) * c.grausPorPct));
        portas(q[1]).forEach((p) => { Object.assign(M[p], { v, modo: 'tempo', rest }); }); break;
      }
      case OP.OUT_TIME_SYNC: case OP.OUT_STEP_SYNC: {
        const ps = portas(q[1]); if (ps.length !== 2) break;
        const v = q[2], t = q[3];
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

// Browser global (IDE)
if (typeof globalThis !== 'undefined') {
  globalThis.SimEV3 = SimEV3;
  globalThis.decodificar = decodificar;
  globalThis.hex = hex;
  globalThis.STRIDE = STRIDE;
  if (typeof CENARIOS !== 'undefined') globalThis.CENARIOS = CENARIOS;
}
