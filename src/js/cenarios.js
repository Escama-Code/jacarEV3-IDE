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
  inicioPadrao: 'rotatoria',
  inicios: {
    // Carrinho inicia exatamente posicionado na estrada de baixo
    rotatoria: { rotulo: 'Início na Estrada de Baixo (Sul)', x: 100, y: 330, th: 0 },
    mercado: { rotulo: 'Início na Reta do Mercado (Norte)', x: 130, y: 40, th: Math.PI }
  },
  caixas: [], // Elementos urbanos 3D
  rampas: [],
  
  // Controle de tempo do semáforo urbano
  semaforoEstado: 'VERMELHO',
  
  desenhar(ctx, self) {
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

    // 3. LINHAS PRETAS GUIA PARA O SEGUIDOR DE LINHA
    ctx.strokeStyle = '#000000'; 
    ctx.lineWidth = 2; 

    // Linha Guia Principal Integrada
    ctx.beginPath();
    ctx.moveTo(30, 330); ctx.lineTo(210, 330);
    ctx.lineTo(210, 120); ctx.lineTo(130, 120);
    ctx.lineTo(130, 40);  ctx.lineTo(40, 40);
    ctx.lineTo(40, 220);
    ctx.stroke();

    // Linha Guia Continua da Rotatória
    ctx.beginPath();
    ctx.arc(65, 250, 30, 0, 2 * Math.PI);
    ctx.stroke();

    // Linha Guia de Interligação Inferior
    ctx.beginPath();
    ctx.moveTo(65, 280);
    ctx.lineTo(65, 330);
    ctx.stroke();

    // 4. SINALIZAÇÃO HORIZONTAL (Efeito Visual)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.6;
    ctx.setLineDash([]); 
    ctx.beginPath();
    ctx.moveTo(35, 330); ctx.lineTo(205, 330);
    ctx.moveTo(210, 325); ctx.lineTo(210, 125);
    ctx.moveTo(45, 40);   ctx.lineTo(125, 40);
    ctx.stroke();

    // Faixas de Pedestres
    ctx.fillStyle = '#ffffff';
    for (let x = 145; x <= 165; x += 5) ctx.fillRect(x, 321, 2.5, 18); // Hospital
    for (let x = 50; x <= 70; x += 5) ctx.fillRect(x, 31, 2.5, 18);   // Escola
    for (let y = 110; y <= 130; y += 5) ctx.fillRect(31, y, 18, 2.5);  // Bosque

    // Gatilho Dinâmico do Semáforo
    const ciclo = Math.floor(Date.now() / 4000) % 2;
    self.semaforoEstado = ciclo === 0 ? 'VERMELHO' : 'VERDE';
    ctx.fillStyle = self.semaforoEstado === 'VERMELHO' ? '#ef4444' : '#2ecc40';
    
    ctx.fillRect(135, 321, 5, 18); // Semáforo 1
    ctx.fillRect(121, 50, 18, 5);   // Semáforo 2

    // 5. RENDERIZAÇÃO DAS CAIXAS 3D (Prédios fora do caminho)
    for (const caixa of self.caixas) {
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
  
  { nome: 'Estação de Bombeiros', x: 10, y: 10, w: 18, h: 18, altura: 18, cor: '#dc2626', modelo: 'parede' },
  { nome: 'Escola Municipal', x: 70, y: 118, w: 30, h: 22, altura: 16, cor: '#a855f7', modelo: 'parede' },

  // Veículos Decorativos nos acostamentos
  { nome: 'Carrinho de Polícia Retido', x: 222, y: 200, w: 8, h: 14, altura: 6, cor: '#172554', modelo: 'conteiner' },
  { nome: 'Sorveteiro Móvel Comercial', x: 12, y: 210, w: 12, h: 8, altura: 9, cor: '#f472b6', modelo: 'conteiner' },
  { nome: 'Ônibus Escolar Estacionado', x: 145, y: 75, w: 8, h: 18, altura: 8, cor: '#eab308', modelo: 'conteiner' },
  { nome: 'Carro Vermelho Estacionado', x: 145, y: 312, w: 7, h: 12, altura: 5, cor: '#b91c1c', modelo: 'conteiner' },

  // Árvores estáticas
  { nome: 'Pinheiro_1_Tronco', x: 20, y: 220, w: 1, h: 1, altura: 6, cor: '#78350f', modelo: 'poste' },
  { nome: 'Pinheiro_1_Folhas', x: 17, y: 217, w: 6, h: 6, altura: 14, cor: '#15803d' },
  { nome: 'Pinheiro_2_Tronco', x: 215, y: 20, w: 1, h: 1, altura: 6, cor: '#78350f', modelo: 'poste' },
  { nome: 'Pinheiro_2_Folhas', x: 212, y: 17, w: 6, h: 6, altura: 14, cor: '#15803d' }
);

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

const arenaSboticsTiles = [{"x": 2, "y": 0, "z": 0, "rotation": 0, "tipo": "", "resgate": false, "rampa": false, "fim": false, "objects": []}, {"x": 3, "y": 0, "z": 0, "rotation": 3, "tipo": "long-curve", "resgate": false, "rampa": false, "fim": false, "objects": []}, {"x": 4, "y": 0, "z": 0, "rotation": 1, "tipo": "t-intersection", "resgate": false, "rampa": false, "fim": false, "objects": [{"name": "Green Plane", "type": "ObjectPlane", "position": {"x": 0.550000011920929, "y": -0.00499999988824129, "z": -0.550000011920929}, "rotation": {"x": 90, "y": 0, "z": 0}, "scale": {"x": 0.800000011920929, "y": 0.800000011920929, "z": 1}}, {"name": "Green Plane", "type": "ObjectPlane", "position": {"x": -0.550000011920929, "y": -0.00499999988824129, "z": -0.550000011920929}, "rotation": {"x": 90, "y": 0, "z": 0}, "scale": {"x": 0.800000011920929, "y": 0.800000011920929, "z": 1}}]}, {"x": 4, "y": 2, "z": 0, "rotation": 3, "tipo": "half-straight-line", "resgate": false, "rampa": false, "fim": true, "objects": [{"name": "Finish Lane", "type": "ObjectPlane", "position": {"x": 0, "y": 0.00499999988824129, "z": 0}, "rotation": {"x": 90, "y": 0, "z": 0}, "scale": {"x": 10, "y": 1.5, "z": 1}}]}, {"x": 5, "y": 1, "z": 0, "rotation": 3, "tipo": "straight-line", "resgate": false, "rampa": true, "fim": false, "objects": []}, {"x": 6, "y": 1, "z": 0, "rotation": 2, "tipo": "smooth-step-curve", "resgate": false, "rampa": false, "fim": false, "objects": []}, {"x": 2, "y": 0, "z": 1, "rotation": 3, "tipo": "90-curve", "resgate": false, "rampa": false, "fim": false, "objects": []}, {"x": 3, "y": 0, "z": 1, "rotation": 1, "tipo": "intersection", "resgate": false, "rampa": false, "fim": false, "objects": [{"name": "Green Plane", "type": "ObjectPlane", "position": {"x": 0.550000011920929, "y": -0.00499999988824129, "z": -0.550000011920929}, "rotation": {"x": 90, "y": 0, "z": 0}, "scale": {"x": 0.800000011920929, "y": 0.800000011920929, "z": 1}}]}, {"x": 4, "y": 1, "z": 1, "rotation": 3, "tipo": "90-curve", "resgate": false, "rampa": false, "fim": false, "objects": []}, {"x": 5, "y": 1, "z": 1, "rotation": 1, "tipo": "straight-line", "resgate": false, "rampa": false, "fim": false, "objects": [{"name": "Seesaw", "type": "ObjectSeesaw", "position": {"x": 0, "y": 0, "z": 0}, "rotation": {"x": 0, "y": 0, "z": 0}, "scale": {"x": 1, "y": 1, "z": 1}}]}, {"x": 6, "y": 1, "z": 1, "rotation": 1, "tipo": "90-curve", "resgate": false, "rampa": false, "fim": false, "objects": []}, {"x": 2, "y": 0, "z": 2, "rotation": 0, "tipo": "gap", "resgate": false, "rampa": false, "fim": false, "objects": []}, {"x": 3, "y": 0, "z": 2, "rotation": 2, "tipo": "start-line", "resgate": false, "rampa": false, "fim": false, "objects": []}, {"x": 4, "y": 0, "z": 2, "rotation": 2, "tipo": "straight-line", "resgate": false, "rampa": true, "fim": false, "objects": [{"name": "Wall Side Entrance", "type": "ObjectCuboid", "position": {"x": -5, "y": 3.40000009536743, "z": 0}, "rotation": {"x": 0, "y": 0, "z": 0}, "scale": {"x": 0.699999988079071, "y": 6.69999980926514, "z": 1.20000004768372}}, {"name": "Wall Side Entrance", "type": "ObjectCuboid", "position": {"x": 5, "y": 3.40000009536743, "z": 0}, "rotation": {"x": 0, "y": 0, "z": 0}, "scale": {"x": 0.699999988079071, "y": 6.69999980926514, "z": 1.20000004768372}}, {"name": "Top Entrance", "type": "ObjectCuboid", "position": {"x": 0, "y": 6.5, "z": 0}, "rotation": {"x": 0, "y": 0, "z": 0}, "scale": {"x": 10, "y": 0.5, "z": 1.20000004768372}}]}, {"x": 5, "y": 1, "z": 2, "rotation": 0, "tipo": "", "resgate": false, "rampa": false, "fim": false, "objects": []}, {"x": 6, "y": 1, "z": 2, "rotation": 0, "tipo": "", "resgate": false, "rampa": false, "fim": false, "objects": []}, {"x": 0, "y": 1, "z": 3, "rotation": 0, "tipo": "", "resgate": false, "rampa": false, "fim": false, "objects": []}, {"x": 1, "y": 1, "z": 3, "rotation": 0, "tipo": "", "resgate": false, "rampa": false, "fim": false, "objects": []}, {"x": 2, "y": 0, "z": 3, "rotation": 0, "tipo": "gap-intersection", "resgate": false, "rampa": true, "fim": false, "objects": []}, {"x": 4, "y": 0, "z": 3, "rotation": 0, "tipo": "", "resgate": true, "rampa": false, "fim": false, "objects": [{"name": "Wall", "type": "ObjectCuboid", "position": {"x": -4.84999990463257, "y": 1.39999997615814, "z": 0}, "rotation": {"x": 0, "y": 0, "z": 0}, "scale": {"x": 0.349999994039536, "y": 3, "z": 10}}, {"name": "Exit", "type": "ObjectPlane", "position": {"x": 0, "y": 0, "z": -4.65000009536743}, "rotation": {"x": 90, "y": 0, "z": 0}, "scale": {"x": 10, "y": 0.800000011920929, "z": 1}}]}, {"x": 5, "y": 0, "z": 3, "rotation": 1, "tipo": "", "resgate": true, "rampa": false, "fim": false, "objects": [{"name": "Wall", "type": "ObjectCuboid", "position": {"x": 4.84999990463257, "y": 1.39999997615814, "z": 0}, "rotation": {"x": 0, "y": 0, "z": 0}, "scale": {"x": 0.349999994039536, "y": 3, "z": 10}}]}, {"x": 6, "y": 0, "z": 3, "rotation": 2, "tipo": "", "resgate": true, "rampa": false, "fim": false, "objects": [{"name": "Wall", "type": "ObjectCuboid", "position": {"x": -4.84999990463257, "y": 1.39999997615814, "z": 0}, "rotation": {"x": 0, "y": 0, "z": 0}, "scale": {"x": 0.349999994039536, "y": 3, "z": 10}}, {"name": "Wall 2", "type": "ObjectCuboid", "position": {"x": 0, "y": 1.39999997615814, "z": 4.84999990463257}, "rotation": {"x": 0, "y": 90, "z": 0}, "scale": {"x": 0.349999994039536, "y": 3, "z": 10}}, {"name": "Evacuation Point", "type": "ObjectEvacuationPoint", "position": {"x": -2.20000004768372, "y": 0.75, "z": -6}, "rotation": {"x": 0, "y": 0, "z": 0}, "scale": {"x": 1, "y": 1, "z": 1}}]}, {"x": 0, "y": 1, "z": 4, "rotation": 3, "tipo": "90-curve", "resgate": false, "rampa": false, "fim": false, "objects": [{"name": "Box Object", "type": "ObjectBox", "position": {"x": 0, "y": 0, "z": 0}, "rotation": {"x": 0, "y": 90, "z": 0}, "scale": {"x": 1.10000002384186, "y": 1, "z": 0.600000023841858}}]}, {"x": 1, "y": 1, "z": 4, "rotation": 3, "tipo": "straight-line", "resgate": false, "rampa": false, "fim": false, "objects": [{"name": "Speed Bump", "type": "ObjectCylinder", "position": {"x": 0, "y": -0.100000001490116, "z": 2.5}, "rotation": {"x": 0, "y": 3, "z": 90}, "scale": {"x": 0.5, "y": 3.5, "z": 0.5}}, {"name": "Speed Bump Line", "type": "ObjectCylinder", "position": {"x": 0, "y": -0.100000001490116, "z": 2.5}, "rotation": {"x": 0, "y": 0, "z": 90}, "scale": {"x": 0.550000011920929, "y": 0.150000005960464, "z": 0.550000011920929}}, {"name": "Speed Bump", "type": "ObjectCylinder", "position": {"x": 0, "y": -0.100000001490116, "z": -2.5}, "rotation": {"x": 0, "y": -2, "z": 90}, "scale": {"x": 0.5, "y": 3.5, "z": 0.5}}, {"name": "Speed Bump Line", "type": "ObjectCylinder", "position": {"x": 0, "y": -0.100000001490116, "z": -2.5}, "rotation": {"x": 0, "y": 0, "z": 90}, "scale": {"x": 0.550000011920929, "y": 0.150000005960464, "z": 0.550000011920929}}]}, {"x": 2, "y": 1, "z": 4, "rotation": 1, "tipo": "90-curve", "resgate": false, "rampa": false, "fim": false, "objects": [{"name": "Box Object", "type": "ObjectBox", "position": {"x": 0, "y": 0, "z": 0}, "rotation": {"x": 0, "y": 90, "z": 0}, "scale": {"x": 1.10000002384186, "y": 1, "z": 0.600000023841858}}]}, {"x": 4, "y": 0, "z": 4, "rotation": 3, "tipo": "", "resgate": true, "rampa": false, "fim": false, "objects": [{"name": "Wall", "type": "ObjectCuboid", "position": {"x": 0, "y": 1.39999997615814, "z": 4.84999990463257}, "rotation": {"x": 0, "y": 90, "z": 0}, "scale": {"x": 0.349999994039536, "y": 3, "z": 10}}]}, {"x": 5, "y": 0, "z": 4, "rotation": 0, "tipo": "", "resgate": true, "rampa": false, "fim": false, "objects": [{"name": "Live Victim", "type": "ObjectLiveVictim", "position": {"x": 0.100000001490116, "y": 3, "z": 0.100000001490116}, "rotation": {"x": 0, "y": 0, "z": 0}, "scale": {"x": 1, "y": 1, "z": 1}}, {"name": "Live Victim", "type": "ObjectLiveVictim", "position": {"x": 0, "y": 2, "z": 0}, "rotation": {"x": 0, "y": 0, "z": 0}, "scale": {"x": 1, "y": 1, "z": 1}}, {"name": "Dead Victim", "type": "ObjectDeadVictim", "position": {"x": 0, "y": 5, "z": -0.100000001490116}, "rotation": {"x": 0, "y": 0, "z": 0}, "scale": {"x": 1, "y": 1, "z": 1}}]}, {"x": 6, "y": 0, "z": 4, "rotation": 0, "tipo": "", "resgate": true, "rampa": false, "fim": false, "objects": [{"name": "Wall", "type": "ObjectCuboid", "position": {"x": 4.84999990463257, "y": 1.39999997615814, "z": 0}, "rotation": {"x": 0, "y": 0, "z": 0}, "scale": {"x": 0.349999994039536, "y": 3, "z": 10}}]}, {"x": 0, "y": 1, "z": 5, "rotation": 0, "tipo": "duo-simple-curve", "resgate": false, "rampa": false, "fim": false, "objects": []}, {"x": 1, "y": 1, "z": 5, "rotation": 1, "tipo": "straight-line", "resgate": false, "rampa": false, "fim": false, "objects": []}, {"x": 2, "y": 0, "z": 5, "rotation": 3, "tipo": "straight-line", "resgate": false, "rampa": true, "fim": false, "objects": []}, {"x": 3, "y": 0, "z": 5, "rotation": 3, "tipo": "straight-line", "resgate": false, "rampa": false, "fim": false, "objects": []}, {"x": 4, "y": 0, "z": 5, "rotation": 3, "tipo": "", "resgate": true, "rampa": false, "fim": false, "objects": [{"name": "Wall", "type": "ObjectCuboid", "position": {"x": 4.84999990463257, "y": 1.39999997615814, "z": 0}, "rotation": {"x": 0, "y": 0, "z": 0}, "scale": {"x": 0.349999994039536, "y": 3, "z": 10}}, {"name": "Entrance", "type": "ObjectPlane", "position": {"x": 0, "y": 0, "z": 4.65000009536743}, "rotation": {"x": 90, "y": 0, "z": 0}, "scale": {"x": 10, "y": 0.800000011920929, "z": 1}}]}, {"x": 5, "y": 0, "z": 5, "rotation": 3, "tipo": "", "resgate": true, "rampa": false, "fim": false, "objects": [{"name": "Wall", "type": "ObjectCuboid", "position": {"x": 4.84999990463257, "y": 1.39999997615814, "z": 0}, "rotation": {"x": 0, "y": 0, "z": 0}, "scale": {"x": 0.349999994039536, "y": 3, "z": 10}}]}, {"x": 6, "y": 0, "z": 5, "rotation": 1, "tipo": "", "resgate": true, "rampa": false, "fim": false, "objects": [{"name": "Wall", "type": "ObjectCuboid", "position": {"x": -4.84999990463257, "y": 1.39999997615814, "z": 0}, "rotation": {"x": 0, "y": 0, "z": 0}, "scale": {"x": 0.349999994039536, "y": 3, "z": 10}}, {"name": "Wall 2", "type": "ObjectCuboid", "position": {"x": 0, "y": 1.39999997615814, "z": 4.84999990463257}, "rotation": {"x": 0, "y": 90, "z": 0}, "scale": {"x": 0.349999994039536, "y": 3, "z": 10}}, {"name": "Evacuation Point", "type": "ObjectEvacuationPoint", "position": {"x": -2.20000004768372, "y": 0.75, "z": -6}, "rotation": {"x": 0, "y": 0, "z": 0}, "scale": {"x": 1, "y": 1, "z": 1}}]}];

  const TAM_TILE_SBOTICS = 30;
  const TILE_SHIFT_X = 0, TILE_SHIFT_Y = 0;

  function desenharTileSbotics(ctx, t, tamanho, detalhado=true) {
    const u = tamanho / 10;   // unidade interna do sBotics (tile = 10u)
    const q = tamanho / 2;

    ctx.save();
    ctx.translate((t.x + 0.5) * tamanho, (t.z + 0.5) * tamanho);
    // sBotics: rotation em incrementos de 90° (sentido horário no plano XZ)
    ctx.rotate((t.rotation || 0) * Math.PI / 2);

    // ---------- fundo do tile ----------
    if (t.resgate) {
      ctx.fillStyle = '#e8f5e9';           // verde bem claro – zona de resgate
    } else if (t.y === 1) {
      ctx.fillStyle = '#eef3ff';           // nível elevado
    } else if (t.y === 2) {
      ctx.fillStyle = '#fff8e1';           // nível mais alto (finish)
    } else {
      ctx.fillStyle = '#f5f7fa';           // chão padrão
    }
    ctx.fillRect(-q, -q, tamanho, tamanho);

    // grade sutil do piso
    ctx.strokeStyle = '#d0d5dd';
    ctx.lineWidth = 0.35;
    ctx.strokeRect(-q + 0.3, -q + 0.3, tamanho - 0.6, tamanho - 0.6);

    // rampa (sombra alaranjada)
    if (t.rampa) {
      ctx.fillStyle = 'rgba(240, 160, 45, 0.22)';
      ctx.fillRect(-q + 1.5, -q + 1.5, tamanho - 3, tamanho - 3);
    }

    // ---------- fita preta (linha) ----------
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1.7;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([]);

    function linha(draw) {
      ctx.beginPath();
      draw();
      ctx.stroke();
    }

    const type = t.tipo || '';

    if (type === 'straight-line' || type === 'half-straight-line' || type === 'start-line') {
      linha(() => { ctx.moveTo(0, -q); ctx.lineTo(0, q); });
    } else if (type === '90-curve') {
      linha(() => { ctx.moveTo(0, -q); ctx.arc(-q, -q, q, 0, Math.PI / 2); });
    } else if (type === 'long-curve') {
      linha(() => { ctx.moveTo(-q, 0); ctx.quadraticCurveTo(0, -q, q, 0); });
    } else if (type === 'intersection' || type === 'gap-intersection') {
      linha(() => { ctx.moveTo(0, -q); ctx.lineTo(0, q); });
      linha(() => { ctx.moveTo(-q, 0); ctx.lineTo(q, 0); });
    } else if (type === 't-intersection') {
      linha(() => { ctx.moveTo(-q, 0); ctx.lineTo(q, 0); });
      linha(() => { ctx.moveTo(0, 0); ctx.lineTo(0, q); });
    } else if (type === 'gap') {
      linha(() => { ctx.moveTo(0, -q); ctx.lineTo(0, -q * 0.22); });
      linha(() => { ctx.moveTo(0, q * 0.22); ctx.lineTo(0, q); });
    } else if (type === 'duo-simple-curve') {
      linha(() => { ctx.moveTo(0, -q); ctx.quadraticCurveTo(q * 0.75, -q * 0.15, 0, q); });
      linha(() => { ctx.moveTo(-q, 0); ctx.quadraticCurveTo(-q * 0.25, -q * 0.55, 0, -q); });
    } else if (type === 'smooth-step-curve') {
      linha(() => { ctx.moveTo(0, -q); ctx.bezierCurveTo(q * 0.85, -q * 0.1, -q * 0.85, q * 0.1, 0, q); });
    }

    // marca de largada / meio-caminho (vermelho)
    if (type === 'start-line' || type === 'half-straight-line') {
      ctx.fillStyle = '#c0392b';
      ctx.fillRect(-q * 0.72, -q * 0.16, q * 1.44, q * 0.22);
    }

    // gap visual (buraco branco)
    if (type.startsWith('gap')) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-q * 0.75, -q * 0.16, q * 1.5, q * 0.32);
      ctx.strokeStyle = '#b0b8c0';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(-q * 0.75, -q * 0.16, q * 1.5, q * 0.32);
    }

    // ---------- objetos 3D projetados no 2D ----------
    for (const o of (t.objects || [])) {
      const name = o.name || '';
      const pos  = o.position || {};
      const sc   = o.scale || {};
      const rot  = o.rotation || {};
      let x = (pos.x || 0) * u;
      let y = (pos.z || 0) * u;   // z do sBotics → y do canvas

      // Vítimas
      if (name.includes('Victim')) {
        ctx.fillStyle = name.includes('Dead') ? '#5b2c6f' : '#e74c3c';
        ctx.beginPath();
        ctx.arc(x, y, 2.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 0.4;
        ctx.stroke();
        continue;
      }

      // Ponto de evacuação (círculo verde/vermelho)
      if (name.includes('Evacuation')) {
        const cor = name.toLowerCase().includes('red') || (o.color || '').includes('Red') ? '#c0392b' : '#27ae60';
        ctx.strokeStyle = cor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, 5.2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = cor + '33';
        ctx.fill();
        continue;
      }

      // Paredes
      if (name.includes('Wall') || name.includes('Entrance') && o.type === 'ObjectCuboid') {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(((rot.y || 0) * Math.PI) / 180);
        const w = Math.max(1.6, (sc.x || 0.35) * u);
        const h = Math.max(2.2, (sc.z || 10) * u);
        // laranja nas entradas laterais, cinza nas demais
        ctx.fillStyle = name.includes('Side Entrance') || name.includes('Top Entrance') ? '#e67e22' : '#7f8c8d';
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.restore();
        continue;
      }

      // Caixas / obstáculos pretos
      if (name.includes('Box')) {
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(x - 3.2, y - 3.2, 6.4, 6.4);
        ctx.strokeStyle = '#1a252f';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x - 3.2, y - 3.2, 6.4, 6.4);
        continue;
      }

      // Speed bump
      if (name.includes('Speed Bump')) {
        ctx.fillStyle = name.includes('Line') ? '#1a1a1a' : '#f39c12';
        ctx.fillRect(x - 3.5, y - 1.1, 7, 2.2);
        continue;
      }

      // Gangorra (seesaw)
      if (name === 'Seesaw') {
        ctx.fillStyle = '#e67e22';
        ctx.fillRect(x - 5.5, y - 2.2, 11, 4.4);
        ctx.strokeStyle = '#d35400';
        ctx.lineWidth = 0.6;
        ctx.strokeRect(x - 5.5, y - 2.2, 11, 4.4);
        continue;
      }

      // Marcadores verdes (Green Plane) – quadradinhos OBR-style
      if (name.includes('Green Plane')) {
        ctx.fillStyle = '#27ae60';
        const sx = (sc.x || 0.8) * u * 0.55;
        const sy = (sc.y || 0.8) * u * 0.55;
        ctx.fillRect(x - sx / 2, y - sy / 2, sx, sy);
        continue;
      }

      // Finish / Entrance / Exit planes
      if (name === 'Finish Lane' || name === 'Entrance' || name === 'Exit' || name === 'Top Entrance') {
        ctx.fillStyle = name === 'Finish Lane' ? '#c0392b' : '#1abc9c';
        const w = (sc.x || 10) * u * 0.45;
        const h = Math.max(1.8, (sc.y || 0.8) * u * 0.6);
        ctx.fillRect(x - w / 2, y - h / 2, w, h);
        continue;
      }
    }

    ctx.restore();

    // coordenadas do tile (debug)
    if (detalhado) {
      ctx.fillStyle = '#5d6d7e';
      ctx.font = '3.2px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('(' + t.x + ',' + t.z + ')', t.x * tamanho + 1.5, t.z * tamanho + 4.2);
    }
  }


  // =========================================================================
  // Cenário G — Arena sBotics (Tiles)
  // Usa o array arenaSboticsTiles + desenharTileSbotics
  // =========================================================================
  const arenaSbotics = {
    id: 'arenaSbotics',
    nome: 'Robocup Arena 7 (sBotics)',
    w: 7 * TAM_TILE_SBOTICS,   // x = 0..6  → 210 cm
    h: 6 * TAM_TILE_SBOTICS,   // z = 0..5  → 180 cm
    pxPorCm: 4,

    inicioPadrao: 'partida',
    inicios: {
      // Tile start-line em (x=3, z=2)
      partida: { rotulo: 'Linha de partida', x: 3.5 * TAM_TILE_SBOTICS, y: 2.5 * TAM_TILE_SBOTICS, th: Math.PI },
      // Entrada da zona de resgate
      resgate: { rotulo: 'Entrada área de resgate', x: 4.5 * TAM_TILE_SBOTICS, y: 4.8 * TAM_TILE_SBOTICS, th: -Math.PI / 2 },
      // Perto do finish (nível alto)
      finish: { rotulo: 'Perto do finish', x: 4.5 * TAM_TILE_SBOTICS, y: 0.5 * TAM_TILE_SBOTICS, th: Math.PI / 2 }
    },

    caixas: [],
    rampas: [],

    desenhar(ctx, c) {
      // fundo neutro
      ctx.fillStyle = '#f0f4f8';
      ctx.fillRect(0, 0, c.w, c.h);

      // desenha todos os tiles
      for (const t of arenaSboticsTiles) {
        desenharTileSbotics(ctx, t, TAM_TILE_SBOTICS, false);
      }

      // borda externa leve
      ctx.strokeStyle = '#8f8b80';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(0.8, 0.8, c.w - 1.6, c.h - 1.6);
    }
  };

  // =========================================================================
  // REGISTRO DOS MAPAS: Adicione a variável do seu mapa aqui na lista
  // =========================================================================
  const lista = { treino, desvio, fll, labirinto, obr, tapeteUrbanoInfantil, brt, arenaSbotics };

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
    lista, registrarCenario, obterTapete, gerarTapete, lerPixel, lerArea, 
    intensidade, classificarCor, NOMES_COR, inicioDe, 
    alturaEm, terreno, usarFabricaCanvas(f) { fabricaInjetada = f; for (const k in cache) delete cache[k]; } 
  };
})();

// Compatibilidade global (Navegador + Node.js)
if (typeof window !== 'undefined') window.Cenarios = Cenarios;
if (typeof module !== 'undefined') module.exports = Cenarios;