"""Desvio por ultrassom — mapa: desvio / centro."""
import time
from jacarev3 import RoboEV3, protocolo as p

VEL, DT = 28, 0.08

with RoboEV3('00:16:53:64:F8:B8') as robo:
    robo.led('VERDE')
    while True:
        d = float(robo.ler_sensor(4, p.MODO_ULTRASSONICO_CM))
        if d < 16:
            robo.apitar(880, 100)
            robo.parar_motor('B'); robo.parar_motor('C'); time.sleep(0.35)
            robo.mover_continuo('B', -20); robo.mover_continuo('C', -20); time.sleep(0.5)
            robo.parar_motor('B'); robo.parar_motor('C'); time.sleep(0.25)
            for _ in range(14):
                if float(robo.ler_sensor(4, p.MODO_ULTRASSONICO_CM)) >= 28:
                    break
                robo.mover_continuo('B', 20); robo.mover_continuo('C', -20); time.sleep(0.18)
            robo.parar_motor('B'); robo.parar_motor('C'); time.sleep(0.2)
        else:
            robo.mover_continuo('B', VEL); robo.mover_continuo('C', VEL)
            time.sleep(DT)
