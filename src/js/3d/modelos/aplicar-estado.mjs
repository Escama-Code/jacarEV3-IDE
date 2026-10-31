// ============================================================
// aplicar-estado.mjs — aplica um instante do playback no rig 3D
// est = { x, y, th, t, encA..encD, led, ledAlpha, refletida, bip, pitch?, roll?, z? }
// ============================================================
import { DEG, COR_LED } from './helpers.mjs';

export function aplicarEstado(rig, est) {
  rig.grupo.position.set(est.x, est.z || 0, est.y);             // sim (x,y) → mundo (X,Z); z = altura do terreno (rampa)
  rig.grupo.rotation.order = 'YXZ';                             // 1º rumo (Y), depois inclinação e rolagem nos eixos do próprio robô
  rig.grupo.rotation.set(-(est.pitch || 0), Math.PI / 2 - est.th, est.roll || 0);   // +Z local → (cosθ, 0, sinθ); pitch>0 = nariz pra cima; roll>0 = lado esquerdo mais alto
  rig.rodaB.rotation.x = est.encB * DEG;                        // encoder REAL do sim.js
  rig.rodaC.rotation.x = est.encC * DEG;
  const base = String(est.led || 'DESLIGADO').split('_')[0];
  const cor = COR_LED[base] ?? 0, a = est.ledAlpha ?? 1;
  for (const m of rig.leds) {
    m.emissive.setHex(cor); m.emissiveIntensity = 1.8 * a;
    m.color.setHex(cor ? cor : 0x1a1d1f);
  }
  const k = Math.max(0, Math.min(1, (est.refletida - 5) / 65));   // 0 = linha preta, 1 = fundo branco
  rig.feixe.matMancha.color.setRGB(0.08 + 0.87 * k, 0.08 + 0.87 * k, 0.08 + 0.87 * k);   // cor da superfície lida
  rig.feixe.matCone.color.setRGB(1, 0.16 + 0.2 * k, 0.1 + 0.15 * k);
  rig.feixe.matCone.opacity = 0.22 + 0.4 * k;
  if (rig.garra && rig.garra.esq) {
    const f = Math.max(0, Math.min(1, Math.abs(Number(est.encA) || 0) / 85));
    const ang = 0.55 - f * 0.47;
    rig.garra.esq.rotation.y = -ang;
    rig.garra.dir.rotation.y = ang;
  }
  if (rig.animar) rig.animar(est);
}

