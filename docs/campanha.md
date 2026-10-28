# Campanha (JSON)

## Estrutura

```
src/campanha/
  pontuacao.mjs     # só similaridade + estrelas (várias respostas)
  motor.mjs         # objetivos de simulação + orquestra pontuação
  loader.mjs        # lê dados/*.json
  index.mjs         # API pública
  dados/
    campanha.json   # registro de temas
    temas/
      codigos-base.json
      leis-transito.json
```

## Novo tema

1. Crie `src/campanha/dados/temas/meu-tema.json` com `{ "id": "...", "missoes": [ ... ] }`
2. Registre em `dados/campanha.json` → `temas[]` com `arquivo: "temas/meu-tema.json"`

## Várias respostas certas

Em cada missão use o array `codigosReferencia` (não um único `codigoReferencia`):

```json
"codigosReferencia": [
  "solução A...",
  "solução B com outro estilo...",
  "solução C..."
]
```

O motor usa a **melhor** similaridade entre o código do aluno e qualquer alternativa.
