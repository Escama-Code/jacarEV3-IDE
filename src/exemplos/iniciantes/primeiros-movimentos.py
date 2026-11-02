"""Primeiros movimentos — acelera e freia de verdade.

Com a física nova, o robô sobe e desce a velocidade aos poucos.
Por isso usamos time.sleep depois de parar / mudar direção.
"""
import time
from jacarev3 import RoboEV3

with RoboEV3('00:16:53:64:F8:B8') as robo:
    robo.led('VERDE')

    # Frente suave
    robo.mover_continuo('B', 28)
    robo.mover_continuo('C', 28)
    time.sleep(1.2)

    # Freio: comando 0 + tempo para a inércia dissipar
    robo.parar_motor('B')
    robo.parar_motor('C')
    time.sleep(0.45)

    # Ré
    robo.mover_continuo('B', -22)
    robo.mover_continuo('C', -22)
    time.sleep(0.9)

    robo.parar_motor('B')
    robo.parar_motor('C')
    time.sleep(0.4)

    # Giro no lugar (curto — guinada tem limite)
    robo.mover_continuo('B', 25)
    robo.mover_continuo('C', -25)
    time.sleep(0.7)

    robo.parar_motor('B')
    robo.parar_motor('C')
    robo.led('DESLIGADO')
    print('Pronto — observe aceleração e freio no 3D.')
