# jacarEV3 IDE

IDE educacional para programação de robôs virtuais, com simulação 2D/3D no navegador.

Usa **Python real** (via [Pyodide](https://pyodide.org/)) e a biblioteca [jacarev3](https://pypi.org/project/jacarev3/), com visualização 2D (Canvas) e 3D ([Three.js](https://threejs.org/)).

## Estrutura do projeto

```text
jacarEV3-IDE/
├── public/
│   └── index.html              # Aplicação principal (abrir no navegador)
├── src/
│   ├── css/
│   │   └── main.css            # Estilos da interface
│   ├── js/
│   │   ├── core/               # Núcleo da simulação
│   │   │   ├── sim.js          # Simulação 2D e lógica do robô EV3
│   │   │   └── cenarios.js     # Cenários e tapetes (sensor de cor)
│   │   ├── 3d/                 # Visualização Three.js
│   │   │   ├── cena3d.mjs      # Cena 3D (luzes, câmeras, arena)
│   │   │   ├── modelos3d.mjs   # Reexport (compatibilidade)
│   │   │   └── modelos/        # Um arquivo por animal
│   │   │       ├── _helpers.mjs
│   │   │       ├── index.mjs
│   │   │       ├── ev3.mjs
│   │   │       ├── jacare.mjs
│   │   │       ├── capivara.mjs
│   │   │       └── caranguejo.mjs
│   │   ├── ui/                 # (futuro) Componentes de interface
│   │   └── utils/              # (futuro) Funções utilitárias
│   └── assets/
│       ├── images/             # Ícones, logos, texturas
│       ├── sounds/             # Sons de feedback
│       └── models/             # Futuros modelos .glb/.gltf
├── docs/                       # Documentação técnica
├── tests/                      # Testes automatizados
│   ├── unit/
│   └── fixtures/
├── scripts/                    # Scripts auxiliares
├── package.json
├── .gitignore
└── README.md
```

## Como executar

### Opção 1 — Servidor HTTP local (recomendado)

```bash
# Na raiz do projeto
python3 -m http.server 8000
# ou
npm start
```

Acesse: **http://localhost:8000/public/**

### Opção 2 — Abrir o HTML diretamente

Abra `public/index.html` no navegador.  
Alguns navegadores podem bloquear módulos ES ou CDNs ao abrir via `file://`. Nesse caso, use a opção 1.

## Funcionalidades

- Editor Python com autocomplete (Monaco Editor)
- Execução real da biblioteca `jacarev3` via Pyodide
- Simulação 2D com leitura de sensor de cor no tapete
- Vista 3D com modelos: LEGO EV3, Jacaré, Capivara e Caranguejo
- Cenários configuráveis (treino, FLL, etc.)
- Reprodução da trajetória do robô (play / scrub)

## Organização do código

| Pasta            | Responsabilidade                                      |
|------------------|--------------------------------------------------------|
| `public/`        | Arquivos servidos ao navegador (entrada da app)        |
| `src/css/`       | Estilos                                               |
| `src/js/core/`   | Domínio: simulação, cenários, protocolo EV3           |
| `src/js/3d/`     | Visualização 3D (Three.js)                            |
| `src/js/ui/`     | Interface (editor, controles, terminal) — futuro      |
| `src/assets/`    | Mídias e recursos estáticos                           |
| `docs/`          | Guias de arquitetura e contribuição                   |
| `tests/`         | Testes unitários e fixtures                           |

> **Nota:** A vista 3D e os modelos de animais são carregados como ES modules a partir de `src/js/3d/`.  
> A lógica de UI, Pyodide e simulação 2D ainda vive embutida em `public/index.html` e pode ser extraída depois.  
> **Importante:** sirva sempre a partir da **raiz do projeto** (não só a pasta `public/`), para que os imports `../src/...` resolvam.

## Convenções de nomenclatura

- **Pastas:** kebab-case (`src/js/core`)
- **Arquivos JS:** camelCase ou kebab-case (`sim.js`, `cena3d.mjs`)
- **Classes / construtores:** PascalCase (`SimEV3`, `construirRoboEV3`)
- **Funções e variáveis:** camelCase
- **Constantes:** UPPER_SNAKE_CASE (`CM_POR_GRAU`)

## Próximos passos sugeridos

1. Extrair a lógica embutida do `index.html` para módulos em `src/js/ui/` e `src/js/core/`
2. Adicionar testes unitários em `tests/unit/`
3. Documentar como criar novos cenários e modelos 3D em `docs/`
4. (Opcional) Adotar um bundler (Vite) para desenvolvimento mais confortável

## Licença

MIT
