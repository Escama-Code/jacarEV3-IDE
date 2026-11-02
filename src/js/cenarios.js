// ============================================================
// cenarios.js — DUPLO ARTEFATO.
// Cada cenário tem UMA arte de tapete (desenhada com Canvas 2D, em cm).
// Essa mesma imagem é:
//   (1) o chão que o aluno vê (2D e textura do 3D), e
//   (2) o que o sensor de cor lê, pixel a pixel (getImageData, uma vez só).
// Sem DOM obrigatório: no navegador usa OffscreenCanvas/<canvas>; no Node,
// @napi-rs/canvas (ou uma fábrica injetada com usarFabricaCanvas).
// ============================================================
const Cenarios = (() => {
  const PI = Math.PI;
  let fabricaInjetada = null;
  const cache = {};

  /** fábrica de canvas: (largura_px, altura_px) => canvas com getContext('2d') */
  function criarCanvas(w, h) {
    if (typeof globalThis.__fabricaCanvas === 'function') return globalThis.__fabricaCanvas(w, h);   // ganchos de teste
    if (fabricaInjetada) return fabricaInjetada(w, h);
    if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
    if (typeof document !== 'undefined') { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
    try { return require('@napi-rs/canvas').createCanvas(w, h); } catch (e) { /* cai no erro abaixo */ }
    throw new Error('Nenhum Canvas 2D disponível pra gerar o tapete.');
  }

  // ---------------------------------------------------------
  // Cor → leitura do EV3
  // ---------------------------------------------------------
  /** 0..100 a partir do RGB. 'luminancia' (padrão, Rec.709) ou 'vermelho' (o LED do sensor real é vermelho) */
  function intensidade(rgb, modoLuz = 'luminancia') {
    const [r, g, b] = rgb;
    const v = modoLuz === 'vermelho' ? r : 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return 5 + 65 * (v / 255);                     // preto ≈ 5, branco ≈ 70 (faixa típica do EV3)
  }
  /** RGB → id de cor do EV3: 0 nenhuma · 1 preto · 2 azul · 3 verde · 4 amarelo · 5 vermelho · 6 branco · 7 marrom */
  function classificarCor(r, g, b) {
    const mx = Math.max(r, g, b) / 255, mn = Math.min(r, g, b) / 255, d = mx - mn;
    const v = mx, s = mx === 0 ? 0 : d / mx;
    if (v < 0.2) return 1;                         // bem escuro = preto
    if (s < 0.25) return v < 0.35 ? 1 : 6;         // pouco colorido: preto, cinza-escuro ou branco
    let h;
    const R = r / 255, G = g / 255, B = b / 255;
    if (mx === R) h = 60 * (((G - B) / d + 6) % 6); else if (mx === G) h = 60 * ((B - R) / d + 2); else h = 60 * ((R - G) / d + 4);
    if (h >= 10 && h < 40 && v < 0.6) return 7;    // laranja escuro = marrom
    if (h < 15 || h >= 345) return 5;
    if (h < 28) return 5;                          // laranja puxando pro vermelho
    if (h < 70) return 4;
    if (h < 170) return 3;
    if (h < 265) return 2;
    return 5;                                      // magenta/roxo: o EV3 real chuta vermelho
  }
  const NOMES_COR = ['nenhuma', 'preto', 'azul', 'verde', 'amarelo', 'vermelho', 'branco', 'marrom'];

  // ---------------------------------------------------------
  // Tapete = imagem + dados de pixel
  // ---------------------------------------------------------
  function gerarTapete(cen) {
    const k = cen.pxPorCm, W = Math.round(cen.w * k), H = Math.round(cen.h * k);
    const canvas = criarCanvas(W, H);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.save(); ctx.scale(k, k); cen.desenhar(ctx, cen); ctx.restore();
    const img = ctx.getImageData(0, 0, W, H);
    return {
      id: cen.id, canvas, W, H, k, dados: img.data,
      // A versão muda somente quando um elemento dinâmico altera o tapete.
      versao: 0, _estadoSemaforo: cen.estadoSemaforoEm ? cen.semaforoEstado : null
    };
  }

  /**
   * Atualiza a pintura dinâmica do tapete usando o TEMPO SIMULADO (segundos).
   * O Canvas, os pixels dos sensores e a textura 3D permanecem sincronizados.
   * Não redesenha a cada passo de 10 ms: só quando a fase realmente muda.
   */
  function atualizarTapete(cen, tapete, tempoS = 0) {
    if (!cen || !tapete || typeof cen.estadoSemaforoEm !== 'function') return false;
    const estado = cen.estadoSemaforoEm(tempoS);
    if (tapete._estadoSemaforo === estado) {
      cen.semaforoEstado = estado; // mantém indicador e pixels coerentes após um reset
      return false;
    }

    cen.semaforoEstado = estado;
    const ctx = tapete.canvas.getContext('2d', { willReadFrequently: true });
    ctx.save();
    ctx.scale(tapete.k, tapete.k);
    cen.desenhar(ctx, cen);
    ctx.restore();

    // Atualiza o MESMO array (evita referências antigas em outros módulos).
    const pixels = ctx.getImageData(0, 0, tapete.W, tapete.H).data;
    if (tapete.dados.length === pixels.length) tapete.dados.set(pixels);
    else tapete.dados = pixels;
    tapete._estadoSemaforo = estado;
    tapete.versao = (tapete.versao || 0) + 1;
    return true;
  }
  /** pixel exato sob (x,y) em cm */
  function lerPixel(t, x, y) {
    const xi = Math.max(0, Math.min(t.W - 1, Math.floor(x * t.k))), yi = Math.max(0, Math.min(t.H - 1, Math.floor(y * t.k)));
    const o = (yi * t.W + xi) * 4; return [t.dados[o], t.dados[o + 1], t.dados[o + 2]];
  }
  /** média de 3×3 amostras num quadrado de ±raio cm (o "ponto" do sensor tem tamanho) */
  function lerArea(t, x, y, raio = 0.35) {
    let r = 0, g = 0, b = 0;
    for (const dy of [-raio, 0, raio]) for (const dx of [-raio, 0, raio]) { const p = lerPixel(t, x + dx, y + dy); r += p[0]; g += p[1]; b += p[2]; }
    return [r / 9, g / 9, b / 9];
  }

  // ---------------------------------------------------------
  // Cenário A — Pista de Treino (Sem Obstáculos) · 120×80 cm
  // ---------------------------------------------------------
  const treino = {
    id: 'treino', nome: 'Pista de Treino (Sem Obstáculos)', w: 120, h: 80, pxPorCm: 10,
    inicioPadrao: 'padrao',
    inicios: { padrao: { rotulo: 'sobre a linha (parte de baixo)', x: 60, y: 62, th: PI }, centro: { rotulo: 'centro, olhando pra esquerda', x: 60, y: 40, th: PI } },
    caixas: [], rampas: [],
    desenhar(ctx, c) {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.w, c.h);                       // fundo branco
      ctx.strokeStyle = '#111111'; ctx.lineWidth = 2;                                // circuito oval, fita de 2 cm
      ctx.beginPath(); ctx.ellipse(60, 40, 42, 22, 0, 0, 2 * PI); ctx.stroke();
    },
  };

  // ---------------------------------------------------------
  // Cenário B — Desvio Clássico (Paredes) · 120×80 cm
  // ---------------------------------------------------------
  const desvio = {
    id: 'desvio', nome: 'Desvio Clássico (Paredes)', w: 120, h: 80, pxPorCm: 10,
    inicioPadrao: 'centro',
    inicios: { centro: { rotulo: 'centro (lado esquerdo, olhando as paredes)', x: 14, y: 40, th: 0 }, baixo: { rotulo: 'canto inferior esquerdo', x: 14, y: 66, th: 0 } },
    caixas: [
      { nome: 'Parede 1', x: 55, y: 22, w: 10, h: 34, altura: 12, cor: '#5f86a6', modelo: 'parede' },
      { nome: 'Parede 2', x: 88, y: 40, w: 10, h: 38, altura: 12, cor: '#5f86a6', modelo: 'parede' },
    ],
    rampas: [],
    desenhar(ctx, c) {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.w, c.h);
      ctx.strokeStyle = '#d4d8dc'; ctx.lineWidth = 1.2; ctx.strokeRect(0.6, 0.6, c.w - 1.2, c.h - 1.2);   // moldura clara
      ctx.strokeStyle = '#c3cbd3'; ctx.lineWidth = 0.4; ctx.setLineDash([2, 2]);                          // guia pontilhada do caminho central
      ctx.beginPath(); ctx.moveTo(4, 40); ctx.lineTo(c.w - 4, 40); ctx.stroke(); ctx.setLineDash([]);
    },
  };

  // ---------------------------------------------------------
  // Cenário C — Tapete de Competição FLL (Com Rampa) · 236×114 cm
  // ---------------------------------------------------------
  const fll = {
    id: 'fll', nome: 'Tapete de Competição FLL (Com Rampa)', w: 236, h: 114, pxPorCm: 8,
    inicioPadrao: 'padrao',
    inicios: { padrao: { rotulo: 'área verde, olhando pra linha', x: 24, y: 92, th: 0 }, azul: { rotulo: 'área azul, olhando pra esquerda', x: 212, y: 92, th: PI }, rampa: { rotulo: 'diante da rampa, olhando pra ela', x: 46, y: 104, th: 0 } },
    caixas: [
      { nome: 'Missão 1 · Torre', x: 96, y: 8, w: 12, h: 12, altura: 8, cor: '#f28c28', modelo: 'torre' },
      { nome: 'Missão 2 · Plataforma', x: 154, y: 40, w: 12, h: 16, altura: 12, cor: '#8e44ad', modelo: 'plataforma' },
      { nome: 'Missão 3 · Contêiner', x: 214, y: 18, w: 14, h: 10, altura: 6, cor: '#c0392b', modelo: 'conteiner' },
    ],
    rampas: [{ nome: 'Rampa', x: 62, y: 96, w: 34, h: 16, altura: 4.5, subida: 18, dir: '+x', cor: '#8c8c8c' }],
    desenhar(ctx, c) {
      ctx.fillStyle = '#f2efe6'; ctx.fillRect(0, 0, c.w, c.h);
      ctx.fillStyle = '#1b2a5c'; ctx.beginPath(); ctx.ellipse(38, 24, 30, 15, 0, 0, 2 * PI); ctx.fill();
      ctx.strokeStyle = '#3a5fc0'; ctx.lineWidth = 0.7;
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(38, 24 + i * 0.01, 24 - i * 5, 11 - i * 2.2, 0, PI * 1.1, PI * 1.9); ctx.stroke(); }
      ctx.fillStyle = '#f2c230'; ctx.fillRect(176, 6, 54, 34);
      ctx.fillStyle = '#e8902a'; for (const [x, y, r] of [[190, 34, 9], [208, 12, 7], [222, 33, 8]]) { ctx.beginPath(); ctx.arc(x, y, r, PI, 2 * PI); ctx.fill(); }
      ctx.fillStyle = '#d62828'; ctx.beginPath(); ctx.arc(150, 96, 9, 0, 2 * PI); ctx.fill();
      ctx.fillStyle = '#ff8c1a'; ctx.beginPath(); ctx.arc(150, 96, 4, 0, 2 * PI); ctx.fill();
      ctx.fillStyle = '#7b4a2a'; ctx.fillRect(104, 82, 22, 10);
      ctx.fillStyle = '#8c8c8c'; ctx.fillRect(62, 96, 34, 16);
      ctx.fillStyle = '#2e9d4f'; ctx.fillRect(6, 76, 36, 32);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.strokeRect(8, 78, 32, 28);
      ctx.fillStyle = '#2f6fd6'; ctx.fillRect(194, 76, 36, 32);
      ctx.strokeStyle = '#ffffff'; ctx.strokeRect(196, 78, 32, 28);
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 5px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('VERDE', 24, 102); ctx.fillText('AZUL', 212, 102);
      ctx.strokeStyle = '#0d0d0d'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(42, 92); ctx.lineTo(64, 92); ctx.bezierCurveTo(80, 92, 84, 76, 92, 64); ctx.lineTo(116, 48); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(116, 48); ctx.bezierCurveTo(126, 40, 134, 30, 148, 30); ctx.lineTo(168, 30); ctx.bezierCurveTo(180, 30, 184, 40, 186, 48); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(116, 48); ctx.bezierCurveTo(126, 56, 134, 66, 148, 66); ctx.lineTo(168, 66); ctx.bezierCurveTo(180, 66, 184, 56, 186, 48); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(186, 48); ctx.lineTo(204, 48); ctx.bezierCurveTo(214, 48, 214, 60, 212, 70); ctx.lineTo(212, 76); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(148, 30); ctx.lineTo(148, 66); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(92, 64); ctx.lineTo(92, 28); ctx.moveTo(82, 28); ctx.lineTo(102, 28); ctx.stroke();
      ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(48, 106); ctx.lineTo(60, 106); ctx.moveTo(130, 106); ctx.lineTo(188, 106); ctx.stroke();
      ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 3; ctx.strokeRect(1.5, 1.5, c.w - 3, c.h - 3);
    },
  };

  // ---------------------------------------------------------
  // Cenário D — O Grande Labirinto · 200×200 cm
  // Paredes finas para colisão 3D + Quadrado Verde no centro para o Sensor de Cor.
  // ---------------------------------------------------------
  const labirinto = {
    id: 'labirinto',
    nome: 'O Grande Labirinto (Chegada no Centro)',
    w: 200,
    h: 200,
    pxPorCm: 5,

    inicioPadrao: 'entrada1',
    inicios: {
      entrada1: { rotulo: 'Entrada Inferior Esquerda', x: 15, y: 185, th: 0 },
      entrada2: { rotulo: 'Entrada Superior Direita',  x: 185, y: 15,  th: PI }
    },

    caixas: [
      // Paredes Externas
      { nome: 'Parede Ext Norte', x: 0,   y: 0,   w: 200, h: 5,   altura: 15, cor: '#4a5568' },
      { nome: 'Parede Ext Sul',   x: 0,   y: 195, w: 200, h: 5,   altura: 15, cor: '#4a5568' },
      { nome: 'Parede Ext Oeste', x: 0,   y: 0,   w: 5,   h: 170, altura: 15, cor: '#4a5568' },
      { nome: 'Parede Ext Leste', x: 195, y: 30,  w: 5,   h: 170, altura: 15, cor: '#4a5568' },

      // Paredes Internas
      { nome: 'Int 1A', x: 30,  y: 30,  w: 140, h: 5,   altura: 15, cor: '#2d3748' },
      { nome: 'Int 1B', x: 30,  y: 30,  w: 5,   h: 110, altura: 15, cor: '#2d3748' },
      { nome: 'Int 1C', x: 30,  y: 165, w: 110, h: 5,   altura: 15, cor: '#2d3748' },
      { nome: 'Int 1D', x: 165, y: 65,  w: 5,   h: 105, altura: 15, cor: '#2d3748' },

      { nome: 'Int 2A', x: 60,  y: 60,  w: 80,  h: 5,   altura: 15, cor: '#2d3748' },
      { nome: 'Int 2B', x: 60,  y: 95,  w: 5,   h: 45,  altura: 15, cor: '#2d3748' },
      { nome: 'Int 2C', x: 95,  y: 135, w: 45,  h: 5,   altura: 15, cor: '#2d3748' },
      { nome: 'Int 2D', x: 135, y: 80,  w: 5,   h: 60,  altura: 15, cor: '#2d3748' },

      // Paredes do Centro
      { nome: 'Centro Norte', x: 80,  y: 80,  w: 40,  h: 5,   altura: 15, cor: '#1a202c' },
      { nome: 'Centro Leste', x: 120, y: 80,  w: 5,   h: 40,  altura: 15, cor: '#1a202c' },
      { nome: 'Centro Sul',   x: 80,  y: 120, w: 45,  h: 5,   altura: 15, cor: '#1a202c' },
      { nome: 'Centro Oeste', x: 80,  y: 105, w: 5,   h: 20,  altura: 15, cor: '#1a202c' }
    ],

    rampas: [],

    desenhar(ctx, c) {
      ctx.fillStyle = '#f7fafc';
      ctx.fillRect(0, 0, c.w, c.h);

      ctx.fillStyle = '#cbd5e0';
      for (const caixa of c.caixas) {
        ctx.fillRect(caixa.x, caixa.y, caixa.w, caixa.h);
      }

      // Zona de Chegada (Verde puro -> classificarCor() = 3)
      ctx.fillStyle = '#00ff00';
      ctx.fillRect(90, 90, 20, 20);

      ctx.strokeStyle = '#22543d';
      ctx.lineWidth = 1;
      ctx.strokeRect(90, 90, 20, 20);

      ctx.strokeStyle = '#a0aec0';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, c.w - 2, c.h - 2);
    }
  };

  // ---------------------------------------------------------
  // Terreno: altura do chão (rampas)
  // ---------------------------------------------------------
  function alturaEm(cen, x, y) {
    let h = 0;
    for (const r of cen.rampas || []) {
      if (x < r.x || x > r.x + r.w || y < r.y || y > r.y + r.h) continue;
      const u = r.dir === '+x' ? x - r.x : r.dir === '-x' ? r.x + r.w - x : r.dir === '+y' ? y - r.y : r.y + r.h - y;
      h = Math.max(h, r.altura * Math.max(0, Math.min(1, u / r.subida)));
    }
    return h;
  }

  function terreno(cen, x, y, th) {
    if (typeof cen.terreno === 'function') return cen.terreno(x, y, th);
    if (!cen.rampas || !cen.rampas.length) return { z: 0, pitch: 0, roll: 0 };
    const c = Math.cos(th), s = Math.sin(th);
    const f = alturaEm(cen, x + 5 * c, y + 5 * s), b = alturaEm(cen, x - 5 * c, y - 5 * s);
    const l = alturaEm(cen, x + 6 * s, y - 6 * c), r = alturaEm(cen, x - 6 * s, y + 6 * c);
    return { z: (f + b + l + r) / 4, pitch: Math.atan2(f - b, 10), roll: Math.atan2(l - r, 12) };
  }

  // ---------------------------------------------------------
  // Cenário E — Pista Estilo OBR (Olimpíada Brasileira de Robótica) · 200×120 cm
  // ---------------------------------------------------------
  const obr = {
    id: 'obr',
    nome: 'Pista Estilo OBR (Linha + Obstáculo + Resgate)',
    w: 200,
    h: 120,
    pxPorCm: 5,

    inicioPadrao: 'largada',
    inicios: {
      largada: { rotulo: 'Área de Largada (Verde)', x: 20, y: 100, th: -Math.PI / 2 },
      bifurcacao: { rotulo: 'Antes da Interseção T', x: 100, y: 30, th: 0 }
    },

    caixas: [
      // Obstáculo (caixa preta no meio de um trecho da fita)
      { nome: 'Obstáculo OBR', x: 50, y: 25, w: 10, h: 10, altura: 8, cor: '#222222' }
    ],

    rampas: [],

    desenhar(ctx, c) {
      // Fundo branco da arena
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, c.w, c.h);

      // Moldura externa
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, c.w - 2, c.h - 2);

      // 1. Área de Largada (Verde)
      ctx.fillStyle = '#2ecc40';
      ctx.fillRect(10, 90, 20, 20);
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(10, 90, 20, 20);

      // 2. Trajeto da Fita Preta (Fita de 2 cm)
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 2;
      ctx.lineCap = 'square';
      ctx.lineJoin = 'miter';

      ctx.beginPath();
      // Linha saindo da largada e subindo
      ctx.moveTo(20, 90);
      ctx.lineTo(20, 30);
      
      // Curva em 90 graus para a direita
      ctx.lineTo(100, 30);
      
      // Interseção / T
      ctx.moveTo(100, 30);
      ctx.lineTo(100, 60); // Ramo que desce
      
      ctx.moveTo(100, 30);
      ctx.lineTo(160, 30); // Ramo que continua pra direita
      
      // Curva suave em direção à Área de Resgate
      ctx.bezierCurveTo(180, 30, 180, 80, 160, 90);
      ctx.lineTo(140, 90);
      ctx.stroke();

      // 3. Marcadores Verdes de Interseção (Estilo OBR)
      // Indicador na bifurcação: virar à esquerda (quadrado verde)
      ctx.fillStyle = '#2ecc40';
      ctx.fillRect(95, 32, 4, 4);

      // 4. Área de Resgate / Vitima (Canto inferior direito - Vermelho/Laranja)
      ctx.fillStyle = '#ff4136';
      ctx.fillRect(130, 80, 10, 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 3px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('RESGATE', 135, 92);
    }
  };

//
// Cenário: Tapete Urbano Ilustrativo (Estilo Pista de Carrinho Infantil)
// Malha totalmente conectada com a rotatória e início na pista inferior.
//
const tapeteUrbanoInfantil = {
  id: 'tapeteUrbanoInfantil',
  nome: 'Tapete Urbano Ilustrativo',
  w: 240, 
  h: 360,
  pxPorCm: 3,
  // O semáforo é pintado no mesmo Canvas do sensor e exibido sem alteração pela luz 3D.
  linhaAltaContraste: true,
  inicioPadrao: 'rotatoria',
  inicios: {
    // Carrinho inicia exatamente posicionado na estrada de baixo
    rotatoria: { rotulo: 'Início na Estrada de Baixo (Sul)', x: 100, y: 330, th: 0 },
    mercado: { rotulo: 'Início na Reta do Mercado (Norte)', x: 130, y: 40, th: Math.PI }
  },
  caixas: [], // Elementos urbanos 3D
  rampas: [],
  
  // Semáforos pintados no CHÃO, sobre a própria linha do percurso.
  // A sequência depende do tempo simulado, nunca de Date.now().
  semaforoEstado: 'VERMELHO',
  semaforos: [
    { x: 135, y: 321, w: 5, h: 18 }, // Avenida Sul, antes da travessia
    { x: 121, y: 50, w: 18, h: 5 }   // Via central, antes da travessia
  ],
  cicloSemaforo: [
    { estado: 'VERMELHO', duracao: 5 },
    { estado: 'VERDE', duracao: 5 },
    { estado: 'AMARELO', duracao: 2 }
  ],
  estadoSemaforoEm(tempoS = 0) {
    const total = this.cicloSemaforo.reduce((sum, fase) => sum + fase.duracao, 0);
    let t = ((Number.isFinite(+tempoS) ? +tempoS : 0) % total + total) % total;
    for (const fase of this.cicloSemaforo) {
      if (t < fase.duracao) return fase.estado;
      t -= fase.duracao;
    }
    return 'VERMELHO';
  },

  // O editor pode retirar SOMENTE o traçado preto, sem alterar as faixas.
  linhasEditor: [
    { tipo: 'caneta', espessura: 2, pontos: [[30,330],[210,330],[210,120],[130,120],[130,40],[40,40],[40,220]] },
    { tipo: 'circulo', espessura: 2, pontos: [[35,220],[95,280]] },
    { tipo: 'reta', espessura: 2, pontos: [[65,280],[65,330]] }
  ],
  pintarFaixasPedestres(ctx) {
    ctx.save();
    ctx.fillStyle = '#ffffff';
    for (let x=145; x<=165; x+=5) ctx.fillRect(x,321,2.5,18);
    for (let x=50; x<=70; x+=5) ctx.fillRect(x,31,2.5,18);
    for (let y=110; y<=130; y+=5) ctx.fillRect(31,y,18,2.5);
    ctx.restore();
  },

  desenhar(ctx, self, opcoes = {}) {
    // 1. Fundo do Tapete (Grama Verde Claro)
    ctx.fillStyle = '#87a922';
    ctx.fillRect(0, 0, self.w, self.h);

    // [ELEMENTOS ILUSTRATIVOS DO TAPETE - BACKGROUND 2D]
    ctx.fillStyle = '#14532d';
    ctx.fillRect(170, 140, 50, 100); // Bosque lateral direito
    ctx.fillRect(15, 100, 15, 60);   // Bosque lateral esquerdo

    ctx.fillStyle = '#cbd5e0';
    ctx.fillRect(100, 275, 40, 30);  // Pátio do Hospital (Ajustado para cima)
    ctx.fillRect(150, 40, 60, 40);   // Pátio do Mercado
    ctx.fillRect(15, 10, 15, 20);    // Pátio dos Bombeiros

    // 2. DESENHO DAS VIAS URBANA (Asfalto Cinza Médio)
    ctx.strokeStyle = '#64748b'; 
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 18; 
    
    // Circuito Principal Integrado
    ctx.beginPath();
    ctx.moveTo(30, 330);
    ctx.lineTo(210, 330); // Avenida Sul (Estrada de baixo)
    ctx.lineTo(210, 120); // Subida Leste
    ctx.lineTo(130, 120); // Conexão Leste-Centro
    ctx.lineTo(130, 40);  // Subida Centro-Norte
    ctx.lineTo(40, 40);   // Reta Norte
    ctx.lineTo(40, 220);  // Descida Oeste (Conectando na entrada superior da Rotatória)
    ctx.stroke();

    // Desenho do Anel da Rotatória
    ctx.beginPath();
    ctx.arc(65, 250, 30, 0, 2 * Math.PI);
    ctx.stroke();

    // Conexão Física com a Estrada de Baixo (Link vertical ligando a base da rotatória)
    ctx.beginPath();
    ctx.moveTo(65, 280); 
    ctx.lineTo(65, 330);
    ctx.stroke();

    // 3. Traçado preto. Pode ser omitido pelo editor para virar linha editável.
    // Removemos as antigas linhas brancas finas, que eram pintadas sobre o preto.
    if (!opcoes.omitirLinha) {
      ctx.save();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(30, 330); ctx.lineTo(210, 330);
      ctx.lineTo(210, 120); ctx.lineTo(130, 120);
      ctx.lineTo(130, 40); ctx.lineTo(40, 40); ctx.lineTo(40, 220);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(65, 250, 30, 0, 2 * Math.PI);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(65, 280); ctx.lineTo(65, 330);
      ctx.stroke();
      ctx.restore();
    }

    // 4. Faixas reais: nunca são apagadas pelo editor de linhas.
    if (!opcoes.omitirFaixas) self.pintarFaixasPedestres(ctx);

    // A faixa semafórica é parte do piso, não um obstáculo.
    // Cores reconhecidas pelo sensor EV3: vermelho=5, verde=3, amarelo=4.
    // Uma ÚNICA geometria para todas as fases. Somente fillStyle é alterado.
    // Sem camadas 3D exclusivas por cor: Canvas, sensor e chão compartilham pixels.
    const coresSemaforo = {
      VERMELHO: '#ef4444', VERDE: '#22c55e', AMARELO: '#facc15'
    };
    if (!opcoes.omitirSemaforos) {
      ctx.save();
      ctx.fillStyle = coresSemaforo[self.semaforoEstado] || coresSemaforo.VERMELHO;
      for (const { x, y, w, h } of self.semaforos) ctx.fillRect(x, y, w, h);
      ctx.restore();
    }

    // 5. Objetos urbanos (omitidos na camada-base do editor).
    if (!opcoes.omitirCaixas) for (const caixa of self.caixas) {
      ctx.fillStyle = caixa.cor || '#475569';
      ctx.fillRect(caixa.x, caixa.y, caixa.w, caixa.h);
    }
  }
};

// POPULANDO CONSTRUÇÕES E CARROS (Alinhados com as calçadas)
tapeteUrbanoInfantil.caixas.push(
  { nome: 'Grande Edifício Azul', x: 12, y: 70, w: 18, h: 40, altura: 30, cor: '#38bdf8', modelo: 'parede' },
  { nome: 'Bloco Comercial Cinza', x: 75, y: 60, w: 35, h: 18, altura: 22, cor: '#64748b', modelo: 'parede' },
  { nome: 'Casinha Amarela', x: 175, y: 250, w: 15, h: 15, altura: 10, cor: '#fbbf24', modelo: 'parede' },
  { nome: 'Casinha Laranja', x: 175, y: 190, w: 15, h: 15, altura: 10, cor: '#fb923c', modelo: 'parede' },
  { nome: 'Supermercado Central', x: 160, y: 10, w: 40, h: 20, altura: 15, cor: '#1e40af', modelo: 'parede' },
  { nome: 'Placa Totem Mercado', x: 205, y: 10, w: 4, h: 4, altura: 18, cor: '#f8fafc', modelo: 'poste' },
  
  // CORRIGIDO: Coordenada y alterada de 295 para 275 para tirar o Hospital de cima da estrada
  { nome: 'Prédio do Hospital', x: 105, y: 275, w: 30, h: 35, altura: 20, cor: '#f8fafc', modelo: 'parede' },
  { nome: 'Detalhe Cruz do Hospital', x: 118, y: 273, w: 4, h: 4, altura: 22, cor: '#ef4444', modelo: 'torre' },
  
  { nome: 'Estação de Bombeiros', x: 4, y: 5, w: 16, h: 16, altura: 18, cor: '#dc2626', modelo: 'parede' },
  { nome: 'Escola Municipal', x: 70, y: 118, w: 30, h: 22, altura: 16, cor: '#a855f7', modelo: 'parede' },

  // Veículos Decorativos nos acostamentos
  { nome: 'Carrinho de Polícia Retido', x: 222, y: 200, w: 8, h: 14, altura: 6, cor: '#172554', modelo: 'conteiner' },
  { nome: 'Sorveteiro Móvel Comercial', x: 12, y: 210, w: 12, h: 8, altura: 9, cor: '#f472b6', modelo: 'conteiner' },
  { nome: 'Ônibus Escolar Estacionado', x: 145, y: 75, w: 8, h: 18, altura: 8, cor: '#eab308', modelo: 'conteiner' },
  { nome: 'Carro Vermelho Estacionado', x: 154, y: 296, w: 7, h: 12, altura: 5, cor: '#b91c1c', modelo: 'conteiner' },

  // Árvores estáticas
  { nome: 'Pinheiro_1_Tronco', x: 20, y: 220, w: 1, h: 1, altura: 6, cor: '#78350f', modelo: 'poste' },
  { nome: 'Pinheiro_1_Folhas', x: 17, y: 217, w: 6, h: 6, altura: 14, cor: '#15803d' },
  { nome: 'Pinheiro_2_Tronco', x: 215, y: 20, w: 1, h: 1, altura: 6, cor: '#78350f', modelo: 'poste' },
  { nome: 'Pinheiro_2_Folhas', x: 212, y: 17, w: 6, h: 6, altura: 14, cor: '#15803d' }
);

// ---------------------------------------------------------
// Cidade Educativa — apresentação de trânsito e cidadania
// Reaproveita EXATAMENTE as vias, linhas, travessias e semáforos
// do Tapete Urbano: qualquer pintura nova é feita fora do trajeto.
// Assim, o mesmo programa Python funciona nos dois cenários.
// ---------------------------------------------------------
const cidadeEducativa = {
  ...tapeteUrbanoInfantil,
  id: 'cidadeEducativa',
  nome: 'Cidade Educativa — Trânsito e Cidadania',
  inicios: Object.fromEntries(Object.entries(tapeteUrbanoInfantil.inicios).map(
    ([id, inicio]) => [id, { ...inicio }]
  )),
  semaforos: tapeteUrbanoInfantil.semaforos.map(s => ({ ...s })),
  cicloSemaforo: tapeteUrbanoInfantil.cicloSemaforo.map(f => ({ ...f })),
  linhasEditor: tapeteUrbanoInfantil.linhasEditor.map(l => ({
    ...l, pontos: l.pontos.map(p => [...p])
  })),
  // Os prédios usam geometria autoral em Three.js. Nenhum GLB de terceiros.
  // As pegadas ficam longe da linha/sensores e também são colisores reais.
  caixas: [
    { nome: 'Escola Municipal', x: 77, y: 148, w: 44, h: 32, altura: 19, cor: '#f2b84b', modelo: 'cidadeEscola' },
    { nome: 'Hospital Municipal', x: 112, y: 279, w: 31, h: 28, altura: 20, cor: '#e7eef5', modelo: 'cidadeHospital' },
    { nome: 'Biblioteca do Bairro', x: 80, y: 79, w: 31, h: 26, altura: 14, cor: '#6b96c8', modelo: 'cidadeBiblioteca' },
    { nome: 'Mercado Local', x: 156, y: 65, w: 40, h: 25, altura: 14, cor: '#e7a060', modelo: 'cidadeMercado' },
    { nome: 'Casa Azul', x: 158, y: 150, w: 28, h: 23, altura: 12, cor: '#91c6e2', modelo: 'cidadeCasa' },
    { nome: 'Casa Coral', x: 158, y: 188, w: 28, h: 23, altura: 12, cor: '#e7a2a2', modelo: 'cidadeCasa' },
    { nome: 'Posto de Bombeiros', x: 10, y: 9, w: 16, h: 19, altura: 13, cor: '#d75c55', modelo: 'cidadeBombeiro' },
    { nome: 'Árvore da Praça 1', x: 120, y: 227, w: 7, h: 7, altura: 15, cor: '#438662', modelo: 'cidadeArvore' },
    { nome: 'Árvore da Praça 2', x: 154, y: 230, w: 7, h: 7, altura: 16, cor: '#438662', modelo: 'cidadeArvore' },
    { nome: 'Árvore da Praça 3', x: 136, y: 250, w: 7, h: 7, altura: 14, cor: '#438662', modelo: 'cidadeArvore' },
    { nome: 'Ponto de Ônibus', x: 153, y: 91, w: 15, h: 6, altura: 7, cor: '#2c6878', modelo: 'cidadeAbrigo' }
  ],
  rampas: [],
  semaforoEstado: 'VERMELHO',
  // O piso já contém telhados, nomes e pintura dos lotes.
  // A vista 2D não deve desenhar retângulos opacos sobre essa arte.
  desenhoCaixasNaTextura: true,

  // Coordenadas sobre o caminho real do robô (NÃO no centro dos prédios).
  // O painel apresenta as dicas ao passar por esses trechos da rota.
  // Referências: Código de Trânsito Brasileiro (Lei 9.503/1997).
  pontosEducativos: [
    { x: 100, y: 330, raio: 11, icone: '🚗', titulo: 'Saída com atenção',
      mensagem: 'Todo condutor deve manter o domínio do veículo e dirigir com atenção e cuidados indispensáveis à segurança.', fundamento: 'CTB — art. 28' },
    { x: 119, y: 330, raio: 10, icone: '🏥', titulo: 'Hospital: velocidade segura',
      mensagem: 'Ao se aproximar de hospitais, reduza a velocidade conforme a segurança do trânsito. Isso também vale perto de escolas e pontos de embarque.', fundamento: 'CTB — art. 220, XIV' },
    { x: 136, y: 330, raio: 10, icone: '🚦', titulo: 'Semáforo: respeite o vermelho',
      mensagem: 'Avançar o sinal vermelho é uma infração gravíssima, salvo exceções previstas na sinalização e na lei.', fundamento: 'CTB — art. 208' },
    { x: 157, y: 330, raio: 12, icone: '🚶', titulo: 'Faixa de pedestres',
      mensagem: 'A travessia na faixa tem prioridade conforme as regras do CTB. Mesmo quando o sinal muda, respeite quem ainda não terminou de atravessar.', fundamento: 'CTB — art. 70' },
    { x: 209, y: 196, raio: 17, icone: '🏘️', titulo: 'Bairro: atenção a todos',
      mensagem: 'Ao regular a velocidade, considere a via, o movimento de pessoas e as condições do trânsito.', fundamento: 'CTB — art. 43' },
    { x: 209, y: 125, raio: 13, icone: '🚌', titulo: 'Transporte coletivo',
      mensagem: 'Nas proximidades de locais de embarque e desembarque, o motorista deve reduzir a velocidade de maneira compatível com a segurança.', fundamento: 'CTB — art. 220, XIV' },
    { x: 130, y: 91, raio: 14, icone: '📚', titulo: 'Biblioteca: travessia segura',
      mensagem: 'No caminho para a biblioteca, procure faixas e passagens apropriadas. O CTB estabelece cuidados para a travessia de pedestres.', fundamento: 'CTB — art. 69' },
    { x: 129, y: 43, raio: 13, icone: '🚸', titulo: 'Cruzamento e segunda faixa',
      mensagem: 'Ao chegar a um cruzamento, o condutor deve agir com prudência e velocidade moderada para poder parar com segurança.', fundamento: 'CTB — art. 44' },
    { x: 60, y: 40, raio: 14, icone: '🤝', titulo: 'Convivência no trânsito',
      mensagem: 'No trânsito, o cuidado com pedestres, ciclistas e outros veículos faz parte de uma circulação responsável.', fundamento: 'CTB — arts. 26 e 29' },
    { x: 40, y: 165, raio: 17, icone: '🏫', titulo: 'Escola: reduza a velocidade',
      mensagem: 'Perto de escolas, a velocidade deve ser compatível com a segurança de crianças e demais pedestres.', fundamento: 'CTB — art. 220, XIV' },
    { x: 64, y: 252, raio: 20, icone: '🔄', titulo: 'Rotatória: quem tem preferência?',
      mensagem: 'Em rotatórias sem sinalização específica em contrário, a preferência é de quem já está circulando por elas.', fundamento: 'CTB — art. 29, III, b' }
  ],

  desenhar(ctx, self, opcoes = {}) {
    // Preserva integralmente os pixels do tapete original nas vias.
    // As novas formas ficam somente nos lotes internos, longe do robô.
    tapeteUrbanoInfantil.desenhar(ctx, self, { ...opcoes, omitirCaixas: true });
    if (opcoes.omitirCaixas && !opcoes.manterDecoracao) return;

    ctx.save();

    function lote(x, y, w, h, cor = '#d9e7cf') {
      ctx.fillStyle = '#8baf8a';
      ctx.fillRect(x - 1.2, y - 1.2, w + 2.4, h + 2.4);
      ctx.fillStyle = cor;
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 0.65;
      ctx.strokeRect(x + 1.1, y + 1.1, w - 2.2, h - 2.2);
    }

    // Os lotes são recuos das ruas, não obstruem as faixas nem a linha preta.
    lote(69, 133, 63, 60, '#e5ddc8');      // Campus escolar
    lote(103, 267, 54, 50, '#e2e8f0');     // Hospital
    lote(73, 70, 46, 44, '#dce6f1');       // Biblioteca
    lote(148, 55, 58, 48, '#e6dfd4');     // Mercado
    lote(150, 139, 46, 43, '#f0e6d8');    // Moradias
    lote(150, 183, 46, 39, '#f0e6d8');
    lote(106, 216, 66, 48, '#9acb83');    // Parque
    lote(6, 5, 23, 25, '#f1ddd8');        // Bombeiros

    // Quadras e praças com elementos menores que um cartaz
    ctx.strokeStyle = '#e0eedc';
    ctx.lineWidth = 0.8;
    for (const [x1,y1,x2,y2] of [
      [110, 222, 167, 222], [111, 260, 165, 260],
      [112, 221, 112, 258], [167, 222, 167, 258],
      [113, 240, 163, 240]
    ]) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }

    function arvore2d(x, y, r = 4) {
      ctx.fillStyle = '#305b41';
      ctx.beginPath(); ctx.arc(x + 0.6, y + 0.8, r + 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4d9861';
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#87bd72';
      ctx.beginPath(); ctx.arc(x - r/3, y - r/3, r*0.5, 0, Math.PI*2); ctx.fill();
    }
    for (const [x,y] of [[111, 231], [127, 231], [139, 231], [157, 234], [139, 253], [163, 252],
                         [65, 177], [144, 152], [145, 211], [114, 108], [191, 100]]) {
      arvore2d(x, y, 3.2);
    }

    // Telhados e identidade visual dos edifícios vistos por cima (2D).
    // No 3D os mesmos lotes são representados por geometrias nativas.
    for (const b of self.caixas) {
      if (b.modelo === 'cidadeArvore') continue;
      ctx.fillStyle = '#506273';
      ctx.globalAlpha = 0.12;
      ctx.fillRect(b.x + 1.4, b.y + 1.5, b.w, b.h);
      ctx.globalAlpha = 1;
      ctx.fillStyle = b.cor;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(b.x + 2, b.y + 2, b.w - 4, 2.2);
      ctx.strokeStyle = '#51647a';
      ctx.lineWidth = 0.6;
      ctx.strokeRect(b.x, b.y, b.w, b.h);
    }

    function nomeLocal(texto, x, y, w, cor = '#17364c') {
      ctx.fillStyle = cor;
      ctx.fillRect(x, y, w, 10);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 4.1px system-ui, sans-serif';
      ctx.fillText(texto, x + w / 2, y + 5.1, w - 3);
    }
    nomeLocal('ESCOLA', 81, 183, 36, '#925419');
    nomeLocal('HOSPITAL', 111, 309, 35, '#b84450');
    nomeLocal('BIBLIOTECA', 79, 108, 34, '#315e83');
    nomeLocal('MERCADO', 159, 53, 34, '#995a33');
    nomeLocal('PRAÇA CENTRAL', 122, 262, 36, '#32724b');
    nomeLocal('MORADIAS', 154, 216, 38, '#7f5365');
    nomeLocal('ÔNIBUS', 153, 99, 30, '#285f73');

    // Escola, hospital e parque têm seus próprios símbolos simples.
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    ctx.fillText('+', 127.5, 290.5);
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.fillText('E', 99, 162);
    ctx.font = 'bold 8px system-ui, sans-serif';
    ctx.fillText('P', 139, 240);

    // Não duplicamos as mensagens sobre o piso. Elas surgem no painel didático.
    ctx.restore();
  }
};

// ---------------------------------------------------------
// Cenário F — Pista BRT / OBR com rampa e área de resgate
// Aproximação fiel à imagem, dentro das limitações atuais.
// ---------------------------------------------------------
const brt = {
  id: 'brt',
  nome: 'Pista BRT (Rampa + Resgate)',
  w: 240,
  h: 180,
  pxPorCm: 4,

  inicioPadrao: 'largadaDireita',
  inicios: {
    largadaDireita: { rotulo: 'Largada à direita', x: 218, y: 108, th: Math.PI },
    resgate: { rotulo: 'Saída da área de resgate', x: 95, y: 96, th: 0 },
    inferior: { rotulo: 'Trecho inferior', x: 70, y: 145, th: 0 }
  },

  caixas: [
    // ---------------------------
    // Área de resgate (paredes)
    // ---------------------------
    { nome: 'Resgate Norte', x: 2, y: 58, w: 88, h: 2, altura: 8, cor: '#d9d9d9', modelo: 'parede' },
    { nome: 'Resgate Oeste', x: 0, y: 60, w: 2, h: 62, altura: 8, cor: '#d9d9d9', modelo: 'parede' },
    { nome: 'Resgate Sul',   x: 2, y: 120, w: 88, h: 2, altura: 8, cor: '#d9d9d9', modelo: 'parede' },
    { nome: 'Resgate Leste 1', x: 88, y: 60, w: 2, h: 26, altura: 8, cor: '#d9d9d9', modelo: 'parede' },
    { nome: 'Resgate Leste 2', x: 88, y: 100, w: 2, h: 22, altura: 8, cor: '#d9d9d9', modelo: 'parede' },

    // divisórias próximas da rampa / ponte
    { nome: 'Divisória Central 1', x: 86, y: 74, w: 14, h: 2, altura: 8, cor: '#d9d9d9', modelo: 'parede' },
    { nome: 'Divisória Central 2', x: 98, y: 74, w: 2, h: 18, altura: 8, cor: '#d9d9d9', modelo: 'parede' },

    // suportes da ponte
    { nome: 'Pilar Ponte 1', x: 144, y: 38, w: 3, h: 3, altura: 16, cor: '#b87333', modelo: 'parede' },
    { nome: 'Pilar Ponte 2', x: 156, y: 38, w: 3, h: 3, altura: 16, cor: '#b87333', modelo: 'parede' },
    { nome: 'Pilar Ponte 3', x: 168, y: 38, w: 3, h: 3, altura: 16, cor: '#b87333', modelo: 'parede' },
    { nome: 'Pilar Ponte 4', x: 180, y: 38, w: 3, h: 3, altura: 16, cor: '#b87333', modelo: 'parede' },

    // suporte inferior da rampa curta
    { nome: 'Pilar Rampa Curta', x: 155, y: 128, w: 3, h: 3, altura: 7, cor: '#b87333', modelo: 'parede' },

    // obstáculo cilíndrico aproximado como bloco
    { nome: 'Obstáculo Cilíndrico', x: 54, y: 138, w: 10, h: 10, altura: 14, cor: '#dbc8a5', modelo: 'parede' }
  ],

  rampas: [
    // subida principal até a parte alta
    { nome: 'Rampa Principal', x: 96, y: 14, w: 92, h: 26, altura: 18, subida: 52, dir: '+x', cor: '#ddd6c8' },

    // descida / ligação à esquerda
    { nome: 'Rampa de Saída', x: 92, y: 38, w: 24, h: 52, altura: 18, subida: 30, dir: '+y', cor: '#ddd6c8' },

    // rampa curta da região central-direita
    { nome: 'Rampa Secundária', x: 146, y: 116, w: 26, h: 18, altura: 7, subida: 18, dir: '+y', cor: '#ddd6c8' }
  ],

  desenhar(ctx, c) {
    // ---------------------------
    // helpers
    // ---------------------------
    const grade = 30;

    function disco(x, y, r, cor = '#e6902e') {
      ctx.fillStyle = cor;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#8a5a1d';
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }

    function marcadorVerde(x, y, w = 4, h = 2) {
      ctx.fillStyle = '#1f7a34';
      ctx.fillRect(x, y, w, h);
    }

    function fitaInicio() {
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 2;
      ctx.lineCap = 'square';
      ctx.lineJoin = 'round';
      ctx.setLineDash([]);
    }

    // ---------------------------
    // fundo
    // ---------------------------
    ctx.fillStyle = '#f2efe6';
    ctx.fillRect(0, 0, c.w, c.h);

    // grade do piso
    ctx.strokeStyle = '#c7c1b4';
    ctx.lineWidth = 0.45;
    for (let x = 0; x <= c.w; x += grade) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, c.h);
      ctx.stroke();
    }
    for (let y = 0; y <= c.h; y += grade) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(c.w, y);
      ctx.stroke();
    }

    // ---------------------------
    // área de resgate
    // ---------------------------
    ctx.fillStyle = '#efede4';
    ctx.fillRect(2, 60, 88, 60);

    // triângulos coloridos
    ctx.fillStyle = '#b3322c';
    ctx.beginPath();
    ctx.moveTo(5, 63);
    ctx.lineTo(18, 63);
    ctx.lineTo(5, 78);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#992222';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(17, 64);
    ctx.lineTo(11, 80);
    ctx.stroke();

    ctx.fillStyle = '#2f8b4b';
    ctx.beginPath();
    ctx.moveTo(5, 118);
    ctx.lineTo(19, 118);
    ctx.lineTo(5, 111);
    ctx.closePath();
    ctx.fill();

    // bolinhas da área de resgate (2D)
    for (const [x, y, cor] of [
      [35, 92, '#d9d9d9'],
      [52, 96, '#d9d9d9'],
      [60, 83, '#202020']
    ]) {
      ctx.fillStyle = cor;
      ctx.beginPath();
      ctx.arc(x, y, 1.8, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 0.3;
      ctx.stroke();
    }

    // ---------------------------
    // plataformas / rampas (pintura 2D)
    // ---------------------------
    ctx.fillStyle = '#ece6d8';
    ctx.fillRect(96, 14, 92, 26);
    ctx.fillRect(92, 38, 24, 52);
    ctx.fillRect(146, 116, 26, 18);

    ctx.strokeStyle = '#b6ae9d';
    ctx.lineWidth = 0.7;
    ctx.strokeRect(96, 14, 92, 26);
    ctx.strokeRect(92, 38, 24, 52);
    ctx.strokeRect(146, 116, 26, 18);

    // linhas divisórias sobre a rampa/ponte
    ctx.strokeStyle = '#b8b0a0';
    ctx.lineWidth = 0.5;
    for (const x of [126, 156]) {
      ctx.beginPath();
      ctx.moveTo(x, 14);
      ctx.lineTo(x, 40);
      ctx.stroke();
    }
    for (const y of [52, 66]) {
      ctx.beginPath();
      ctx.moveTo(92, y);
      ctx.lineTo(116, y);
      ctx.stroke();
    }

    // ---------------------------
    // fita preta / trajetos
    // ---------------------------
    fitaInicio();

    // trecho superior / ponte
    ctx.beginPath();
    ctx.moveTo(102, 72);
    ctx.quadraticCurveTo(104, 60, 112, 48);
    ctx.lineTo(126, 30);
    ctx.lineTo(150, 12);
    ctx.lineTo(172, 12);
    ctx.quadraticCurveTo(180, 12, 186, 20);
    ctx.lineTo(194, 28);
    ctx.lineTo(174, 34);
    ctx.lineTo(142, 34);
    ctx.lineTo(118, 50);
    ctx.quadraticCurveTo(109, 56, 104, 66);
    ctx.stroke();

    // saída da área de resgate até o centro
    ctx.beginPath();
    ctx.moveTo(90, 96);
    ctx.lineTo(104, 96);
    ctx.lineTo(104, 88);
    ctx.lineTo(118, 88);
    ctx.stroke();

    // curva descendo do centro para a parte inferior
    ctx.beginPath();
    ctx.moveTo(116, 88);
    ctx.quadraticCurveTo(94, 102, 94, 120);
    ctx.quadraticCurveTo(94, 134, 108, 140);
    ctx.lineTo(132, 140);
    ctx.stroke();

    // trecho sinuoso inferior
    ctx.beginPath();
    ctx.moveTo(64, 148);
    ctx.lineTo(82, 148);
    ctx.bezierCurveTo(90, 148, 92, 138, 100, 138);
    ctx.bezierCurveTo(108, 138, 110, 148, 118, 148);
    ctx.bezierCurveTo(126, 148, 128, 138, 136, 138);
    ctx.bezierCurveTo(144, 138, 146, 148, 154, 148);
    ctx.stroke();

    // caminho vindo da esquerda para o trecho sinuoso
    ctx.beginPath();
    ctx.moveTo(44, 142);
    ctx.lineTo(44, 160);
    ctx.lineTo(82, 160);
    ctx.lineTo(82, 148);
    ctx.stroke();

    // ligação do sinuoso para o centro
    ctx.beginPath();
    ctx.moveTo(154, 148);
    ctx.quadraticCurveTo(166, 146, 166, 136);
    ctx.quadraticCurveTo(166, 126, 154, 124);
    ctx.lineTo(140, 124);
    ctx.lineTo(132, 140);
    ctx.stroke();

    // região central direita com cruzamento vermelho
    ctx.beginPath();
    ctx.moveTo(138, 108);
    ctx.lineTo(154, 108);
    ctx.stroke();

    ctx.strokeStyle = '#b12a2a';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(132, 102);
    ctx.lineTo(148, 110);
    ctx.moveTo(148, 102);
    ctx.lineTo(132, 110);
    ctx.stroke();

    // trilha zigue-zague do meio
    fitaInicio();
    ctx.beginPath();
    ctx.moveTo(166, 108);
    ctx.lineTo(166, 114);
    ctx.lineTo(176, 114);
    ctx.lineTo(176, 120);
    ctx.lineTo(170, 120);
    ctx.lineTo(170, 126);
    ctx.lineTo(180, 126);
    ctx.lineTo(180, 132);
    ctx.lineTo(168, 132);
    ctx.stroke();

    // lado direito
    ctx.beginPath();
    ctx.moveTo(188, 56);
    ctx.lineTo(214, 56);
    ctx.lineTo(214, 108);
    ctx.lineTo(224, 108);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(182, 80);
    ctx.lineTo(206, 80);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(150, 66);
    ctx.lineTo(150, 86);
    ctx.lineTo(170, 86);
    ctx.stroke();

    // barras finais estilo "T"
    ctx.beginPath();
    ctx.moveTo(206, 56);
    ctx.lineTo(222, 56);
    ctx.moveTo(218, 52);
    ctx.lineTo(218, 60);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(216, 108);
    ctx.lineTo(230, 108);
    ctx.moveTo(223, 104);
    ctx.lineTo(223, 112);
    ctx.stroke();

    // ---------------------------
    // marcadores
    // ---------------------------
    disco(101, 51, 2.2);
    disco(109, 122, 2.2);
    disco(184, 132, 2.2);

    marcadorVerde(103, 136, 4, 2);
    marcadorVerde(150, 73, 4, 2);
    marcadorVerde(183, 78, 4, 2);
    marcadorVerde(154, 73, 3, 2);

    // borda externa leve
    ctx.strokeStyle = '#8f8b80';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(0.8, 0.8, c.w - 1.6, c.h - 1.6);
  }
};


  // ---------------------------------------------------------
  // Circuito Aurora — cenário ORIGINAL da jacarEV3 (sem arquivos externos).
  // O Canvas é simultaneamente a textura do piso e a fonte do sensor de cor.
  // Desafio: seguir linha, contornar curvas, passar pelo zigue-zague e entrar
  // na estação de objetivos por uma abertura suficientemente larga.
  // ---------------------------------------------------------
  const circuitoAurora = {
    id: 'circuitoAurora',
    nome: 'Circuito Aurora (Autoral)',
    w: 260, h: 180, pxPorCm: 5,
    inicioPadrao: 'partida',
    inicios: {
      partida: { rotulo: 'Largada — sobre a linha', x: 28, y: 155, th: -PI / 2 },
      serpentina: { rotulo: 'Antes do zigue-zague', x: 106, y: 66, th: 0 },
      estacao: { rotulo: 'Entrada da estação', x: 229, y: 92, th: -PI / 2 },
    },
    // Estes retângulos têm colisão no SimEV3 e representação 3D automática.
    // Passagem de 40 cm (x=209 a 249), garantindo folga para o robô de raio 7 cm.
    caixas: [
      { nome: 'Estação - parede norte', x: 191, y: 16, w: 64, h: 2, altura: 12, cor: '#778b9d' },
      { nome: 'Estação - parede oeste', x: 191, y: 16, w: 2, h: 61, altura: 12, cor: '#778b9d' },
      { nome: 'Estação - parede leste', x: 253, y: 16, w: 2, h: 61, altura: 12, cor: '#778b9d' },
      { nome: 'Estação - parede sul esquerda', x: 191, y: 75, w: 18, h: 2, altura: 12, cor: '#778b9d' },
      { nome: 'Estação - parede sul direita', x: 249, y: 75, w: 6, h: 2, altura: 12, cor: '#778b9d' },
      { nome: 'Obstáculo central', x: 108, y: 95, w: 10, h: 10, altura: 8, cor: '#e39f5b' },
      { nome: 'Obstáculo lateral', x: 170, y: 132, w: 8, h: 8, altura: 6, cor: '#637ca7' },
    ],
    rampas: [],
    // Só decoração: as esferas não são obstáculos físicos.
    decoracoes3d: [
      { tipo: 'esfera', nome: 'Esfera coral', x: 210, y: 29, raio: 2.3, cor: '#e76e62' },
      { tipo: 'esfera', nome: 'Esfera azul', x: 224, y: 29, raio: 2.3, cor: '#52a5db' },
      { tipo: 'esfera', nome: 'Esfera grafite', x: 238, y: 29, raio: 2.3, cor: '#344457' },
    ],
    linhaAltaContraste: true,
    desenhar(ctx, c) {
      // Piso autoral: tons claros para contraste com o sensor refletivo.
      ctx.fillStyle = '#fafaf6';
      ctx.fillRect(0, 0, c.w, c.h);

      // Elementos decorativos que NÃO cobrem a linha do seguidor.
      ctx.fillStyle = '#eff5f8';
      ctx.fillRect(193, 18, 60, 57);
      ctx.fillStyle = '#eef7f6';
      ctx.fillRect(12, 143, 31, 25);
      ctx.strokeStyle = '#4a9b9b';
      ctx.lineWidth = 0.85;
      ctx.strokeRect(13, 144, 29, 23);

      // Duas bases circulares com cores e identificação próprias.
      const base = (x, y, cor, rotulo) => {
        ctx.fillStyle = cor;
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, 2 * PI);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 4px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(rotulo, x, y);
      };
      base(206, 50, '#278b79', 'A');
      base(245, 50, '#d27748', 'B');

      // O percurso inteiro é UM único path: sem emendas entre tiles.
      ctx.strokeStyle = '#050505';
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(28, 155);
      ctx.lineTo(28, 130);
      ctx.bezierCurveTo(28, 117, 37, 111, 50, 111);
      ctx.lineTo(75, 111);
      ctx.bezierCurveTo(86, 111, 91, 104, 91, 95);
      // Retorno aberto: semicírculo de raio ~14 cm em vez da
      // antiga curva fechada com apenas 15 cm entre as retas.
      ctx.bezierCurveTo(91, 92, 83, 94, 73, 94);
      ctx.lineTo(54, 94);
      // Dois quartos de círculo com tangentes contínuas nas retas.
      ctx.bezierCurveTo(46.268, 94, 40, 87.732, 40, 80);
      ctx.bezierCurveTo(40, 72.268, 46.268, 66, 54, 66);
      ctx.lineTo(112, 66);
      // Duas ondulações arredondadas, sem cantos de 90 graus:
      // a linha segue contínua e o sensor lê exatamente o Canvas.
      ctx.bezierCurveTo(116, 66, 116, 59, 122, 59);
      ctx.bezierCurveTo(128, 59, 128, 66, 136, 66);
      ctx.bezierCurveTo(141, 66, 142, 59, 148, 59);
      ctx.bezierCurveTo(154, 59, 156, 66, 164, 66);
      ctx.lineTo(169, 66);
      // Contorna a estação com folga: a versão anterior passava a ~2 cm
      // da parede oeste (x=191), menor que o raio de colisão do robô (7 cm).
      ctx.bezierCurveTo(174, 66, 177, 77, 177, 91);
      ctx.bezierCurveTo(177, 104, 173, 114, 162, 114);
      ctx.lineTo(148, 114);
      ctx.bezierCurveTo(136, 114, 128, 121, 128, 132);
      ctx.bezierCurveTo(128, 143, 137, 150, 151, 150);
      ctx.lineTo(209, 150);
      ctx.bezierCurveTo(221, 150, 229, 141, 229, 128);
      ctx.lineTo(229, 48);
      ctx.stroke();

      // Alvo final, distante das esferas e das paredes.
      ctx.fillStyle = '#205e9b';
      ctx.beginPath();
      ctx.arc(229, 48, 3.5, 0, 2 * PI);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.7;
      ctx.stroke();

      // Esferas: mesmas posições em 2D e 3D.
      for (const bola of c.decoracoes3d) {
        ctx.fillStyle = bola.cor;
        ctx.beginPath();
        ctx.arc(bola.x, bola.y, bola.raio, 0, 2 * PI);
        ctx.fill();
      }

      // Legendas longe do caminho e dos obstáculos físicos.
      ctx.fillStyle = '#577081';
      ctx.font = 'bold 4px sans-serif';
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
      ctx.fillText('AURORA', 14, 18);
      ctx.font = '3px sans-serif';
      ctx.fillText('ESTAÇÃO', 199, 70);
      ctx.fillText('INÍCIO', 14, 174);
    },
  };



  // ============================================================
  // A Jornada de Jofre v4 — S.O.S. Pantanal
  // 520 × 360 cm. Elementos naturais 3D são somente decorativos;
  // a física e o ultrassônico consultam exclusivamente "caixas".
  // ============================================================
  const pantanalEcologico = {
    id: 'pantanalEcologico',
    nome: 'A Jornada de Jofre — S.O.S. Pantanal',
    w: 520,
    h: 360,
    pxPorCm: 3,
    linhaAltaContraste: true,

    inicioPadrao: 'lagoa_seca',
    inicios: {
      lagoa_seca: { x: 60, y: 75, th: -0.149, rotulo: 'Lagoa Seca (Início da Migração)' }
    },

    caixas: [
      // Obstáculos físicos; somente estes participam das colisões e do ultrassônico.
      // A rota serpenteia pela parte seca antes de atravessar a rodovia.
      { nome: 'Árvore Derrubada (Centro)', x: 127, y: 148, w: 20, h: 17,
        altura: 12, cor: '#4c3527', modelo: 'troncoQueimado' },
      { nome: 'Galhos Carbonizados (Sul)', x: 137, y: 270, w: 21, h: 17,
        altura: 9, cor: '#342722', modelo: 'troncoQueimado' },
      { nome: 'Barreira de Rochas', x: 345, y: 222, w: 22, h: 15,
        altura: 14, cor: '#62645e', modelo: 'rochaSeca' },
      // Obstáculos laterais que reforçam a história, sem bloquear o leito inteiro.
      { nome: 'Toco de Desmatamento', x: 231, y: 52, w: 13, h: 13,
        altura: 7, cor: '#46352c', modelo: 'troncoQueimado' },
      { nome: 'Rocha do Solo Seco', x: 30, y: 289, w: 17, h: 14,
        altura: 9, cor: '#78736b', modelo: 'rochaSeca' }
    ],
    rampas: [],

    pontosEducativos: [
      {
        x: 60, y: 75, raio: 19, icone: '🍂',
        titulo: 'A lagoa de Jofre secou',
        mensagem: 'Na estiagem, algumas lagoas diminuem ou secam. Jofre precisa encontrar outro local com água e abrigo.',
        fundamento: 'Ecologia — sazonalidade das áreas úmidas.'
      },
      {
        x: 110, y: 67, raio: 17, icone: '🔥',
        // Aviso acionado quando o SENSOR EV3 lê a faixa vermelha (x=88..97).
        // A ilustração do incêndio permanece em x=110; não é um sensor de calor.
        gatilhoSensor: { x: 93, y: 68, raio: 13, cor: 5, refletanciaMax: 35 },
        titulo: 'Perigo: área de queimada',
        mensagem: 'O vermelho representa um foco de incêndio. O fogo, o calor e a fumaça ameaçam a fauna e destroem abrigos.',
        fundamento: 'Educação ambiental — prevenção e impactos dos incêndios.'
      },
      {
        x: 195, y: 115, raio: 20, icone: '🌳',
        titulo: 'Troncos e perda de habitat',
        mensagem: 'A derrubada da vegetação fragmenta habitats e deixa animais expostos durante a migração.',
        fundamento: 'Ecologia — fragmentação de habitats.'
      },
      {
        x: 135, y: 156, raio: 24, icone: '🌳',
        titulo: 'Por que evitar o desmatamento?',
        mensagem: 'A vegetação nativa protege o solo, oferece abrigo e ajuda a manter o equilíbrio dos ecossistemas.',
        fundamento: 'Conservação da biodiversidade e da vegetação nativa.'
      },
      {
        x: 65, y: 211, raio: 23, icone: '🌫️',
        titulo: 'A fumaça também prejudica',
        mensagem: 'A fumaça de queimadas pode prejudicar a respiração dos animais e afetar a qualidade do ar.',
        fundamento: 'Saúde ambiental — poluentes de incêndios florestais.'
      },
      {
        x: 169, y: 284, raio: 20, icone: '🌱',
        titulo: 'Recuperar áreas queimadas',
        mensagem: 'Recuperar a vegetação ajuda a restabelecer alimento, sombra e refúgio para os animais.',
        fundamento: 'Ecologia — restauração de habitats.'
      },
      {
        x: 241, y: 180, raio: 18, icone: '🚧',
        titulo: 'Travessia segura de fauna',
        mensagem: 'Rodovias podem separar habitats. Passagens de fauna e direção cuidadosa reduzem o risco de atropelamentos.',
        fundamento: 'Educação cívica — segurança viária e proteção da fauna.'
      },
      {
        x: 350, y: 230, raio: 22, icone: '🌿',
        titulo: 'Proteger as margens dos rios',
        mensagem: 'Matas ciliares diminuem a erosão e ajudam a preservar a água e os habitats aquáticos.',
        fundamento: 'Lei nº 12.651/2012, art. 4º — áreas de preservação permanente.'
      },
      {
        x: 412, y: 289, raio: 22, icone: '🌳',
        titulo: 'Os rastros da degradação',
        mensagem: 'Galhos caídos e vegetação destruída mostram por que prevenir incêndios e recuperar áreas afetadas é importante.',
        fundamento: 'Educação ambiental — prevenção e recuperação ecológica.'
      },
      {
        x: 450, y: 300, raio: 24, icone: '💧',
        titulo: 'Jofre encontrou um refúgio',
        mensagem: 'As áreas úmidas conservadas fornecem água, abrigo e alimento para muitos animais do Pantanal.',
        fundamento: 'Conservação de áreas úmidas e biodiversidade.'
      }
    ],

    // A posição das decorações é em cm. Apenas a lista "caixas"
    // participa de colisões e leituras de ultrassônico.
    // Elementos ficam fora da faixa de 4 cm lida pelo sensor.
    ambientacao3d: [
      // Região seca: madeira chamuscada, árvores mortas, clareiras e fumaça.
      { tipo: 'lagoaSeca', x: 85, y: 309, sx: 51, sy: 26 },
      { tipo: 'arvoreSeca', x: 24, y: 50, escala: 1.05, rotacao: 0.35 },
      { tipo: 'arvoreSeca', x: 44, y: 109, escala: 1.12 },
      { tipo: 'arvoreSeca', x: 27, y: 285, escala: 1.21, rotacao: -0.4 },
      { tipo: 'arvoreSeca', x: 101, y: 332, escala: 1.05 },
      { tipo: 'arvoreSeca', x: 169, y: 334, escala: 1.17 },
      { tipo: 'arvoreSeca', x: 231, y: 54, escala: 1.18 },
      { tipo: 'arvoreSeca', x: 219, y: 333, escala: 1.1 },
      { tipo: 'tocoQueimado', x: 27, y: 199, escala: 1.13 },
      { tipo: 'tocoQueimado', x: 105, y: 205, escala: 0.87 },
      { tipo: 'tocoQueimado', x: 186, y: 207, escala: 1.15 },
      { tipo: 'tocoQueimado', x: 229, y: 107, escala: 0.94 },
      { tipo: 'tocoQueimado', x: 35, y: 333, escala: 1.2 },
      { tipo: 'tocoQueimado', x: 196, y: 17, escala: 0.9 },
      { tipo: 'rochas', x: 129, y: 212, escala: 0.92 },
      { tipo: 'rochas', x: 181, y: 337, escala: 0.83 },
      { tipo: 'rochas', x: 17, y: 343, escala: 0.82 },
      // v5: árvores secas adicionais, decoração sem colisão.
      { tipo: 'arvoreSeca', x: 24, y: 336, escala: 0.85 },
      { tipo: 'arvoreSeca', x: 195, y: 178, escala: 0.85 },
      { tipo: 'arvoreSeca', x: 112, y: 95, escala: 0.85 },
      { tipo: 'arvoreSeca', x: 173, y: 256, escala: 0.85 },
      { tipo: 'arvoreSeca', x: 21, y: 126, escala: 0.85 },
      { tipo: 'arvoreSeca', x: 42, y: 252, escala: 0.85 },
      { tipo: 'arvoreSeca', x: 230, y: 294, escala: 0.85 },
      { tipo: 'arvoreSeca', x: 137, y: 244, escala: 0.85 },
      { tipo: 'arvoreSeca', x: 237, y: 154, escala: 0.85 },
      { tipo: 'arvoreSeca', x: 172, y: 95, escala: 0.85 },
      { tipo: 'arvoreSeca', x: 82, y: 131, escala: 0.85 },
      { tipo: 'arvoreSeca', x: 80, y: 207, escala: 0.85 },
      { tipo: 'arvoreSeca', x: 110, y: 182, escala: 0.85 },
      { tipo: 'arvoreSeca', x: 71, y: 268, escala: 0.85 },
      { tipo: 'arvoreSeca', x: 159, y: 205, escala: 0.85 },
      { tipo: 'arvoreSeca', x: 156, y: 305, escala: 0.85 },
      { tipo: 'arvoreSeca', x: 185, y: 119, escala: 0.85 },
      { tipo: 'arvoreSeca', x: 105, y: 219, escala: 0.85 },
      { tipo: 'arvoreSeca', x: 139, y: 187, escala: 0.85 },
      // O incêndio é detectado pelo vermelho no chão; chamas sem colisão.
      { tipo: 'focoFogo', x: 110, y: 67, escala: 0.78 },
      { tipo: 'fumaca', x: 121, y: 38, escala: 0.8 },
      { tipo: 'fumaca', x: 184, y: 33, escala: 0.85 },
      // A placa de alerta é retangular e fica fora do corredor do robô.
      { tipo: 'placaPerigo', x: 25, y: 19, escala: 0.75 },

      // Faixa de passagem de fauna: uma placa lateral legível, sem invadir a guia.
      { tipo: 'placaFauna', x: 295, y: 114, escala: 0.77, rotacao: 0.15 },

      // Refúgio úmido com fauna e vegetação 3D.
      { tipo: 'arvoreVerde', x: 305, y: 43, escala: 0.92 },
      { tipo: 'arvoreVerde', x: 345, y: 56, escala: 1.09 },
      { tipo: 'arvoreVerde', x: 403, y: 49, escala: 0.91 },
      { tipo: 'arvoreVerde', x: 479, y: 60, escala: 1.12 },
      { tipo: 'arvoreVerde', x: 312, y: 307, escala: 0.94 },
      { tipo: 'arvoreVerde', x: 374, y: 331, escala: 1.16 },
      { tipo: 'arvoreVerde', x: 498, y: 343, escala: 0.91 },
      { tipo: 'arvoreVerde', x: 509, y: 134, escala: 1.03 },
      { tipo: 'arvoreVerde', x: 478, y: 184, escala: 0.85 },
      // v5: vegetação preservada.
      { tipo: 'arvoreVerde', x: 425, y: 172, escala: 0.85 },
      { tipo: 'arvoreVerde', x: 346, y: 335, escala: 0.85 },
      { tipo: 'arvoreVerde', x: 323, y: 161, escala: 0.85 },
      { tipo: 'arvoreVerde', x: 358, y: 126, escala: 0.85 },
      { tipo: 'arvoreVerde', x: 400, y: 206, escala: 0.85 },
      { tipo: 'arvoreVerde', x: 347, y: 149, escala: 0.85 },
      { tipo: 'arvoreVerde', x: 395, y: 106, escala: 0.85 },
      { tipo: 'arvoreVerde', x: 369, y: 96, escala: 0.85 },
      { tipo: 'arvoreVerde', x: 340, y: 99, escala: 0.85 },
      { tipo: 'arvoreVerde', x: 414, y: 147, escala: 0.85 },
      { tipo: 'arvoreVerde', x: 379, y: 144, escala: 0.85 },
      { tipo: 'arvoreVerde', x: 400, y: 348, escala: 0.85 },
      { tipo: 'arvoreVerde', x: 380, y: 284, escala: 0.85 },
      { tipo: 'arvoreVerde', x: 314, y: 108, escala: 0.85 },
      { tipo: 'arvoreVerde', x: 430, y: 324, escala: 0.85 },
      { tipo: 'arvoreVerde', x: 502, y: 160, escala: 0.85 },
      { tipo: 'arvoreVerde', x: 400, y: 310, escala: 0.85 },
      { tipo: 'arvoreVerde', x: 481, y: 208, escala: 0.85 },
      { tipo: 'arvoreVerde', x: 498, y: 298, escala: 0.85 },
      { tipo: 'arvoreVerde', x: 318, y: 337, escala: 0.85 },
      { tipo: 'arvoreVerde', x: 419, y: 235, escala: 0.85 },
      { tipo: 'arvoreVerde', x: 350, y: 187, escala: 0.85 },
      { tipo: 'arvoreVerde', x: 506, y: 77, escala: 0.85 },
      { tipo: 'arvoreVerde', x: 445, y: 50, escala: 0.85 },
      { tipo: 'arbusto', x: 316, y: 140, escala: 1.0 },
      { tipo: 'arbusto', x: 379, y: 102, escala: 1.04 },
      { tipo: 'arbusto', x: 496, y: 217, escala: 1.15 },
      { tipo: 'arbusto', x: 408, y: 332, escala: 0.8 },
      { tipo: 'arbusto', x: 295, y: 270, escala: 0.85 },
      { tipo: 'lagoa', x: 462, y: 259, sx: 21, sy: 13 },
      { tipo: 'lagoa', x: 478, y: 329, sx: 22, sy: 14 },
      { tipo: 'lagoa', x: 446, y: 94, sx: 20, sy: 12 },
      { tipo: 'taboas', x: 441, y: 246, escala: 1.0 },
      { tipo: 'taboas', x: 497, y: 315, escala: 1.17 },
      { tipo: 'taboas', x: 422, y: 96, escala: 0.93 },
      { tipo: 'capivara', x: 485, y: 285, escala: 0.86, rotacao: -0.55 },
      { tipo: 'garca', x: 421, y: 85, escala: 1.05 },
      { tipo: 'garca', x: 503, y: 280, escala: 0.87 },
      // v5: fauna do Pantanal, somente visual.
      { tipo: 'tuiuiu', x: 413, y: 69, escala: 0.92 },
      { tipo: 'tuiuiu', x: 435, y: 136, escala: 0.92 },
      { tipo: 'araraAzul', x: 421, y: 189, escala: 0.83 },
      { tipo: 'araraAzul', x: 443, y: 343, escala: 0.83 },
      { tipo: 'cervoPantaneiro', x: 358, y: 298, escala: 0.75 },
      { tipo: 'cervoPantaneiro', x: 333, y: 347, escala: 0.75 },
      { tipo: 'capivara', x: 367, y: 258, escala: 0.92 },
      { tipo: 'garca', x: 359, y: 209, escala: 0.92 },
      { tipo: 'garca', x: 343, y: 257, escala: 0.92 },
      { tipo: 'marcoRefugio', x: 487, y: 295, escala: 0.82 }
    ],

    desenhar(ctx) {
      this.desenharPiso(ctx);
    },

    desenharPiso: function(ctx) {
      const W = 520, H = 360;
      ctx.save();

      // 1. Solo: mudança progressiva da estiagem para a área úmida.
      const solo = ctx.createLinearGradient(0, 0, W, 0);
      solo.addColorStop(0.00, '#d8c3a7');
      solo.addColorStop(0.23, '#cdb18a');
      solo.addColorStop(0.41, '#bdb685');
      solo.addColorStop(0.56, '#a9bd79');
      solo.addColorStop(0.76, '#7eb36d');
      solo.addColorStop(1.00, '#4fa96f');
      ctx.fillStyle = solo;
      ctx.fillRect(0, 0, W, H);

      // Manchas orgânicas do solo, desenhadas como áreas planas.
      for (const [x,y,rx,ry,cor] of [
        [56,309,76,38,'#c7a77f'], [165,312,61,28,'#b49d78'],
        [280,50,76,28,'#9ab679'], [370,45,79,35,'#83b974'],
        [485,164,43,62,'#6bac6b'], [341,307,68,45,'#77a96c']
      ]) {
        ctx.fillStyle = cor;
        ctx.beginPath();
        ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);
        ctx.fill();
      }

      // Terra rachada da estiagem; traços claros e finos.
      for (let i = 0; i < 100; i++) {
        const x = 10 + (i*73)%225, y = 18 + (i*113)%328, r = 3 + i%7;
        ctx.strokeStyle = i%3===0 ? '#ae9277' : '#c1a78a';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(x-r,y-r*.4); ctx.lineTo(x,y);
        ctx.lineTo(x+r*.8,y-r*.55);
        ctx.moveTo(x,y); ctx.lineTo(x-r*.2,y+r);
        ctx.stroke();
      }

      // Lagoa seca — piso ilustrativo.
      ctx.fillStyle = '#b59c80';
      ctx.beginPath();
      ctx.ellipse(85,309,55,29,-0.12,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = '#ddc5a1';
      ctx.beginPath();
      ctx.ellipse(85,310,45,22,-0.12,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#a28b70'; ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(58,307); ctx.lineTo(83,315); ctx.lineTo(105,299);
      ctx.moveTo(83,315); ctx.lineTo(78,327);
      ctx.moveTo(105,299); ctx.lineTo(119,321);
      ctx.stroke();

      // Refúgio: manchas de água no solo, fora dos trechos da linha.
      function lagoa(x,y,rx,ry) {
        ctx.fillStyle = '#3e9e9c';
        ctx.beginPath();
        ctx.ellipse(x,y,rx+3,ry+3,0,0,Math.PI*2); ctx.fill();
        const azul = ctx.createLinearGradient(x-rx,y-ry,x+rx,y+ry);
        azul.addColorStop(0,'#8ad9c3');
        azul.addColorStop(1,'#3ea8a2');
        ctx.fillStyle = azul;
        ctx.beginPath();
        ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2); ctx.fill();
      }
      lagoa(462,259,21,13);
      lagoa(478,329,22,14);
      lagoa(446,94,20,12);
      lagoa(369,326,12,8);

      // Arbustos e gramíneas, porém NÃO sobre a linha final.
      for (let i = 0; i < 135; i++) {
        const x = 284+(i*71)%226, y = 12+(i*89)%335;
        const r = 2.5+(i%4);
        ctx.strokeStyle = i%3===0 ? '#4d925c' : '#70af67';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(x,y); ctx.lineTo(x-r*.6,y-r*1.2);
        ctx.moveTo(x,y); ctx.lineTo(x+r*.6,y-r*1.25);
        ctx.stroke();
      }

      // Os símbolos das árvores no piso auxiliam o modo 2D.
      // O 3D usa geometrias próprias em "ambientacao3d".
      for (const obj of this.ambientacao3d) {
        if (obj.tipo==='arvoreVerde') {
          ctx.fillStyle = '#427c50';
          ctx.beginPath(); ctx.arc(obj.x,obj.y,7*(obj.escala||1),0,Math.PI*2); ctx.fill();
          ctx.fillStyle = '#78ba78';
          ctx.beginPath(); ctx.arc(obj.x-2,obj.y-2,4*(obj.escala||1),0,Math.PI*2); ctx.fill();
        } else if (obj.tipo==='arvoreSeca') {
          ctx.strokeStyle = '#84674c'; ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(obj.x-7,obj.y); ctx.lineTo(obj.x+6,obj.y);
          ctx.moveTo(obj.x,obj.y-6); ctx.lineTo(obj.x,obj.y+6);
          ctx.stroke();
        } else if (obj.tipo==='capivara' || obj.tipo==='cervoPantaneiro') {
          ctx.fillStyle = obj.tipo==='capivara' ? '#8c6546' : '#ad7749';
          ctx.beginPath(); ctx.ellipse(obj.x,obj.y,6,3.7,0,0,Math.PI*2); ctx.fill();
        } else if (obj.tipo==='garca' || obj.tipo==='tuiuiu') {
          ctx.fillStyle='#f2eee1';
          ctx.beginPath();ctx.ellipse(obj.x,obj.y,3.6,2.1,-.35,0,Math.PI*2);ctx.fill();
          ctx.fillStyle=obj.tipo==='tuiuiu'?'#34363a':'#e7c16b';
          ctx.beginPath();ctx.arc(obj.x+3,obj.y-2,1.6,0,Math.PI*2);ctx.fill();
        } else if (obj.tipo==='araraAzul') {
          ctx.fillStyle='#2566ad';
          ctx.beginPath();ctx.ellipse(obj.x,obj.y,4.1,2.8,.35,0,Math.PI*2);ctx.fill();
        }
      }

      // Leito sinuoso do rio seco: 2 trechos, separados pela rodovia.
      function oeste() {
        // Percurso em serpentina: norte -> centro -> sul da área seca.
        // O braço final se alinha horizontalmente à passagem de fauna.
        ctx.beginPath();
        ctx.moveTo(60, 75);
        ctx.bezierCurveTo(100,69,143,59,176,66);
        ctx.bezierCurveTo(215,76,220,114,203,132);
        ctx.bezierCurveTo(170,161,112,158,81,153);
        ctx.bezierCurveTo(43,150,39,208,67,230);
        ctx.bezierCurveTo(104,251,131,282,168,284);
        ctx.bezierCurveTo(203,289,227,280,214,252);
        ctx.bezierCurveTo(206,216,222,180,247,180);
      }
      function leste() {
        ctx.beginPath();
        ctx.moveTo(283,180);
        ctx.bezierCurveTo(320,175,306,237.5,350,230);
        ctx.bezierCurveTo(397.5,222.5,396.5,305,450,300);
      }
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const caminho of [oeste,leste]) {
        caminho(); ctx.lineWidth = 19; ctx.strokeStyle = '#9f9279'; ctx.stroke();
        caminho(); ctx.lineWidth = 15; ctx.strokeStyle = '#e6d2aa'; ctx.stroke();
      }

      // Rodovia que atravessa o corredor natural.
      ctx.fillStyle = '#505b61';
      ctx.fillRect(250,0,30,H);
      ctx.fillStyle = '#a4adb1';
      ctx.fillRect(248.5,0,1.5,H);
      ctx.fillRect(280,0,1.5,H);
      ctx.strokeStyle = '#e8c36a';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([10,8]);
      ctx.beginPath();
      ctx.moveTo(265,4); ctx.lineTo(265,151);
      ctx.moveTo(265,208); ctx.lineTo(265,356);
      ctx.stroke(); ctx.setLineDash([]);

      // Faixa horizontal de fauna: parada e travessia por programação.
      // O intervalo x = 247..283 NÃO possui a guia preta.
      ctx.fillStyle = '#f7f6ea';
      for (let y=163; y<=195; y+=8) ctx.fillRect(252,y,26,4);

      // Sinalização de travessia fica no 3D, fora da estrada e do leito.
      // Não desenhamos placas, textos ou caixas sobre pixels do sensor.

      // Círculo translúcido de chegada ANTES do traçado preto.
      ctx.fillStyle = 'rgba(35,168,82,.23)';
      ctx.beginPath(); ctx.arc(450,300,24,0,Math.PI*2); ctx.fill();

      // Linha de sensor: #1a1a1a exato, largura física de 4 cm.
      ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 4;
      oeste(); ctx.stroke();
      leste(); ctx.stroke();

      // 3. ZONA DE INCÊNDIO: sobrepõe a linha no primeiro trecho.
      // O vermelho é um desafio real para o sensor de cor (código EV3 = 5).
      // Não redesenhar a guia preta sobre o núcleo vermelho!
      const fx = 110, fy = 67;
      ctx.fillStyle = '#6d4336';
      ctx.beginPath(); ctx.ellipse(fx,fy,17,14,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = '#fa8c20';
      ctx.beginPath(); ctx.ellipse(fx,fy,13,11,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = '#ed2923';
      ctx.beginPath(); ctx.ellipse(fx,fy,11,9,0,0,Math.PI*2); ctx.fill();
      // Escoriações e brasas fora da região percorrida.
      for (const [bx,by,br] of [[95,84,3],[122,53,2],[130,88,3],[88,59,2]]) {
        ctx.fillStyle='#da6230';
        ctx.beginPath(); ctx.arc(bx,by,br,0,Math.PI*2); ctx.fill();
      }

      // Marca azul na faixa e no refúgio: sensor de cor EV3 reconhece azul.
      // A primeira marca inicia travessia, a segunda representa a chegada.
      ctx.fillStyle = '#1659e8';
      ctx.fillRect(236, 174, 9, 12);
      ctx.beginPath(); ctx.arc(449, 300, 9, 0, Math.PI*2); ctx.fill();

      // Faixa vermelha de aviso, fisicamente impressa no piso antes do fogo.
      // O EV3 reconhece vermelho pelo sensor de cor; não é um sensor térmico.
      ctx.fillStyle = '#ed2923';
      ctx.fillRect(88, 61, 9, 14);

      // Círculos de largada e chegada: contornos apenas.
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#83533c';
      ctx.beginPath(); ctx.arc(60,75,10,0,Math.PI*2); ctx.stroke();
      ctx.strokeStyle = '#edffe5';
      ctx.beginPath(); ctx.arc(450,300,14,0,Math.PI*2); ctx.stroke();

      ctx.textAlign='left';
      ctx.font='bold 14px sans-serif'; ctx.fillStyle='#654b3c';
      ctx.fillText('A JORNADA DE JOFRE',14,22);
      ctx.font='9px sans-serif';
      ctx.fillText('SECA • QUEIMADAS • MIGRAÇÃO',15,35);
      ctx.fillText('LAGOA SECA',48,348);
      ctx.fillStyle='#eaffeb';
      ctx.font='bold 10px sans-serif';
      ctx.fillText('PANTANAL VIVO',402,23);
      ctx.font='bold 9px sans-serif';
      ctx.fillText('REFÚGIO',457,300);
      ctx.restore();
    }
  };

  // =========================================================================
  // REGISTRO DOS MAPAS: Adicione a variável do seu mapa aqui na lista
  // =========================================================================
  const lista = { treino, desvio, fll, labirinto, obr, tapeteUrbanoInfantil, cidadeEducativa, brt, circuitoAurora, pantanalEcologico };

  /** tapete (imagem + pixels) do cenário, gerado uma vez e reaproveitado */
  function obterTapete(id) { if (!cache[id]) cache[id] = gerarTapete(lista[id]); return cache[id]; }

  // Usado por arenas importadas em runtime: mesmo canvas para o sensor e o 3D.
  function registrarCenario(cenario, tapete) {
    if (!cenario || !cenario.id) throw new Error('Cenário sem identificador');
    lista[cenario.id] = cenario;
    if (tapete) cache[cenario.id] = tapete;
    else delete cache[cenario.id];
    return cenario;
  }
  const inicioDe = (cen, chave) => cen.inicios[chave] || cen.inicios[cen.inicioPadrao];

  // Mantém tudo dentro do IIFE e retorna o objeto Cenarios
  return { 
    lista, registrarCenario, obterTapete, gerarTapete, atualizarTapete, lerPixel, lerArea, 
    intensidade, classificarCor, NOMES_COR, inicioDe, 
    alturaEm, terreno, usarFabricaCanvas(f) { fabricaInjetada = f; for (const k in cache) delete cache[k]; } 
  };
})();

// Compatibilidade global (Navegador + Node.js)
if (typeof window !== 'undefined') window.Cenarios = Cenarios;
if (typeof module !== 'undefined') module.exports = Cenarios;