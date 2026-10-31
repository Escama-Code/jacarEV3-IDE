import time
from jacarev3 import RoboEV3, protocolo as p

with RoboEV3("00:16:53:64:F8:B8") as robo:
    for amostra in range(20):
        luz = robo.ler_sensor(3, p.MODO_COR_REFLETIDA)
        cor = robo.ler_sensor(3, p.MODO_COR_COR)
        distancia = robo.ler_sensor(4, p.MODO_ULTRASSONICO_CM)

        print(
            "Amostra:", amostra + 1,
            "| Luz:", luz,
            "| Cor:", cor,
            "| Distância:", distancia, "cm"
        )
        time.sleep(0.25)
