"""Seguidor de borda no tapete FLL (sensor porta 3).

Mapa grande e linha irregular — velocidade baixa e limiar generoso.
"""
import time
from jacarev3 import RoboEV3, protocolo as p

LIMIAR = 36
BASE = 18
DT = 0.045

with RoboEV3('00:16:53:64:F8:B8') as robo:
    robo.led('VERDE')
    while True:
        luz = float(robo.ler_sensor(3, p.MODO_COR_REFLETIDA))
        if luz < LIMIAR - 6:
            robo.mover_continuo('B', 8)
            robo.mover_continuo('C', BASE + 8)
        elif luz > LIMIAR + 10:
            robo.mover_continuo('B', BASE + 8)
            robo.mover_continuo('C', 8)
        else:
            robo.mover_continuo('B', BASE)
            robo.mover_continuo('C', BASE)
        time.sleep(DT)
