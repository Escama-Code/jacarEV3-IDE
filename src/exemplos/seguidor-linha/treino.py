"""Seguidor 1 sensor (porta 3) — Pista de Treino.

Calibrado para mitigar inércia final: velocidade corrigida e terceiro estado de busca.
"""
import time
from jacarev3 import RoboEV3, protocolo as p

LIMIAR = 38
V_LENTA = 10
V_RAPIDA = 24
DT = 0.035

with RoboEV3('00:16:53:64:F8:B8') as robo:
    robo.led('VERDE')
    while True:
        luz = float(robo.ler_sensor(3, p.MODO_COR_REFLETIDA))
        
        if luz < LIMIAR:
            robo.mover_continuo('B', V_RAPIDA)
            robo.mover_continuo('C', V_LENTA)
        elif luz > 65:
            robo.mover_continuo('B', -5)
            robo.mover_continuo('C', V_RAPIDA)
        else:
            robo.mover_continuo('B', V_LENTA)
            robo.mover_continuo('C', V_RAPIDA)
            
        time.sleep(DT)
