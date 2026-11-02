"""Seguidor 1 sensor (porta 3) — Pista de Treino.

Calibrado para a física com inércia: velocidade moderada + ciclo ~25 Hz.
"""
import time
from jacarev3 import RoboEV3, protocolo as p

# Preto típico < 25–35; branco > 55 (ajuste se calibrar no EV3 real)
LIMIAR = 38
V_LENTA = 14
V_RAPIDA = 28
DT = 0.04

with RoboEV3('00:16:53:64:F8:B8') as robo:
    robo.led('VERDE')
    while True:
        luz = float(robo.ler_sensor(3, p.MODO_COR_REFLETIDA))
        if luz < LIMIAR:
            # sobre o preto (ou borda interna) → puxa para a direita
            robo.mover_continuo('B', V_LENTA)
            robo.mover_continuo('C', V_RAPIDA)
        else:
            robo.mover_continuo('B', V_RAPIDA)
            robo.mover_continuo('C', V_LENTA)
        time.sleep(DT)
