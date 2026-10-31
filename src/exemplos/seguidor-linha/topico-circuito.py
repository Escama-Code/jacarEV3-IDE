from jacarev3 import RoboEV3
from jacarev3.topicos import circuito

with RoboEV3('00:16:53:64:F8:B8') as robo:
    circuito.seguir_linha(robo, porta_sensor=3, limiar=35, velocidade=30, duracao_s=20)
