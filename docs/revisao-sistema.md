# Revisão do sistema — status

## Feito (P0 + P1 viável)

| Item | Status |
|------|--------|
| **P0** SimEV3 só em `src/js/sim.js` (HTML não embute mais a classe) | ✅ |
| **P1** Toolbar da arena no mesmo visual do editor | ✅ |
| **P1** Pacote base `mapas/obr/*.json` | ✅ esqueleto |
| **P1** `src/js/editor/validarMapa.mjs` | ✅ módulo pronto |
| **P1** Array 3 cores com lateral + média estável | ✅ |
| **P1** Garra + `cen.vitimas` (pegar/soltar básico) | ✅ básico |
| **P1** `avaliarObjetivosCodigo` em pontuacao | ✅ |
| **P1** Teste de inércia (`tests/teste-fisica-inercia.mjs`) | ⚠️ precisa ajuste ESM/CJS |

## Ainda falta

### P1 residual
1. Mapas OBR **completos** `.jcrv3map` jogáveis no Sandbox  
2. Conectar `validarMapa` no botão **Salvar** do editor de blocos  
3. Vítimas **visíveis no 3D** + missão de resgate na campanha  
4. Objetivos de **simulação** (região, distância), não só código  
5. Testes verdes de ponta a ponta nos exemplos Python  

### P2
6. Tour 1ª visita / mascote PNG  
7. Preview 3D fiel no editor  
8. Import `.sArena` mais robusto  
9. Responsivo tablet + acessibilidade  
10. Build Vite para GitHub Pages  

### P3
11. Progresso na nuvem / sala do professor  
12. Multiplayer  
13. BNCC/ODS por missão  
