"""OBR Nacional — array de 3 sensores de cor + ultrassônico.

Portas (perfil padrão do simulador):
  1 = cor esquerda   |  2 = cor centro  |  3 = cor direita
  4 = ultrassônico (cm)

Modos de cor:
  MODO_COR_REFLETIDA (0)  → 0..100 (linha preta baixa)
  MODO_COR_COR (2)        → id EV3 (3 = verde da marcação de interseção)

Giroscópio virtual: use o ângulo da odometria se a biblioteca expuser
robo.angulo() / leitura de heading; no Direct Command o th está no estado do sim.
"""
import time
from jacarev3 import RoboEV3, protocolo as p

LIMIAR = 35          # refletida: abaixo = preto
VEL = 35
MACHO_VERDE = 3      # id EV3 verde

with RoboEV3('00:16:53:64:F8:B8') as robo:
    robo.led('VERDE')
    while True:
        e = robo.ler_sensor(1, p.MODO_COR_REFLETIDA)
        c = robo.ler_sensor(2, p.MODO_COR_REFLETIDA)
        d = robo.ler_sensor(3, p.MODO_COR_REFLETIDA)
        cor_c = int(robo.ler_sensor(2, p.MODO_COR_COR))
        dist = robo.ler_sensor(4, p.MODO_ULTRASSONICO_CM)

        # obstáculo à frente
        if dist < 12:
            robo.parar_motor('B')
            robo.parar_motor('C')
            time.sleep(0.05)
            continue

        # marcação verde no centro → decisão de interseção (exemplo: virar à direita)
        if cor_c == MACHO_VERDE:
            robo.mover_continuo('B', 25)
            robo.mover_continuo('C', -10)
            time.sleep(0.4)
            continue

        # seguidor proporcional simples com 3 sensores
        erro = (d - e)  # positivo = linha mais à esquerda do centro
        v_esq = max(-100, min(100, int(VEL + 0.4 * erro)))
        v_dir = max(-100, min(100, int(VEL - 0.4 * erro)))
        # se os três veem branco, tenta achar linha girando
        if e > LIMIAR and c > LIMIAR and d > LIMIAR:
            v_esq, v_dir = 20, -20
        robo.mover_continuo('B', v_esq)
        robo.mover_continuo('C', v_dir)
        time.sleep(0.03)
