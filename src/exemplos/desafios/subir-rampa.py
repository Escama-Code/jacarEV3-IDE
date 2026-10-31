import time
from jacarev3 import RoboEV3

with RoboEV3('00:16:53:64:F8:B8') as robo:
    robo.led('AMBAR')
    robo.mover_base(velocidade=40, direcao=0, duracao_ms=2000)
    time.sleep(2.2)
    robo.apitar()
    print('em cima da rampa!')
