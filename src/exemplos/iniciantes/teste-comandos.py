"""Tour rápido dos comandos básicos (LED, bip, base, graus)."""
import time
from jacarev3 import RoboEV3

with RoboEV3('00:16:53:64:F8:B8') as robo:
    robo.led('LARANJA')
    robo.apitar(880, 120)
    time.sleep(0.2)

    robo.led('VERDE')
    # mover_base: um trecho curto e tempo extra para a física assentar
    robo.mover_base(velocidade=30, direcao=0, duracao_ms=800)
    time.sleep(1.0)

    # Giro ~90° com graus (vel positiva; sentido pelo sinal da velocidade)
    robo.girar_motor_graus('B', 180, 35)
    robo.girar_motor_graus('C', 180, -35)
    time.sleep(0.5)

    robo.parar_motor('B')
    robo.parar_motor('C')
    robo.led('DESLIGADO')
    print('Comandos ok.')
