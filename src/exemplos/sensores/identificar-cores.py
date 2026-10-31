import time
from jacarev3 import RoboEV3, protocolo as p

NOMES = {0: 'sem cor', 1: 'preto', 2: 'azul', 3: 'verde', 4: 'amarelo', 5: 'vermelho', 6: 'branco', 7: 'marrom'}

with RoboEV3('00:16:53:64:F8:B8') as robo:
    anterior = None
    robo.mover_continuo('B', 20)
    robo.mover_continuo('C', 20)
    for _ in range(120):
        cor = int(robo.ler_sensor(3, p.MODO_COR_COR))
        if cor != anterior:
            print('cor:', NOMES.get(cor, cor))
            anterior = cor
        time.sleep(0.05)
    robo.parar_motor('B')
    robo.parar_motor('C')
