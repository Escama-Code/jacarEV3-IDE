// ============================================================
// modelos3d.mjs — reexporta os modelos de ./modelos/
// Mantido para compatibilidade com imports antigos:
//   import { ... } from './modelos3d.mjs'
// Preferira importar de './modelos/index.mjs' nos arquivos novos.
// ============================================================
export {
  DEG,
  CM_POR_GRAU,
  COR_LED,
  construirRoboEV3,
  construirRoboJacare,
  construirRoboCapivara,
  construirRoboCaranguejo,
  construirRoboTubarao,
  construirRoboSapo,
  construirRoboElefante,
  construirRoboCamaleao,
  construirRoboEscorpiao,
  construirRoboCoruja,
  construirRoboArara,
  aplicarEstado,
} from './modelos/index.mjs';
