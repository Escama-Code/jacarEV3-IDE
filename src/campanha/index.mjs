export { carregarSave, gravarSave, resetSave } from './save.mjs';
export { avaliar, aplicarResultado, detectarApis, statusMissao, carregarSave as loadSave } from './motor.mjs';

/** Catálogo embutido (evita fetch/CORS em file:// e simplifica Pages) */
export const CAMPANHA = {
  id: 'pantanal-1',
  titulo: 'Operação Pantanal',
  descricao: 'O jacaré-robô aprende a biblioteca jacarev3 em missões curtas.',
  missoes: null, // preenchido abaixo
};

export const MISSOES = [
  {
    id: 'm01-led',
    titulo: 'LED verde e um passo',
    ordem: 1,
    setup: {
      cenario: 'treino',
      inicio: 'padrao',
      robo3d: 'jacare',
      codigoInicial:
`from jacarev3 import RoboEV3
import time

with RoboEV3('00:16:53:64:F8:B8') as robo:
    robo.led('VERDE')
    robo.mover_continuo('B', 30)
    robo.mover_continuo('C', 30)
    time.sleep(1.0)
    robo.parar_motor('B')
    robo.parar_motor('C')
`,
    },
    limites: { tempoSimMaxS: 20 },
    objetivos: [
      { id: 'usou-led', tipo: 'api_usada', obrigatorio: true, metodos: ['led'] },
      { id: 'andou', tipo: 'dist_min', obrigatorio: true, cm: 12 },
    ],
    avaliacao: {
      estrelas: [
        { estrelas: 1, quando: 'vitoria' },
        { estrelas: 2, quando: 'tempoSim', maxS: 8 },
        { estrelas: 3, quando: 'tempoSim', maxS: 4 },
      ],
    },
    recompensas: { xp: 50, desbloqueia: ['m02-linha'] },
    narrativa: {
      intro: [
        { personagem: 'Jacaré', texto: 'Primeiro teste: mostre que estou ligado (LED verde) e ande um pouco para a frente.' },
      ],
      sucesso: [{ personagem: 'Jacaré', texto: 'Boa! Sistemas no ar. Próxima: a linha preta.' }],
      fracasso: [{ personagem: 'Jacaré', texto: 'Faltou LED ou ainda não andei o suficiente. Tente de novo.' }],
    },
  },
  {
    id: 'm02-linha',
    titulo: 'Seguir a linha até a marca',
    ordem: 2,
    setup: {
      cenario: 'treino',
      inicio: 'padrao',
      robo3d: 'jacare',
      codigoInicial:
`from jacarev3 import RoboEV3, protocolo as p

with RoboEV3('00:16:53:64:F8:B8') as robo:
    robo.led('VERDE')
    while True:
        luz = robo.ler_sensor(3, p.MODO_COR_REFLETIDA)
        if luz < 30:
            robo.mover_continuo('B', 10)
            robo.mover_continuo('C', 35)
        else:
            robo.mover_continuo('B', 35)
            robo.mover_continuo('C', 10)
`,
    },
    limites: { tempoSimMaxS: 40 },
    objetivos: [
      { id: 'sensor', tipo: 'api_usada', obrigatorio: true, metodos: ['ler_sensor'] },
      { id: 'zona', tipo: 'regiao', obrigatorio: true, regiao: { x: 70, y: 25, w: 45, h: 40 } },
    ],
    avaliacao: {
      estrelas: [
        { estrelas: 1, quando: 'vitoria' },
        { estrelas: 2, quando: 'tempoSim', maxS: 30 },
        { estrelas: 3, quando: 'tempoSim', maxS: 20 },
      ],
    },
    recompensas: { xp: 100, desbloqueia: ['m03-teleop'] },
    narrativa: {
      intro: [
        { personagem: 'Jacaré', texto: 'A trilha preta leva à ponte. Use o sensor de cor e chegue à região leste da pista.' },
      ],
      sucesso: [{ personagem: 'Jacaré', texto: 'Cheguei na marca! Agora o controle manual.' }],
      fracasso: [{ personagem: 'Jacaré', texto: 'Não alcancei a zona a tempo. Ajuste o seguidor de linha.' }],
    },
  },
  {
    id: 'm03-teleop',
    titulo: 'Teleop: atravessar a pista',
    ordem: 3,
    setup: {
      cenario: 'treino',
      inicio: 'padrao',
      robo3d: 'jacare',
      codigoInicial:
`"""Dirija até a região leste (WASD ou gamepad).

Rode o script: o teleop inicia sozinho.
"""
from js import gamepadPonte

print('Teleop 40s — chegue na marca a leste!')
await gamepadPonte.teleop(40, 45)
`,
    },
    limites: { tempoSimMaxS: 40 },
    objetivos: [
      { id: 'teleop', tipo: 'api_usada', obrigatorio: true, metodos: ['teleop'] },
      { id: 'zona', tipo: 'regiao', obrigatorio: true, regiao: { x: 75, y: 20, w: 40, h: 50 } },
    ],
    avaliacao: {
      estrelas: [
        { estrelas: 1, quando: 'vitoria' },
        { estrelas: 2, quando: 'tempoSim', maxS: 25 },
        { estrelas: 3, quando: 'tempoSim', maxS: 15 },
      ],
    },
    recompensas: { xp: 120, desbloqueia: [] },
    narrativa: {
      intro: [
        { personagem: 'Jacaré', texto: 'Sua vez no controle! Use WASD ou o gamepad e me leve até a marca leste.' },
      ],
      sucesso: [{ personagem: 'Jacaré', texto: 'Missão cumprida. Operação Pantanal — fase 1 concluída!' }],
      fracasso: [{ personagem: 'Jacaré', texto: 'Não cheguei na zona. Tente de novo com o teleop.' }],
    },
  },
];

CAMPANHA.missoes = MISSOES;

export function getMissao(id) {
  return MISSOES.find((m) => m.id === id) || null;
}
