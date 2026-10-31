# Semáforo Urbano — correção v3

## Alterações
- O retângulo do semáforo usa as mesmas coordenadas nas três cores; apenas o preenchimento muda.
- O Tapete Urbano usa material 3D não afetado pela iluminação, para manter a cor do piso legível.
- O indicador tem sua própria linha, sem empurrar os controles do robô/câmera a cada mudança de estado.
- O indicador mostra 0–11 segundos em cada ciclo de 12 segundos, em vez de exibir o tempo acumulado desde que abriu a página.
- Botão **↻ Reiniciar semáforo** redefine o ciclo para vermelho em `t=0` e descarta o playback anterior.
- Selecionar outro ponto inicial e rodar um novo programa reiniciam o tempo de referência.
- Enquanto o Python executa, o relógio usado é o tempo simulado (não o relógio real).
- Novo exemplo no seletor **Trânsito — parar no vermelho (Tapete Urbano)**; código também disponível em `exemplos/teste_semaforo_urbano.py`.

## Ciclo
| Tempo dentro do ciclo | Cor | Código EV3 em modo de cor |
|---|---|---|
| 0 <= t < 5 s | Vermelho | 5 |
| 5 <= t < 10 s | Verde | 3 |
| 10 <= t < 12 s | Amarelo | 4 |

## Instalação
Copie somente os arquivos deste ZIP para a raiz da IDE, preservando as pastas.
Se o usuário já modificou `public/sandbox.html` ou `src/js/cenarios.js`, compare as alterações antes de substituir.
Faça backup/commit e recarregue o navegador com Ctrl+Shift+R.
O patch assume a versão do semáforo v2 previamente instalada; a base do Sandbox inclui o editor de mapas.

## Teste recomendado
1. Abrir o Sandbox, selecionar **Tapete Urbano Ilustrativo** e **Início na Estrada de Baixo (Sul)**.
2. Conferir o indicador, que repete 0...11 segundos e não desloca os controles 3D.
3. Clicar **↻ Reiniciar semáforo**, conferir **VERMELHO 0/12 s**.
4. No seletor de exemplos, abrir **Trânsito — parar no vermelho (Tapete Urbano)**.
5. Rodar o script; o robô avança, para no vermelho, espera e passa no verde.
6. Conferir que o piso e o sensor têm a mesma cor nas fases.

## Observações
- O programa de exemplo testa uma única travessia em linha reta; não implementa um seguidor de linha completo para todas as ruas.
- A leitura do EV3 é feita pela porta 3 em modo `p.MODO_COR_COR`.
- As marcas permanecem em posições fixas no piso; não são colisores.
- O ciclo exibido é um contador por período de 12 segundos. O programa Python utiliza o relógio virtual da execução.
