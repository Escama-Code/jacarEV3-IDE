"""Garra (motor A): graus sempre positivos; velocidade negativa inverte."""
import time
from jacarev3 import RoboEV3

with RoboEV3('00:16:53:64:F8:B8') as robo:
    robo.led('LARANJA')
    print('Fechando…')
    robo.girar_motor_graus('A', 90, 35)
    time.sleep(0.35)
    print('Abrindo…')
    robo.girar_motor_graus('A', 90, -35)
    time.sleep(0.35)
    robo.led('VERDE')
    print('Ok — veja a garra no 3D.')
