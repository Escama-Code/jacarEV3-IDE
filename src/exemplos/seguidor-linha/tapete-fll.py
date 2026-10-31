from jacarev3 import RoboEV3, protocolo as p

with RoboEV3('00:16:53:64:F8:B8') as robo:
    robo.led('VERDE')
    robo.mover_continuo('B', 25)
    robo.mover_continuo('C', 25)
    while robo.ler_sensor(3, p.MODO_COR_REFLETIDA) > 30:
        pass
    while True:
        luz = robo.ler_sensor(3, p.MODO_COR_REFLETIDA)
        if luz < 30:
            robo.mover_continuo('B', 32)
            robo.mover_continuo('C', 8)
        else:
            robo.mover_continuo('B', 8)
            robo.mover_continuo('C', 32)
