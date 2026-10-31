"""Teleop pelo código da IDE (Rodar script).

WASD/setas = andar | Espaço = parar | E = apitar | Q/R = LED | Esc = sair
Gamepad: stick/D-pad | B = parar | A = apitar | X/Y = LED | Start = sair

O await gamepadPonte.teleop(segundos, velocidade) inicia o modo ao vivo.
"""
from js import gamepadPonte

print("Teleop 90s pelo código — mexa WASD ou o controle")
await gamepadPonte.teleop(90, 45)
print("fim do teleop")
