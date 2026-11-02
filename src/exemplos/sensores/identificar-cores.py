"""Classifica cor no sensor central (porta 2) e reage com LED."""
import time
from jacarev3 import RoboEV3, protocolo as p

NOMES = {0: 'nada', 1: 'preto', 2: 'azul', 3: 'verde', 4: 'amarelo',
         5: 'vermelho', 6: 'branco', 7: 'marrom'}

with RoboEV3('00:16:53:64:F8:B8') as robo:
    for _ in range(40):
        cod = int(robo.ler_sensor(2, p.MODO_COR_COR))
        nome = NOMES.get(cod, str(cod))
        print('cor:', nome)
        if cod == 3:
            robo.led('VERDE')
        elif cod == 5:
            robo.led('VERMELHO')
        elif cod == 1:
            robo.led('LARANJA')
        else:
            robo.led('DESLIGADO')
        time.sleep(0.15)
