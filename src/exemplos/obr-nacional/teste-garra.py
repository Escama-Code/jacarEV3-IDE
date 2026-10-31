"""Teste da garra (motor A)."""
import time
from jacarev3 import RoboEV3

with RoboEV3('00:16:53:64:F8:B8') as robo:
    robo.led('LARANJA')
    print('Fechando garra…')
    robo.girar_motor_graus('A', 90, 40)
    time.sleep(0.3)
    print('Abrindo garra…')
    robo.girar_motor_graus('A', -90, 40)
    time.sleep(0.3)
    print('Fechando de novo…')
    robo.girar_motor_graus('A', 90, 40)
    robo.led('VERDE')
    print('Ok — observe a garra no 3D.')