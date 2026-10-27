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
    return { id: cen.id, canvas, W, H, k, dados: img.data };       // dados: RGBA, linha 0 = y 0 (topo)
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

// -------------------------------------------------------------------------
// Cenário G — Megatapete FLL: Bairro do Derby Completo · 400×240 cm
// -------------------------------------------------------------------------
const derby = (() => {
  const c = {
    id: 'derby',
    nome: 'Torneio FLL - Distrito do Derby (Recife)',
    w: 400,
    h: 240,
    pxPorCm: 3,
    inicioPadrao: 'baseLancamento',
    inicios: {
      baseLancamento: { rotulo: 'Base FLL (Noroeste)', x: 45, y: 45, th: 0 },
      agamenonNorte:  { rotulo: 'Interseção Agamenon', x: 200, y: 35, th: Math.PI / 2 },
      estacionamento: { rotulo: 'Entrada do Comando PMPE', x: 200, y: 170, th: -Math.PI / 2 }
    },
    rampas: [],
    caixas: []
  };

  // =========================================================================
  // 1. MODELAGEM 3D DE OBSTÁCULOS E ELEMENTOS URBANOS (ESTILO MODELOS LEGO FLL)
  // =========================================================================

  // --- [NOVO] REPREENCHIMENTO DO CANTO SUPERIOR ESQUERDO: Complexo Escolar/Comercial ---
  c.caixas.push(
    // Prédio do Colégio (Bloco grande para preencher o fundo da área vazia)
    { nome: 'Colégio do Derby - Bloco A', x: 75, y: 80, w: 30, h: 25, altura: 20, cor: '#f8fafc', modelo: 'parede' },
    { nome: 'Colégio do Derby - Bloco B', x: 105, y: 80, w: 15, h: 15, altura: 15, cor: '#3b82f6', modelo: 'parede' },
    
    // Obstáculos menores na área livre (Quiosques / Lixeiras Seletivas da FLL)
    { nome: 'Quiosque Praça de Alimentação', x: 130, y: 105, w: 8, h: 8, altura: 5, cor: '#f97316', modelo: 'torre' },
    { nome: 'Lixeira Seletiva Metal', x: 75, y: 115, w: 4, h: 3, altura: 4, cor: '#22c55e', modelo: 'conteiner' },
    { nome: 'Lixeira Seletiva Plástico', x: 81, y: 115, w: 4, h: 3, altura: 4, cor: '#ef4444', modelo: 'conteiner' }
  );

  // --- MODELOS DA BASE E INFRAESTRUTURA ---
  c.caixas.push(
    // Estação de BRT Derby (Terminal de Integração da Missão)
    { nome: 'BRT Plataforma Central', x: 20, y: 65, w: 45, h: 10, altura: 5, cor: '#0284c7', modelo: 'plataforma' },
    { nome: 'BRT Cobertura Acrílica', x: 25, y: 66, w: 35, h: 8,  altura: 14, cor: '#f1f5f9' },
    // Poste com Câmeras de Monitoramento (Próximo ao cruzamento)
    { nome: 'Torre de Videomonitoramento', x: 175, y: 15, w: 3, h: 3, altura: 20, cor: '#334155', modelo: 'poste' }
  );

  // --- MISSÃO TRÂNSITO: ENGARRAFAMENTO DA AGAMENON ---
  c.caixas.push(
    { nome: 'Carro Retido A (Vermelho)', x: 115, y: 30, w: 14, h: 7, altura: 7, cor: '#ef4444', modelo: 'conteiner' },
    { nome: 'Carro Retido B (Amarelo)',   x: 145, y: 45, w: 12, h: 7, altura: 6, cor: '#eab308', modelo: 'conteiner' },
    { nome: 'Ônibus Interurbanos',        x: 110, y: 130, w: 28, h: 9, altura: 12, cor: '#16a34a', modelo: 'conteiner' }
  );

  // --- MISSÃO HISTÓRICA: Praça do Derby (Arborização Avançada e Coreto) ---
  c.caixas.push(
    { nome: 'Base Octogonal Coreto', x: 280, y: 65, w: 16, h: 16, altura: 4, cor: '#cbd5e1', modelo: 'torre' },
    { nome: 'Cúpula do Coreto',      x: 283, y: 68, w: 10, h: 10, altura: 10, cor: '#ffffff' }
  );

  // Função procedural para gerar as Árvores Históricas
  function plantarArvoreDerby(nome, x, y) {
    c.caixas.push(
      { nome: nome + ' Tronco', x: x - 0.5, y: y - 0.5, w: 1,  h: 1,  altura: 7,  cor: '#451a03', modelo: 'poste' },
      { nome: nome + ' Copa L1', x: x - 5,   y: y - 5,   w: 10, h: 10, altura: 13, cor: '#064e3b' },
      { nome: nome + ' Copa L2', x: x - 3,   y: y - 3,   w: 6,  h: 6,  altura: 18, cor: '#0f9f6e' }
    );
  }
  
  const coordenadasArvores = [, [270, 35], [320, 35], [345, 45],
, [270, 125], [320, 125], [345, 115]
  ];
  coordenadasArvores.forEach((pos, i) => plantarArvoreDerby('ArvoreDerby_' + i, pos[0], pos[1]));

  // --- MISSÃO COMANDO GERAL: Quartel da PMPE ---
  c.caixas.push(
    { nome: 'PMPE Ala Principal Esquerda', x: 60,  y: 205, w: 120, h: 22, altura: 12, cor: '#f1f5f9', modelo: 'parede' },
    { nome: 'PMPE Ala Principal Direita',  x: 220, y: 205, w: 120, h: 22, altura: 12, cor: '#f1f5f9', modelo: 'parede' },
    { nome: 'PMPE Pavilhão Central',       x: 180, y: 200, w: 40,  h: 28, altura: 18, cor: '#ffffff', modelo: 'parede' },
    { nome: 'PMPE Torre do Relógio',       x: 195, y: 204, w: 10,  h: 5,  altura: 34, cor: '#f8fafc', modelo: 'torre' }
  );

  // =========================================================================
  // 2. DESIGN DO TAPETE GRÁFICO (IMAGEM 2D + MAPEAMENTO DE CORES DO SENSOR)
  // =========================================================================
  c.desenhar = function(ctx, self) {
    // Fundo de Asfalto Realista Escuro
    ctx.fillStyle = '#1e1f22';
    ctx.fillRect(0, 0, self.w, self.h);

    // --- ARTWORK DO TAPETE ---
    
    // [NOVO] Calçadão e Pátio Interno do Colégio (Área Cinza Clara)
    ctx.fillStyle = '#475569';
    ctx.fillRect(70, 75, 75, 50);

    // Canteiro de Preservação Ambiental (Grama da Praça do Derby)
    ctx.fillStyle = '#065f46';
    ctx.fillRect(230, 20, 130, 110);
    
    // Ciclovia Metropolitana (Faixa Vermelha de Segurança - Cor 5)
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(5, 15, 390, 6);   // Ciclovia Norte
    ctx.fillRect(215, 21, 6, 129);  // Conexão vertical

    // Espelho d'Água Monumental (Área Azul Pura - Cor 2)
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(295, 100, 14, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Pátio Frontal do Quartel
    ctx.fillStyle = '#374151';
    ctx.fillRect(50, 165, 300, 35);
    
    // Áreas de Calçadão de Pedras
    ctx.fillStyle = '#64748b';
    ctx.fillRect(20, 75, 45, 12);
    ctx.fillRect(230, 65, 35, 30);

    // Base de Lançamento Oficial (Canto Superior Esquerdo)
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(0, 0, 65, 0, Math.PI / 2);
    ctx.lineTo(0, 0);
    ctx.fill();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Faixas de Pedestres Urbanas
    ctx.fillStyle = '#ffffff';
    for (let f = 170; f <= 195; f += 6) {
      ctx.fillRect(185, f, 6, 2.5);
      ctx.fillRect(208, f, 6, 2.5);
    }
    for (let f = 90; f <= 140; f += 8) {
      ctx.fillRect(f, 48, 3, 4);
    }

    // Retângulos Marcadores de Missões
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(18, 63, 49, 14);   // Zona BRT
    ctx.strokeRect(190, 180, 20, 15); // Zona PMPE

    // -----------------------------------------------------------------------
    // REDE DE TRILHAS DA MISSÃO (Linhas Pretas)
    // -----------------------------------------------------------------------
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(45, 45);
    ctx.lineTo(95, 45);
    
    ctx.lineTo(105, 25);
    ctx.lineTo(165, 25);
    ctx.lineTo(175, 52);
    ctx.lineTo(200, 52);
    
    ctx.lineTo(200, 115); 
    ctx.lineTo(245, 115);
    
    ctx.lineTo(245, 55);
    ctx.bezierCurveTo(275, 40, 335, 40, 345, 75);
    ctx.lineTo(345, 115);
    
    ctx.lineTo(210, 115);
    ctx.lineTo(200, 130);
    ctx.lineTo(200, 180);
    ctx.stroke();

    // Marcadores Verdes
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(198, 70, 4, 4);
    ctx.fillRect(243, 85, 4, 4);

    // Desenhar a base física projetada dos modelos
    for (const caixa of self.caixas) {
      ctx.fillStyle = caixa.cor || '#475569';
      ctx.fillRect(caixa.x, caixa.y, caixa.w, caixa.h);
    }
  };

  return c;
})();
  
  // =========================================================================
  // ATENÇÃO: COLOQUE / DECLARE O MODELO DO SEU NOVO MAPA NESTE LOCAL (ANTES DA LISTA)
  // =========================================================================


  // =========================================================================
  // REGISTRO DOS MAPAS: Adicione a variável do seu mapa aqui na lista
  // =========================================================================
  const lista = { treino, desvio, fll, labirinto, obr, derby };

  /** tapete (imagem + pixels) do cenário, gerado uma vez e reaproveitado */
  function obterTapete(id) { if (!cache[id]) cache[id] = gerarTapete(lista[id]); return cache[id]; }
  const inicioDe = (cen, chave) => cen.inicios[chave] || cen.inicios[cen.inicioPadrao];

  // Mantém tudo dentro do IIFE e retorna o objeto Cenarios
  return { 
    lista, obterTapete, gerarTapete, lerPixel, lerArea, 
    intensidade, classificarCor, NOMES_COR, inicioDe, 
    alturaEm, terreno, usarFabricaCanvas(f) { fabricaInjetada = f; for (const k in cache) delete cache[k]; } 
  };
})();

// Compatibilidade global (Navegador + Node.js)
if (typeof window !== 'undefined') window.Cenarios = Cenarios;
if (typeof module !== 'undefined') module.exports = Cenarios;