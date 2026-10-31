import time
from jacarev3 import RoboEV3

# Motores B e C: rodas esquerda e direita.
with RoboEV3("00:16:53:64:F8:B8") as robo:
    print("Avançando...")
    robo.mover_continuo("B", 20)
    robo.mover_continuo("C", 20)
    time.sleep(1.2)

    robo.parar_motor("B")
    robo.parar_motor("C")
    print("Pausa.")
    time.sleep(0.5)

    print("Voltando...")
    robo.mover_continuo("B", -15)
    robo.mover_continuo("C", -15)
    time.sleep(0.7)

    robo.parar_motor("B")
    robo.parar_motor("C")
    print("Fim do exercício.")
