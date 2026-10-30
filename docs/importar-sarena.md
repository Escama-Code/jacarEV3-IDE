# Importação de arenas .sArena (sBotics)

## Arquivos alterados

- `public/sandbox.html`: botão Importar e ligação com Playback.
- `src/js/cenarios.js`: registro dinâmico e compartilhamento de tapete com sensores.
- `src/js/3d/cena3d.mjs`: criação nativa da geometria da arena importada.
- `src/js/arena/index.mjs`: API de importação.
- `src/js/arena/sArenaParser.mjs`: leitura de tiles, pistas, alturas e colisores.
- `src/js/arena/sArenaBuilder3d.mjs`: pisos por tile, rampas e obstáculos.
- `tests/teste-sarena.mjs`: testes sem dependências extras.
- `tests/fixtures/arenanova.sArena`: arquivo de exemplo enviado.

**Atenção ao caminho:** o arquivo 3D usado pelo sandbox é `src/js/3d/cena3d.mjs`, e não
`src/js/cena3d.mjs`. O HTML em uso está em `public/sandbox.html`.

## Como iniciar

Na raiz do projeto:

```sh
npm run dev
```

Abra `http://localhost:8000/public/sandbox.html` (não abra via `file://`).

Clique em **Importar .sArena**, escolha o arquivo e selecione **3D**. Para testar
o parser sem navegador, use:

```sh
node tests/teste-sarena.mjs
```

Ou para testar outro arquivo:

```sh
node tests/teste-sarena.mjs /caminho/para/arenanova.sArena
```

## Arquitetura

`arquivo .sArena` → `parseSArena()` → cenário e tapete de pixels. O
`Cenarios.registrarCenario` registra ambos na mesma API que o SimEV3 usa.
`Playback.escolher/aplicarCenario` chama a API `Vista3D.setCenario`.
`construirArena` chama `construirGrupoSArena` diretamente quando
`cen.tilesOriginais` está presente. A cena antiga é descartada pela Vista3D.

A montagem não depende de um atraso arbitrário nem de ocultar geometria
do cenário retangular procurando meshes pelas dimensões.

## Estado da compatibilidade

- O arquivo de exemplo possui 40 tiles reais, 19 objetos e 4 rampas;
  5 entradas sem x/z são metadados.
- 1 tile = 30 cm; 1 nível = 10 cm; altura da primeira plataforma = 8 cm
  (`BASE_CM`). São opções de compatibilidade visual da IDE, não dimensões
  oficiais verificadas do mundo físico sBotics.
- As linhas são reconstruídas por formas aproximadas a partir dos nomes das
  imagens em `properties.image`. Não dependem da URL autenticada do sBotics.
  A aparência exata de todas as texturas exige os assets PNG originais.
- Cada tile possui piso com espessura e postes. A rampa é uma malha fechada
  cujo topo coincide com a função `cenario.alturaEm`; os objetos usam o mesmo
  deslocamento vertical da plataforma. A câmera de acompanhamento usa a altura
  da arena, e modelos GLB são assentados sobre o próprio limite inferior.
- A simulação física do jacarEV3 **continua 2D** e não substitui a física 3D
  original do sBotics. Como proteção, o robô não consegue sair da superfície
  com seu raio de apoio nem atravessar desníveis abruptos sem uma rampa.
  Os obstáculos continuam projetados em AABB, sem simular queda, impulso ou
  interações de contato tridimensionais.
- O renderizador original e a importação não foram validados visualmente no
  navegador nesta entrega. Foram verificados o parser e a sintaxe JS.
