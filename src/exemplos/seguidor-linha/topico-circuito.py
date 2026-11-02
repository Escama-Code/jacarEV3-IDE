"""Seguidor com array 3 sensores (1=esq, 3=dir) — OBR.

erro = esq - dir: se a direita vê mais preto (valor menor), erro positivo → corrige.
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
        
        # Refletida: menor = mais preto
        erro = e - d  # positivo → esquerda na área clara, direita na área escura (preto)
        
        # Correção proporcional invertida para garantir convergência ao centro da linha
        v_esq = max(-60, min(60, int(VEL + K * erro)))
        v_dir = max(-60, min(60, int(VEL - K * erro)))
        
        robo.mover_continuo('B', v_esq)
        robo.mover_continuo('C', v_dir)
        time.sleep(DT)
