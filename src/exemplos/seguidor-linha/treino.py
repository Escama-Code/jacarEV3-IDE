"""Seguidor 1 sensor (porta 3) — Pista de Treino.

Calibrado para mitigar inércia final: velocidade corrigida e terceiro estado de busca.
"""
import time
from jacarev3 import RoboEV3, protocolo as p

# Preto típico < 25–35; branco > 55
LIMIAR = 38
V_LENTA = 10    # Reduzido levemente para maior precisão em curvas fechadas
V_RAPIDA = 24   # Reduzido para diminuir a força da inércia
DT = 0.035      # Amostragem sutilmente mais rápida (~28 Hz) para responder antes de escapar

with RoboEV3('00:16:53:64:F8:B8') as robo:
    robo.led('VERDE')
    while True:
        luz = float(robo.ler_sensor(3, p.MODO_COR_REFLETIDA))
        
        if luz < LIMIAR:
            # Sobre o preto → Puxa para a DIREITA (afasta da linha)
            robo.mover_continuo('B', V_RAPIDA)
            robo.mover_continuo('C', V_LENTA)
        elif luz > 65:
            # Perdeu totalmente a linha (Branco puro) no final do circuito → 
            # Faz uma curva fechada imediata de retorno para a ESQUERDA para recuperar a borda
            robo.mover_continuo('B', -5)
            robo.mover_continuo('C', V_RAPIDA)
        else:
            # Sobre a borda/cinza ou branco padrão → Puxa para a ESQUERDA (aproxima da linha)
            robo.mover_continuo('B', V_LENTA)
            robo.mover_continuo('C', V_RAPIDA)
            
        time.sleep(DT)
