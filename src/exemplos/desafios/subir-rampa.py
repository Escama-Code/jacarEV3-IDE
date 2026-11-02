"""Sobe rampa com velocidade constante e tempo de acomodação."""
import time
from jacarev3 import RoboEV3

with RoboEV3('00:16:53:64:F8:B8') as robo:
    robo.led('LARANJA')
    # potência média: em rampa, aceleração brusca derrapa na simulação
    robo.mover_continuo('B', 36)
    robo.mover_continuo('C', 36)
    time.sleep(2.4)
    robo.parar_motor('B')
    robo.parar_motor('C')
    time.sleep(0.5)
    robo.apitar(660, 150)
    print('Topo (ou fim do trecho) — confira no mapa com rampa.')
