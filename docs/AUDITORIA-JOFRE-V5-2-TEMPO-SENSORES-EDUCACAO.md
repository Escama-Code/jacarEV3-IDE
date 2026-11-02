# Auditoria didática — Jornada de Jofre v5.2 (correções de interface e sensores)

## Objetivo
Manter o mapa e os cinco obstáculos físicos existentes. Alterações apenas:
- `public/sandbox.html`: separação visual das dicas; ativação da dica de incêndio pelo sensor de cor na faixa vermelha; explicação da duração da simulação.
- `src/js/cenarios.js`: metadados do gatilho da dica de incêndio; ícones de troncos substituídos por emoji de árvore, mais compatível com fontes usuais.
- `src/exemplos/desafios/jofre-pantanal.py`: limite de alerta do ultrassônico de 27 cm para 18 cm, com mensagem clara no terminal.
- `tests/`: testes ajustados à API da v5.2 e teste novo da ativação por sensor.

## O que a IDE realmente executa?
No Sandbox, o botão **Rodar script** lê o texto atual do editor (`App.editor.getValue()`).
O código Python é compilado e executado no Pyodide, com a biblioteca `jacarev3` instalada via PyPI.
O método de comunicação com um EV3 físico é temporariamente substituído por uma
**ponte de simulação**, que interpreta os bytes das instruções enviados pela biblioteca e
responde com as leituras virtuais. Portanto, você realmente controla o programa e os motores
simulados, mas as leituras não são medidas de sensores físicos.

O controle da arena 2D/3D é reconstruído da execução, não de uma animação predeterminada.

## Por que o tempo diminui quando eu altero código?
- **300 s**: teto de segurança selecionado na interface, não obrigação de esperar 300 s.
- **Término do programa**: se sair do loop, detectar a chegada ou parar por erro, a
  duração final será menor. Se o robô movimentar-se mais rápido ou fizer menos manobras,
  também poderá completar antes.
- **Relógio virtual**: `time.sleep` avança tempo simulado; leituras e comandos também
  gastam uma pequena latência virtual por pacote. Isso permite que o script seja executado
  rapidamente no navegador, e o percurso seja reproduzido depois.
- **Velocidade 2x/4x**: altera apenas o ritmo de reprodução, não o tempo que o código levou
  em segundos simulados.
- **Não há velocidade ou tempo fixos ocultos para obrigar a missão a terminar**.

## Como o aviso da queimada passou a funcionar?
O ponto ilustrativo do incêndio fica em torno de `(110,67)`.
A faixa vermelha que o sensor realmente lê fica perto de `(88..97,61..75)`.
Anteriormente o aviso só aparecia quando o **centro do robô** se aproximava
do ponto da ilustração, mesmo que o sensor de cor já tivesse identificado vermelho.
Agora o metadado `gatilhoSensor` liga o aviso à leitura **real do sensor de cor simulado**
na região da faixa vermelha. Isso altera somente a aba Educação ambiental:
o código Python não recebe coordenadas do mapa.

Os outros avisos continuam baseados na passagem do robô pela região educativa.

## Como ajustar a distância de desvio?
No programa `src/exemplos/desafios/jofre-pantanal.py`, altere:

```python
DISTANCIA_ALERTA = 18  # centímetros, leitura do ultrassônico
DISTANCIA_SEGURANCA = 12  # distância mínima tolerada durante uma manobra
```

A detecção é feita **por `robo.ler_sensor(4, p.MODO_ULTRASSONICO_CM)`**.
Não depende do nome do obstáculo nem da posição armazenada no mapa.
Um valor maior provoca o desvio mais cedo; um valor menor aproxima o robô do
obstáculo e pode aumentar o risco de colisão. No EV3 físico, considere o tamanho
da base, ângulo do sensor, velocidade, desaceleração e folga do percurso.

Não reduza `DISTANCIA_SEGURANCA` só para “passar” nos testes: ela serve para
interromper manobras quando algo está perto demais.

## Como alterar o código sem depender de patches?
1. Escolha **Jofre v5.2** em **Desafios e obstáculos**.
2. Edite diretamente o código Python. Ele é o programa que será executado.
3. Para antecipar ou atrasar a detecção, altere `DISTANCIA_ALERTA`.
4. Para ajustar o seguidor de borda, modifique `VELOCIDADE_LINHA`,
   `VELOCIDADE_BORDA_LENTA` e `LIMIAR_BORDA`. Faça uma alteração por vez.
5. Rode, observe os `print` no terminal e o **Monitor do robô** para conferir a
   distância do ultrassônico e os valores dos sensores de cor.

Quando escolher um exemplo novamente pelo menu, o editor pode ser recarregado
com o código original: salve seus experimentos separadamente.

## Testes
- `node tests/teste-jofre-v5.cjs`
- `node tests/teste-jofre-interacao-v5.cjs`
- Sintaxe JavaScript/Python conferida.
- Uma simulação aproximada do percurso padrão com 18 cm chegou à faixa azul final
  em ~190 s, sem contato com as cinco caixas; mais seis pequenas variações da
  largada também chegaram ao final.

**Limitações:** esses testes não são uma execução completa no navegador com Pyodide
nem em um EV3 físico; calibração e estabilidade dependem do ambiente real.
A pintura vermelha representa risco de incêndio; o sensor de cor não mede calor
nem fumaça. O azul da rodovia indica uma parada simbólica de 3 s, não
uma detecção de veículos ou confirmação de travessia segura.
