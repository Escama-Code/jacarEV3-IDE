# Correção de passagem e colisões em arenas `.sArena`

Esta revisão considera as marcações em X das capturas do usuário como **locais em
que o carrinho não consegue avançar**. Os X não fazem parte do arquivo da arena
e não devem ser desenhados como barreiras.

## Mudanças

- O motor (`src/js/core/sim.js` e `src/js/sim.js`) consulta agora
  `cenario.solidoEm` e `cenario.podeTransitar` ao decidir se um movimento é
  permitido. Regiões sem piso e desníveis abruptos bloqueiam o movimento,
  mas os quatro tiles de rampa permitem passar suavemente ao nível superior.
- A verificação da área ocupada pelo carrinho usa oito pontos no seu perímetro
  para não autorizar que metade do veículo fique fora da plataforma.
- Os colisores de paredes e caixas extraídos do `.sArena` incluem `pisoCm`:
  um obstáculo não bloqueia uma plataforma situada em outro nível.
  Cenários clássicos sem esse campo preservam a regra anterior.
- O ultrassônico aplica a mesma filtragem de patamar.
- A textura visível do piso passou a usar `MeshBasicMaterial` sem atenuação por
  iluminação, com linha preta. O sensor de cor continua amostrando o tapete.

## Testes automatizados

- `node tests/teste-sarena.mjs`
- `node tests/teste-colisao-sarena.mjs`

## Limites

A precisão visual completa do sBotics ainda requer reproduzir os arquivos
de imagem originais de cada tile. A versão presente desenha certas curvas
proceduralmente; trechos desconectados podem fazer um seguidor de linha perder
a trajetória mesmo quando não existe obstáculo físico.

Os testes Node validam regras de colisão e sintaxe. É necessário executar
o navegador para validar o movimento com a câmera, sensores e texturas reais.
