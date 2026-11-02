"""
Jornada de Jofre — seguidor de borda v5.2 (jacarev3 / EV3).

Fluxo definido pelo estudante:
 linha -> vermelho -> desvio à esquerda -> linha ->
 obstáculo 1 -> desvio à direita -> linha ->
 obstáculo 2 -> desvio à esquerda -> linha ->
 azul da rodovia -> pausa de 3 s -> linha ->
 obstáculo 3 -> desvio à direita -> linha -> azul de chegada.

Portas: cor ESQ 1, cor DIR 3, ultrassônico 4; motores B e C.
Não lê coordenadas x/y, curvas ou colisores internos do simulador.
Giros e distâncias vêm somente dos encoders dos motores.

A linha é seguida pela borda usando a refletância da porta 3,
como nos exemplos treino.py e tapete-fll.py da própria IDE.
Medidas de cada manobra são parâmetros didáticos a calibrar na arena
e no robô físico. O segundo contorno encontra a guia durante o avanço.
Não usa posições x/y.
Falhas são reportadas e os motores param, sem "teleportar" o robô.
"""
import math
import time

from jacarev3 import RoboEV3, protocolo as p

COR_ESQ = 1
COR_DIR = 3
US = 4
MOTOR_ESQ = "B"
MOTOR_DIR = "C"

PRETO = 1
AZUL = 2
VERMELHO = 5

LIMIAR_PRETO = 24
# O ultrassônico mede a distância até o objeto; reduza ou aumente
# este limiar com cautela e teste a folga necessária para o giro.
DISTANCIA_ALERTA = 21  # cm, calibrado para o cenário v5.2
DISTANCIA_SEGURANCA = 12
VELOCIDADE_LINHA = 23
VELOCIDADE_MANOBRA = 15
VELOCIDADE_BORDA_LENTA = 8
LIMIAR_BORDA = 30
PASSO = 0.06
TEMPO_MAXIMO = 300

DIAMETRO_RODA_CM = 5.6
BITOLA_CM = 12.0
CM_POR_GRAU = math.pi * DIAMETRO_RODA_CM / 360.0
GRAUS_MOTOR_POR_GRAU_ROBO = BITOLA_CM / DIAMETRO_RODA_CM

with RoboEV3("00:16:53:64:F8:B8") as robo:
    inicio = time.time()
    ultimo_comando = None
    etapa = "ATE_VERMELHO"
    obstaculos_contornados = 0
    ultimo_evento = -1000.0
    erro_fatal = False

    def ha_tempo():
        return time.time() - inicio < TEMPO_MAXIMO

    def motores(esquerda, direita):
        global ultimo_comando
        esquerda = int(max(-35, min(35, round(esquerda))))
        direita = int(max(-35, min(35, round(direita))))
        if (esquerda, direita) == ultimo_comando:
            return
        for porta, velocidade in ((MOTOR_ESQ, esquerda), (MOTOR_DIR, direita)):
            if velocidade == 0:
                robo.parar_motor(porta)
            else:
                robo.mover_continuo(porta, velocidade)
        ultimo_comando = (esquerda, direita)

    def parar():
        motores(0, 0)

    def encoder(porta):
        return float(robo.ler_graus_motor(porta))

    def distancia():
        return float(robo.ler_sensor(US, p.MODO_ULTRASSONICO_CM))

    def cor(porta):
        return int(robo.ler_sensor(porta, p.MODO_COR_COR))

    def refletancia(porta):
        return float(robo.ler_sensor(porta, p.MODO_COR_REFLETIDA))

    def viu_cor(codigo):
        """Reconhece tinta da pista, filtrando solo e lagoas por refletância."""
        for porta in (COR_ESQ, COR_DIR):
            if cor(porta) != codigo:
                continue
            luz = refletancia(porta)
            if codigo == VERMELHO and luz > 35:
                continue
            if codigo == AZUL and luz > 38:
                continue
            return True
        return False

    def viu_preto():
        # Combina identificação de cor e refletância para evitar
        # confundir marrom do solo / objetos com a guia preta.
        for porta in (COR_ESQ, COR_DIR):
            if refletancia(porta) < LIMIAR_PRETO and cor(porta) == PRETO:
                return True
        return False

    def seguir_linha():
        """Seguidor de borda como nos exemplos originais da IDE.

        Um sensor de refletância acompanha a TRANSIÇÃO preto/claro.
        No preto, curva para um lado; no claro, curva para o outro.
        Isto é controle reativo: não usa posição, mapa ou odometria.
        """
        luz = refletancia(COR_DIR)
        if luz < LIMIAR_BORDA:
            motores(VELOCIDADE_LINHA, VELOCIDADE_BORDA_LENTA)
        else:
            motores(VELOCIDADE_BORDA_LENTA, VELOCIDADE_LINHA)

    def avancar_cm(cm, velocidade=VELOCIDADE_MANOBRA,
                   achar_linha=False, ignorar_linha_cm=0,
                   checar_obstaculo=False, achar_cor=None):
        """Deslocamento medido nos motores; pode terminar por linha, cor ou obstáculo."""
        if cm == 0:
            return "feito"
        ini_b, ini_c = encoder(MOTOR_ESQ), encoder(MOTOR_DIR)
        sinal = 1 if cm > 0 else -1
        motores(sinal * velocidade, sinal * velocidade)
        while ha_tempo():
            b = (encoder(MOTOR_ESQ) - ini_b) * CM_POR_GRAU
            c = (encoder(MOTOR_DIR) - ini_c) * CM_POR_GRAU
            percorrido = abs((b + c) / 2.0)
            if checar_obstaculo and sinal > 0 and distancia() <= DISTANCIA_SEGURANCA:
                parar()
                return "obstaculo"
            if achar_linha and percorrido >= ignorar_linha_cm and viu_preto():
                parar()
                return "linha"
            if achar_cor is not None and viu_cor(achar_cor):
                parar()
                return "cor"
            if percorrido >= abs(cm):
                parar()
                return "feito"
            time.sleep(PASSO)
        parar()
        return "tempo"

    def girar(graus, velocidade=14):
        """Graus negativos = esquerda; positivos = direita."""
        if graus == 0:
            return True
        b0, c0 = encoder(MOTOR_ESQ), encoder(MOTOR_DIR)
        alvo = abs(graus) * GRAUS_MOTOR_POR_GRAU_ROBO
        sinal = 1 if graus > 0 else -1
        motores(sinal * velocidade, -sinal * velocidade)
        while ha_tempo():
            b = abs(encoder(MOTOR_ESQ) - b0)
            c = abs(encoder(MOTOR_DIR) - c0)
            if (b + c) / 2 >= alvo:
                parar()
                return True
            time.sleep(PASSO)
        parar()
        return False

    def livre(limite=DISTANCIA_SEGURANCA + 7):
        return distancia() >= limite

    def procurar_linha(limite_cm, ignorar_cm=6, velocidade=12):
        """Procura a guia preta com sensores de cor, sem saber onde ela está."""
        resultado = avancar_cm(limite_cm, velocidade, achar_linha=True,
                               ignorar_linha_cm=ignorar_cm,
                               checar_obstaculo=True)
        if resultado == "linha":
            print("LINHA: reencontrada pelos sensores de cor.")
            return True
        print("LINHA: busca terminou sem encontrar a guia:", resultado)
        return False

    def desvio_vermelho():
        """ESQUERDA -> RETO -> DIREITA -> RETO -> DIREITA -> RETO até a linha."""
        print("ETAPA 1: vermelho detectado; parada e contorno pela esquerda.")
        parar()
        time.sleep(2)
        if not girar(-90): return False
        if avancar_cm(23, 14, checar_obstaculo=True) != "feito": return False
        if not girar(90): return False
        if avancar_cm(55, 14, checar_obstaculo=True) != "feito": return False
        if not girar(90): return False
        if not procurar_linha(46, ignorar_cm=8):
            print("QUEIMADA: linha ausente; buscando retorno deslocado.")
            if avancar_cm(-40, velocidade=12) != "feito": return False
            if not girar(-90): return False
            if avancar_cm(24, velocidade=12, checar_obstaculo=True) != "feito": return False
            if not girar(90): return False
            if not procurar_linha(44, ignorar_cm=5): return False
        if avancar_cm(6, 10) != "feito": return False
        # A linha é cruzada perpendicularmente: realinha o robô para retomá-la.
        return girar(-90)

    def desvio_primeiro():
        """DIREITA -> RETO -> ESQUERDA (se livre) -> RETO ->
        ESQUERDA (se livre) -> RETO até a linha.
        Um bloqueio extra provoca desvio lateral de segurança.
        """
        print("ETAPA 2: primeiro obstáculo detectado; contorno pela direita.")
        parar()
        if not girar(90): return False
        if avancar_cm(26, checar_obstaculo=True) != "feito": return False
        parar()
        # Primeiro verifica a direção escolhida com o ultrassônico.
        if not girar(-90): return False
        if not livre():
            print("DESVIO 1: esquerda bloqueada; reposicionando à direita.")
            if not girar(90): return False
            if avancar_cm(15, checar_obstaculo=True) != "feito": return False
            if not girar(-90): return False
        resultado = avancar_cm(78, achar_linha=True, ignorar_linha_cm=45,
                              checar_obstaculo=True)
        if resultado == "linha":
            print("DESVIO 1: guia reencontrada antes da última curva.")
            return True
        if resultado != "feito": return False
        parar()
        if not girar(-90): return False
        if not livre():
            print("DESVIO 1: esquerda bloqueada; direita, pouco avanço, esquerda.")
            if not girar(90): return False
            if avancar_cm(14, checar_obstaculo=True) != "feito": return False
            if not girar(-90): return False
        if not procurar_linha(51, ignorar_cm=6): return False
        return girar(90)

    def desvio_segundo():
        """ESQUERDA -> RETO -> DIREITA -> RETO; se houver novo obstáculo,
        DIREITA e pequeno deslocamento; caso contrário, procurar a linha.
        """
        print("ETAPA 3: segundo obstáculo detectado; contorno pela esquerda.")
        parar()
        if not girar(-90): return False
        resultado = avancar_cm(32, checar_obstaculo=True)
        if resultado == "obstaculo":
            print("DESVIO 2: bloqueio na primeira manobra; parada segura.")
            return False
        if resultado != "feito": return False
        if not girar(90): return False
        resultado = avancar_cm(51, checar_obstaculo=True)
        if resultado == "obstaculo" or not livre():
            print("DESVIO 2: novo obstáculo; virando à direita.")
            if not girar(90): return False
            if avancar_cm(16, checar_obstaculo=True) != "feito": return False
            if not girar(-90): return False
        elif resultado != "feito":
            return False
        return procurar_linha(65, ignorar_cm=9)

    def atravessar():
        """AZUL -> PARAR 3 s -> reto até encontrar linha do lado oposto."""
        print("ETAPA 4: azul da rodovia detectado; parada de 3 segundos.")
        parar()
        time.sleep(3)
        # Marca didática, não é sensor de veículos: confirma apenas a travessia.
        # O traçado da pista cruza o asfalto aproximadamente na horizontal.
        if not girar(28): return False
        return procurar_linha(75, ignorar_cm=38, velocidade=13)

    def diagnosticar_falha():
        """Mostra somente leituras disponíveis no EV3 para facilitar a calibração."""
        try:
            print("LEITURAS: ultrassônico", round(distancia(), 1), "cm,",
                  "cor esquerda", cor(COR_ESQ), "cor direita", cor(COR_DIR),
                  "refletância esquerda", round(refletancia(COR_ESQ), 1),
                  "direita", round(refletancia(COR_DIR), 1))
        except Exception as exc:
            print("LEITURAS: não foi possível obter os sensores:", str(exc))

    def desvio_terceiro():
        """DIREITA -> RETO -> ESQUERDA -> RETO -> ESQUERDA -> linha."""
        print("ETAPA 5: terceiro obstáculo; contorno pela direita.")
        parar()
        if not girar(90): return False
        if avancar_cm(25, checar_obstaculo=True) != "feito": return False
        if not girar(-90): return False
        if avancar_cm(70, checar_obstaculo=True) != "feito": return False
        if not girar(-90): return False
        if not procurar_linha(65, ignorar_cm=10): return False
        if avancar_cm(5, 10) != "feito": return False
        return girar(100)

    print("JOFRE: início da missão por sensores (sem coordenadas).")
    try:
        while ha_tempo():
            if etapa == "ATE_VERMELHO" and viu_cor(VERMELHO):
                if not desvio_vermelho():
                    print("ERRO: falhou o contorno da queimada.")
                    erro_fatal = True
                    break
                etapa = "ATE_OBSTACULO_1"
                ultimo_evento = time.time()
                print("ETAPA 1 CONCLUÍDA.")
                continue

            if etapa == "ATE_RODOVIA" and viu_cor(AZUL):
                if not atravessar():
                    print("ERRO: travessia não encontrou a linha oposta.")
                    erro_fatal = True
                    break
                etapa = "ATE_OBSTACULO_3"
                ultimo_evento = time.time()
                print("ETAPA 4 CONCLUÍDA.")
                continue

            if etapa == "ATE_CHEGADA" and viu_cor(AZUL):
                parar()
                print("MISSÃO CONCLUÍDA: azul do refúgio identificado.")
                break

            if etapa in ("ATE_OBSTACULO_1", "ATE_OBSTACULO_2", "ATE_OBSTACULO_3"):
                distancia_atual = (distancia() if time.time() - ultimo_evento > 2.0
                                  else float("inf"))
                if distancia_atual < DISTANCIA_ALERTA:
                    print("ULTRASSÔNICO:", round(distancia_atual, 1), "cm;",
                          "limiar:", DISTANCIA_ALERTA, "cm; iniciando desvio.")
                    if etapa == "ATE_OBSTACULO_1":
                        ok = desvio_primeiro()
                        proxima = "ATE_OBSTACULO_2"
                    elif etapa == "ATE_OBSTACULO_2":
                        ok = desvio_segundo()
                        proxima = "ATE_RODOVIA"
                    else:
                        ok = desvio_terceiro()
                        proxima = "ATE_CHEGADA"
                    if not ok:
                        print("ERRO: desvio não concluído na etapa", etapa)
                        erro_fatal = True
                        break
                    etapa = proxima
                    obstaculos_contornados += 1
                    ultimo_evento = time.time()
                    print("DESVIO", obstaculos_contornados, "CONCLUÍDO.")
                    continue

            seguir_linha()
            time.sleep(PASSO)
        else:
            print("TEMPO: limite de 300 segundos atingido.")
    finally:
        parar()
        if erro_fatal:
            print("PARADA SEGURA: revise as medidas e o ponto da manobra.")
            diagnosticar_falha()
        print("ETAPA FINAL:", etapa)
        print("Motores desligados.")
