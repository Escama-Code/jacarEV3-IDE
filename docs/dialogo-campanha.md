# Diálogo da campanha

Conversa com o estudante em momentos-chave da missão.

## Pasta

```
src/campanha/dialogo/
  personagens.json   # quem fala (emoji, nome, cor)
  falas-padrao.json  # fallback se a missão não tiver fala
  dialogo.mjs        # motor + UI (typewriter, Continuar/Pular)
```

## Eventos

| Evento | Quando |
|--------|--------|
| `intro` | Ao abrir a missão |
| `dica` | Pedir dica / dica automática |
| `fracasso` | Tentativa que não passou |
| `sucesso` | Objetivos cumpridos |
| `referencia` | Ao liberar código de referência (3★+) |

## Como escrever em um módulo

No JSON da missão (qualquer tema):

```json
"dialogos": {
  "intro": [
    { "personagem": "instrutor", "texto": "Primeira fala…" },
    { "personagem": "instrutor", "texto": "Segunda fala…" }
  ],
  "sucesso": [
    { "personagem": "arbitro", "texto": "Mandou bem!" }
  ],
  "fracasso": [
    { "personagem": "instrutor", "texto": "Ainda falta algo…" }
  ],
  "dica": [
    { "personagem": "assistente", "texto": "Olhe de novo o enunciado." }
  ]
}
```

Personagens padrão: `instrutor`, `assistente`, `arbitro` (ver `personagens.json`).

Também vale o campo antigo `narrativa.intro|sucesso|fracasso` — o motor aceita os dois.

## Novo personagem

1. Adicione em `personagens.json`.
2. Use o `id` em `personagem` nas falas.
