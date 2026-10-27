export { carregarSave, gravarSave, resetSave } from './save.mjs';
export { avaliar, aplicarResultado, detectarApis, statusMissao, temaCompleto, temaLiberado, similaridadeCodigo, carregarSave as loadSave } from './motor.mjs';

/** Campanha educacional — 2 temas */
export const CAMPANHA = {
  id: 'jacarev3-fundamentos',
  titulo: 'Academia jacarev3',
  descricao: 'Aprenda a biblioteca e as regras da pista em missões guiadas.',
  temas: [
    {
      id: 'codigos-base',
      titulo: '1 · Códigos-base',
      descricao: 'LED, motores, sensores e o padrão with RoboEV3.',
      cor: '#3b82f6',
    },
    {
      id: 'leis-transito',
      titulo: '2 · Leis de trânsito',
      descricao: 'Parar, sinalizar, respeitar zonas e completar o percurso com segurança.',
      cor: '#e3b341',
    },
  ],
};

/**
 * Missões embutidas (ordem global).
 * temaId liga à seção na UI.
 */
export const MISSOES = [
  // ========== TEMA 1: CÓDIGOS-BASE ==========
  {
    id: 'cb01-led',
    temaId: 'codigos-base',
    titulo: 'Ligar o LED',
    ordem: 1,
    setup: {
      cenario: 'treino',
      inicio: 'padrao',
      robo3d: 'jacare',
      codigoInicial:
`from jacarev3 import RoboEV3
import time

# Missão: deixe o LED verde por um instante.
with RoboEV3('00:16:53:64:F8:B8') as robo:
    # TODO: robo.led('VERDE')
    time.sleep(0.5)
`,
    },
    codigoReferencia:
`from jacarev3 import RoboEV3
import time

with RoboEV3('00:16:53:64:F8:B8') as robo:
    robo.led('VERDE')
    time.sleep(0.5)
`,
    dicas: [
      'Use robo.led(\'VERDE\') dentro do with.',
      'Cores comuns: VERDE, VERMELHO, LARANJA, DESLIGADO.',
      'Solução: robo.led(\'VERDE\') logo após o with.',
    ],
    limites: { tempoSimMaxS: 10 },
    objetivos: [
      { id: 'usou-led', tipo: 'api_usada', obrigatorio: true, metodos: ['led'] },
    ],
    avaliacao: {
      estrelas: [
        { estrelas: 1, quando: 'vitoria' },
        { estrelas: 2, quando: 'tempoSim', maxS: 3 },
        { estrelas: 3, quando: 'tempoSim', maxS: 1.5 },
      ],
    },
    recompensas: { xp: 40, desbloqueia: ['cb02-andar'] },
    narrativa: {
      intro: [
        { personagem: 'Instrutor', texto: 'Todo programa começa mostrando que o robô está vivo. Acenda o LED verde.' },
      ],
      sucesso: [{ personagem: 'Instrutor', texto: 'LED ok. Próximo: movimento.' }],
      fracasso: [{ personagem: 'Instrutor', texto: 'Não detectei chamada a led(). Confira o código.' }],
    },
  },
  {
    id: 'cb02-andar',
    temaId: 'codigos-base',
    titulo: 'Andar e parar',
    ordem: 2,
    setup: {
      cenario: 'treino',
      inicio: 'padrao',
      robo3d: 'jacare',
      codigoInicial:
`from jacarev3 import RoboEV3
import time

# Missão: ande para a frente e pare os motores B e C.
with RoboEV3('00:16:53:64:F8:B8') as robo:
    robo.led('VERDE')
    robo.mover_continuo('B', 35)
    robo.mover_continuo('C', 35)
    time.sleep(1.2)
    # TODO: parar_motor em B e C
`,
    },
    codigoReferencia:
`from jacarev3 import RoboEV3
import time

with RoboEV3('00:16:53:64:F8:B8') as robo:
    robo.led('VERDE')
    robo.mover_continuo('B', 35)
    robo.mover_continuo('C', 35)
    time.sleep(1.2)
    robo.parar_motor('B')
    robo.parar_motor('C')
`,
    dicas: [
      'mover_continuo(porta, velocidade) com velocidade entre -100 e 100.',
      'Depois do time.sleep, use robo.parar_motor(\'B\') e o mesmo para C.',
      'time.sleep avança o tempo do simulador — sem ele o robô quase não anda.',
    ],
    limites: { tempoSimMaxS: 15 },
    objetivos: [
      { id: 'andou', tipo: 'dist_min', obrigatorio: true, cm: 15 },
      { id: 'parou', tipo: 'api_usada', obrigatorio: true, metodos: ['parar_motor'] },
    ],
    avaliacao: {
      estrelas: [
        { estrelas: 1, quando: 'vitoria' },
        { estrelas: 2, quando: 'tempoSim', maxS: 6 },
        { estrelas: 3, quando: 'tempoSim', maxS: 3 },
      ],
    },
    recompensas: { xp: 50, desbloqueia: ['cb03-sensor'] },
    narrativa: {
      intro: [
        { personagem: 'Instrutor', texto: 'Motores B (esquerda) e C (direita). Ande e sempre finalize com parar_motor.' },
      ],
      sucesso: [{ personagem: 'Instrutor', texto: 'Movimento controlado. Hora do sensor.' }],
      fracasso: [{ personagem: 'Instrutor', texto: 'Precisa andar ≥ 15 cm e chamar parar_motor.' }],
    },
  },
  {
    id: 'cb03-sensor',
    temaId: 'codigos-base',
    titulo: 'Ler o sensor de cor',
    ordem: 3,
    setup: {
      cenario: 'treino',
      inicio: 'padrao',
      robo3d: 'jacare',
      codigoInicial:
`from jacarev3 import RoboEV3, protocolo as p
import time

# Missão: leia a luz refletida na porta 3 (pelo menos uma vez).
with RoboEV3('00:16:53:64:F8:B8') as robo:
    robo.led('VERDE')
    # TODO: luz = robo.ler_sensor(3, p.MODO_COR_REFLETIDA)
    # print(luz)
    robo.mover_continuo('B', 25)
    robo.mover_continuo('C', 25)
    time.sleep(0.8)
    robo.parar_motor('B')
    robo.parar_motor('C')
`,
    },
    codigoReferencia:
`from jacarev3 import RoboEV3, protocolo as p
import time

with RoboEV3('00:16:53:64:F8:B8') as robo:
    robo.led('VERDE')
    luz = robo.ler_sensor(3, p.MODO_COR_REFLETIDA)
    print(luz)
    robo.mover_continuo('B', 25)
    robo.mover_continuo('C', 25)
    time.sleep(0.8)
    robo.parar_motor('B')
    robo.parar_motor('C')
`,
    dicas: [
      'porta 3 costuma ser o sensor de cor voltado para o chão.',
      'p.MODO_COR_REFLETIDA devolve um número (0–100 aproximadamente).',
      'Chame ler_sensor antes de andar — o avaliador só exige que a API tenha sido usada.',
    ],
    limites: { tempoSimMaxS: 15 },
    objetivos: [
      { id: 'sensor', tipo: 'api_usada', obrigatorio: true, metodos: ['ler_sensor'] },
      { id: 'andou', tipo: 'dist_min', obrigatorio: true, cm: 8 },
    ],
    avaliacao: {
      estrelas: [
        { estrelas: 1, quando: 'vitoria' },
        { estrelas: 2, quando: 'tempoSim', maxS: 5 },
        { estrelas: 3, quando: 'tempoSim', maxS: 2.5 },
      ],
    },
    recompensas: { xp: 60, desbloqueia: ['cb04-linha'] },
    narrativa: {
      intro: [
        { personagem: 'Instrutor', texto: 'O sensor “enxerga” a linha. Leia MODO_COR_REFLETIDA na porta 3.' },
      ],
      sucesso: [{ personagem: 'Instrutor', texto: 'Leitura ok. Agora junte tudo num seguidor simples.' }],
      fracasso: [{ personagem: 'Instrutor', texto: 'Faltou ler_sensor ou andar um pouco.' }],
    },
  },
  {
    id: 'cb04-linha',
    temaId: 'codigos-base',
    titulo: 'Seguidor de linha (base)',
    ordem: 4,
    setup: {
      cenario: 'treino',
      inicio: 'padrao',
      robo3d: 'jacare',
      codigoInicial:
`from jacarev3 import RoboEV3, protocolo as p

# Missão: use o sensor em loop e chegue à região leste da pista.
with RoboEV3('00:16:53:64:F8:B8') as robo:
    robo.led('VERDE')
    while True:
        luz = robo.ler_sensor(3, p.MODO_COR_REFLETIDA)
        if luz < 30:
            robo.mover_continuo('B', 12)
            robo.mover_continuo('C', 32)
        else:
            robo.mover_continuo('B', 32)
            robo.mover_continuo('C', 12)
`,
    },
    codigoReferencia:
`from jacarev3 import RoboEV3, protocolo as p

with RoboEV3('00:16:53:64:F8:B8') as robo:
    robo.led('VERDE')
    while True:
        luz = robo.ler_sensor(3, p.MODO_COR_REFLETIDA)
        if luz < 30:
            robo.mover_continuo('B', 12)
            robo.mover_continuo('C', 32)
        else:
            robo.mover_continuo('B', 32)
            robo.mover_continuo('C', 12)
`,
    dicas: [
      'Valores baixos ≈ linha preta; altos ≈ fundo claro.',
      'Se curvar para o lado errado, inverta as velocidades de B e C.',
      'O objetivo é chegar na região a leste (x alto) da pista treino.',
    ],
    limites: { tempoSimMaxS: 45 },
    objetivos: [
      { id: 'sensor', tipo: 'api_usada', obrigatorio: true, metodos: ['ler_sensor'] },
      { id: 'zona', tipo: 'regiao', obrigatorio: true, regiao: { x: 70, y: 20, w: 50, h: 50 } },
    ],
    avaliacao: {
      estrelas: [
        { estrelas: 1, quando: 'vitoria' },
        { estrelas: 2, quando: 'tempoSim', maxS: 30 },
        { estrelas: 3, quando: 'tempoSim', maxS: 18 },
      ],
    },
    recompensas: { xp: 80, desbloqueia: ['lt01-sinalizar'] },
    narrativa: {
      intro: [
        { personagem: 'Instrutor', texto: 'Tema códigos-base: feche com um seguidor que alcance a marca leste.' },
      ],
      sucesso: [{ personagem: 'Instrutor', texto: 'Base concluída! Tema 2: leis de trânsito na pista.' }],
      fracasso: [{ personagem: 'Instrutor', texto: 'Ajuste o limiar ou as velocidades até cruzar a região leste.' }],
    },
  },

  // ========== TEMA 2: LEIS DE TRÂNSITO ==========
  {
    id: 'lt01-sinalizar',
    temaId: 'leis-transito',
    titulo: 'Sinalizar antes de sair',
    ordem: 5,
    setup: {
      cenario: 'treino',
      inicio: 'padrao',
      robo3d: 'jacare',
      codigoInicial:
`from jacarev3 import RoboEV3
import time

# Lei: antes de circular, sinalize com LED LARANJA, depois VERDE, e só então ande.
with RoboEV3('00:16:53:64:F8:B8') as robo:
    # TODO: LED LARANJA, sleep, LED VERDE, sleep, depois andar e parar
    pass
`,
    },
    codigoReferencia:
`from jacarev3 import RoboEV3
import time

with RoboEV3('00:16:53:64:F8:B8') as robo:
    robo.led('LARANJA')
    time.sleep(0.3)
    robo.led('VERDE')
    time.sleep(0.2)
    robo.mover_continuo('B', 30)
    robo.mover_continuo('C', 30)
    time.sleep(1.0)
    robo.parar_motor('B')
    robo.parar_motor('C')
`,
    dicas: [
      'Ordem: LARANJA → VERDE → mover_continuo → sleep → parar_motor.',
      'O avaliador verifica se você usou led e andou o suficiente.',
      'robo.led(\'LARANJA\'); time.sleep(0.3); robo.led(\'VERDE\')',
    ],
    limites: { tempoSimMaxS: 15 },
    objetivos: [
      { id: 'sinalizou', tipo: 'api_usada', obrigatorio: true, metodos: ['led'] },
      { id: 'andou', tipo: 'dist_min', obrigatorio: true, cm: 12 },
    ],
    avaliacao: {
      estrelas: [
        { estrelas: 1, quando: 'vitoria' },
        { estrelas: 2, quando: 'tempoSim', maxS: 6 },
        { estrelas: 3, quando: 'tempoSim', maxS: 3 },
      ],
    },
    recompensas: { xp: 50, desbloqueia: ['lt02-pare'] },
    narrativa: {
      intro: [
        { personagem: 'Agente', texto: 'Regra 1: sinalize (LARANJA) e só entre na via com VERDE.' },
      ],
      sucesso: [{ personagem: 'Agente', texto: 'Sinalização correta. Próxima: parada obrigatória.' }],
      fracasso: [{ personagem: 'Agente', texto: 'Use led e circule um trecho curto.' }],
    },
  },
  {
    id: 'lt02-pare',
    temaId: 'leis-transito',
    titulo: 'Parada obrigatória',
    ordem: 6,
    setup: {
      cenario: 'treino',
      inicio: 'padrao',
      robo3d: 'jacare',
      codigoInicial:
`from jacarev3 import RoboEV3
import time

# Lei: avance, pare completamente (parar_motor), espere 1 s, só então continue um pouco.
with RoboEV3('00:16:53:64:F8:B8') as robo:
    robo.led('VERDE')
    robo.mover_continuo('B', 30)
    robo.mover_continuo('C', 30)
    time.sleep(0.7)
    # TODO: parar, sleep(1), LED VERMELHO no "pare", depois VERDE e siga
    robo.parar_motor('B')
    robo.parar_motor('C')
`,
    },
    codigoReferencia:
`from jacarev3 import RoboEV3
import time

with RoboEV3('00:16:53:64:F8:B8') as robo:
    robo.led('VERDE')
    robo.mover_continuo('B', 30)
    robo.mover_continuo('C', 30)
    time.sleep(0.7)
    robo.parar_motor('B')
    robo.parar_motor('C')
    robo.led('VERMELHO')
    time.sleep(1.0)
    robo.led('VERDE')
    robo.mover_continuo('B', 30)
    robo.mover_continuo('C', 30)
    time.sleep(0.7)
    robo.parar_motor('B')
    robo.parar_motor('C')
`,
    dicas: [
      'Após a primeira perna: parar_motor + time.sleep(1) + led VERMELHO.',
      'Depois led VERDE e mais um trecho com mover_continuo.',
      'A distância total ainda precisa ser ≥ 18 cm.',
    ],
    limites: { tempoSimMaxS: 20 },
    objetivos: [
      { id: 'parou', tipo: 'api_usada', obrigatorio: true, metodos: ['parar_motor'] },
      { id: 'led', tipo: 'api_usada', obrigatorio: true, metodos: ['led'] },
      { id: 'andou', tipo: 'dist_min', obrigatorio: true, cm: 18 },
    ],
    avaliacao: {
      estrelas: [
        { estrelas: 1, quando: 'vitoria' },
        { estrelas: 2, quando: 'tempoSim', maxS: 10 },
        { estrelas: 3, quando: 'tempoSim', maxS: 6 },
      ],
    },
    recompensas: { xp: 70, desbloqueia: ['lt03-zona'] },
    narrativa: {
      intro: [
        { personagem: 'Agente', texto: 'Regra 2: na faixa de pare, pare de verdade e sinalize VERMELHO antes de seguir.' },
      ],
      sucesso: [{ personagem: 'Agente', texto: 'Parada válida. Agora respeite a zona da pista.' }],
      fracasso: [{ personagem: 'Agente', texto: 'Faltou parar_motor, led ou distância.' }],
    },
  },
  {
    id: 'lt03-zona',
    temaId: 'leis-transito',
    titulo: 'Chegar na zona permitida',
    ordem: 7,
    setup: {
      cenario: 'treino',
      inicio: 'padrao',
      robo3d: 'jacare',
      codigoInicial:
`from jacarev3 import RoboEV3, protocolo as p

# Lei: só vale ponto se você chegar na região leste usando o sensor (não chute cego eterno).
with RoboEV3('00:16:53:64:F8:B8') as robo:
    robo.led('VERDE')
    while True:
        luz = robo.ler_sensor(3, p.MODO_COR_REFLETIDA)
        if luz < 30:
            robo.mover_continuo('B', 10)
            robo.mover_continuo('C', 34)
        else:
            robo.mover_continuo('B', 34)
            robo.mover_continuo('C', 10)
`,
    },
    codigoReferencia:
`from jacarev3 import RoboEV3, protocolo as p

with RoboEV3('00:16:53:64:F8:B8') as robo:
    robo.led('VERDE')
    while True:
        luz = robo.ler_sensor(3, p.MODO_COR_REFLETIDA)
        if luz < 30:
            robo.mover_continuo('B', 10)
            robo.mover_continuo('C', 34)
        else:
            robo.mover_continuo('B', 34)
            robo.mover_continuo('C', 10)
`,
    dicas: [
      'Mesma lógica do seguidor, com foco em chegar na zona.',
      'Se travar num loop, confira o limiar 30 e o sentido da curva.',
      'LED verde = “via liberada” durante o percurso.',
    ],
    limites: { tempoSimMaxS: 45 },
    objetivos: [
      { id: 'sensor', tipo: 'api_usada', obrigatorio: true, metodos: ['ler_sensor'] },
      { id: 'zona', tipo: 'regiao', obrigatorio: true, regiao: { x: 70, y: 20, w: 50, h: 50 } },
    ],
    avaliacao: {
      estrelas: [
        { estrelas: 1, quando: 'vitoria' },
        { estrelas: 2, quando: 'tempoSim', maxS: 28 },
        { estrelas: 3, quando: 'tempoSim', maxS: 16 },
      ],
    },
    recompensas: { xp: 90, desbloqueia: ['lt04-final'] },
    narrativa: {
      intro: [
        { personagem: 'Agente', texto: 'Regra 3: destino só conta dentro da zona permitida (leste da pista).' },
      ],
      sucesso: [{ personagem: 'Agente', texto: 'Zona ok. Desafio final do tema.' }],
      fracasso: [{ personagem: 'Agente', texto: 'Não alcançou a região a tempo.' }],
    },
  },
  {
    id: 'lt04-final',
    temaId: 'leis-transito',
    titulo: 'Percurso completo e seguro',
    ordem: 8,
    setup: {
      cenario: 'treino',
      inicio: 'padrao',
      robo3d: 'jacare',
      codigoInicial:
`from jacarev3 import RoboEV3, protocolo as p
import time

# Desafio final do tema:
# 1) LED LARANJA e depois VERDE
# 2) seguir linha com sensor
# 3) ao “completar”, parar e LED VERMELHO (fim de missão)
with RoboEV3('00:16:53:64:F8:B8') as robo:
    robo.led('LARANJA')
    time.sleep(0.25)
    robo.led('VERDE')
    while True:
        luz = robo.ler_sensor(3, p.MODO_COR_REFLETIDA)
        if luz < 30:
            robo.mover_continuo('B', 12)
            robo.mover_continuo('C', 32)
        else:
            robo.mover_continuo('B', 32)
            robo.mover_continuo('C', 12)
`,
    },
    codigoReferencia:
`from jacarev3 import RoboEV3, protocolo as p
import time

with RoboEV3('00:16:53:64:F8:B8') as robo:
    robo.led('LARANJA')
    time.sleep(0.25)
    robo.led('VERDE')
    t0 = 0
    while t0 < 25:
        luz = robo.ler_sensor(3, p.MODO_COR_REFLETIDA)
        if luz < 30:
            robo.mover_continuo('B', 12)
            robo.mover_continuo('C', 32)
        else:
            robo.mover_continuo('B', 32)
            robo.mover_continuo('C', 12)
        time.sleep(0.05)
        t0 += 0.05
    robo.parar_motor('B')
    robo.parar_motor('C')
    robo.led('VERMELHO')
`,
    dicas: [
      'Você pode parar por tempo: após alguns segundos no loop, parar_motor + led VERMELHO.',
      'Ou mantenha o seguidor até o tempo máximo — o importante é zona + APIs.',
      'Objetivos: led, ler_sensor, parar_motor e região leste.',
    ],
    limites: { tempoSimMaxS: 50 },
    objetivos: [
      { id: 'led', tipo: 'api_usada', obrigatorio: true, metodos: ['led'] },
      { id: 'sensor', tipo: 'api_usada', obrigatorio: true, metodos: ['ler_sensor'] },
      { id: 'parou', tipo: 'api_usada', obrigatorio: true, metodos: ['parar_motor'] },
      { id: 'zona', tipo: 'regiao', obrigatorio: true, regiao: { x: 65, y: 15, w: 55, h: 55 } },
    ],
    avaliacao: {
      estrelas: [
        { estrelas: 1, quando: 'vitoria' },
        { estrelas: 2, quando: 'tempoSim', maxS: 35 },
        { estrelas: 3, quando: 'tempoSim', maxS: 22 },
      ],
    },
    recompensas: { xp: 120, desbloqueia: [] },
    narrativa: {
      intro: [
        { personagem: 'Agente', texto: 'Final: sinalize, siga a via com sensor, chegue na zona e encerre com parada + VERMELHO.' },
      ],
      sucesso: [{ personagem: 'Agente', texto: 'Academia concluída. Você dominou códigos-base e leis de trânsito na pista!' }],
      fracasso: [{ personagem: 'Agente', texto: 'Revise: led, sensor, parar_motor e zona leste.' }],
    },
  },
];

CAMPANHA.missoes = MISSOES;

export function getMissao(id) {
  return MISSOES.find((m) => m.id === id) || null;
}

export function missoesDoTema(temaId) {
  return MISSOES.filter((m) => m.temaId === temaId);
}
