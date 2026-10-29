# Como adicionar um modelo 3D (sistema de catálogo)

A IDE **não** exige editar o HTML nem o `cena3d.mjs` a cada animal novo.  
Tudo passa por um **catálogo único**.

## Por que assim?

No navegador (ES modules, sem Vite/Webpack) **não dá** para listar automaticamente os arquivos de uma pasta.  
O browser só carrega o que você `import` de forma explícita.

Solução usada na jacarEV3 IDE:

1. Cada modelo = um arquivo `.mjs` com a função `construirRobo...()`
2. **Um único registro** em `catalogo.mjs` (id + label + construtor)
3. O mapa `ROBOS` e o `<select id="robo3d">` são **gerados a partir desse catálogo**

Assim você não coloca option 1 por 1 no HTML.

---

## Arquivos envolvidos

```text
src/js/3d/modelos/
├── catalogo.mjs          ← registre o modelo AQUI (1 import + 1 linha no array)
├── index.mjs             ← reexporta catálogo e construtores
├── helpers.mjs
├── aplicar-estado.mjs
├── ev3.mjs, jacare.mjs, … ← um arquivo por modelo

src/js/3d/cena3d.mjs      ← usa ROBOS do catálogo (não lista modelo a modelo)
public/missao.html
public/sandbox.html       ← <select id="robo3d"> vazio; preenchido por JS
```

API do catálogo:

| Export | Uso |
|--------|-----|
| `MODELOS` | Array `{ id, label, construir, ordem }` |
| `ROBOS` | `{ [id]: construir }` para `setRobo` |
| `listarModelos()` | Lista ordenada |
| `preencherSelectModelos('robo3d')` | Monta as `<option>` no select |

---

## Passo a passo

### 1. Criar o arquivo do modelo

Exemplo: `src/js/3d/modelos/tartaruga.mjs`

```js
import * as THREE from 'three';
import {
  M, posicionar, caixa,
  construirRoda, criarFeixe,
} from './helpers.mjs';

export function construirRoboTartaruga() {
  const root = new THREE.Group();
  root.name = 'tartaruga';

  // Rodas B/C — obrigatórias (física do sim)
  const rodaB = construirRoda('ev3', +1);
  const rodaC = construirRoda('ev3', -1);
  root.add(rodaB, rodaC);

  // … geometria do seu modelo …

  const ledMat = new THREE.MeshStandardMaterial({
    color: 0x1a1d1f,
    emissive: 0x000000,
    emissiveIntensity: 1.5,
    roughness: 0.3,
  });
  root.add(caixa(0.8, 0.14, 0.32, ledMat, 0, 6, 0));

  const feixe = criarFeixe(1.4);
  posicionar(feixe.grupo, 0, 0, 5.5);
  root.add(feixe.grupo);

  return {
    nome: 'tartaruga',
    grupo: root,
    rodaB,
    rodaC,
    leds: [ledMat],
    feixe,
    animar(est) {
      // opcional: est.t, est.encB, est.encC, est.bip, …
    },
  };
}
```

### 2. Registrar no catálogo (única edição “de sistema”)

Em `src/js/3d/modelos/catalogo.mjs`:

```js
import { construirRoboTartaruga } from './tartaruga.mjs';

export const MODELOS = [
  // … entradas já existentes …
  { id: 'tartaruga', label: 'Tartaruga', construir: construirRoboTartaruga, ordem: 14 },
];
```

Opcional: em `index.mjs`, reexportar o construtor se algum código antigo importar direto:

```js
export { construirRoboTartaruga } from './tartaruga.mjs';
```

### 3. Não precisa

- Adicionar `<option>` no `missao.html` / `sandbox.html`
- Editar o objeto `ROBOS` em `cena3d.mjs`
- Duplicar a lista em vários lugares

### 4. Usar

- No select da IDE: aparece **Robô: Tartaruga** sozinho  
- Na campanha JSON: `"robo3d": "tartaruga"` no `setup` da missão  
- No código: `vista.setRobo('tartaruga')`

---

## Interface obrigatória do “rig”

| Campo | Obrigatório | Função |
|-------|-------------|--------|
| `grupo` | sim | `THREE.Group` raiz |
| `rodaB`, `rodaC` | sim | rodas (encoders B e C) |
| `leds` | sim | array de materiais com `emissive` |
| `feixe` | sim | retorno de `criarFeixe` (sensor de cor) |
| `nome` | recomendado | id legível |
| `animar(est)` | opcional | animação por frame |
| `lcd` | opcional | se o modelo tiver tela |

---

## Fluxo interno

```text
catalogo.mjs  →  MODELOS[]  →  ROBOS{}
                    ↓
         preencherSelectModelos()  →  <select id="robo3d">
                    ↓
         cena3d.setRobo(id)  →  ROBOS[id]()  →  rig na cena
```

---

## Futuro (com bundler)

Se a IDE usar Vite:

```js
const mods = import.meta.glob('./*.mjs', { eager: true });
// montar MODELOS a partir dos módulos que exportam META + construir
```

Com o servidor estático atual, **catalogo.mjs é o caminho certo**.
