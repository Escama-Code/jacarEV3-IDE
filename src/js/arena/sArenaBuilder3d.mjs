// sArenaBuilder3d.mjs — pisos por tile, rampas, suportes e objetos Three.js.
// Substitui a arena plana por plataformas fiéis aos níveis do .sArena.
import * as THREE from 'three';
import { TILE_CM, NIVEL_CM, BASE_CM, desenharArteTile, resolverCor, verticesEvacuacao, posicoesVitimasNoPiso } from './sArenaParser.mjs';

const material = (hex, extra={}) =>
  new THREE.MeshStandardMaterial({color:hex,roughness:.85,...extra});
const sombrear = (m) => {
  m.castShadow=true;m.receiveShadow=true;return m;
};
const cubo = (x,y,z,cor) => sombrear(new THREE.Mesh(
  new THREE.BoxGeometry(x,y,z),typeof cor==='string'?material(cor):cor
));
function descartarGrupo(grupo) {
  if (!grupo) return;
  grupo.parent?.remove(grupo);
  grupo.traverse(o=>{
    o.geometry?.dispose();
    const mats=o.material ? (Array.isArray(o.material)?o.material:[o.material]) : [];
    for (const m of mats) {m.map?.dispose();m.dispose();}
  });
}
function criarCanvasLado(n=256) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(n,n);
  if (typeof document !== 'undefined') {
    const c=document.createElement('canvas');c.width=c.height=n;return c;
  }
  return null;
}
function texturaTile(tile) {
  const canvas=criarCanvasLado(512);
  if (!canvas) return null;
  const ctx=canvas.getContext('2d');
  ctx.setTransform(canvas.width/10,0,0,canvas.height/10,
    canvas.width/2,canvas.height/2);
  desenharArteTile(ctx,tile);
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.anisotropy=16;
  // O desenho da arena é usado pelos sensores de cor: não deixá-lo
  // acinzentado por luz/sombra ou mapeamento de tons do renderizador.
  texture.minFilter=THREE.LinearMipmapLinearFilter;
  texture.magFilter=THREE.LinearFilter;
  return texture;
}
function materialPiso(tile) {
  const textura=texturaTile(tile);
  return new THREE.MeshBasicMaterial({
    color:0xffffff,
    map:textura,
    side:THREE.DoubleSide,
    toneMapped:false,
  });
}
function dirRampa(tile, tiles) {
  if (!tile.properties?.is_ramp) return null;
  const dirs=[[0,1],[0,-1],[1,0],[-1,0]];
  return dirs.find(([dx,dz])=>tiles.some(t=>
    t.x===tile.x+dx && t.z===tile.z+dz && t.y===tile.y+1)) || null;
}
const ESPESSURA_PISO = 0.65;
const COR_ESTRUTURA = '#c56433';
// A altura e a espessura das paredes são lidas de obj.scale no .sArena.
// Não aplicar altura mínima arbitrária: o arquivo já traz a medida correta.

/** Desenha o canto colorido e sua pequena borda elevada no próprio tile. */
function areaEvacuacao3d(tile) {
  const grupo = new THREE.Group();
  grupo.name = 'areas-evacuacao';
  for (const obj of tile.objects || []) {
    if (obj.type !== 'ObjectEvacuationPoint') continue;
    const cor = resolverCor(obj.color);
    const [pa,pb,pc] = verticesEvacuacao(tile, obj);
    const a = new THREE.Vector3(pa[0]*TILE_CM/10, .035, pa[1]*TILE_CM/10);
    const b = new THREE.Vector3(pb[0]*TILE_CM/10, .035, pb[1]*TILE_CM/10);
    const c = new THREE.Vector3(pc[0]*TILE_CM/10, .035, pc[1]*TILE_CM/10);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([
      ...a.toArray(), ...b.toArray(), ...c.toArray()
    ], 3));
    geo.computeVertexNormals();
    const area = new THREE.Mesh(geo,
      new THREE.MeshBasicMaterial({ color:cor, side:THREE.DoubleSide, toneMapped:false })
    );
    area.name = 'triangulo-evacuacao';
    grupo.add(area);

    // A borda colorida acompanha a diagonal, sem bloquear a parede.
    const meio = b.clone().add(c).multiplyScalar(.5);
    const d = c.clone().sub(b);
    const faixa = cubo(d.length(), .85, .55, cor);
    faixa.position.set(meio.x, .43, meio.z);
    faixa.rotation.y = -Math.atan2(d.z, d.x);
    faixa.name = 'borda-evacuacao';
    grupo.add(faixa);
  }
  return grupo;
}

/** Desnível em cada canto local, consistente com cenario.alturaEm(). */
function alturasRampa(dir) {
  if (!dir) return [0, 0, 0, 0];
  const [dx, dz] = dir;
  return [
    (dx === -1 || dz === -1) ? NIVEL_CM : 0, // -X,-Z
    (dx ===  1 || dz === -1) ? NIVEL_CM : 0, // +X,-Z
    (dx === -1 || dz ===  1) ? NIVEL_CM : 0, // -X,+Z
    (dx ===  1 || dz ===  1) ? NIVEL_CM : 0, // +X,+Z
  ];
}

/**
 * Rampa como placa de espessura uniforme, fechada nas quatro laterais.
 * O topo fica exatamente na função alturaEm, sem triângulos abertos nem
 * faces viradas para baixo que possam desaparecer por backface culling.
 */
function malhaRampa(tile, dir) {
  const q = TILE_CM / 2;
  const [a, b, c, d] = alturasRampa(dir);
  const vertices = [
    [-q, a, -q], [+q, b, -q],
    [-q, c, +q], [+q, d, +q],
  ];
  const topo = new THREE.BufferGeometry();
  const faces = [0, 2, 1, 1, 2, 3]; // normal para cima
  const pos = [], uv = [];
  const uvCantos = [[0, 1], [1, 1], [0, 0], [1, 0]];
  for (const k of faces) {
    pos.push(...vertices[k]);
    uv.push(...uvCantos[k]);
  }
  topo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  topo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  topo.computeVertexNormals();

  const grupo = new THREE.Group();
  const superficie = sombrear(new THREE.Mesh(topo, materialPiso(tile)));
  superficie.name = 'piso-inclinado';
  grupo.add(superficie);

  const sideVerts = [];
  const tri = (u, v, w) => sideVerts.push(...u, ...v, ...w);
  // O fechamento conecta cada borda do topo com sua cópia mais baixa.
  for (const [i, j] of [[0, 1], [1, 3], [3, 2], [2, 0]]) {
    const t0 = vertices[i], t1 = vertices[j];
    const b0 = [t0[0], t0[1] - ESPESSURA_PISO, t0[2]];
    const b1 = [t1[0], t1[1] - ESPESSURA_PISO, t1[2]];
    tri(t0, b0, t1);
    tri(t1, b0, b1);
  }
  tri(...[0,1,2].map(k => [
    vertices[k][0], vertices[k][1] - ESPESSURA_PISO, vertices[k][2]
  ]));
  tri(...[1,3,2].map(k => [
    vertices[k][0], vertices[k][1] - ESPESSURA_PISO, vertices[k][2]
  ]));
  const lados = new THREE.BufferGeometry();
  lados.setAttribute('position', new THREE.Float32BufferAttribute(sideVerts, 3));
  lados.computeVertexNormals();
  const m = sombrear(new THREE.Mesh(lados, material('#f3f3f3', {
    side: THREE.DoubleSide,
  })));
  m.name = 'laterais-rampa';
  grupo.add(m);
  return grupo;
}

function construirPisoTile(tile, tiles, minX, minZ) {
  const baseY = BASE_CM + tile.y * NIVEL_CM;
  const cx = (tile.x - minX + .5) * TILE_CM;
  const cz = (tile.z - minZ + .5) * TILE_CM;
  const g = new THREE.Group();
  g.name = `sArenaTile_${tile.x}_${tile.y}_${tile.z}`;
  g.userData = { tipo: 'tile', tile: { x: tile.x, y: tile.y, z: tile.z } };
  g.position.set(cx, baseY, cz);
  const dir = dirRampa(tile, tiles);
  if (dir) {
    g.add(malhaRampa(tile, dir));
  } else {
    // O topo é um volume fechado. Posição y=0 é sempre o plano de rodagem.
    const estrutura = cubo(TILE_CM, ESPESSURA_PISO, TILE_CM, '#f3f3f3');
    estrutura.position.y = -ESPESSURA_PISO / 2;
    estrutura.name = 'estrutura-piso';
    g.add(estrutura);
    const superficie = sombrear(new THREE.Mesh(
      new THREE.PlaneGeometry(TILE_CM, TILE_CM).rotateX(-Math.PI / 2),
      materialPiso(tile)
    ));
    superficie.position.y = .012;
    superficie.name = 'superficie-piso';
    g.add(superficie);
  }

  if (tile.objects?.some(o => o.type === 'ObjectEvacuationPoint')) {
    g.add(areaEvacuacao3d(tile));
  }

  // No sBotics, TODOS os pisos têm pés de apoio, inclusive os do nível 0.
  // Cada pé acaba na base inferior da placa correspondente, até nas rampas.
  const alturas = alturasRampa(dir);
  const cantos = [[-1, -1, 0], [1, -1, 1], [-1, 1, 2], [1, 1, 3]];
  for (const [sx, sz, index] of cantos) {
    const altura = baseY + alturas[index] - ESPESSURA_PISO;
    if (altura <= .1) continue;
    const coluna = cubo(.32, altura, .32, COR_ESTRUTURA);
    coluna.name = 'suporte';
    coluna.position.set(
      sx * (TILE_CM / 2 - .4),
      altura / 2 - baseY,
      sz * (TILE_CM / 2 - .4)
    );
    g.add(coluna);
  }
  return g;
}
function construirObjeto(obj,esc,cor) {
  const g=new THREE.Group();
  const sx=esc.sx, sz=esc.sz;
  const sy=esc.sy;
  switch(obj.type) {
    case 'ObjectCuboid':
    case 'ObjectBox': {
      const corpo=cubo(sx,sy,sz,cor);
      g.add(corpo);
      if (obj.type==='ObjectBox') {
        const faixa=material('#222222');
        const r=Math.min(sx,sz)*.07;
        for(const x of [-1,1])for(const z of [-1,1]){
          const canto=cubo(r,sy+.04,r,faixa);
          canto.position.set(x*sx/2,0,z*sz/2);
          g.add(canto);
        }
      }
      return g;
    }
    case 'ObjectCylinder': {
      const r=(sx+sz)/4;
      g.add(sombrear(new THREE.Mesh(
        new THREE.CylinderGeometry(r,r,sy,20),material(cor)
      )));
      return g;
    }
    case 'ObjectPlane': {
      // No sBotics ObjectPlane nasce no plano XY e rotation.x=90º
      // o coloca no chão. Portanto não aplicar a rotação X de novo.
      const horizontal=Math.abs((obj.rotation?.x||0)%180)>45;
      const plane=new THREE.Mesh(
        new THREE.PlaneGeometry(sx,sy),
        material(cor,{side:THREE.DoubleSide,depthWrite:true})
      );
      if(horizontal) plane.rotation.x=-Math.PI/2;
      g.add(plane);
      return g;
    }
    case 'ObjectSeesaw': {
      const pivo=cubo(8,.85,.8,'#99602e');
      pivo.position.y=.43;g.add(pivo);
      const tabua=cubo(9,.35,10,cor);
      tabua.position.y=1.05;tabua.rotation.x=.08;g.add(tabua);
      return g;
    }
    case 'ObjectEvacuationPoint':
      // Construído sobre o tile por areaEvacuacao3d(), com rotação e
      // tamanho corretos. Não desenhar o marcador pequeno duplicado.
      return null;
    case 'ObjectLiveVictim': {
      const corpo=sombrear(new THREE.Mesh(
        new THREE.SphereGeometry(.9,14,12),
        material('#ffffff')
      ));
      g.add(corpo);
      const anel=new THREE.Mesh(
        new THREE.TorusGeometry(1.02,.10,8,24),
        material('#16b34a')
      );
      anel.rotation.x=Math.PI/2;
      g.add(anel);
      return g;
    }
    case 'ObjectDeadVictim': {
      g.add(sombrear(new THREE.Mesh(
        new THREE.SphereGeometry(.9,14,12),
        material('#2c2c2c')
      )));
      return g;
    }
    default:
      console.warn('[sArena] tipo de objeto não suportado:',obj.type);
      return null;
  }
}

/**
 * Constrói a arena sBotics como parte normal da arena 3D.
 * O chamador (cena3d.mjs) gerencia a substituição/remoção do grupo,
 * assim não é necessário procurar ou ocultar meshes pela geometria.
 */
export function construirGrupoSArena(cenario) {
  const tiles = cenario.tilesOriginais || [];
  const objetos = cenario.objetosSBotics || [];
  if (!tiles.length) throw new Error('sArena: cenário sem tiles');

  const origemX = cenario.origemTiles?.x ?? Math.min(...tiles.map(t => t.x));
  const origemZ = cenario.origemTiles?.z ?? Math.min(...tiles.map(t => t.z));
  const grupo = new THREE.Group();
  grupo.name = 'arena';
  grupo.userData.formato = 'sArena';

  // Chão teal independente dos pisos: recebe sombras dos suportes e mantém
  // visível o espaço vazio entre placas, como no ambiente original.
  const solo = new THREE.Mesh(
    new THREE.PlaneGeometry(cenario.w + 150, cenario.h + 150).rotateX(-Math.PI / 2),
    material('#528fa0', { side: THREE.DoubleSide })
  );
  solo.name = 'solo-sbotics';
  solo.position.set(cenario.w / 2, -.15, cenario.h / 2);
  solo.receiveShadow = true;
  grupo.add(solo);

  for (const tile of tiles) {
    grupo.add(construirPisoTile(tile, tiles, origemX, origemZ));
  }

  const posicoesVitimas = posicoesVitimasNoPiso(objetos);
  for (const item of objetos) {
    const { obj, pos, escala: esc, cor } = item;
    const m = construirObjeto(obj, esc, cor);
    if (!m) continue;
    m.name = obj.name || obj.type;

    let y = pos.y;
    // "ObjectBox" tem sua origem na face inferior no arquivo sBotics.
    if (obj.type === 'ObjectBox' || obj.type === 'ObjectCylinder') {
      if (Math.abs(obj.position?.y ?? 0) < 0.001) y += esc.sy / 2;
    }
    const piso = BASE_CM + (item.tile.y || 0) * NIVEL_CM;
    const posVitima = posicoesVitimas.get(item);
    if (posVitima) y = posVitima.y;
    if (obj.type === 'ObjectPlane') y = piso + .065;
    if (obj.type === 'ObjectEvacuationPoint') y = piso + .06;
    if (obj.type === 'ObjectSeesaw') y = piso;

    m.position.set(posVitima?.x ?? pos.x, y, posVitima?.z ?? pos.z);
    m.rotation.y = pos.rotY;
    if (obj.type !== 'ObjectPlane') m.rotation.x = (obj.rotation?.x || 0) * Math.PI / 180;
    m.rotation.z = (obj.rotation?.z || 0) * Math.PI / 180;
    grupo.add(m);
  }
  return grupo;
}

/** API mantida para ferramentas que montam objetos diretamente em uma Scene. */
export function montarObjetos3d(scene, objetosSBotics = [], tiles = [], cenario = null) {
  if (!scene) throw new Error('montarObjetos3d: THREE.Scene não informada');
  const anterior = scene.getObjectByName('sArenaObjetos');
  if (anterior) descartarGrupo(anterior);
  if (cenario?.tilesOriginais) {
    const grupo = construirGrupoSArena(cenario);
    grupo.name = 'sArenaObjetos';
    scene.add(grupo);
    return grupo;
  }

  // Compatibilidade com a assinatura antiga: apenas objetos, sem tiles.
  const grupo = new THREE.Group();
  grupo.name = 'sArenaObjetos';
  for (const { obj, pos, escala, cor } of objetosSBotics) {
    const m = construirObjeto(obj, escala, cor);
    if (!m) continue;
    m.name = obj.name || obj.type;
    m.position.set(pos.x, pos.y, pos.z);
    m.rotation.y = pos.rotY;
    grupo.add(m);
  }
  scene.add(grupo);
  return grupo;
}
