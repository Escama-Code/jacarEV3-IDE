"""Primeiros movimentos — mapa: treino / padrao. Respeita inércia."""
import time
from jacarev3 import RoboEV3

with RoboEV3('00:16:53:64:F8:B8') as robo:
    robo.led('VERDE')
    robo.mover_continuo('B', 26); robo.mover_continuo('C', 26); time.sleep(1.1)
    robo.parar_motor('B'); robo.parar_motor('C'); time.sleep(0.45)
    robo.mover_continuo('B', -20); robo.mover_continuo('C', -20); time.sleep(0.8)
    robo.parar_motor('B'); robo.parar_motor('C'); time.sleep(0.35)
    robo.mover_continuo('B', 22); robo.mover_continuo('C', -22); time.sleep(0.65)
    robo.parar_motor('B'); robo.parar_motor('C')
    robo.led('DESLIGADO')
    print('Ok.')
