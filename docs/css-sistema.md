# Sistema de CSS

## Ordem obrigatória

```html
<link rel="stylesheet" href="../src/css/tokens.css">
<link rel="stylesheet" href="../src/css/base.css">
<link rel="stylesheet" href="../src/css/….css">  <!-- página -->
```

| Arquivo | Função |
|---------|--------|
| **tokens.css** | Cores, raios, alturas — **mude só aqui** para retema |
| **base.css** | Botões, inputs, links, `.painel` |
| **main.css** | Layout IDE (header, grid, editor, terminal, palco) |
| **campanha.css** | Lobby e HUD da campanha |
| **dialogo.css** | Balão de conversa |
| **menu.css** | `index.html` |
| **editores.css** | Editores de mapa |

## Trocar tema (exemplo)

Em `tokens.css`:

```css
--bg: #0b1020;
--acc: #ff7a18;
--brand: #5eead4;
```

Salva e recarrega. IDE, campanha e menu acompanham.

## Não faça

- Novas cores hardcoded (`#3ecf8e`) em HTML/JS — use `var(--brand)`
- Novo `<style>` gigante na página — extraia para o CSS da feature

## efeitos.css

Animações e avatares. Ver `docs/assets-e-efeitos.md`.

