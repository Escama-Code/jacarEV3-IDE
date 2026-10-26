# Como adicionar um novo modelo 3D (animal / robô)

Cada animal vive em **um arquivo próprio** em `src/js/3d/modelos/`.

## Estrutura atual

```text
src/js/3d/modelos/
├── _helpers.mjs          # Geometria compartilhada (roda, sensor, feixe, LCD…)
├── aplicar-estado.mjs    # Aplica posição/LED/sensor no rig
├── index.mjs             # Reexporta tudo (ponto de entrada)
├── ev3.mjs
├── jacare.mjs
├── capivara.mjs
└── caranguejo.mjs
```

## Passo a passo para criar um novo animal

### 1. Crie o arquivo do modelo

Exemplo: `src/js/3d/modelos/tartaruga.mjs`

```js
import * as THREE from 'three';
import {
  M, pronto, posicionar, caixa, cil, chanfrada, cone,
  construirRoda, criarFeixe, RAIO_RODA,
} from './_helpers.mjs';

export function construirRoboTartaruga() {
  const root = new THREE.Group();
  root.name = 'tartaruga';

  // Rodas funcionais (obrigatório — a física usa encoders B e C)
  const rodaB = construirRoda('ev3', +1); // +1 = esquerda (porta B)
  const rodaC = construirRoda('ev3', -1); // -1 = direita (porta C)
  root.add(rodaB, rodaC);

  // Seu corpo / casco / cabeça com as helpers (caixa, cil, cone…)
  // ...

  // LEDs (material com emissive) — lista usada por aplicarEstado
  const ledMat = new THREE.MeshStandardMaterial({
    color: 0x1a1d1f, emissive: 0x000000, emissiveIntensity: 1.5, roughness: 0.3,
  });
  root.add(caixa(0.8, 0.14, 0.32, ledMat, 0, 6, 0));

  // Feixe do sensor de cor (obrigatório)
  const feixe = criarFeixe(1.4);
  posicionar(feixe.grupo, 0, 0, 5.5);
  root.add(feixe.grupo);

  // Animação opcional (cauda, boca, garras…)
  function animar(est) {
    // est.t, est.bip, est.encB, est.encC, …
  }

  // Interface obrigatória do rig
  return {
    nome: 'tartaruga',
    grupo: root,
    rodaB,
    rodaC,
    leds: [ledMat],
    feixe,
    animar,
  };
}
```

### 2. Exporte no `index.mjs`

```js
export { construirRoboTartaruga } from './tartaruga.mjs';
```

### 3. Registre em `cena3d.mjs`

```js
import { construirRoboTartaruga, /* … */ } from './modelos/index.mjs';

const ROBOS = {
  // …
  tartaruga: construirRoboTartaruga,
};
```

### 4. Adicione a opção no HTML

Em `public/index.html`, no `<select id="robo3d">`:

```html
<option value="tartaruga">Robô: Tartaruga</option>
```

> Enquanto a lógica 3D ainda estiver embutida no HTML, atualize também a cópia interna do mapa de robôs (procure por `Vista3D` / `construirRobo`).

### 5. Teste

```bash
python3 -m http.server 8000
# http://localhost:8000/public/
```

Selecione o novo robô no seletor 3D.

## Interface do rig (contrato)

| Campo     | Obrigatório | Descrição |
|-----------|-------------|-----------|
| `grupo`   | sim | `THREE.Group` raiz do modelo |
| `rodaB`   | sim | Mesh/Group da roda esquerda (gira em `rotation.x`) |
| `rodaC`   | sim | Mesh/Group da roda direita |
| `leds`    | sim | Array de materiais com `emissive` |
| `feixe`   | sim | `{ grupo, matCone, matMancha }` de `criarFeixe()` |
| `animar`  | não | `(est) => void` para animações extras |
| `lcd`     | não | LCD com `.desenhar(est)` |
| `partes`  | não | Referências internas para animação |

## Convenções

- 1 unidade = **1 cm**
- Eixo **Y** para cima; o robô olha para **+Z**
- Origem = centro do eixo das rodas, no chão
- Nome do arquivo em **kebab-case**: `meu-animal.mjs`
- Função em **PascalCase** após `construirRobo`: `construirRoboMeuAnimal`
- Chave no mapa `ROBOS` em **camelCase** ou minúsculo: `meuAnimal` / `tartaruga`
