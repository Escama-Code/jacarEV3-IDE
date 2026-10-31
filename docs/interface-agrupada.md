# Construtor de Mapas — interface agrupada

Esta atualização é exclusivamente de **organização da interface** do Construtor de Mapas v2 do jacarEV3. Mantenha instalada a v2 anterior: o arquivo `src/js/editor/mapaEditorCore.js` não foi alterado e continua necessário.

## Como usar

- **Desenho:** caneta, borracha, retas, curva, elipse, retângulo, espessura, suavização, reconhecimento de retas e conexão de pontas.
- **Objetos:** paredes, obstáculos, rampas, esferas, áreas verdes/vermelhas, sala de resgate, mover/remover e largada.
  - As dimensões da sala e da entrada aparecem **somente** ao selecionar **Sala de resgate**.
  - O canto colorido aparece **somente** ao selecionar **Área verde** ou **Área vermelha**.
  - A orientação aparece **somente** ao selecionar **Largada**.
- **Ajustes:** grade visível, encaixe à grade e distância de conexão.
- **OBR:** perfil, nível, verificação parcial de medidas e acesso aos manuais.
- **Arquivo:** mapa em branco, copiar cenário, desafio surpresa e abrir `.jmap`.

**Desfazer e Refazer** ficam sempre disponíveis junto às abas. A ferramenta selecionada aparece acima do mapa, inclusive quando você está vendo outra aba. Para mudar de ferramenta, clique em sua aba e selecione-a. Nas abas, é possível usar as setas para esquerda/direita e as teclas Home/End.

Os botões de **Salvar .jmap**, **Cancelar** e **Aplicar na IDE** permanecem no rodapé, para evitar que salvar/aplicar dependa da aba aberta.

## Instalação

Extraia o ZIP **na raiz da IDE**, substituindo os dois arquivos existentes:
- `public/sandbox.html`
- `src/js/editor/mapaEditor.js`

O arquivo `tests/teste-editor-abas.mjs` é um novo teste opcional. Execute:

```bash
node tests/teste-editor-abas.mjs
node tests/teste-editor-mapa.mjs
```

Recarregue o navegador com Ctrl+Shift+R.

## Limites e compatibilidade

As regras OBR, a criação de objetos, a simulação, as colisões e o formato `.jmap` **não mudaram**. A organização agrupa os controles existentes, não implementa funcionalidades adicionais. A validação OBR continua parcial. O teste visual realizado foi isolado no navegador com Canvas, sem confirmar a integração completa com a execução Python/3D.
