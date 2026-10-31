"""Teste educativo do semáforo no Tapete Urbano Ilustrativo.

Na IDE:
- Cenário: Tapete Urbano Ilustrativo
- Início: Início na Estrada de Baixo (Sul)
- Sensor de cor: porta 3, modo COR
- Motores: B (esquerda), C (direita)
O robô segue reto até a marca colorida, para no vermelho/amarelo
e atravessa quando o sinal fica verde.
"""
import time
from jacarev3 import RoboEV3, protocolo as p

NOMES = {1: "preto", 3: "verde", 4: "amarelo", 5: "vermelho", 6: "branco"}
VEL = 20

with RoboEV3("00:16:53:64:F8:B8") as robo:
    andando = False
    chegou_ao_sinal = False
    cor_anterior = None

    for _ in range(220):  # no máximo ~22 segundos simulados de observação
        cor = int(robo.ler_sensor(3, p.MODO_COR_COR))

        if cor != cor_anterior:
            print("Sensor de cor:", NOMES.get(cor, str(cor)))
            cor_anterior = cor

        if cor in (5, 4):  # vermelho ou amarelo: parar
            chegou_ao_sinal = True
            if andando:
                robo.parar_motor("B")
                robo.parar_motor("C")
                andando = False
                print("PARE: aguarde o verde.")

        elif cor == 3:  # verde: avançar
            chegou_ao_sinal = True
            if not andando:
                robo.mover_continuo("B", VEL)
                robo.mover_continuo("C", VEL)
                andando = True
                print("VERDE: pode passar.")

        elif chegou_ao_sinal:  # saiu da faixa colorida
            print("Travessia concluída.")
            break

        elif not andando:  # aproximação pela linha preta
            robo.mover_continuo("B", VEL)
            robo.mover_continuo("C", VEL)
            andando = True

        time.sleep(0.10)

    robo.parar_motor("B")
    robo.parar_motor("C")
    print("Teste finalizado.")
