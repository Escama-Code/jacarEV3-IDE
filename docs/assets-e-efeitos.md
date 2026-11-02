# Assets e efeitos

## Pastas

```
src/assets/
  ui/                         # logos, ícones gerais
  campanha/avatares/          # personagens do diálogo
  campanha/efeitos/           # estrela, confete…
  anim/sprites/               # sprites de animação (walk, idle)
src/css/efeitos.css           # classes de animação
```

## 1. Só animar um elemento

```html
<div class="fx-pulse">…</div>
<button class="fx-glow">Rodar</button>
```

| Classe | Efeito |
|--------|--------|
| `fx-fade-in` | Aparece |
| `fx-bounce-in` | Quica na entrada |
| `fx-slide-up` | Sobe |
| `fx-pulse` | Pulsa (loop) |
| `fx-glow` | Brilho (loop) |
| `fx-spin` | Gira |
| `fx-float` | Flutua |

No JS:

```js
el.classList.add('fx-bounce-in');
```

## 2. Estrelas da campanha

```html
<span class="fx-star is-on"></span>
<span class="fx-star is-off"></span>
```

## 3. Avatar (PNG/SVG)

Troque o arquivo **mantendo o nome**:

- `src/assets/campanha/avatares/instrutor.svg` → pode ser `instrutor.png`
- Se usar `.png`, atualize `personagens.json`:

```json
"avatar": "../../assets/campanha/avatares/instrutor.png"
```

Classes CSS opcionais:

```html
<div class="fx-avatar fx-avatar--instrutor fx-float"></div>
```

## 4. Nova imagem solta

1. Coloque em `src/assets/ui/minha-arte.png`
2. No CSS da feature:

```css
.minha-arte {
  width: 120px;
  height: 120px;
  background: url("../assets/ui/minha-arte.png") center / contain no-repeat;
}
```

3. Ou no HTML:

```html
<img src="../src/assets/ui/minha-arte.png" alt="" class="fx-bounce-in" width="120">
```

## 5. Sprite sheet (animação quadro a quadro)

1. PNG em `src/assets/anim/sprites/robo-walk.png` (ex.: 4 frames de 64px)
2. CSS:

```css
.robo-walk {
  width: 64px; height: 64px;
  background: url("../assets/anim/sprites/robo-walk.png") 0 0 / 256px 64px;
  animation: walk 0.4s steps(4) infinite;
}
@keyframes walk {
  to { background-position: -256px 0; }
}
```

## Lembrete

- **Cores** → `tokens.css`
- **Animação / PNG** → `assets/` + `efeitos.css` (ou CSS da feature)
