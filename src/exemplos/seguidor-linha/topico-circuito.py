"""Seguidor com array 3 sensores (1=esq, 3=dir) — OBR.

erro = dir - esq: se a direita vê mais preto (valor menor), erro negativo → corrige.
"""
import time
from jacarev3 import RoboEV3, protocolo as p

VEL = 22
K = 0.55
DT = 0.04

with RoboEV3('00:16:53:64:F8:B8') as robo:
    robo.led('VERDE')
    while True:
        e = float(robo.ler_sensor(1, p.MODO_COR_REFLETIDA))
        d = float(robo.ler_sensor(3, p.MODO_COR_REFLETIDA))
        # refletida: menor = mais preto
        erro = e - d  # positivo → esquerda mais clara que direita → vira à esquerda
        v_esq = max(-60, min(60, int(VEL - K * erro)))
        v_dir = max(-60, min(60, int(VEL + K * erro)))
        robo.mover_continuo('B', v_esq)
        robo.mover_continuo('C', v_dir)
        time.sleep(DT)
