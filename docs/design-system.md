# Design system jacarEV3

## Logo

| Arquivo | Uso |
|---------|-----|
| `src/assets/ui/logo-icon.svg` | Ícone só (home, favicon) |
| `src/assets/ui/logo-header.svg` | Header das telas internas |
| `src/assets/ui/logo.svg` | Wordmark completo (docs / apresentação) |

Verde marca: `#b8f52a` (`--brand` em `tokens.css`).

## Telas

Todas as internas usam:

```
tokens.css → base.css → efeitos.css → shell.css → [página]
```

`shell.css` = fundo grade + **header único** (logo + nav Campanha / Sandbox / Blocos / Mapas).

| Página | CSS extra |
|--------|-----------|
| `index.html` | menu.css |
| `sandbox.html` / `missao.html` | main + campanha + dialogo |
| `campanha.html` | campanha |
| editores | editores.css |

## Padronização

1. Cores só via tokens  
2. Header só via `.app-header`  
3. Logo só pelos SVG em `assets/ui`  
4. Novas telas: `body.app-shell` + mesmo header  
