import time
from jacarev3 import RoboEV3, protocolo as p

with RoboEV3('00:16:53:64:F8:B8') as robo:
    robo.led('VERDE')
    while True:
        d = robo.ler_sensor(4, p.MODO_ULTRASSONICO_CM)
        if d < 15:
            robo.apitar(frequencia=880, duracao_ms=150)
            robo.mover_base(velocidade=-30, direcao=0, duracao_ms=600)
            time.sleep(0.7)
            while robo.ler_sensor(4, p.MODO_ULTRASSONICO_CM) < 30:
                robo.mover_base(velocidade=25, direcao=200, duracao_ms=200)
                time.sleep(0.25)
        else:
            robo.mover_base(velocidade=40, direcao=0, duracao_ms=300)
            time.sleep(0.1)
