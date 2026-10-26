# Arquitetura do jacarEV3 IDE

## Visão geral

O jacarEV3 IDE é uma aplicação web educativa que permite programar um robô EV3 virtual em Python (biblioteca real `jacarev3`) e visualizar o resultado em 2D e 3D no navegador.

```
┌─────────────────────────────────────────────────────────┐
│  public/index.html                                      │
│  (UI + Pyodide + Monaco + ponte Python ↔ JS)            │
└────────────┬────────────────────────────┬───────────────┘
             │                            │
             ▼                            ▼
    ┌─────────────────┐          ┌─────────────────┐
    │  src/js/core/   │          │   src/js/3d/    │
    │  sim.js         │◄────────►│  cena3d.mjs     │
    │  cenarios.js    │  estado  │  modelos3d.mjs  │
    └─────────────────┘          └─────────────────┘
```

## Fluxo principal

1. O aluno escreve Python no editor (Monaco).
2. Pyodide executa o código com a lib `jacarev3` real.
3. A ponte (`ev3Ponte`) intercepta os Direct Commands e os envia para `SimEV3`.
4. `SimEV3` simula motores, sensores e gera o histórico de estados.
5. A vista 2D (Canvas) ou 3D (Three.js) reproduz a trajetória.

## Módulos

### `src/js/core/sim.js`
- Classe `SimEV3`: recebe bytes de Direct Command, simula física e sensores.
- Decodificação de opcodes do protocolo EV3.
- Exporta também `CENARIOS` e helpers.

### `src/js/core/cenarios.js`
- Gera tapetes (arte + mapa de cor) usados tanto visualmente quanto pelo sensor de cor.
- Funciona no navegador (OffscreenCanvas) e em Node (`@napi-rs/canvas`).

### `src/js/3d/cena3d.mjs`
- Cria a cena Three.js, luzes, sombras e controles de câmera.
- Sincroniza a pose do robô com o estado da simulação.

### `src/js/3d/modelos3d.mjs`
- Construtores procedurais dos modelos 3D (EV3, jacaré, capivara, caranguejo).
- Cada construtor devolve um "rig" com grupo, rodas, LEDs e função `animar`.

## Próxima evolução

- Extrair UI (editor, terminal, controles) para `src/js/ui/`.
- Fazer `index.html` importar os módulos de `src/js/` em vez de carregar cópias embutidas.
- Adicionar testes unitários para `sim.js` e `cenarios.js`.
