// sArenaParser.mjs — converte sBotics (.sArena) para jacarEV3.
// 1 tile sBotics = 10 unidades locais = 30 cm no simulador.
// O desnível vertical entre andares é de 10 cm.
// Eixo X/Z: planta; eixo Y: altura.
// O desenho em Canvas é compartilhado entre o tapete/sensor e o piso 3D.
export const TILE_CM = 30;
export const NIVEL_CM = 10;
// No sBotics até o primeiro piso fica elevado sobre suportes, acima do chão azul.
export const BASE_CM = 8;
const ESCALA_OBJ = TILE_CM / 10;
const PI = Math.PI;
const CORES = {
  ColorWhite:'#f7f7f7', ColorBlack:'#151515', ColorRed:'#ea2323',
  ColorGreen:'#159f39', ColorBlue:'#2071ca', ColorYellow:'#ffcf23',
  ColorOrange:'#e97a1c', ColorGray:'#848484', ColorGrey:'#848484',
};
export function resolverCor(cor) {
  if (typeof cor === 'string' && (/^#[\da-f]{3,8}$/i.test(cor))) return cor;
  return CORES[cor] || '#888888';
}

function tileValido(t) {
  return t && Number.isFinite(t.x) && Number.isFinite(t.z) &&
    Number.isFinite(t.y ?? 0);
}
function grauParaRad(g) { return (Number(g) || 0) * PI / 180; }
function rotacaoTile(t) { return ((t.rotation || 0) % 4) * PI / 2; }

// O desenho das imagens usa a rotação positiva do Canvas (+z para baixo).
// Os objetos do .sArena, porém, seguem o eixo Y do sBotics/Unity:
// a transformação local X/Z gira no sentido oposto ao desenho da imagem.
// Não misturar essas duas convenções: isso cria paredes internas e
// elementos fora do perímetro da sala de resgate.
export function posicaoGlobal(tile, obj, origemX = 0, origemZ = 0) {
  const x = Number(obj.position?.x) || 0;
  const z = Number(obj.position?.z) || 0;
  const y = Number(obj.position?.y) || 0;
  const a = -rotacaoTile(tile);
  const c = Math.cos(a), s = Math.sin(a);
  return {
    x: (tile.x - origemX + 0.5) * TILE_CM + ESCALA_OBJ * (x * c - z * s),
    y: BASE_CM + (tile.y ?? 0) * NIVEL_CM + y * ESCALA_OBJ,
    z: (tile.z - origemZ + 0.5) * TILE_CM + ESCALA_OBJ * (x * s + z * c),
    rotY: -a - grauParaRad(obj.rotation?.y),
  };
}
function escalaObjeto(obj) {
  const s = obj.scale || {};
  return {
    sx: Math.max(0.001, Math.abs(Number(s.x ?? 1))) * ESCALA_OBJ,
    sy: Math.max(0.001, Math.abs(Number(s.y ?? 1))) * ESCALA_OBJ,
    sz: Math.max(0.001, Math.abs(Number(s.z ?? 1))) * ESCALA_OBJ,
  };
}

// As URLs de properties.image guardam o nome do arquivo em base64.
// Decodificar o nome evita depender de links com token temporário e de CORS.
export function tipoImagem(tile) {
  const url = tile?.properties?.image;
  if (!url || typeof url !== 'string') return '';
  try {
    const value = new URL(url, 'https://sbotics.net').searchParams.get('target') || '';
    const payload = value.replace(/^fls\d+_/, '');
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = typeof atob !== 'undefined'
      ? atob(normalized)
      : Buffer.from(normalized, 'base64').toString('utf8');
    const filename = decoded.split('/').pop() || '';
    return filename.replace(/\.(png|jpe?g|webp)$/i, '').toLowerCase();
  } catch {
    const m = url.match(/([\w-]+)\.(png|jpe?g|webp)/i);
    return m ? m[1].toLowerCase() : '';
  }
}
const LINHA = '#000000';
function poligono(ctx, points, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  points.forEach(([x,z],i)=> i ? ctx.lineTo(x,z) : ctx.moveTo(x,z));
  ctx.closePath();ctx.fill();
}

/**
 * Desenho vetorial offline das imagens oficiais conhecidas do sBotics.
 *
 * A imagem da linha usa a rotação do Canvas; pontos de evacuação
 * são objetos sBotics e seguem a rotação inversa, como as paredes.
 * Separar as transformações preserva as conexões do seguidor de linha.
 *
 * As dimensões locais da imagem sBotics vão de -5 a +5, em ambas as direções.
 * O mesmo desenho é usado pelo Canvas do sensor e pela textura da malha 3D.
 */
<<<<<<< HEAD
export const LARGURA_LINHA_TILE = (20 / 300) * 10; // 20 mm oficiais OBR
=======
export const LARGURA_LINHA_TILE = 0.36;
>>>>>>> ebe5f226f8c18e9f1d296621ded67aa7bdc8a36e
// Tamanho em unidades locais (-5..5); o original ocupa quase um ladrilho.
export const TAMANHO_TRIANGULO_RESGATE = 7.6;
const RECUO_TRIANGULO = 0.12;

/**
 * Um ponto de evacuação fica no canto EXTERNO da sala de resgate,
 * não no canto resultante da rotação gráfica do próprio ladrilho.
 * Retorna vértices locais tanto para o Canvas/sensor quanto para o Three.js.
 */
export function verticesEvacuacao(tile, obj) {
  const limites = tile._sArenaLimitesResgate;
  const a = -rotacaoTile(tile);
  const xObj = Number(obj.position?.x ?? -2.2);
  const zObj = Number(obj.position?.z ?? -6);
  const localRotX = xObj*Math.cos(a) - zObj*Math.sin(a);
  const localRotZ = xObj*Math.sin(a) + zObj*Math.cos(a);
  const dx = limites && limites.minX !== limites.maxX
    ? (tile.x === limites.maxX ? 1 : tile.x === limites.minX ? -1 : Math.sign(localRotX) || 1)
    : Math.sign(localRotX) || 1;
  const dz = limites && limites.minZ !== limites.maxZ
    ? (tile.z === limites.maxZ ? 1 : tile.z === limites.minZ ? -1 : Math.sign(localRotZ) || 1)
    : Math.sign(localRotZ) || 1;
  const lado = 5 - RECUO_TRIANGULO;
  const perna = Math.min(TAMANHO_TRIANGULO_RESGATE, lado*2);
  return [
    [dx*lado, dz*lado],
    [dx*(lado-perna), dz*lado],
    [dx*lado, dz*(lado-perna)]
  ];
}

/**
 * Encontra os limites de cada sala de resgate no mesmo nível (BFS).
 * Não confunde salas distintas nem depende da câmera ou rotação de imagem.
 */
function prepararSalasDeResgate(tiles) {
  const salas = tiles.filter(t => t.properties?.rescue_zone);
  const index = new Map(salas.map(t => [`${t.x}:${t.z}:${t.y}`, t]));
  const visitados = new Set();
  for (const t of salas) {
    if (visitados.has(t)) continue;
    const fila = [t], componentes = [];
    visitados.add(t);
    for (let i = 0; i < fila.length; i++) {
      const atual = fila[i]; componentes.push(atual);
      for (const [dx,dz] of [[0,1],[0,-1],[1,0],[-1,0]]) {
        const viz = index.get(`${atual.x+dx}:${atual.z+dz}:${atual.y}`);
        if (viz && !visitados.has(viz)) { visitados.add(viz); fila.push(viz); }
      }
    }
    const limites = {
      minX:Math.min(...componentes.map(t=>t.x)),
      maxX:Math.max(...componentes.map(t=>t.x)),
      minZ:Math.min(...componentes.map(t=>t.z)),
      maxZ:Math.max(...componentes.map(t=>t.z))
    };
    for (const tile of componentes) Object.defineProperty(tile, '_sArenaLimitesResgate', {
      configurable:true, value:limites
    });
  }
}

/**
 * Esferas da mesma sala que compartilham quase a mesma posição X/Z
 * devem repousar na placa, lado a lado. O y do arquivo não é utilizado
 * como deslocamento visual vertical para vítimas.
 *
 * Retorna Map de item -> posição 3D; não altera os dados originais.
 */
export function posicoesVitimasNoPiso(objetosSBotics) {
  const porTile = new Map();
  for (const item of objetosSBotics) {
    if (!['ObjectLiveVictim','ObjectDeadVictim'].includes(item.obj.type)) continue;
    const chave = `${item.tile.x}:${item.tile.z}:${item.tile.y}`;
    if (!porTile.has(chave)) porTile.set(chave, []);
    porTile.get(chave).push(item);
  }
  const saida = new Map();
  for (const grupo of porTile.values()) {
    const centroX = grupo.reduce((s,i)=>s+i.pos.x,0)/grupo.length;
    const centroZ = grupo.reduce((s,i)=>s+i.pos.z,0)/grupo.length;
    const sobrepostos = grupo.length > 1 && grupo.every(i =>
      Math.hypot(i.pos.x-centroX, i.pos.z-centroZ) < 2.5);
    const ordenado = [...grupo].sort((a,b) =>
      (a.obj.type === 'ObjectDeadVictim' ? 0 : 1) -
      (b.obj.type === 'ObjectDeadVictim' ? 0 : 1));
    for (let i=0; i<ordenado.length; i++) {
      const item = ordenado[i];
      const piso = BASE_CM + item.tile.y * NIVEL_CM;
      const raio = 0.9;
      saida.set(item, {
        x:sobrepostos ? centroX+(i-(grupo.length-1)/2)*5.2 : item.pos.x,
        z:sobrepostos ? centroZ : item.pos.z,
        y:piso+raio
      });
    }
  }
  return saida;
}

export function desenharArteTile(ctx, tile) {
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-5, -5, 10, 10);
  // Os triângulos compartilham o mesmo canto físico em 2D e 3D.
  // Não girá-los com o desenho da imagem: a sala possui orientação própria.
  for (const obj of tile.objects || []) {
    if (obj.type !== 'ObjectEvacuationPoint') continue;
    poligono(ctx, verticesEvacuacao(tile, obj), resolverCor(obj.color));
  }

  ctx.rotate(rotacaoTile(tile));
  const tipo = tipoImagem(tile);
  ctx.strokeStyle = LINHA;
  ctx.lineWidth = LARGURA_LINHA_TILE;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const desenhar = fn => { ctx.beginPath(); fn(); ctx.stroke(); };
  switch (tipo) {
    case 'straight-line':
    case 'start-line':
    case 'half-straight-line':
      desenhar(() => {
        ctx.moveTo(0, -5);
        ctx.lineTo(0, tipo === 'half-straight-line' ? 0 : 5);
      });
      break;
    case '90-curve':
      // Entradas: bordas superior e direita; a rotação conecta os vizinhos.
      desenhar(() => { ctx.arc(5, -5, 5, PI, PI / 2, true); });
      break;
    case 'simple-curve':
      // Quarto de circunferência exato, como o outro canto da arena.
      // Entradas: esquerda (-5,0) e inferior (0,+5).
      desenhar(() => { ctx.arc(-5, 5, 5, -PI / 2, 0); });
      break;
    case 'long-circular-curve':
    case 'long-curve':
      // Alça arredondada junto à chegada, sem o "círculo fechado"
      // com emenda aguda da implementação anterior. As tangentes são
      // contínuas: vertical na entrada, horizontal no fundo da alça
      // e horizontal na saída para o ladrilho à direita.
      // Curva vetorial independente, desenhada também para o sensor.
      desenhar(() => {
        ctx.moveTo(0,-5);
        ctx.lineTo(0,-1.5);
        ctx.bezierCurveTo(0,1.7, 1,3.2, 2.5,3.2);
        ctx.bezierCurveTo(4.2,3.2, 4.3,0, 5,0);
      });
      break;
    case 'multi-zig-zag':
      // Escada com três degraus uniformes. A última diagonal volta ao
      // centro da borda para encontrar a reta do ladrilho vizinho.
      // Coordenadas locais (-5..5): a rotação da imagem é aplicada acima.
      desenhar(() => {
        ctx.moveTo(0, -5);
        for (const [x, z] of [
          [0, -4.5], [-0.9, -4.5], [-0.9, -2.3],
          [-1.8, -2.3], [-1.8, -0.1],
          [-2.7, -0.1], [-2.7, 2.1], [0, 5]
        ]) ctx.lineTo(x, z);
      });
      break;
    case 'intersection':
    case 'gap-intersection':
      desenhar(() => {
        ctx.moveTo(0, -5); ctx.lineTo(0, 5);
        ctx.moveTo(-5, 0); ctx.lineTo(5, 0);
      });
      if (tipo === 'gap-intersection') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-1.1, -1.1, 2.2, 2.2);
      }
      break;
    case 't-intersection':
      desenhar(() => {
        ctx.moveTo(-5, 0); ctx.lineTo(5, 0);
        ctx.moveTo(0, 0); ctx.lineTo(0, 5);
      });
      break;
    case 'gap':
      desenhar(() => {
        ctx.moveTo(0, -5); ctx.lineTo(0, -1.4);
        ctx.moveTo(0, 1.4); ctx.lineTo(0, 5);
      });
      break;
    case 'duo-simple-curve':
      desenhar(() => {
        ctx.moveTo(0, -5); ctx.bezierCurveTo(4, -2, 4, 2, 0, 5);
        ctx.moveTo(-5, 0); ctx.bezierCurveTo(-3, -3, -1, -4, 0, -5);
      });
      break;
    case 'smooth-step-curve':
      desenhar(() => {
        ctx.moveTo(0, -5); ctx.bezierCurveTo(4, -1, -4, 1, 0, 5);
      });
      break;
    default:
      break; // Sem inventar linha quando o ladrilho não contém imagem.
  }
  if (tipo === 'start-line') {
    ctx.fillStyle = '#f52236';
    ctx.fillRect(-4.7, -0.36, 9.4, 0.72);
  }
  ctx.restore();
}

function criarCanvas(w,h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w,h);
  if (typeof document !== 'undefined') {
    const c=document.createElement('canvas');c.width=w;c.height=h;return c;
  }
  return null;
}
export function gerarTapeteSArena(cenario, pxPorCm=8) {
  const W=Math.round(cenario.w*pxPorCm),H=Math.round(cenario.h*pxPorCm);
  const canvas=criarCanvas(W,H);
  if (!canvas) {
    const dados=new Uint8ClampedArray(W*H*4);
    dados.fill(255);
    return {id:cenario.id,canvas:null,W,H,k:pxPorCm,dados};
  }
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  ctx.save();ctx.scale(pxPorCm,pxPorCm);cenario.desenhar(ctx,cenario);ctx.restore();
  const dados=ctx.getImageData(0,0,W,H).data;
  return {id:cenario.id,canvas,W,H,k:pxPorCm,dados};
}
function desenharMapa(ctx, tiles, origemX, origemZ, w, h) {
  ctx.fillStyle='#528fa0';ctx.fillRect(0,0,w,h);
  // 2D mostra o andar mais alto por cima, nunca uma plataforma branca contínua.
  for (const t of [...tiles].sort((a,b)=>a.y-b.y)) {
    ctx.save();
    ctx.translate((t.x-origemX+0.5)*TILE_CM,(t.z-origemZ+0.5)*TILE_CM);
    ctx.scale(ESCALA_OBJ,ESCALA_OBJ);
    desenharArteTile(ctx,t);
    ctx.restore();
  }
}
function alturaEmTiles(tiles, x, z, origemX, origemZ) {
  const tx=Math.floor(x/TILE_CM)+origemX;
  const tz=Math.floor(z/TILE_CM)+origemZ;
  const candidato=tiles.filter(t=>t.x===tx && t.z===tz).sort((a,b)=>b.y-a.y)[0];
  if (!candidato) return 0;
  if (!candidato.properties?.is_ramp) return BASE_CM + candidato.y*NIVEL_CM;
  const vizinhos=[
    [0,1,'+z'],[0,-1,'-z'],[1,0,'+x'],[-1,0,'-x'],
  ];
  const alto=vizinhos.find(([dx,dz])=>tiles.some(t=>
    t.x===tx+dx && t.z===tz+dz && t.y===(candidato.y+1)));
  if (!alto) return BASE_CM + candidato.y*NIVEL_CM;
  const u=(x/TILE_CM)-Math.floor(x/TILE_CM);
  const v=(z/TILE_CM)-Math.floor(z/TILE_CM);
  const fator=alto[2]==='+z'?v:alto[2]==='-z'?1-v:alto[2]==='+x'?u:1-u;
  return BASE_CM + (candidato.y+fator)*NIVEL_CM;
}
function detectarInicio(tiles, origemX, origemZ) {
  const tile = tiles.find(t => tipoImagem(t) === 'start-line') ||
    tiles.find(t => t.properties?.has_checkpoint) ||
    tiles.find(t => t.y === 0) || tiles[0];

  // O robô deve apontar para o próximo ladrilho da linha. O código anterior
  // usava th=0 (leste) mesmo quando a faixa de partida era norte/sul:
  // o sensor 5,5 cm à frente nascia fora da linha.
  const direcoes = [
    [0, -1, -PI / 2], [0, 1, PI / 2],
    [1, 0, 0], [-1, 0, PI]
  ];
  const proximo = direcoes.find(([dx, dz]) =>
    tiles.some(t => t.x === tile.x + dx &&
      t.z === tile.z + dz && !!tipoImagem(t) &&
      Math.abs(t.y - tile.y) <= 1));
  const rot = rotacaoTile(tile);
  const th = proximo ? proximo[2] : (rot - PI / 2);
  return {
    x: (tile.x - origemX + 0.5) * TILE_CM,
    y: (tile.z - origemZ + 0.5) * TILE_CM,
    th
  };
}
export function parseSArena(json) {
  if (!json || !Array.isArray(json.tiles)) {
    throw new Error('sArenaParser: o arquivo não contém a lista "tiles".');
  }
  // Os primeiros elementos podem ser metadados ({rotation:1}, {y:1}).
  const tiles=json.tiles.filter(tileValido);
  if (!tiles.length) throw new Error('sArenaParser: nenhum tile com x, y e z válidos.');
  prepararSalasDeResgate(tiles);
  const minX=Math.min(...tiles.map(t=>t.x)),maxX=Math.max(...tiles.map(t=>t.x));
  const minZ=Math.min(...tiles.map(t=>t.z)),maxZ=Math.max(...tiles.map(t=>t.z));
  const w=(maxX-minX+1)*TILE_CM,h=(maxZ-minZ+1)*TILE_CM;
  const inicio=detectarInicio(tiles,minX,minZ);
  const cenario={
    id:'sarena',
    nome:json.settings?.name || 'Arena sBotics',
    w,h,pxPorCm:8,baseAltura:BASE_CM,
    inicioPadrao:'padrao',
    inicios:{padrao:{rotulo:'início da arena',...inicio}},
    caixas:[],rampas:[],
    tilesOriginais:tiles,origemTiles:{x:minX,z:minZ},
    alturaEm(x,z) {return alturaEmTiles(tiles,x,z,minX,minZ);},
    // A pista não ocupa todo o retângulo: não permitir dirigir no vazio.
    solidoEm(x,z) {
      const tx=Math.floor(x/TILE_CM)+minX;
      const tz=Math.floor(z/TILE_CM)+minZ;
      return tiles.some(t=>t.x===tx&&t.z===tz);
    },
    // O simulador é 2D, mas não deve atravessar a lateral de um platô.
    podeTransitar(x0,z0,x1,z1) {
      if (!this.solidoEm(x1,z1)) return false;
      return Math.abs(this.alturaEm(x1,z1) - this.alturaEm(x0,z0)) <= 1.5;
    },
    terreno(x,z,th) {
      const h=this.alturaEm(x,z);
      const tx=Math.floor(x/TILE_CM)+minX;
      const tz=Math.floor(z/TILE_CM)+minZ;
      const atual=tiles.find(t=>t.x===tx&&t.z===tz&&t.properties?.is_ramp);
      if (!atual) return {z:h,pitch:0,roll:0};
      const vizinhos=[[0,1],[0,-1],[1,0],[-1,0]];
      const subida=vizinhos.find(([dx,dz])=>tiles.some(t=>
        t.x===tx+dx && t.z===tz+dz && t.y===atual.y+1));
      if (!subida) return {z:h,pitch:0,roll:0};
      const [dx,dz]=subida;
      const frente=dx*Math.cos(th)+dz*Math.sin(th);
      const lateral=dx*Math.sin(th)-dz*Math.cos(th);
      const inclinacao=NIVEL_CM/TILE_CM;
      return {z:h,pitch:Math.atan(frente*inclinacao),
        roll:Math.atan(lateral*inclinacao)};
    },
    desenhar(ctx,c){desenharMapa(ctx,tiles,minX,minZ,c.w,c.h);},
  };
  const tapete=gerarTapeteSArena(cenario,cenario.pxPorCm);
  const objetosSBotics=[];
  const caixas=[];
  for (const tile of tiles) for (const obj of tile.objects||[]) {
    const pos=posicaoGlobal(tile,obj,minX,minZ);
    const escala=escalaObjeto(obj),cor=resolverCor(obj.color);
    objetosSBotics.push({tile,obj,pos,escala,cor});
    if (obj.type === 'ObjectCuboid' || obj.type === 'ObjectBox') {
      // A colisão da IDE usa retângulos alinhados aos eixos.
      // Converter a caixa girada em AABB dá compatibilidade ao ultrassônico.
      const cos=Math.abs(Math.cos(pos.rotY)),sin=Math.abs(Math.sin(pos.rotY));
      const ww=Math.max(0.1,cos*escala.sx+sin*escala.sz);
      const hh=Math.max(0.1,sin*escala.sx+cos*escala.sz);
      caixas.push({
        nome:obj.name || obj.type, x:pos.x-ww/2, y:pos.z-hh/2,
        w:ww,h:hh,altura:escala.sy,cor,
        // Metadados usados somente pelo motor de colisão da sArena.
        // Objetos do piso de cima não devem virar paredes invisíveis embaixo.
        pisoCm: BASE_CM + (tile.y ?? 0) * NIVEL_CM,
        topoCm: pos.y + escala.sy / 2,
        baseCm: pos.y - escala.sy / 2,
      });
    }
  }
  cenario.caixas = caixas;
  cenario.objetosSBotics = objetosSBotics;
  return {cenario,tapete,objetosSBotics,tiles};
}
