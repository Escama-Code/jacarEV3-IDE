import time
from jacarev3 import RoboEV3

with RoboEV3('00:16:53:64:F8:B8') as robo:
    robo.apitar()
    robo.led('VERDE')
    robo.girar_motor('B', velocidade=40, duracao_ms=1000)
    robo.mover_base(velocidade=30, direcao=0, duracao_ms=500)
    time.sleep(1)
    robo.girar_motor_graus('C', 360, 50)
    print('encoder C =', robo.ler_graus_motor('C'), 'graus')
    print('luz refletida porta 3 =', robo.ler_sensor(3, 0))
