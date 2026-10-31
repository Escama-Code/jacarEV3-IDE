/**
 * Editor modular OBR — grade de ladrilhos 30×30 cm, níveis (eixo Z / gy),
 * rampas, pilares e sala de resgate. Serializa .jcrv3map v2.
 */
(() => {
  const $ = (id) => document.getElementById(id);
  const cat = () => window.ObrCatalogo;
  const STORAGE_KEY = 'jacar-mapa-pendente';

  let doc = null;
  let tool = 'obr-reta';
  let rot = 0; // 0,90,180,270
  let nivelAtivo = 0;
  let hover = null;
  let painting = false;
  let showPorts = true;
  let showGridLabels = false;
  let preview3d = null; // {renderer, scene, camera, root, tiles:{}}
 // {gx,gz}
  let history = [];
  let future = [];

  function docVazio(gw = 8, gh = 6, niveis = 2) {
    return {
      formato: 'jacarev3-mapa',
      versao: 2,
      modo: 'modular-obr',
      nome: 'Arena OBR',
      tileCm: cat().TILE_CM,
      nivelCm: cat().NIVEL_CM,
      gridW: gw,
      gridH: gh,
      niveisMax: niveis,
      celulas: [],
      inicio: { gx: 0, gz: gh - 1, gy: 0, rot: 0 },
      // campos legados para o simulador 2D (gerados no export/aplicar)
      w: gw * cat().TILE_CM,
      h: gh * cat().TILE_CM,
      pxPorCm: 4,
      tracos: [],
      caixas: [],
      rampas: [],
      decoracoes3d: [],
      basePNG: '',
    };
  }

  function validar(d) {
    if (!d || d.formato !== 'jacarev3-mapa') throw new Error('Formato inválido.');
    if (d.versao === 1) throw new Error('Este editor usa mapas modulares v2 (.jcrv3map). Abra no modo legado ou converta.');
    if (d.versao !== 2 || d.modo !== 'modular-obr') throw new Error('Mapa não é modular-obr v2.');
    if (!Array.isArray(d.celulas)) throw new Error('celulas inválidas.');
    return d;
  }

  function deepCopy(o) { return JSON.parse(JSON.stringify(o)); }

  /** Portas após rotação do bloco (0/90/180/270). */
  function portsRotacionadas(ports, rotDeg) {
    const order = ['N', 'E', 'S', 'W'];
    const shift = ((Math.round(rotDeg / 90) % 4) + 4) % 4;
    return (ports || []).map((p) => {
      const i = order.indexOf(p);
      return i < 0 ? p : order[(i + shift) % 4];
    });
  }

  function vizinho(gx, gz, dir) {
    if (dir === 'N') return { gx, gz: gz - 1, opp: 'S' };
    if (dir === 'S') return { gx, gz: gz + 1, opp: 'N' };
    if (dir === 'E') return { gx: gx + 1, gz, opp: 'W' };
    if (dir === 'W') return { gx: gx - 1, gz, opp: 'E' };
    return null;
  }

  function celulasNoNivel(gy) {
    return doc.celulas.filter((c) => (c.gy || 0) === gy);
  }

  function celulaCobrindo(gx, gz, gy) {
    for (const c of celulasNoNivel(gy)) {
      const def = cat().BLOCOS[c.tipo];
      const w = def?.w || 1, h = def?.h || 1;
      if (gx >= c.gx && gx < c.gx + w && gz >= c.gz && gz < c.gz + h) return c;
    }
    return null;
  }

  /** Checklist inspirado no validaOBR do editor livre, adaptado a blocos. */
  function validaModularOBR(d) {
    const avisos = [], ok = [];
    const tile = d.tileCm || 30;
    if (tile !== 30) avisos.push({ tipo: 'aviso', texto: `tileCm=${tile}: referência OBR é 30 cm (300 mm).` });
    else ok.push({ tipo: 'ok', texto: 'Ladrilho 30×30 cm (padrão OBR).' });

    const linhas = d.celulas.filter((c) => {
      const id = c.tipo || '';
      return id.startsWith('obr-') && !['obr-vazio', 'obr-pilar', 'obr-elevado', 'obr-ponte'].includes(id)
        && !id.includes('resgate') && !id.includes('tri-') && id !== 'obr-rampa';
    });
    if (!linhas.length && !d.celulas.some((c) => String(c.tipo).includes('resgate'))) {
      avisos.push({ tipo: 'aviso', texto: 'Nenhuma linha de pista nem sala de resgate colocada.' });
    }

    // Encaixe de portas no nível 0
    let falhas = 0, checados = 0;
    for (const c of d.celulas) {
      if ((c.gy || 0) !== 0) continue;
      const def = cat().BLOCOS[c.tipo];
      if (!def?.ports?.length) continue;
      const ports = portsRotacionadas(def.ports, c.rot || 0);
      // só verifica a célula âncora (gx,gz) para multi
      for (const dir of ports) {
        const v = vizinho(c.gx, c.gz, dir);
        if (!v) continue;
        if (v.gx < 0 || v.gz < 0 || v.gx >= d.gridW || v.gz >= d.gridH) continue;
        const other = celulaCobrindo(v.gx, v.gz, 0);
        checados++;
        if (!other) {
          // borda aberta — ok em fim de pista
          continue;
        }
        const odef = cat().BLOCOS[other.tipo];
        const oports = portsRotacionadas(odef?.ports || [], other.rot || 0);
        if (oports.length && !oports.includes(v.opp)) {
          falhas++;
          if (falhas <= 6) {
            avisos.push({
              tipo: 'aviso',
              texto: `Encaixe fraco em (${c.gx},${c.gz})→${dir}: vizinho «${odef?.nome || other.tipo}» sem porta ${v.opp}. Rotacione o bloco.`,
            });
          }
        }
      }
    }
    if (checados && !falhas) ok.push({ tipo: 'ok', texto: `Encaixes de porta conferidos (${checados} arestas com vizinho).` });
    if (falhas > 6) avisos.push({ tipo: 'aviso', texto: `… e mais ${falhas - 6} encaixes suspeitos.` });

    // Salas de resgate
    for (const c of d.celulas) {
      if (!String(c.tipo).includes('resgate-sala')) continue;
      const def = cat().BLOCOS[c.tipo];
      const wcm = (def?.w || 1) * tile, hcm = (def?.h || 1) * tile;
      const okDim = [[90, 90], [90, 120], [120, 90]].some(([a, b]) => a === wcm && b === hcm);
      if (!okDim) avisos.push({ tipo: 'aviso', texto: `Sala em (${c.gx},${c.gz}): ${wcm}×${hcm} cm — referência 90×90 ou 90×120.` });
      else ok.push({ tipo: 'ok', texto: `Sala de resgate ${wcm}×${hcm} cm em (${c.gx},${c.gz}).` });
    }

    // Rampas
    const rampas = d.celulas.filter((c) => c.tipo === 'obr-rampa' || c.tipo === 'rampa');
    if (rampas.length) ok.push({ tipo: 'info', texto: `${rampas.length} rampa(s) — confira nível de destino no andar superior.` });

    if (!d.inicio) avisos.push({ tipo: 'aviso', texto: 'Defina o ponto inicial do robô.' });
    else ok.push({ tipo: 'ok', texto: `Início no ladrilho (${d.inicio.gx},${d.inicio.gz}).` });

    if (!avisos.some((a) => a.tipo === 'aviso')) {
      ok.push({ tipo: 'ok', texto: 'Nenhuma divergência estrutural detectada nos blocos verificados.' });
    }
    avisos.push({
      tipo: 'info',
      texto: 'Checklist de treino inspirado no manual OBR / RoboCup Junior Rescue — não é certificação oficial.',
    });
    return [...avisos.filter((a) => a.tipo === 'aviso'), ...ok, ...avisos.filter((a) => a.tipo === 'info')];
  }

  function mostrarValidacao() {
    const box = $('mapValidacao');
    if (!box) return;
    const res = validaModularOBR(doc);
    box.innerHTML = '';
    box.hidden = false;
    for (const r of res) {
      const p = document.createElement('p');
      p.textContent = (r.tipo === 'aviso' ? '⚠ ' : r.tipo === 'ok' ? '✓ ' : 'ℹ ') + r.texto;
      p.style.margin = '4px 0';
      p.style.color = r.tipo === 'aviso' ? '#ffb4a8' : r.tipo === 'ok' ? '#8dffb5' : '#9eb6d4';
      box.appendChild(p);
    }
    status(res.some((r) => r.tipo === 'aviso') ? 'Validação: há avisos.' : 'Validação: ok estrutural.');
  }


  function guardarHist() {
    history.push(deepCopy(doc));
    if (history.length > 50) history.shift();
    future = [];
  }

  function undo() {
    if (!history.length) return;
    future.push(deepCopy(doc));
    doc = history.pop();
    render();
  }
  function redo() {
    if (!future.length) return;
    history.push(deepCopy(doc));
    doc = future.pop();
    render();
  }

  function celulaEm(gx, gz, gy) {
    return doc.celulas.find((c) => c.gx === gx && c.gz === gz && (c.gy || 0) === gy);
  }

  function ocupadoPorMulti(gx, gz, gy, w, h, ignoreId) {
    for (const c of doc.celulas) {
      if (ignoreId && c._uid === ignoreId) continue;
      const def = cat().BLOCOS[c.tipo];
      if (!def) continue;
      const cw = def.w || 1, ch = def.h || 1;
      const cgy = c.gy || 0;
      if (cgy !== gy) continue;
      if (gx < c.gx + cw && gx + w > c.gx && gz < c.gz + ch && gz + h > c.gz) return true;
    }
    return false;
  }

  function colocar(gx, gz) {
    const def = cat().BLOCOS[tool];
    if (!def) return;
    const gy = def.gy != null && tool !== 'rampa' && tool !== 'pilar'
      ? (tool === 'piso-elevado' || tool === 'ponte' ? nivelAtivo : (def.gy || nivelAtivo))
      : nivelAtivo;
    const w = def.w || 1, h = def.h || 1;
    if (gx < 0 || gz < 0 || gx + w > doc.gridW || gz + h > doc.gridH) {
      status('Fora da grade.', true);
      return;
    }
    if (gy < 0 || gy >= doc.niveisMax) {
      status('Nível inválido.', true);
      return;
    }
    if (ocupadoPorMulti(gx, gz, gy, w, h)) {
      status('Espaço ocupado neste nível.', true);
      return;
    }
    guardarHist();
    const cell = {
      _uid: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      tipo: tool,
      gx, gz, gy,
      rot: rot,
    };
    if (def.sobeNivel) cell.sobeNivel = def.sobeNivel;
    doc.celulas.push(cell);
    // rampa: marca destino elevado implícito na serialização
    status(`Colocado: ${def.nome} @ (${gx},${gz}) nível ${gy}`);
    render();
  }

  function apagar(gx, gz) {
    const gy = nivelAtivo;
    const list = doc.celulas.filter((c) => {
      const def = cat().BLOCOS[c.tipo];
      const w = def?.w || 1, h = def?.h || 1;
      const cgy = c.gy || 0;
      if (cgy !== gy) return true;
      const hit = gx >= c.gx && gx < c.gx + w && gz >= c.gz && gz < c.gz + h;
      return !hit;
    });
    if (list.length === doc.celulas.length) return;
    guardarHist();
    doc.celulas = list;
    status('Bloco removido.');
    render();
  }

  function status(msg, erro) {
    const el = $('mapStatus');
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('erro', !!erro);
  }


  /** Desenha um ladrilho no ctx (coords em cm do mapa) — padrão OBR oficial */
  function desenharBloco(ctx, c, tileCm) {
    const def = cat().BLOCOS[c.tipo];
    if (!def) return;
    const x = c.gx * tileCm;
    const z = c.gz * tileCm;
    const w = (def.w || 1) * tileCm;
    const h = (def.h || 1) * tileCm;
    ctx.save();
    ctx.translate(x + w / 2, z + h / 2);
    ctx.rotate((c.rot || 0) * Math.PI / 180);
    // padrão desenhado em 0..30 local; multi-tile escala a partir da origem do bloco
    ctx.translate(-tileCm / 2, -tileCm / 2);
    if ((def.w || 1) > 1 || (def.h || 1) > 1) {
      // salas: desenhar em escala completa do módulo
      ctx.translate(tileCm / 2, tileCm / 2);
      ctx.translate(-w / 2, -h / 2);
      if (typeof cat().desenharPadrao === 'function') {
        // temporary scale for multi
        ctx.save();
        // desenharPadrao uses fixed 30; for multi fill bg then call pattern once in top-left cell space
        cat().desenharPadrao(ctx, c.tipo);
        ctx.restore();
      }
    } else if (typeof cat().desenharPadrao === 'function') {
      cat().desenharPadrao(ctx, c.tipo);
    }
    // badge nível
    if ((c.gy || 0) > 0) {
      ctx.fillStyle = 'rgba(30,80,160,0.9)';
      ctx.fillRect(tileCm - 12, 2, 10, 10);
      ctx.fillStyle = '#fff';
      ctx.font = '8px sans-serif';
      ctx.fillText(String(c.gy), tileCm - 9, 10);
    }
    ctx.restore();
  }


  function initPreview3d() {
    if (preview3d || typeof THREE === 'undefined') return;
    const canvas = $('view3d');
    if (!canvas) return;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x6a8aa8);
    const camera = new THREE.PerspectiveCamera(40, 2, 0.1, 500);
    camera.position.set(90, 85, 100);
    camera.lookAt(0, 0, 0);
    const light = new THREE.DirectionalLight(0xffffff, 1.1);
    light.position.set(40, 80, 30);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    const root = new THREE.Group();
    scene.add(root);
    // orbit drag
    let drag = false, lx = 0, ly = 0, theta = 0.75, phi = 0.95, dist = 130;
    const updateCam = () => {
      camera.position.set(
        dist * Math.sin(phi) * Math.cos(theta),
        dist * Math.cos(phi),
        dist * Math.sin(phi) * Math.sin(theta),
      );
      camera.lookAt(0, 5, 0);
    };
    updateCam();
    canvas.addEventListener('pointerdown', (e) => { drag = true; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointerup', () => { drag = false; });
    canvas.addEventListener('pointermove', (e) => {
      if (!drag) return;
      theta -= (e.clientX - lx) * 0.01;
      phi = Math.max(0.2, Math.min(1.4, phi + (e.clientY - ly) * 0.01));
      lx = e.clientX; ly = e.clientY;
      updateCam();
    });
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      dist = Math.max(40, Math.min(220, dist + e.deltaY * 0.08));
      updateCam();
    }, { passive: false });
    preview3d = { renderer, scene, camera, root, updateCam };
    const loop = () => {
      requestAnimationFrame(loop);
      if (!preview3d) return;
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (w && h && (canvas.width !== w || canvas.height !== h)) {
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
      renderer.render(scene, camera);
    };
    loop();
  }

  function atualizarPreview3d() {
    if (!doc) return;
    initPreview3d();
    if (!preview3d) return;
    const { root } = preview3d;
    while (root.children.length) root.remove(root.children[0]);
    const tile = doc.tileCm || 30;
    const nivelH = doc.nivelCm || 10;
    const ox = -(doc.gridW * tile) / 2;
    const oz = -(doc.gridH * tile) / 2;
    // base grid
    const gridMat = new THREE.MeshLambertMaterial({ color: 0x3a4a5c });
    for (let gx = 0; gx < doc.gridW; gx++) {
      for (let gz = 0; gz < doc.gridH; gz++) {
        const m = new THREE.Mesh(
          new THREE.BoxGeometry(tile * 0.98, 0.4, tile * 0.98),
          gridMat,
        );
        m.position.set(ox + (gx + 0.5) * tile, -0.2, oz + (gz + 0.5) * tile);
        root.add(m);
      }
    }
    const cores = {
      linha: 0x111111, verde: 0x2d8a4e, rampa: 0x5a8ab0, resgate: 0x2a2a32,
      pilar: 0x5a6570, padrao: 0xf0eeea,
    };
    for (const c of doc.celulas) {
      const def = cat().BLOCOS[c.tipo];
      if (!def) continue;
      const tw = (def.w || 1) * tile;
      const td = (def.h || 1) * tile;
      const gy = c.gy || 0;
      const y0 = gy * nivelH;
      // textura 2D do mesmo desenharPadrao → prévia igual ao editor
      const cnv = document.createElement('canvas');
      const res = 64 * (def.w || 1);
      cnv.width = res;
      cnv.height = 64 * (def.h || 1);
      const cx = cnv.getContext('2d');
      cx.scale(cnv.width / tw, cnv.height / td);
      if (typeof cat().desenharPadrao === 'function' && (def.w || 1) === 1 && (def.h || 1) === 1) {
        cx.save();
        cx.translate(tile / 2, tile / 2);
        cx.rotate(((c.rot || 0) * Math.PI) / 180);
        cx.translate(-tile / 2, -tile / 2);
        cat().desenharPadrao(cx, c.tipo);
        cx.restore();
      } else {
        cx.fillStyle = '#f0eeea';
        cx.fillRect(0, 0, tw, td);
        desenharBloco(cx, { ...c, gx: 0, gz: 0 }, tile);
      }
      const tex = new THREE.CanvasTexture(cnv);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      const geo = new THREE.BoxGeometry(tw * 0.98, Math.max(1.0, gy > 0 ? 2 : 1.0), td * 0.98);
      const mats = [
        new THREE.MeshLambertMaterial({ color: 0xd8d4cc }),
        new THREE.MeshLambertMaterial({ color: 0xd8d4cc }),
        new THREE.MeshLambertMaterial({ map: tex }), // topo
        new THREE.MeshLambertMaterial({ color: 0x8a8680 }),
        new THREE.MeshLambertMaterial({ color: 0xd8d4cc }),
        new THREE.MeshLambertMaterial({ color: 0xd8d4cc }),
      ];
      const mesh = new THREE.Mesh(geo, mats);
      mesh.position.set(
        ox + (c.gx + (def.w || 1) / 2) * tile,
        y0 + 0.6,
        oz + (c.gz + (def.h || 1) / 2) * tile,
      );
      root.add(mesh);
    }
    if (doc.inicio) {
      const arrow = new THREE.Mesh(
        new THREE.ConeGeometry(3, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x3ecf8e }),
      );
      arrow.rotation.x = Math.PI / 2;
      arrow.position.set(
        ox + (doc.inicio.gx + 0.5) * tile,
        4,
        oz + (doc.inicio.gz + 0.5) * tile,
      );
      arrow.rotation.z = -((doc.inicio.rot || 0) * Math.PI) / 180;
      root.add(arrow);
    }
  }


  function render() {
    const canvas = $('mapCanvas');
    if (!canvas || !doc) return;
    const tileCm = doc.tileCm || 30;
    const px = doc.pxPorCm || 4;
    const W = doc.gridW * tileCm;
    const H = doc.gridH * tileCm;
    canvas.width = Math.round(W * px);
    canvas.height = Math.round(H * px);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(px, 0, 0, px, 0, 0);

    // fundo
    ctx.fillStyle = '#1a2030';
    ctx.fillRect(0, 0, W, H);

    // grade
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 0.3;
    for (let i = 0; i <= doc.gridW; i++) {
      ctx.beginPath(); ctx.moveTo(i * tileCm, 0); ctx.lineTo(i * tileCm, H); ctx.stroke();
    }
    for (let j = 0; j <= doc.gridH; j++) {
      ctx.beginPath(); ctx.moveTo(0, j * tileCm); ctx.lineTo(W, j * tileCm); ctx.stroke();
    }

    // células: primeiro níveis baixos, depois altos (do nível ativo em destaque)
    const ordenadas = [...doc.celulas].sort((a, b) => (a.gy || 0) - (b.gy || 0));
    for (const c of ordenadas) {
      const same = (c.gy || 0) === nivelAtivo;
      ctx.globalAlpha = same ? 1 : 0.35;
      desenharBloco(ctx, c, tileCm);
    }
    ctx.globalAlpha = 1;


    // portas (encaixe)
    if (showPorts) {
      for (const c of ordenadas) {
        if ((c.gy || 0) !== nivelAtivo) continue;
        const def = cat().BLOCOS[c.tipo];
        if (!def?.ports?.length) continue;
        const ports = portsRotacionadas(def.ports, c.rot || 0);
        const cx = (c.gx + 0.5) * tileCm;
        const cz = (c.gz + 0.5) * tileCm;
        ctx.fillStyle = 'rgba(80,160,255,0.9)'; // portas = azul (não confundir com marcação OBR verde)
        for (const dir of ports) {
          let px = cx, pz = cz;
          if (dir === 'N') pz = c.gz * tileCm;
          if (dir === 'S') pz = (c.gz + (def.h || 1)) * tileCm;
          if (dir === 'W') px = c.gx * tileCm;
          if (dir === 'E') px = (c.gx + (def.w || 1)) * tileCm;
          ctx.beginPath();
          ctx.arc(px, pz, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    if (showGridLabels) {
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.font = '3px sans-serif';
      for (let gx = 0; gx < doc.gridW; gx++) {
        for (let gz = 0; gz < doc.gridH; gz++) {
          ctx.fillText(`${gx},${gz}`, gx * tileCm + 1, gz * tileCm + 4);
        }
      }
    }

    // hover preview
    if (hover && cat().BLOCOS[tool]) {
      const def = cat().BLOCOS[tool];
      ctx.globalAlpha = 0.45;
      desenharBloco(ctx, {
        tipo: tool, gx: hover.gx, gz: hover.gz, gy: nivelAtivo, rot,
      }, tileCm);
      ctx.globalAlpha = 1;
      // outline
      ctx.strokeStyle = '#3ecf8e';
      ctx.lineWidth = 0.6;
      ctx.strokeRect(hover.gx * tileCm, hover.gz * tileCm, (def.w || 1) * tileCm, (def.h || 1) * tileCm);
    }

    // Início do robô: quadrado verde (área) + seta = direção que deve seguir
    if (doc.inicio) {
      const ix = (doc.inicio.gx + 0.5) * tileCm;
      const iz = (doc.inicio.gz + 0.5) * tileCm;
      const ang = (doc.inicio.rot || 0) * Math.PI / 180;
      ctx.save();
      ctx.translate(ix, iz);
      ctx.rotate(ang);
      // “pegada” do robô no ladrilho (quadrado verde semitransparente)
      const lado = tileCm * 0.42;
      ctx.fillStyle = 'rgba(46, 200, 120, 0.35)';
      ctx.strokeStyle = '#1fa85e';
      ctx.lineWidth = 0.7;
      ctx.fillRect(-lado / 2, -lado / 2, lado, lado);
      ctx.strokeRect(-lado / 2, -lado / 2, lado, lado);
      // seta: aponta para onde o robô “olha” / deve seguir
      ctx.fillStyle = '#1a9b52';
      ctx.strokeStyle = '#0d5c30';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(lado * 0.48, 0);
      ctx.lineTo(-lado * 0.22, lado * 0.28);
      ctx.lineTo(-lado * 0.22, -lado * 0.28);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // pontinho no centro
      ctx.fillStyle = '#0d5c30';
      ctx.beginPath();
      ctx.arc(0, 0, 1.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const info = $('mapInfo');
    if (info) {
      info.textContent = `${doc.gridW}×${doc.gridH} ladrilhos · ${doc.celulas.length} bloco(s) · nível ${nivelAtivo}/${doc.niveisMax - 1} · ${W}×${H} cm`;
    }
    try { atualizarPreview3d(); } catch (e) { /* three opcional */ }
  }

  function gridPos(event) {
    const canvas = $('mapCanvas');
    const r = canvas.getBoundingClientRect();
    const tileCm = doc.tileCm;
    const px = doc.pxPorCm || 4;
    // use displayed size
    const xCm = ((event.clientX - r.left) / r.width) * doc.gridW * tileCm;
    const zCm = ((event.clientY - r.top) / r.height) * doc.gridH * tileCm;
    return {
      gx: Math.floor(xCm / tileCm),
      gz: Math.floor(zCm / tileCm),
    };
  }

  /** Gera caixas/rampas legadas + desenho plano para o simulador 2D */
  function materializarParaSimulador(d) {
    /**
     * Exporta para o Sandbox com o MESMO desenho do editor.
     * Importante: NÃO gerar traços aproximados por cima do PNG —
     * isso quebrava as curvas (como na importação bugada).
     * Toda a pista vai em basePNG; tracos fica vazio.
     */
    const tileCm = d.tileCm || 30;
    const px = d.pxPorCm || 4;
    const W = d.gridW * tileCm;
    const H = d.gridH * tileCm;

    const cnv = document.createElement('canvas');
    cnv.width = Math.round(W * px);
    cnv.height = Math.round(H * px);
    const ctx = cnv.getContext('2d');
    ctx.setTransform(px, 0, 0, px, 0, 0);
    // fundo claro como no sArena / OBR
    ctx.fillStyle = '#f4f3ee';
    ctx.fillRect(0, 0, W, H);

    // desenha cada ladrilho com o padrão oficial (mesmo do editor)
    const ordenadas = [...(d.celulas || [])].sort((a, b) => (a.gy || 0) - (b.gy || 0));
    for (const c of ordenadas) {
      if ((c.gy || 0) > 0) continue; // piso 2D = térreo
      desenharBloco(ctx, c, tileCm);
    }

    // grade sutil opcional (não — sensor pode confundir)

    const out = {
      formato: 'jacarev3-mapa',
      versao: 2,
      id: 'autoral-modular-' + Date.now().toString(36),
      nome: (d.nome || 'Arena OBR').trim().slice(0, 70),
      w: W,
      h: H,
      pxPorCm: px,
      perfil: 'regional',
      nivel: 1,
      basePNG: cnv.toDataURL('image/png'),
      sobreposicaoPNG: '',
      legadoRaster: false,
      borrachasBase: [],
      sinalUrbano: null,
      // vazio de propósito: o desenho fiel está no basePNG
      tracos: [],
      caixas: [],
      rampas: [],
      decoracoes3d: [],
      areas: [],
      salas: [],
      pontosEducativos: [],
      desenhoCaixasNaTextura: false,
      inicio: {
        x: tileCm / 2,
        y: (d.gridH - 0.5) * tileCm,
        th: -Math.PI / 2,
      },
      origemModular: {
        modo: 'modular-obr',
        gridW: d.gridW,
        gridH: d.gridH,
        niveisMax: d.niveisMax,
        celulas: deepCopy(d.celulas || []),
      },
    };

    for (const c of d.celulas || []) {
      const def = cat().BLOCOS[c.tipo];
      if (!def) continue;
      const x = c.gx * tileCm;
      const y = c.gz * tileCm;
      const w = (def.w || 1) * tileCm;
      const h = (def.h || 1) * tileCm;
      if (c.tipo === 'obr-pilar' || c.tipo === 'obstaculo') {
        out.caixas.push({
          x: x + w * 0.3, y: y + h * 0.3, w: w * 0.4, h: h * 0.4,
          cor: '#6a7380', altura: 12, modelo: 'simples', nome: def.nome || c.tipo,
        });
      }
      if (c.tipo === 'obr-rampa') {
        const dir = (c.rot || 0) % 180 === 0 ? '+y' : '+x';
        out.rampas.push({
          x, y, w, h, altura: 10, dir,
          subida: dir.endsWith('y') ? h : w,
        });
      }
      if (String(c.tipo).startsWith('obr-resgate-sala')) {
        out.salas.push({
          x, y, w, h,
          rotacao: Math.round((c.rot || 0) / 90) % 4,
          entrada: 20, ladoEntrada: 'baixo',
          segundaEntrada: false, entrada2: 20, ladoEntrada2: 'cima',
          cantoVerde: 'br', cantoVermelho: 'bl',
        });
      }
      if (c.tipo === 'obr-tri-verde') {
        out.areas.push({ tipo: 'triangulo', x, y, lado: Math.min(30, w, h), canto: 'br', cor: 'verde' });
      }
      if (c.tipo === 'obr-tri-vermelho') {
        out.areas.push({ tipo: 'triangulo', x, y, lado: Math.min(30, w, h), canto: 'bl', cor: 'vermelho' });
      }
    }

    if (d.inicio) {
      out.inicio = {
        x: (d.inicio.gx + 0.5) * tileCm,
        y: (d.inicio.gz + 0.5) * tileCm,
        th: ((d.inicio.rot || 0) - 90) * Math.PI / 180,
      };
    }
    return out;
  }

  function baixar() {
    try {
      doc.nome = ($('mapNome')?.value || doc.nome).trim() || 'Arena OBR';
      const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = (doc.nome.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) || 'arena') + '.jcrv3map';
      a.click();
      status('Arquivo .jcrv3map (v2 modular) salvo.');
    } catch (e) { status(e.message, true); }
  }

  async function abrirArquivo(file) {
    const text = await file.text();
    const data = JSON.parse(text);
    if (data.versao === 1) {
      status('Mapa v1 (traços). Use o editor legado ou redesenhe em módulos.', true);
      return;
    }
    validar(data);
    doc = data;
    history = []; future = [];
    if ($('mapNome')) $('mapNome').value = doc.nome;
    render();
    status('Mapa modular carregado.');
  }

  function enviarIde() {
    try {
      doc.nome = ($('mapNome')?.value || doc.nome).trim() || 'Arena OBR';
      const mat = materializarParaSimulador(doc);
      // Sandbox ainda espera estrutura aplicável; guarda o doc modular + materializado
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(mat));
      sessionStorage.setItem(STORAGE_KEY + '-modular', JSON.stringify(doc));
      location.href = 'sandbox.html?mapa=1';
    } catch (e) { status(e.message, true); }
  }

  function montarPaleta() {
    const root = $('paleta');
    if (!root) return;
    root.innerHTML = '';
    for (const catDef of cat().CATEGORIAS) {
      const h = document.createElement('h2');
      h.textContent = catDef.titulo;
      h.style.borderLeft = `3px solid ${catDef.cor}`;
      root.appendChild(h);
      const wrap = document.createElement('div');
      wrap.className = 'paleta-grupo';
      for (const bl of Object.values(cat().BLOCOS)) {
        if (bl.cat !== catDef.id) continue;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.dataset.tipo = bl.id;
        btn.innerHTML = `<strong>${bl.nome}</strong><span>${bl.desc}</span>`;
        btn.onclick = () => {
          tool = bl.id;
          root.querySelectorAll('button').forEach((b) => b.classList.toggle('ativo', b.dataset.tipo === tool));
          status('Ferramenta: ' + bl.nome);
        };
        if (bl.id === tool) btn.classList.add('ativo');
        wrap.appendChild(btn);
      }
      root.appendChild(wrap);
    }
  }

  function iniciar() {
    if (!$('mapCanvas') || !window.ObrCatalogo) return;
    doc = docVazio(
      Number($('gridW')?.value) || 8,
      Number($('gridH')?.value) || 6,
      Number($('niveisMax')?.value) || 2,
    );
    montarPaleta();

    $('btnNovo')?.addEventListener('click', () => {
      guardarHist();
      doc = docVazio(
        Number($('gridW')?.value) || 8,
        Number($('gridH')?.value) || 6,
        Number($('niveisMax')?.value) || 2,
      );
      if ($('mapNome')) $('mapNome').value = doc.nome;
      render();
      status('Nova arena modular.');
    });
    $('btnApplyGrid')?.addEventListener('click', () => {
      guardarHist();
      doc.gridW = Math.max(3, Math.min(20, Number($('gridW').value) || 8));
      doc.gridH = Math.max(3, Math.min(16, Number($('gridH').value) || 6));
      doc.niveisMax = Math.max(1, Math.min(4, Number($('niveisMax').value) || 2));
      doc.w = doc.gridW * doc.tileCm;
      doc.h = doc.gridH * doc.tileCm;
      doc.celulas = doc.celulas.filter((c) => {
        const def = cat().BLOCOS[c.tipo];
        const w = def?.w || 1, h = def?.h || 1;
        return c.gx + w <= doc.gridW && c.gz + h <= doc.gridH && (c.gy || 0) < doc.niveisMax;
      });
      render();
    });
    $('btnUndo')?.addEventListener('click', undo);
    $('btnRedo')?.addEventListener('click', redo);
    $('btnSave')?.addEventListener('click', baixar);
    $('btnLoad')?.addEventListener('click', () => $('fileIn').click());
    $('fileIn')?.addEventListener('change', async (e) => {
      const f = e.target.files?.[0];
      e.target.value = '';
      if (f) try { await abrirArquivo(f); } catch (err) { status(err.message, true); }
    });
    $('btnToIde')?.addEventListener('click', enviarIde);
    $('btnRot')?.addEventListener('click', () => {
      rot = (rot + 90) % 360;
      $('btnRot').textContent = `Rotação: ${rot}°`;
    });
    $('nivelAtivo')?.addEventListener('change', () => {
      nivelAtivo = Number($('nivelAtivo').value) || 0;
      render();
    });
    $('btnInicio')?.addEventListener('click', () => {
      tool = '__inicio';
      status('Clique na grade para definir o início do robô.');
    });
    $('btnApagar')?.addEventListener('click', () => {
      tool = '__apagar';
      status('Clique para remover bloco no nível ativo.');
    });

    const canvas = $('mapCanvas');
    canvas.addEventListener('pointermove', (e) => {
      hover = gridPos(e);
      if (painting && tool !== '__inicio') aplicarCelula(hover);
      else render();
    });
    canvas.addEventListener('pointerleave', () => { hover = null; render(); });
    const aplicarCelula = (p) => {
      if (tool === '__apagar') apagar(p.gx, p.gz);
      else if (tool === '__inicio') {
        guardarHist();
        doc.inicio = { gx: p.gx, gz: p.gz, gy: nivelAtivo, rot };
        status(`Início em (${p.gx},${p.gz}) · direção ${rot}° (R para girar a seta)`);
        render();
      } else colocar(p.gx, p.gz);
    };
    canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      painting = true;
      canvas.setPointerCapture(e.pointerId);
      aplicarCelula(gridPos(e));
    });
    canvas.addEventListener('pointerup', () => { painting = false; });
    canvas.addEventListener('pointercancel', () => { painting = false; });


    $('btnValidar')?.addEventListener('click', mostrarValidacao);
    $('chkPorts')?.addEventListener('change', () => { showPorts = !!$('chkPorts').checked; render(); });
    $('chkLabels')?.addEventListener('change', () => { showGridLabels = !!$('chkLabels').checked; render(); });

    document.addEventListener('keydown', (e) => {
      if (e.target.closest('input,textarea,select')) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
      }
      if (e.key.toLowerCase() === 'r') {
        rot = (rot + 90) % 360;
        if ($('btnRot')) $('btnRot').textContent = `Rotação: ${rot}°`;
        if (tool === '__inicio' && doc?.inicio) {
          guardarHist();
          doc.inicio.rot = rot;
          status(`Direção do robô: ${rot}°`);
        } else {
          status(`Rotação do próximo bloco: ${rot}°`);
        }
        render();
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        tool = '__apagar';
        status('Modo apagar (Delete)');
      }
      if (e.key >= '0' && e.key <= '3') {
        nivelAtivo = Number(e.key);
        if ($('nivelAtivo')) $('nivelAtivo').value = String(nivelAtivo);
        render();
      }
    });

    render();
    status('Editor modular OBR pronto — ladrilhos 30×30 cm. Atalhos: R gira, Del apaga, Ctrl+Z desfaz.');
  }

  document.addEventListener('DOMContentLoaded', iniciar);

  window.MapaModular = {
    materializarParaSimulador,
    validar,
    validaModularOBR,
    docVazio,
    STORAGE_KEY,
  };
})();
