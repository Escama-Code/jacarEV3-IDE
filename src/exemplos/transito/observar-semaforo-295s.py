"""Teste longo do semáforo do Tapete Urbano Ilustrativo.

No campo "limite máximo", escolha 300 segundos.
DURACAO_S = 295 mantém uma margem antes desse limite.

O robô aproxima-se da faixa, estaciona SOBRE o sinal e observa
as mudanças de cor sem sair da área. A simulação não precisa
durar 300 segundos: quem define a duração é este programa.
"""
import time
from jacarev3 import RoboEV3, protocolo as p

DURACAO_S = 295.0
VEL = 20
NOMES = {1: "preto", 3: "verde", 4: "amarelo", 5: "vermelho", 6: "branco"}

with RoboEV3("00:16:53:64:F8:B8") as robo:
    inicio = time.monotonic()
    encontrou = False
    robo.mover_continuo("B", VEL)
    robo.mover_continuo("C", VEL)

    # Chega ao primeiro semáforo da estrada de baixo.
    for _ in range(120):
        cor = int(robo.ler_sensor(3, p.MODO_COR_COR))
        if cor in (3, 4, 5):
            encontrou = True
            break
        time.sleep(0.1)

    robo.parar_motor("B")
    robo.parar_motor("C")

    if not encontrou:
        print("A faixa colorida não foi encontrada. Verifique o início do mapa.")
    else:
        print("Robô parado sobre a faixa. Observando o semáforo...")
        anterior = None
        while time.monotonic() - inicio < DURACAO_S:
            cor = int(robo.ler_sensor(3, p.MODO_COR_COR))
            if cor != anterior:
                tempo = time.monotonic() - inicio
                print(f"{tempo:.0f}s — semáforo: {NOMES.get(cor, cor)}")
                anterior = cor
            restante = DURACAO_S - (time.monotonic() - inicio)
            if restante > 0:
                time.sleep(min(1.0, restante))

        print(f"Observação finalizada após {time.monotonic() - inicio:.1f} segundos simulados.")

    robo.parar_motor("B")
    robo.parar_motor("C")
