# Modo campanha — Academia jacarEV3

## Trilha (ordem fixa)

1. **Primeiros passos** (`codigos-base`) — LED, motores, 1 sensor, seguidor básico  
2. **Sensores OBR** (`sensores-obr`) — portas 1–3, ultrassom, garra A, array  
3. **Leis de trânsito** (`leis-transito`) — sinalizar, parar, zona  
4. **Desafios de pista** (`competicao`) — reto, giro, linha, desvio  

Um módulo só libera quando **todas** as missões do anterior estão `concluida`.

## Arquivos

| Arquivo | Papel |
|---------|--------|
| `src/campanha/dados/campanha.json` | Lista de módulos |
| `src/campanha/dados/temas/*.json` | Missões de cada módulo |
| `src/campanha/motor.mjs` | Avaliação de objetivos |
| `src/campanha/pontuacao.mjs` | Estrelas / similaridade |
| `public/campanha.html` | Escolha de módulo e missão |
| `public/missao.html` | IDE da missão + painel de dicas |

## Regras didáticas

- Editor abre só com **esqueleto** (`codigoInicial`), não com a solução.  
- **Dica** manual ou a cada **3 falhas**.  
- **Código de referência** só com **≥ 3 estrelas**.  

## Acrescentar missão

1. Edite o JSON do tema.  
2. Preencha `objetivos`, `dicas`, `codigosReferencia`, `setup.codigoInicial`.  
3. Ajuste `ordem` global se quiser.  
4. Não precisa mudar JS do motor se usar tipos já suportados (`api_usada`, `dist_min`, …).
