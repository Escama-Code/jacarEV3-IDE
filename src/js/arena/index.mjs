// src/js/arena/index.mjs — carregamento de arquivos .sArena no jacarEV3.
export {
  parseSArena, TILE_CM, NIVEL_CM, BASE_CM, resolverCor, posicaoGlobal, tipoImagem,
  desenharArteTile, gerarTapeteSArena
} from './sArenaParser.mjs';
export { montarObjetos3d, construirGrupoSArena } from './sArenaBuilder3d.mjs';

/** Aceita File/Blob, JSON em texto ou objeto já convertido. */
export async function carregarSArena(fonte) {
  const {parseSArena}=await import('./sArenaParser.mjs');
  const {montarObjetos3d}=await import('./sArenaBuilder3d.mjs');

  let json;
  if (typeof Blob !== 'undefined' && fonte instanceof Blob) {
    json=JSON.parse(await fonte.text());
  } else if(typeof fonte==='string') {
    json=JSON.parse(fonte);
  } else {
    json=fonte;
  }
  const {cenario,tapete,objetosSBotics,tiles}=parseSArena(json);
  return {
    cenario,tapete,objetosSBotics,tiles,
    montarObjetos3d:(scene)=>montarObjetos3d(scene,objetosSBotics,tiles,cenario),
  };
}
