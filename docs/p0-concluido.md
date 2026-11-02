# P0 concluído

1. **Exemplos alinhados** — `exemplos.json` com cenario/inicio válidos; ao selecionar o programa o mapa é aplicado automaticamente.
2. **Sensores** — portas 1–3 laterais + modos refletida/cor no `src/js/sim.js`.
3. **Fonte única** — `SimEV3` só em `src/js/sim.js` (sandbox/missão via `<script src>`).

Validação: `node tests/validar-catalogo-exemplos.mjs`
