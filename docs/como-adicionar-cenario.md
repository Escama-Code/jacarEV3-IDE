# Como adicionar um novo cenário

1. Abra `src/js/core/cenarios.js`.
2. Adicione uma nova entrada na lista de cenários com:
   - `nome`: rótulo amigável
   - `w`, `h`: dimensões em cm
   - função de desenho do tapete (Canvas 2D)
   - `caixas`: obstáculos (opcional)
   - `inicios`: posições iniciais do robô
3. Atualize também a cópia embutida em `public/index.html` (enquanto a migração completa não for feita).
4. Teste no navegador selecionando o novo cenário.
