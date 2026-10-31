# Semáforo dinâmico — Tapete Urbano Ilustrativo

O cenário `tapeteUrbanoInfantil` possui **dois sinais no chão**. Ao
abrir o mapa sem programa rodando, o sinal muda a cada intervalo indicado
pelo relógio da prévia. Durante a simulação e o playback, usa o tempo
**simulado**, para que o sensor e a imagem concordem.

| Tempo no ciclo | Sinal | Identificador do sensor EV3 (modo 2) |
| --- | --- | --- |
| 0 a 4,999 s | Vermelho | 5 |
| 5 a 9,999 s | Verde | 3 |
| 10 a 11,999 s | Amarelo | 4 |

O ciclo recomeça a cada **12 segundos** (relógio da prévia ou tempo simulado, conforme o modo). As durações podem ser ajustadas
na propriedade `cicloSemaforo` do cenário em `src/js/cenarios.js`.

## Como usar

1. Abra o Sandbox e selecione **Tapete Urbano Ilustrativo**.
2. Observe as faixas coloridas no chão (e o indicador `🚦` na barra do mapa).
3. Rode um programa e use o sensor de cor da porta 3 em **modo 2**, que retorna
   um código de cor. As faixas mudam durante a simulação e também durante a
   reprodução do histórico. O 3D usa o mesmo Canvas do sensor.

Exemplo de parte de um programa do aluno:

```python
# Dentro do with RoboEV3(...) as robo:
cor = robo.ler_sensor(3, 2)  # 5=vermelho, 4=amarelo, 3=verde
if cor == 5:                 # parada obrigatória
    robo.parar_motor('B')
    robo.parar_motor('C')
    # Repetir a leitura depois de avançar o tempo simulado com time.sleep(...)
```

**O simulador não freia automaticamente.** A atividade pedagógica é o aluno
programar a reação ao semáforo e a lógica de seguir a linha. Para que a
cor do sinal seja detectada, o sensor (5,5 cm à frente do centro do robô)
precisa passar sobre uma das faixas coloridas da pista.

O modo **0** do sensor retorna luz refletida (0–100); para distinguir
vermelho/verde/amarelo, utilize o **modo 2**.

## Implementação

- `src/js/cenarios.js`: configura o ciclo e reconstrói a pintura dinâmica,
  atualizando o Canvas, os pixels do sensor e o contador `tapete.versao`.
- `src/js/sim.js` e `src/js/core/sim.js`: usam o tempo do simulador ao ler cor.
- `public/sandbox.html`: atualiza a cor no playback, no teleop e quando o
  mapa está aberto sem uma simulação em andamento. **Importante:** o
  Sandbox contém outra implementação inline de `SimEV3`; agora seus métodos
  `rgbEm`, `refletidaEm` e `corEm` também recebem o instante simulado e
  atualizam o tapete na leitura. A troca de cenário descarta `App.sim` para
  religar a prévia automática. Foi adicionada versão às importações de
  `cenarios.js` e `cena3d.mjs` para reduzir o risco de cache antigo.
- `src/js/3d/cena3d.mjs`: reenvia a textura para a GPU na mudança de versão.
- `tests/teste-semaforo-urbano.html`: testes de cores, fases, reinício,
  avanço do tempo, retorno no playback e conservação dos outros cenários.

Para rodar os testes: inicie `npm run dev` na raiz da IDE e abra
`http://localhost:8000/tests/teste-semaforo-urbano.html`. Para conferir
a versão **inline do Sandbox**, rode `node tests/teste-semaforo-sandbox.mjs`.

## Verificação na interface

1. Substitua **todos** os arquivos presentes no patch, mantendo os caminhos.
2. Atualize com `Ctrl+Shift+R`, ou abra uma janela anônima.
3. Entre em **Sandbox → Tapete Urbano Ilustrativo** e observe o indicador
   `🚦` próximo ao seletor do mapa. Sem programa rodando, ele deve mudar
   em 5, 10 e 12 segundos. Se o indicador não aparecer, o `sandbox.html`
   atualizado não foi carregado.
4. Em execução/reprodução, a cor passa a acompanhar o tempo simulado.
   Se o programa durou apenas 3 segundos, a reprodução inteira estará
   na fase vermelha: isso é esperado, não falha.
5. Para testar o sensor, coloque a parte sensível sobre uma das faixas
   coloridas e leia a porta 3 no modo 2. Fora da faixa, o sensor lê
   a pintura do chão, não a cor do semáforo.

## Limitações

A cor do sinal é global por cenário; os dois pontos usam o mesmo ciclo.
Não foi adicionada fiscalização automática de infração de trânsito.
A atualização visual completa em 3D ainda deve ser conferida no navegador
com Three.js carregado.
