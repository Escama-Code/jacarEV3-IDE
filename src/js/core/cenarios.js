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
  // Só o oval preto sobre fundo branco: o robô pode orbitar sem nada no caminho.
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
  // Duas paredes paralelas escalonadas: o robô sai do centro-esquerda, enxerga a parede
  // pelo ultrassônico (<15 cm), recua, gira e segue até a próxima.
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
      ctx.strokeStyle = '#d4d8dc'; ctx.lineWidth = 1.2; ctx.strokeRect(0.6, 0.6, c.w - 1.2, c.h - 1.2);   // moldura clara (o robô nunca a alcança com o sensor)
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
    // rampa física: sobe em +x ao longo de 18 cm até 4,5 cm de altura e segue em platô (16 cm de largura cabe o robô)
    rampas: [{ nome: 'Rampa', x: 62, y: 96, w: 34, h: 16, altura: 4.5, subida: 18, dir: '+x', cor: '#8c8c8c' }],
    desenhar(ctx, c) {
      const retArred = (x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
      // base do tapete
      ctx.fillStyle = '#f2efe6'; ctx.fillRect(0, 0, c.w, c.h);
      // lago fundo (azul-marinho: luminância BAIXA — pode enganar o sensor como se fosse linha)
      ctx.fillStyle = '#1b2a5c'; ctx.beginPath(); ctx.ellipse(38, 24, 30, 15, 0, 0, 2 * PI); ctx.fill();
      ctx.strokeStyle = '#3a5fc0'; ctx.lineWidth = 0.7;
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(38, 24 + i * 0.01, 24 - i * 5, 11 - i * 2.2, 0, PI * 1.1, PI * 1.9); ctx.stroke(); }
      // deserto amarelo com dunas laranja
      ctx.fillStyle = '#f2c230'; ctx.fillRect(176, 6, 54, 34);
      ctx.fillStyle = '#e8902a'; for (const [x, y, r] of [[190, 34, 9], [208, 12, 7], [222, 33, 8]]) { ctx.beginPath(); ctx.arc(x, y, r, PI, 2 * PI); ctx.fill(); }
      // vulcão (vermelho + laranja), floresta (marrom), rampa cinza
      ctx.fillStyle = '#d62828'; ctx.beginPath(); ctx.arc(150, 96, 9, 0, 2 * PI); ctx.fill();
      ctx.fillStyle = '#ff8c1a'; ctx.beginPath(); ctx.arc(150, 96, 4, 0, 2 * PI); ctx.fill();
      ctx.fillStyle = '#7b4a2a'; ctx.fillRect(104, 82, 22, 10);
      ctx.fillStyle = '#8c8c8c'; ctx.fillRect(62, 96, 34, 16);                      // rampa (cinza): o 3D ergue uma rampa real aqui
      // áreas de partida: VERDE e AZUL
      ctx.fillStyle = '#2e9d4f'; ctx.fillRect(6, 76, 36, 32);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.strokeRect(8, 78, 32, 28);
      ctx.fillStyle = '#2f6fd6'; ctx.fillRect(194, 76, 36, 32);
      ctx.strokeStyle = '#ffffff'; ctx.strokeRect(196, 78, 32, 28);
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 5px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('VERDE', 24, 102); ctx.fillText('AZUL', 212, 102);
      // linhas pretas: percurso principal, bifurcação (A em cima / B embaixo), reencontro, ladrão, ramal em T
      ctx.strokeStyle = '#0d0d0d'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(42, 92); ctx.lineTo(64, 92); ctx.bezierCurveTo(80, 92, 84, 76, 92, 64); ctx.lineTo(116, 48); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(116, 48); ctx.bezierCurveTo(126, 40, 134, 30, 148, 30); ctx.lineTo(168, 30); ctx.bezierCurveTo(180, 30, 184, 40, 186, 48); ctx.stroke();   // ramo A
      ctx.beginPath(); ctx.moveTo(116, 48); ctx.bezierCurveTo(126, 56, 134, 66, 148, 66); ctx.lineTo(168, 66); ctx.bezierCurveTo(180, 66, 184, 56, 186, 48); ctx.stroke();    // ramo B
      ctx.beginPath(); ctx.moveTo(186, 48); ctx.lineTo(204, 48); ctx.bezierCurveTo(214, 48, 214, 60, 212, 70); ctx.lineTo(212, 76); ctx.stroke();                          // reencontro → área azul
      ctx.beginPath(); ctx.moveTo(148, 30); ctx.lineTo(148, 66); ctx.stroke();                                                                                           // ponte entre os ramos
      ctx.beginPath(); ctx.moveTo(92, 64); ctx.lineTo(92, 28); ctx.moveTo(82, 28); ctx.lineTo(102, 28); ctx.stroke();                                                    // ramal em T
      ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(48, 106); ctx.lineTo(60, 106); ctx.moveTo(130, 106); ctx.lineTo(188, 106); ctx.stroke();                             // linha fina
      // moldura escura do tapete
      ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 3; ctx.strokeRect(1.5, 1.5, c.w - 3, c.h - 3);
    },
  };

  // ---------------------------------------------------------
  // Terreno: altura do chão (rampas). Usado só pra POSE VISUAL no 3D; a física 2D e o sensor não mudam.
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
  /** altura (z) do robô e inclinações a partir de 4 pontos de apoio: frente/trás (±5 cm) e roda esq./dir. (±6 cm) */
  function terreno(cen, x, y, th) {
    if (!cen.rampas || !cen.rampas.length) return { z: 0, pitch: 0, roll: 0 };
    const c = Math.cos(th), s = Math.sin(th);
    const f = alturaEm(cen, x + 5 * c, y + 5 * s), b = alturaEm(cen, x - 5 * c, y - 5 * s);
    const l = alturaEm(cen, x + 6 * s, y - 6 * c), r = alturaEm(cen, x - 6 * s, y + 6 * c);
    return { z: (f + b + l + r) / 4, pitch: Math.atan2(f - b, 10), roll: Math.atan2(l - r, 12) };      // pitch>0 = nariz pra cima · roll>0 = lado esquerdo mais alto
  }


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

  const lista = { treino, desvio, fll, circuitoAurora };
  /** tapete (imagem + pixels) do cenário, gerado uma vez e reaproveitado */
  function obterTapete(id) { if (!cache[id]) cache[id] = gerarTapete(lista[id]); return cache[id]; }
  const inicioDe = (cen, chave) => cen.inicios[chave] || cen.inicios[cen.inicioPadrao];

  return { lista, obterTapete, gerarTapete, lerPixel, lerArea, intensidade, classificarCor, NOMES_COR, inicioDe, alturaEm, terreno,
    usarFabricaCanvas(f) { fabricaInjetada = f; for (const k in cache) delete cache[k]; } };
})();
if (typeof module !== 'undefined') module.exports = Cenarios;
