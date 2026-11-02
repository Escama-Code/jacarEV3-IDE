"""Lê o array OBR: cores 1–3 + ultrassom 4."""
import time
from jacarev3 import RoboEV3, protocolo as p

with RoboEV3('00:16:53:64:F8:B8') as robo:
    robo.led('VERDE')
    for _ in range(25):
        e = robo.ler_sensor(1, p.MODO_COR_REFLETIDA)
        c = robo.ler_sensor(2, p.MODO_COR_REFLETIDA)
        d = robo.ler_sensor(3, p.MODO_COR_REFLETIDA)
        us = robo.ler_sensor(4, p.MODO_ULTRASSONICO_CM)
        print(f'esq={e:.0f} cen={c:.0f} dir={d:.0f}  us={us:.0f} cm')
        time.sleep(0.12)
    robo.led('DESLIGADO')
