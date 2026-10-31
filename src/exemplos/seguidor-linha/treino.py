from jacarev3 import RoboEV3, protocolo as p

with RoboEV3('00:16:53:64:F8:B8') as robo:
    robo.led('VERDE')
    while True:
        luz = robo.ler_sensor(3, p.MODO_COR_REFLETIDA)
        if luz < 30:
            robo.mover_continuo('B', 10)
            robo.mover_continuo('C', 35)
        else:
            robo.mover_continuo('B', 35)
            robo.mover_continuo('C', 10)
