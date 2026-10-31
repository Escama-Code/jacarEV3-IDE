# Limpeza de arquivos mortos (out/2026)

Removidos por não serem carregados pelas páginas ativas ou estarem abandonados:

| Item | Motivo |
|------|--------|
| `src/multiplayer/` | Multiplayer desistido por agora |
| `scripts/mp-relay.*` | Relay do multiplayer |
| `src/css/multiplayer.css`, `style.css` | CSS sem referência nas páginas |
| `src/js/main.js` + `src/js/animais/` | Entrada legada não usada pelo HTML |
| `src/js/cena3d.mjs`, `modelos3d.mjs` (raiz) | Duplicata; ativo é `src/js/3d/` |
| `src/js/core/` | Cópia antiga de sim/cenarios; páginas usam `src/js/cenarios.js` e sim embutido |
| `docs/multiplayer-*.md`, `docs/patch-*.md` | Notas temporárias / feature cancelada |

Teste `teste-colisao-sarena.mjs` passou a apontar para `src/js/sim.js`.
