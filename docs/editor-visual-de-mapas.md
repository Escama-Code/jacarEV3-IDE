<<<<<<< HEAD
# Editores de mapas

Dois editores **fora** do Sandbox:

| Página | Tipo |
|--------|------|
| `public/editor-mapas-blocos.html` | **Por blocos** — ladrilhos OBR 30×30 cm |
| `public/editor-mapas.html` | **Livre** — traço, objetos, salas (v2) |

## Blocos
- `src/js/editor/obrCatalogo.js`
- `src/js/editor/mapaModular.js`
- Formato `.jcrv3map` v2 `modo: modular-obr`

## Livre
- `src/js/editor/mapaEditorCore.js` + `mapaEditor.js`
- Formato `.jmap` / `.jcrv3map` v2 traços

Sandbox só abre os editores e **importa** o arquivo pronto.
=======
# Editor visual de mapas — primeira versão

O novo botão **✏️ Editar mapa**, no Sandbox, abre um editor 2D para desenhar pistas autorais diretamente com o mouse ou tela sensível ao toque.

## Instalação

Extraia o ZIP na raiz do projeto (mesmo nível de `public/` e `src/`) e mantenha os caminhos dos arquivos. O patch contém os arquivos inteiros que devem ser substituídos.

O `public/sandbox.html` deste patch mantém o tempo máximo de 300 segundos da atualização anterior.

Inicie a IDE com `npm run dev` e acesse `http://localhost:8000/public/sandbox.html`. Atualize com `Ctrl + Shift + R` após instalar.

## Como usar

1. No Sandbox, escolha um cenário nativo e clique em **✏️ Editar mapa**.
2. Você pode copiar a arte original desse cenário ou clicar em **Novo em branco** para apagar tudo e desenhar do zero.
3. **Caneta**: mantenha o botão pressionado para desenhar linha preta.
4. **Borracha**: pinta de branco na região desenhada; sobre cenários coloridos, pode cobrir a decoração, pois não recupera os pixels anteriores.
5. **Reta**: clique e arraste do ponto inicial ao final.
6. **Posição inicial**: selecione a orientação e clique no local onde o robô deve começar.
7. Ajuste a espessura entre 0,5 e 12 cm e use **Desfazer/Refazer**.
8. Clique em **Aplicar na IDE** para registrar o novo cenário e atualizar os pixels dos sensores, a cena 2D e a textura da cena 3D.
9. Clique em **Salvar .jmap** para baixar seu projeto de desenho. **Abrir .jmap** carrega novamente o mapa para edição.

O arquivo `.jmap` é um JSON autoral do jacarEV3. Não depende de `.sArena`.

## Como funciona

`src/js/editor/mapaEditor.js` guarda os traços como sequências de pontos (coordenadas em cm), largura e ferramenta. Ao aplicar, cria um novo objeto `cenario` com função `desenhar(ctx)`, registra-o em `Cenarios.registrarCenario`, e seleciona o mapa no `Playback`.

O próprio `Cenarios.gerarTapete` converte essa função em `Canvas` e `ImageData`, que o `SimEV3` usa para as leituras do sensor. O 3D utiliza a mesma textura resultante: não são duas linhas independentes.

Ao copiar um cenário nativo, a arte inicial é armazenada como PNG dentro do `.jmap`, enquanto paredes e rampas são mantidas como dados de colisão. Os traços adicionais ficam em camadas vetoriais. Se desejar apagar todo o circuito original, comece com **Novo em branco**.

## Limitações desta primeira versão

- Edição exclusiva do **Sandbox**, não modifica missões de campanha.
- Ferramentas: caneta, borracha, reta e posição inicial. Edição visual de paredes, caixas, rampas e curvas Bézier fica para uma futura etapa.
- O cenário é registrado na sessão atual. Para utilizá-lo depois de fechar o navegador, é preciso **salvar o arquivo `.jmap`** e carregá-lo novamente.
- Ao fazer uma cópia de um cenário, os obstáculos existentes são mantidos; por enquanto o editor não move nem remove esses obstáculos.
- Para preservar autonomia dos mapas autorais, o editor não permite copiar mapas importados por `.sArena`.
- Mapas aceitos: entre 40 × 40 cm e 360 × 240 cm, até 3 milhões de pixels, para limitar consumo de memória.
- Uma linha 2D não gera automaticamente física tridimensional nem remove paredes existentes.
- O ponto inicial marca o **centro** do robô; o sensor de cor fica deslocado à frente, então é necessário posicioná-lo corretamente para o sensor começar na linha.

## Testes

`node tests/teste-editor-mapa.mjs`

Teste de integração em um Canvas real realizado com navegador Chromium: linha desenhada no editor e aplicada ao cenário retornou pixel preto `[5,5,5]` (refletância ≈6,3), versus fundo branco `[255,255,255]` (≈70). Também foram verificados exportação e reimportação `.jmap`.

A integração da página completa com Pyodide, Three.js e scripts Python ainda deve ser conferida manualmente no ambiente da IDE.
>>>>>>> ebe5f226f8c18e9f1d296621ded67aa7bdc8a36e
