# JacarEV3 — Correções Tapete Urbano e Editor de Mapas

Base: ZIP `jacarEV3-IDE-main(2).zip` de 31/10/2026.

## Correções
1. O Tapete Urbano de 240 × 360 cm abre no editor: o limite antigo era 240 cm de altura.
2. O desenho da linha preta é independente do fundo. A rota principal, o círculo da rotatória e a ligação inferior são traços editáveis.
3. As faixas de pedestres ficam em uma camada superior protegida pela borracha. Não foram retiradas ou reposicionadas.
4. As antigas linhas brancas finas pintadas por cima do seguidor foram removidas. **As faixas brancas de pedestres permanecem iguais.**
5. A estação vermelha dos Bombeiros foi reduzida e afastada da curva e da faixa de pedestres do Norte; o carro vermelho estacionado foi deslocado de `(145,312)` para `(154,296)` cm, fora da estrada inferior e da área de passagem.
6. Outros mapas nativos com linhas rasterizadas podem usar a borracha para restaurar **somente pixels escuros** tocados, com restauração aproximada da cor circundante. Superfícies claras, faixas e outras cores não são apagadas. Recomenda-se revisar o resultado e usar Desfazer se tocar algum detalhe preto que não seja linha.
7. Mapas nativos com densidade superior a 6 px/cm são reamostrados **somente ao copiar**, respeitando o limite de 3 milhões de pixels. O cenário original permanece intacto.
8. A sinalização dinâmica do Tapete Urbano é preservada ao aplicar o mapa editado na simulação, com as três fases do semáforo.

## Instalação
Extraia este ZIP na raiz do projeto (sobrepondo os arquivos nos mesmos caminhos) e atualize o navegador com Ctrl+Shift+R. Faça um commit antes da instalação.

## Testes
- `node tests/teste-urbano-editor.mjs`
- `node tests/teste-editor-mapa.mjs`
- `node tests/teste-editor-abas.mjs`

Testes isolados em Chromium confirmaram abertura do editor, borracha na pista original, faixas preservadas, leitura de pixels do sensor e semáforo verde ao avançar 6 s. A execução completa com robô 3D e Python ainda deve ser confirmada no Sandbox.
