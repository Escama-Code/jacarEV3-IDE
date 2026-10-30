/**
 * Editor visual de linhas do jacarEV3.
 * Formato autoral .jmap (JSON). Nenhuma dependência de .sArena.
 * O mesmo desenho alimenta o Canvas do sensor e a textura da pista 3D.
 */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const MAX_STROKES = 1500;
  const MAX_POINTS = 4000;
  const MAX_BASE_SIZE = 3_000_000;
  const MIMETYPE = 'data:image/png;base64,';
  const TOOLS = new Set(['caneta', 'borracha', 'reta', 'inicio']);

  let doc = null;
  let baseImage = null;
  let currentStroke = null;
  let pointer = null;
  let history = [];
  let future = [];
  let tool = 'caneta';
  let active = false;
  let busy = false;

  const deepCopy = (value) => JSON.parse(JSON.stringify(value));
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

  function validNum(v, lo, hi, label) {
    if (typeof v !== 'number' || !Number.isFinite(v) || v < lo || v > hi) {
      throw new Error(`Valor inválido em ${label}.`);
    }
    return v;
  }

  function validar(d) {
    if (!d || d.formato !== 'jacarev3-mapa' || d.versao !== 1) {
      throw new Error('Esse arquivo não é um mapa .jmap versão 1.');
    }
    if (typeof d.nome !== 'string' || d.nome.trim().length < 1 || d.nome.length > 70) {
      throw new Error('Nome do mapa inválido.');
    }
    validNum(d.w, 40, 360, 'largura');
    validNum(d.h, 40, 240, 'altura');
    validNum(d.pxPorCm, 2, 6, 'resolução');
    if (d.w * d.h * d.pxPorCm ** 2 > 3_000_000) {
      throw new Error('Mapa muito grande para esta versão do editor.');
    }
    if (typeof d.basePNG !== 'string' ||
      (d.basePNG !== '' && (!d.basePNG.startsWith(MIMETYPE) || d.basePNG.length > MAX_BASE_SIZE))) {
      throw new Error('Imagem base inválida ou muito grande.');
    }
    if (!Array.isArray(d.tracos) || d.tracos.length > MAX_STROKES) {
      throw new Error('Quantidade de traços inválida.');
    }
    for (const t of d.tracos) {
      if (!t || !['caneta', 'borracha', 'reta'].includes(t.tipo)) throw new Error('Ferramenta inválida.');
      validNum(t.espessura, 0.5, 20, 'espessura');
      if (!Array.isArray(t.pontos) || t.pontos.length < 1 || t.pontos.length > MAX_POINTS) {
        throw new Error('Pontos inválidos.');
      }
      for (const p of t.pontos) {
        if (!Array.isArray(p) || p.length !== 2) throw new Error('Ponto inválido.');
        validNum(p[0], 0, d.w, 'X');
        validNum(p[1], 0, d.h, 'Y');
      }
    }
    if (!d.inicio) throw new Error('Faltou o ponto inicial.');
    validNum(d.inicio.x, 0, d.w, 'início X');
    validNum(d.inicio.y, 0, d.h, 'início Y');
    validNum(d.inicio.th, -Math.PI * 2, Math.PI * 2, 'orientação');
    // Os obstáculos são dados do próprio mapa, não scripts executáveis.
    if (!Array.isArray(d.caixas) || d.caixas.length > 100) throw new Error('Obstáculos inválidos.');
    for (const b of d.caixas) {
      validNum(b.x, 0, d.w, 'obstáculo X');
      validNum(b.y, 0, d.h, 'obstáculo Y');
      validNum(b.w, 0.1, d.w, 'obstáculo largura');
      validNum(b.h, 0.1, d.h, 'obstáculo altura');
    }
    if (!Array.isArray(d.rampas) || d.rampas.length > 20) throw new Error('Rampas inválidas.');
    if (!Array.isArray(d.decoracoes3d) || d.decoracoes3d.length > 100) throw new Error('Decorações inválidas.');
    return d;
  }

  function criarDocumento(w = 260, h = 180) {
    return {
      formato: 'jacarev3-mapa', versao: 1, nome: 'Meu circuito',
      w: clamp(w, 40, 360), h: clamp(h, 40, 240), pxPorCm: 5,
      basePNG: '', tracos: [], caixas: [], rampas: [], decoracoes3d: [],
      inicio: { x: 28, y: clamp(h - 25, 10, h - 5), th: -Math.PI / 2 }
    };
  }

  async function decodificarBase(d) {
    if (!d.basePNG) return null;
    const image = new Image();
    image.decoding = 'async';
    image.src = d.basePNG;
    try {
      if (typeof image.decode === 'function') await image.decode();
      else await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
      });
    } catch {
      throw new Error('Não foi possível abrir a imagem base do mapa.');
    }
    return image;
  }

  function pintarTracos(ctx, tracos) {
    for (const t of tracos) {
      const pts = t.pontos;
      ctx.save();
      ctx.lineWidth = t.espessura;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = t.tipo === 'borracha' ? '#ffffff' : '#050505';
      ctx.fillStyle = ctx.strokeStyle;
      if (pts.length === 1) {
        ctx.beginPath(); ctx.arc(pts[0][0], pts[0][1], t.espessura / 2, 0, 2 * Math.PI); ctx.fill();
      } else {
        ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function pintarMapa(ctx, d, image, strokes = d.tracos) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, d.w, d.h);
    if (image) ctx.drawImage(image, 0, 0, d.w, d.h);
    pintarTracos(ctx, strokes);
  }

  function posicionarInicio(ctx, d) {
    const {x, y, th} = d.inicio;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(th);
    ctx.fillStyle = '#ef9a37';
    ctx.strokeStyle = '#563e21';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(5, 0); ctx.lineTo(-4, -3.5); ctx.lineTo(-4, 3.5);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  function renderizar() {
    if (!doc) return;
    const canvas = $('mapEditorCanvas');
    const factor = Math.min(4, 1200 / doc.w, 900 / doc.h);
    const w = Math.round(doc.w * factor), h = Math.round(doc.h * factor);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(w / doc.w, 0, 0, h / doc.h, 0, 0);
    pintarMapa(ctx, doc, baseImage);
    if (currentStroke) pintarTracos(ctx, [currentStroke]);
    // Obstáculos são apenas indicadores visuais; colisão é do SimEV3.
    for (const b of doc.caixas) {
      ctx.save();
      ctx.fillStyle = 'rgba(84,112,135,.65)';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.restore();
    }
    posicionarInicio(ctx, doc);
    $('mapEditorUndo').disabled = history.length === 0;
    $('mapEditorRedo').disabled = future.length === 0;
    $('mapEditorStatus').textContent =
      `${doc.w} × ${doc.h} cm · ${doc.tracos.length} traço(s) · ${tool === 'inicio' ? 'clique para posicionar o robô' : 'desenhe no mapa'}`;
  }

  function posicao(event) {
    const el = $('mapEditorCanvas');
    const bounds = el.getBoundingClientRect();
    return [
      Math.round(clamp((event.clientX - bounds.left) / bounds.width * doc.w, 0, doc.w) * 100) / 100,
      Math.round(clamp((event.clientY - bounds.top) / bounds.height * doc.h, 0, doc.h) * 100) / 100
    ];
  }

  function guardarHistorico() {
    history.push({tracos: deepCopy(doc.tracos), inicio: {...doc.inicio}});
    if (history.length > 60) history.shift();
    future = [];
  }
  function trocarPilha(from, to) {
    if (!from.length) return;
    to.push({tracos: deepCopy(doc.tracos), inicio: {...doc.inicio}});
    const state = from.pop();
    doc.tracos = state.tracos;
    doc.inicio = state.inicio;
    currentStroke = null;
    renderizar();
  }
  function selecionarFerramenta(t) {
    if (!TOOLS.has(t)) return;
    tool = t;
    document.querySelectorAll('[data-map-tool]').forEach((btn) => {
      btn.classList.toggle('ativo', btn.dataset.mapTool === t);
      btn.setAttribute('aria-pressed', String(btn.dataset.mapTool === t));
    });
    $('mapEditorCanvas').style.cursor = t === 'inicio' ? 'crosshair' : t === 'borracha' ? 'cell' : 'crosshair';
    renderizar();
  }
  function iniciarTraco(event) {
    if (!active || event.button !== 0 || busy || pointer !== null) return;
    event.preventDefault();
    const p = posicao(event);
    if (tool === 'inicio') {
      guardarHistorico();
      doc.inicio.x = p[0];
      doc.inicio.y = p[1];
      doc.inicio.th = Number($('mapEditorHeading').value) * Math.PI / 180;
      renderizar();
      return;
    }
    if (doc.tracos.length >= MAX_STROKES) {
      mensagem('Limite de traços atingido.', true); return;
    }
    pointer = event.pointerId;
    try { event.currentTarget.setPointerCapture(pointer); } catch { /* navegador sem captura */ }
    guardarHistorico();
    currentStroke = { tipo: tool, espessura: Number($('mapEditorBrush').value), pontos: [p] };
    renderizar();
  }
  function moverTraco(event) {
    if (pointer !== event.pointerId || !currentStroke) return;
    event.preventDefault();
    const p = posicao(event);
    const pts = currentStroke.pontos;
    if (currentStroke.tipo === 'reta') {
      pts[1] = p;
    } else if (pts.length < MAX_POINTS) {
      const last = pts[pts.length - 1];
      if (Math.hypot(p[0] - last[0], p[1] - last[1]) >= 0.15) pts.push(p);
    }
    renderizar();
  }
  function finalizarTraco(event) {
    if (pointer !== event.pointerId) return;
    if (currentStroke) {
      if (currentStroke.tipo === 'reta' && currentStroke.pontos.length === 1) {
        currentStroke.pontos.push([...currentStroke.pontos[0]]);
      }
      doc.tracos.push(currentStroke);
    }
    currentStroke = null; pointer = null;
    renderizar();
  }
  function mensagem(msg, erro = false) {
    const el = $('mapEditorAviso');
    el.textContent = msg;
    el.style.color = erro ? '#ff8c8c' : '';
  }
  async function mostrarDocumento(d) {
    validar(d);
    const loaded = await decodificarBase(d);
    doc = deepCopy(d);
    baseImage = loaded;
    history = [];
    future = [];
    currentStroke = null;
    pointer = null;
    $('mapEditorNome').value = doc.nome;
    $('mapEditorBrush').value = '3';
    $('mapEditorBrushValor').textContent = '3 cm';
    const graus = Math.round(doc.inicio.th * 180 / Math.PI);
    const heading = $('mapEditorHeading');
    heading.value = ['-90', '0', '90', '180'].includes(String(graus)) ? String(graus) : '-90';
    renderizar();
    mensagem('Desenhe com o mouse ou toque na tela. A borracha pinta de branco.');
  }

  function docAtual() {
    if (!doc) throw new Error('Nenhum mapa aberto.');
    const value = $('mapEditorNome').value.trim();
    if (!value || value.length > 70) throw new Error('Digite um nome de até 70 caracteres.');
    const copy = deepCopy(doc);
    copy.nome = value;
    validar(copy);
    return copy;
  }

  function duplicarCenarioAtual() {
    const id = $('cenario').value;
    const cen = Cenarios.lista[id];
    if (!cen) throw new Error('Selecione um cenário válido.');
    if (cen.tilesOriginais) throw new Error('Para criar pistas autorais, escolha um cenário nativo ou comece em branco.');
    if (cen.editorDocumento) return deepCopy(cen.editorDocumento);
    const canvas = Cenarios.obterTapete(id).canvas;
    const normal = document.createElement('canvas');
    normal.width = canvas.width; normal.height = canvas.height;
    normal.getContext('2d').drawImage(canvas, 0, 0);
    const d = criarDocumento(cen.w, cen.h);
    d.nome = cen.nome + ' (editado)';
    d.basePNG = normal.toDataURL('image/png');
    d.caixas = deepCopy(cen.caixas || []);
    d.rampas = deepCopy(cen.rampas || []);
    d.decoracoes3d = deepCopy(cen.decoracoes3d || []);
    const ini = Cenarios.inicioDe(cen, cen.inicioPadrao);
    d.inicio = {x: ini.x, y: ini.y, th: ini.th};
    return d;
  }

  async function abrirEditor() {
    if (active) return;
    try {
      if (document.body.classList.contains('modo-campanha')) {
        throw new Error('O editor funciona no modo Sandbox.');
      }
      if (typeof Playback.prepararEdicao === 'function') Playback.prepararEdicao();
      active = true;
      $('mapEditorModal').hidden = false;
      await mostrarDocumento(duplicarCenarioAtual());
    } catch (err) {
      active = false;
      $('mapEditorModal').hidden = true;
      mensagem(err.message, true);
      alert(err.message);
    }
  }

  function fechar() {
    if (busy) return;
    active = false;
    currentStroke = null;
    pointer = null;
    $('mapEditorModal').hidden = true;
  }

  function registrar(d, image) {
    const idBase = d.id && /^autoral-[a-z0-9-]{1,60}$/.test(d.id)
      ? d.id : 'autoral-' + Date.now().toString(36);
    // Só substitui um mapa editado quando o usuário está reeditando esse mapa.
    // Abrir um .jmap não pode sobrescrever acidentalmente outro cenário.
    let id = idBase;
    if (Cenarios.lista[id] && ($('cenario').value !== id || !Cenarios.lista[id].editorDocumento)) {
      let n = 2;
      while (Cenarios.lista[`${idBase}-${n}`]) n++;
      id = `${idBase}-${n}`;
    }
    const snapshot = deepCopy({...d, id});
    const cen = {
      id, nome: d.nome, w: d.w, h: d.h, pxPorCm: d.pxPorCm,
      inicioPadrao: 'padrao',
      inicios: { padrao: {rotulo: 'Início definido no editor', ...d.inicio} },
      caixas: deepCopy(d.caixas), rampas: deepCopy(d.rampas),
      decoracoes3d: deepCopy(d.decoracoes3d),
      linhaAltaContraste: true,
      editorDocumento: snapshot,
      desenhar(ctx) { pintarMapa(ctx, snapshot, image); }
    };
    Cenarios.registrarCenario(cen); // invalida o cache de pixels anterior
    let opt = Array.from($('cenario').options).find((o) => o.value === id);
    if (!opt) {
      opt = new Option(cen.nome, id);
      $('cenario').add(opt);
    } else opt.textContent = cen.nome;
    Playback.escolher(id, 'padrao'); // também atualiza tapete/3D e invalida playback
    return cen;
  }

  function aplicar() {
    if (busy) return;
    busy = true;
    let sucesso = false;
    try {
      const d = docAtual();
      // Guarda o mesmo ID ao reeditar; mapas importados sem ID recebem um novo.
      const cen = registrar(d, baseImage);
      doc.id = cen.id;
      mensagem('Mapa aplicado ao simulador!');
      sucesso = true;
    } catch (err) {
      mensagem(err.message, true);
    } finally {
      busy = false;
    }
    if (sucesso) fechar();
  }

  function baixar() {
    try {
      const d = docAtual();
      const text = JSON.stringify(d, null, 2);
      const blob = new Blob([text], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (d.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9_-]+/g, '-').slice(0, 45) || 'mapa') + '.jmap';
      document.body.appendChild(a);
      a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      mensagem('Mapa salvo. Guarde o arquivo .jmap para editar depois.');
    } catch (e) { mensagem(e.message, true); }
  }

  async function importar(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 3_500_000) { mensagem('Arquivo .jmap muito grande.', true); return; }
    if (busy) return;
    busy = true;
    try {
      const parsed = JSON.parse(await file.text());
      await mostrarDocumento(parsed);
      mensagem('Mapa carregado. Clique em Aplicar na IDE para usar no simulador.');
    } catch (e) { mensagem('Não foi possível abrir o .jmap: ' + e.message, true); }
    finally { busy = false; }
  }

  function iniciar() {
    $('btnEditorMapa').addEventListener('click', abrirEditor);
    $('mapEditorClose').addEventListener('click', fechar);
    $('mapEditorCancel').addEventListener('click', fechar);
    $('mapEditorApply').addEventListener('click', aplicar);
    $('mapEditorDownload').addEventListener('click', baixar);
    $('mapEditorUpload').addEventListener('click', () => $('mapEditorFile').click());
    $('mapEditorFile').addEventListener('change', importar);
    $('mapEditorBlank').addEventListener('click', async () => {
      const d = criarDocumento(doc?.w, doc?.h);
      await mostrarDocumento(d);
    });
    $('mapEditorCopy').addEventListener('click', async () => {
      try { await mostrarDocumento(duplicarCenarioAtual()); }
      catch (e) { mensagem(e.message, true); }
    });
    $('mapEditorUndo').addEventListener('click', () => trocarPilha(history, future));
    $('mapEditorRedo').addEventListener('click', () => trocarPilha(future, history));
    $('mapEditorBrush').addEventListener('input', () => {
      $('mapEditorBrushValor').textContent = $('mapEditorBrush').value + ' cm';
    });
    $('mapEditorHeading').addEventListener('change', () => {
      if (doc) { guardarHistorico(); doc.inicio.th = Number($('mapEditorHeading').value) * Math.PI / 180; renderizar(); }
    });
    document.querySelectorAll('[data-map-tool]').forEach((b) =>
      b.addEventListener('click', () => selecionarFerramenta(b.dataset.mapTool)));
    const canvas = $('mapEditorCanvas');
    canvas.addEventListener('pointerdown', iniciarTraco);
    canvas.addEventListener('pointermove', moverTraco);
    canvas.addEventListener('pointerup', finalizarTraco);
    canvas.addEventListener('pointercancel', finalizarTraco);
    document.addEventListener('keydown', (event) => {
      if (!active || event.target.closest('input,textarea,select')) return;
      if (event.key === 'Escape') fechar();
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        trocarPilha(event.shiftKey ? future : history, event.shiftKey ? history : future);
      }
    });
    selecionarFerramenta('caneta');
  }

  document.addEventListener('DOMContentLoaded', iniciar);
  window.JacarEditorMapa = {validar, criarDocumento}; // útil para diagnósticos
})();
