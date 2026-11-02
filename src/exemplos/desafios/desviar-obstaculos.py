"""Desvia de obstáculo com ultrassom (porta 4).

Ré e giro com pausas: a física precisa de tempo para frear antes de virar.
"""
import time
from jacarev3 import RoboEV3, protocolo as p

VEL = 32
DT = 0.08

with RoboEV3('00:16:53:64:F8:B8') as robo:
    robo.led('VERDE')
    while True:
        d = robo.ler_sensor(4, p.MODO_ULTRASSONICO_CM)
        if d < 16:
            robo.apitar(880, 120)
            robo.parar_motor('B')
            robo.parar_motor('C')
            time.sleep(0.35)

            # ré curta
            robo.mover_continuo('B', -22)
            robo.mover_continuo('C', -22)
            time.sleep(0.55)
            robo.parar_motor('B')
            robo.parar_motor('C')
            time.sleep(0.3)

            # gira até abrir espaço
            for _ in range(12):
                if robo.ler_sensor(4, p.MODO_ULTRASSONICO_CM) >= 28:
                    break
                robo.mover_continuo('B', 22)
                robo.mover_continuo('C', -22)
                time.sleep(0.2)
            robo.parar_motor('B')
            robo.parar_motor('C')
            time.sleep(0.25)
        else:
            robo.mover_continuo('B', VEL)
            robo.mover_continuo('C', VEL)
            time.sleep(DT)
