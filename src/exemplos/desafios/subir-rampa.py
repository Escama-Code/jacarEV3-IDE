"""Subir rampa — mapa: fll / rampa."""
import time
from jacarev3 import RoboEV3

with RoboEV3('00:16:53:64:F8:B8') as robo:
    robo.led('LARANJA')
    robo.mover_continuo('B', 34)
    robo.mover_continuo('C', 34)
    time.sleep(2.6)
    robo.parar_motor('B')
    robo.parar_motor('C')
    time.sleep(0.4)
    robo.apitar(660, 150)
    print('Trecho da rampa concluído (confira no 3D).')
