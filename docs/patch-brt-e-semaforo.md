# Patch: Pista BRT no editor + seguidor de linha com semáforo

## Instalação
Extraia este ZIP na raiz da jacarEV3-IDE atual, preservando os caminhos.
Substitua apenas `src/js/editor/mapaEditorCore.js` e
`src/js/editor/mapaEditor.js`. Os demais arquivos são novos (exemplo e testes).

## Problema corrigido
A pista BRT possui três rampas: uma `+x` e duas `+y`. O validador
anterior exigia que a subida estivesse limitada à largura (`w`) e
rejeitava as direções em `y`, produzindo "Número inválido: rampa subida".

Agora a validação utiliza:
- `+x`/`-x`: subida entre 1 e a largura da rampa (`w`);
- `+y`/`-y`: subida entre 1 e o comprimento (`h`).

A visualização das ranhuras da rampa também respeita essa orientação.
A pista original e os dados das rampas **não foram modificados**.

## Programa do carrinho
Abra `exemplos/seguidor_linha_semaforo.py` e cole no editor Python da IDE.

- Cenário: Tapete Urbano Ilustrativo.
- Início: Início na Estrada de Baixo (Sul).
- Porta 3: sensor de cor.
- Motores B e C.
- Vermelho/amarelo: pare e aguarde; verde: atravesse.
- Fora da faixa colorida: use luz refletida para seguir a linha.

O limiar de 20 foi escolhido para a pista cinza do Tapete Urbano:
sobre o preto a leitura é perto de 5 e sobre o asfalto cinza é
aproximadamente 34. Ajuste o limiar se alterar a textura do piso.

## Testes
- `node tests/teste-editor-brt-rampas.mjs`
- `python tests/teste-seguidor-semaforo.py`

O teste Python simula os valores do sensor com um mock para verificar
o controle de motores. **Não substitui o teste do carrinho no navegador.**

Faça um commit antes de substituir os arquivos.
