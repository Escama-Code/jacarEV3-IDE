"""OBR array + verde + US — mapa: treino / padrao."""
import time
from jacarev3 import RoboEV3, protocolo as p

VEL, K, LIMIAR, VERDE, DT = 20, 0.5, 40, 3, 0.04

with RoboEV3('00:16:53:64:F8:B8') as robo:
    robo.led('VERDE')
    while True:
        e = float(robo.ler_sensor(1, p.MODO_COR_REFLETIDA))
        c = float(robo.ler_sensor(2, p.MODO_COR_REFLETIDA))
        d = float(robo.ler_sensor(3, p.MODO_COR_REFLETIDA))
        cor_c = int(robo.ler_sensor(2, p.MODO_COR_COR))
        dist = float(robo.ler_sensor(4, p.MODO_ULTRASSONICO_CM))

        if dist < 12:
            robo.parar_motor('B'); robo.parar_motor('C')
            time.sleep(0.3)
            continue
        if cor_c == VERDE:
            robo.mover_continuo('B', 24); robo.mover_continuo('C', -6)
            time.sleep(0.55)
            robo.parar_motor('B'); robo.parar_motor('C')
            time.sleep(0.2)
            continue
        if e > LIMIAR and c > LIMIAR and d > LIMIAR:
            robo.mover_continuo('B', 14); robo.mover_continuo('C', -14)
        else:
            erro = e - d
            robo.mover_continuo('B', max(-55, min(55, int(VEL - K * erro))))
            robo.mover_continuo('C', max(-55, min(55, int(VEL + K * erro))))
        time.sleep(DT)
