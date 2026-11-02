"""Array 3 sensores — mapa: treino / padrao. Portas 1=esq 3=dir."""
import time
from jacarev3 import RoboEV3, protocolo as p

VEL = 20
K = 0.5
DT = 0.04

with RoboEV3('00:16:53:64:F8:B8') as robo:
    robo.led('VERDE')
    while True:
        e = float(robo.ler_sensor(1, p.MODO_COR_REFLETIDA))
        d = float(robo.ler_sensor(3, p.MODO_COR_REFLETIDA))
        erro = e - d  # menor refletida = mais preto
        robo.mover_continuo('B', max(-55, min(55, int(VEL - K * erro))))
        robo.mover_continuo('C', max(-55, min(55, int(VEL + K * erro))))
        time.sleep(DT)
