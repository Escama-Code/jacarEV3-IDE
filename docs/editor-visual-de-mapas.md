# Editores de mapas

Dois editores **fora** do Sandbox:

| Página | Tipo |
|--------|------|
| `public/editor-mapas-blocos.html` | **Por blocos** — ladrilhos OBR 30×30 cm |
| `public/editor-mapas.html` | **Livre** — traço, objetos, salas (v2) |

## Blocos
- `src/js/editor/obrCatalogo.js`
- `src/js/editor/mapaModular.js`
- Formato `.jcrv3map` v2 `modo: modular-obr`

## Livre
- `src/js/editor/mapaEditorCore.js` + `mapaEditor.js`
- Formato `.jmap` / `.jcrv3map` v2 traços

Sandbox só abre os editores e **importa** o arquivo pronto.
