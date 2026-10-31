<<<<<<< HEAD
# Modo campanha — Academia jacarEV3

## Trilha (ordem fixa)

1. **Primeiros passos** (`codigos-base`) — LED, motores, 1 sensor, seguidor básico  
2. **Sensores OBR** (`sensores-obr`) — portas 1–3, ultrassom, garra A, array  
3. **Leis de trânsito** (`leis-transito`) — sinalizar, parar, zona  
4. **Desafios de pista** (`competicao`) — reto, giro, linha, desvio  

Um módulo só libera quando **todas** as missões do anterior estão `concluida`.

## Arquivos

| Arquivo | Papel |
|---------|--------|
| `src/campanha/dados/campanha.json` | Lista de módulos |
| `src/campanha/dados/temas/*.json` | Missões de cada módulo |
| `src/campanha/motor.mjs` | Avaliação de objetivos |
| `src/campanha/pontuacao.mjs` | Estrelas / similaridade |
| `public/campanha.html` | Escolha de módulo e missão |
| `public/missao.html` | IDE da missão + painel de dicas |

## Regras didáticas

- Editor abre só com **esqueleto** (`codigoInicial`), não com a solução.  
- **Dica** manual ou a cada **3 falhas**.  
- **Código de referência** só com **≥ 3 estrelas**.  

## Acrescentar missão

1. Edite o JSON do tema.  
2. Preencha `objetivos`, `dicas`, `codigosReferencia`, `setup.codigoInicial`.  
3. Ajuste `ordem` global se quiser.  
4. Não precisa mudar JS do motor se usar tipos já suportados (`api_usada`, `dist_min`, …).
=======
# Campanha (JSON + motor pedagógico)

## Estrutura

```
src/campanha/
  pontuacao.mjs     # similaridade + estrelas (várias respostas)
  motor.mjs         # objetivos de simulação + feedback + skills
  loader.mjs        # lê dados/*.json
  save.mjs          # localStorage, export/import, dicas em camadas
  index.mjs         # API pública
  dados/
    campanha.json   # registro de temas
    temas/
      codigos-base.json
      leis-transito.json
      competicao.json
```

## Temas atuais

1. **Códigos-base** — LED, motores, sensor, seguidor
2. **Leis de trânsito** — sinalizar, parar, zonas
3. **Competição (OBR-like)** — calibrar, reto, giroscópio, linha, desvio

## Novo tema

1. Crie `src/campanha/dados/temas/meu-tema.json` com `{ "id": "...", "missoes": [ ... ] }`
2. Registre em `dados/campanha.json` → `temas[]` com `arquivo: "temas/meu-tema.json"`

## Campos de uma missão

| Campo | Função |
|-------|--------|
| `codigosReferencia[]` | Várias soluções válidas (melhor similaridade) |
| `objetivos[]` | Critérios de simulação / API |
| `feedback{}` | Mensagem por id de objetivo que falhou |
| `skills[]` | Habilidades ao concluir |
| `dicas[]` | Camadas: string ou `{ camada, texto, custoXp }` |
| `links` | `{ docs, aula }` |
| `recompensas` | `{ xp, desbloqueia[] }` |
| `narrativa` | intro / sucesso / fracasso |

### Dicas em camadas

```json
"dicas": [
  { "camada": 0, "texto": "Ideia geral (grátis)", "custoXp": 0 },
  { "camada": 1, "texto": "Qual API usar", "custoXp": 5 },
  { "camada": 2, "texto": "Trecho quase pronto", "custoXp": 10 }
]
```

### Feedback por objetivo

```json
"feedback": {
  "andou": "Andou pouco; precisa de pelo menos 15 cm.",
  "parou": "Chame parar_motor ou parar_base no final."
}
```

## Tipos de objetivo

| tipo | Parâmetros | Significado |
|------|------------|-------------|
| `api_usada` | `metodos[]`, `qualquer?` | Todas as APIs (ou qualquer uma se `qualquer: true`) |
| `api_proibida` | `metodos[]` | Nenhuma dessas APIs |
| `ordem_apis` | `metodos[]` | Ordem relativa no código |
| `dist_min` | `cm` | Distância mínima |
| `regiao` | `regiao: {x,y,w,h}` | Dentro do retângulo |
| `tempo_sim` | `maxS` | Tempo de simulação |
| `sem_colisao` | `max` | Máx. colisões |
| `angulo_final` | `min`, `max` | Heading final |
| `heading_perto` | `graus`, `tolerancia` | Perto do ângulo alvo |
| `passou_linha` | `minS` | Tempo sobre a linha |
| `parou_antes_obstaculo` | `maxCm`, `velMax?` | Perto e parado |
| `sem_sair_pista` | `bounds?` | Dentro dos limites |

## Skills e save

- Skills incrementam em `save.skills` ao concluir
- Lobby: mapa de habilidades + **Exportar/Importar progresso**
- `exportarSave` / `importarSave` em `save.mjs`

## API JS

```js
await Campanha.initCampanha();
const r = Campanha.avaliar(sim, codigo, missao);
// r.feedback[], r.skillsGanhas[], r.ok, r.estrelas
Campanha.aplicarResultado(save, missao, r);
Campanha.consumirDica(save, missao);
Campanha.resumoSkills(save);
```
>>>>>>> ebe5f226f8c18e9f1d296621ded67aa7bdc8a36e
