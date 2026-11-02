"""Seguidor 1 sensor (porta 3) — mapa: treino / padrao."""
import time
from jacarev3 import RoboEV3, protocolo as p

LIMIAR = 38
V_LENTA = 12
V_RAPIDA = 26
DT = 0.04

with RoboEV3('00:16:53:64:F8:B8') as robo:
    robo.led('VERDE')
    while True:
        luz = float(robo.ler_sensor(3, p.MODO_COR_REFLETIDA))
        if luz < LIMIAR:
            robo.mover_continuo('B', V_LENTA)
            robo.mover_continuo('C', V_RAPIDA)
        else:
            robo.mover_continuo('B', V_RAPIDA)
            robo.mover_continuo('C', V_LENTA)
        time.sleep(DT)
