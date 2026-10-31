# Construtor de mapas jacarEV3 v2

## Instalação
Copie os arquivos do patch para a **raiz da IDE**, mantendo os caminhos.
Abra `public/sandbox.html`, escolha uma pista no Sandbox e clique em **Editar mapa**.
Use **Em branco** para desenhar uma pista completamente autoral; **Copiar cenário**
mantém a pintura original como fundo não editável.

## Ferramentas
- **Caneta / Reta / Elipse / Retângulo:** linhas pretas na camada editável; os sensores usam os mesmos pixels.
- **Curva:** clique no início, clique no ponto de controle e clique no final; `Esc` cancela.
- **Borracha:** apaga apenas os traços criados na camada de linha. Não pinta o chão de branco.
- **Conectar pontas próximas:** aproxima extremidades até 2, 3 ou 5 cm. Desmarque para manter gaps intencionais.
- **Suavizar mão livre:** remove tremores ao terminar o desenho, preservando as pontas.
- **Reconhecer retas:** opcional; converte traços quase retilíneos em segmentos perfeitos.
- **Mostrar grade:** grade de ladrilhos de 30 cm, visível apenas durante a edição.
- **Ajustar grade:** limita os pontos a intervalos de 5 cm.
- **Parede / Caixa / Rampa:** arraste para delimitar a peça; ela entra no modelo 3D e na geometria do cenário.
- **Esfera:** clique para posicionar uma vítima de treino de 4,5 cm de diâmetro.
- **Verde / Vermelho:** clique para posicionar área triangular de 30 × 30 cm, orientável pelo seletor de canto.
- **Sala de resgate:** clique para criar sala 90×90 ou 120×90 cm com abertura de 25, 27 ou 30 cm; paredes, áreas e vítimas são geradas como um conjunto.
- **Mover objeto / Remover objeto:** arraste ou clique em um objeto criado pelo editor.
- **Largada:** clique no ponto de partida e selecione orientação.
- **Desfazer / Refazer:** histórico das alterações. **Salvar .jmap** guarda dados estruturados.
- **Desafio surpresa:** cria um percurso original aleatório como exercício de sensores, não como mapa oficial de competição.

## Regras OBR 2026 (referência de treino)
Escolha `Modo Livre`, `OBR 2026 — Regional/Estadual` ou `OBR 2026 — Nacional`,
e Nível 1/2. Depois pressione **Verificar medidas**.

Referências:
- Resgate Presencial Regional/Estadual 2026 — https://obr.robocup.org.br/wp-content/uploads/2026/07/OBR2026_REGIONAL_ESTADUAL_MANUAL-DE-REGRAS-E-INSTRUCOES_v1.2.pdf
- Resgate Presencial Nacional 2026 — https://obr.robocup.org.br/wp-content/uploads/2026/10/OBR2026_NACIONAL_MANUAL-DE-REGRAS-E-INSTRUCOES_RESGATE.pdf
- Índice de manuais OBR — https://obr.robocup.org.br/documentos-e-manuais/

A verificação atual contempla parte das medidas de objetos **estruturados**:
largura de linha de 1–2 cm, dimensões de salas, entrada da sala (regional),
altura de paredes criadas pelo editor, triângulos 30 cm, esferas 4–5 cm e
inclinação da rampa como alerta de treino.
O tempo da rodada regional é 300 s; o Sandbox já recebeu patch separado
para 300 s nas conversas anteriores.

**Não é homologação oficial, nem uma reprodução integral do regulamento.**
O verificador NÃO julga pontuação, autonomia do robô, gaps intencionais,
posicionamento e geometria de todos os obstáculos, fita de entrada/saída,
quinas elevadas dos triângulos, comportamento das vítimas e todos os
critérios específicos dos dois níveis. O motor de física do jacarEV3
continua predominantemente 2D: a rampa possui representação 3D, mas não
equivale a uma simulação física completa. As paredes são sólidas no
sistema de colisão já existente; as esferas são inicialmente decorativas.

## Compatibilidade e limitações
- O editor abre arquivos `.jmap` versão 1, migrando-os para a versão 2.
- Ao copiar um cenário antigo, `basePNG` contém piso, linhas e pinturas
  anteriores em uma única imagem. Não há como apagar **somente as linhas
  originais** dessa imagem sem redesenhá-las separadamente; a borracha
  afeta apenas a camada nova. Use um mapa em branco para edição integral.
- A mesma saída Canvas fornece os pixels do sensor e a textura do piso 3D.
  Paredes/caixas/rampas/esferas viram dados para o renderizador existente.
- Os mapas existem na sessão do navegador; **exporte o `.jmap`** antes de
  fechar. Não há persistência automática em nuvem nesta versão.
- Mapas autorais são independentes do formato `.sArena` e dos recursos do sBotics.
- É recomendado validar visualmente em 3D, a movimentação Python e a
  geometria de todo novo mapa antes de utilizá-lo em sala de aula.

## Verificação local
`node tests/teste-editor-mapa.mjs`

No navegador: desenhe uma linha sobre um triângulo colorido e apague um
pedaço. A cor do chão deve continuar aparecendo. Experimente desenhar
duas retas com as pontas a menos de 3 cm e exporte `.jmap`: os pontos
de conexão devem coincidir.
