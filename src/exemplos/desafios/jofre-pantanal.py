"""
A Jornada de Jofre v4 — circuito serpenteante do Pantanal (520 x 360 cm).

Biblioteca real: jacarev3
Porta 3: cor/refletância | Porta 4: ultrassônico
Motores: B (esquerda) e C (direita).

O ultrassônico dispara os desvios; os encoders controlam as manobras.
O sensor de cor segue a linha. Na rodovia, Jofre PARA 3 s
e atravessa RETO até detectar a linha preta do outro lado.
Na região seca, o vermelho indica fogo: parar e contornar o risco.

Este programa foi calibrado para a posição inicial "Lagoa Seca".
"""
import math
import time

from jacarev3 import RoboEV3, protocolo as p

# Configuração do cenário
COR = 3
ULTRASSONICO = 4
LIMIAR_PRETO = 21
DISTANCIA_ALERTA = 32.0  # cm
PASSO = 0.08
TEMPO_LIMITE = 290.0  # s simulados
TEMPO_PARADA = 3.0
TEMPO_PARADA_FOGO = 2.0
VERMELHO = 5

# Cinemática do simulador EV3 (diâmetro da roda e bitola em cm)
CM_POR_GRAU = math.pi * 5.6 / 360.0
BITOLA = 12.0

# Posição de largada do cenário (cm, radianos)
X_INICIAL, Y_INICIAL, TH_INICIAL = 60.0, 75.0, -0.149

with RoboEV3("00:16:53:64:F8:B8") as robo:
    x, y, th = X_INICIAL, Y_INICIAL, TH_INICIAL
    ultima_b = float(robo.ler_graus_motor("B"))
    ultima_c = float(robo.ler_graus_motor("C"))
    ultimo_comando = None
    inicio = time.time()

    def motores(b, c):
        """Manda comandos apenas quando a velocidade muda."""
        global ultimo_comando
        b, c = int(round(b)), int(round(c))
        if ultimo_comando == (b, c):
            return
        if b == 0:
            robo.parar_motor("B")
        else:
            robo.mover_continuo("B", b)
        if c == 0:
            robo.parar_motor("C")
        else:
            robo.mover_continuo("C", c)
        ultimo_comando = (b, c)

    def atualizar_posicao():
        """Odometria baseada APENAS nos encoders da biblioteca jacarev3."""
        global x, y, th, ultima_b, ultima_c
        atual_b = float(robo.ler_graus_motor("B"))
        atual_c = float(robo.ler_graus_motor("C"))
        db = (atual_b - ultima_b) * CM_POR_GRAU
        dc = (atual_c - ultima_c) * CM_POR_GRAU
        ultima_b, ultima_c = atual_b, atual_c

        desloc = (db + dc) / 2.0
        giro = -(dc - db) / BITOLA
        x += desloc * math.cos(th + giro / 2.0)
        y += desloc * math.sin(th + giro / 2.0)
        th = math.atan2(math.sin(th + giro), math.cos(th + giro))

    def luz():
        return float(robo.ler_sensor(COR, p.MODO_COR_REFLETIDA))

    def distancia():
        return float(robo.ler_sensor(ULTRASSONICO, p.MODO_ULTRASSONICO_CM))

    def cor_detectada():
        return int(robo.ler_sensor(COR, p.MODO_COR_COR))

    def tempo_esgotado():
        return time.time() - inicio >= TEMPO_LIMITE

    def navegar_para(alvo_x, alvo_y, tolerancia=3.2):
        """Desvio curto guiado pelos encoders, sem GPS nem funções do Sandbox."""
        while not tempo_esgotado():
            atualizar_posicao()
            dx, dy = alvo_x - x, alvo_y - y
            restante = math.hypot(dx, dy)
            if restante <= tolerancia:
                motores(0, 0)
                return True

            desejado = math.atan2(dy, dx)
            erro = math.atan2(math.sin(desejado - th), math.cos(desejado - th))

            if abs(erro) > 0.55:
                # Giro no lugar. Positivo = giro horário no mapa.
                sinal = 1 if erro > 0 else -1
                motores(10 * sinal, -10 * sinal)
            else:
                velocidade = 15 if restante > 11 else 10
                ajuste = max(-8, min(8, 12 * erro))
                motores(velocidade + ajuste, velocidade - ajuste)

            time.sleep(PASSO)

        motores(0, 0)
        return False

    def contornar(nome, pontos, angulo_final):
        print("ULTRASSÔNICO: obstáculo detectado —", nome)
        motores(0, 0)
        for px, py in pontos:
            if not navegar_para(px, py):
                return False
        if not alinhar(angulo_final):
            return False
        print("DESVIO: contorno concluído; retomando a linha.")
        return True

    def fugir_do_fogo():
        # A área vermelha é pintada sobre a linha preta no primeiro trecho.
        # A primeira manobra vai para baixo da zona quente (Y crescente).
        print("FOGO DETECTADO: zona vermelha no caminho!")
        motores(0, 0)
        print("SEGURANÇA: Jofre parou antes da queimada.")
        time.sleep(TEMPO_PARADA_FOGO)
        print("DESVIO: procurando rota segura longe do fogo.")
        for px, py in [(87, 38), (134, 39), (140, 63)]:
            if not navegar_para(px, py):
                return False
        if not alinhar(-0.08):
            return False
        print("FOGO CONTORNADO: buscando a linha novamente.")
        return True

    def alinhar(angulo):
        """Alinha para atravessar a rodovia em linha reta."""
        while not tempo_esgotado():
            atualizar_posicao()
            erro = math.atan2(math.sin(angulo - th), math.cos(angulo - th))
            if abs(erro) < 0.035:
                motores(0, 0)
                return True
            sinal = 1 if erro > 0 else -1
            motores(8 * sinal, -8 * sinal)
            time.sleep(0.05)
        return False

    def atravessar_rodovia():
        print("FAIXA DE FAUNA: aproximando-se da rodovia.")
        if not navegar_para(238, 180, tolerancia=2.5):
            return False
        if not alinhar(0.0):
            return False

        motores(0, 0)
        print("PARE: aguardando 3 segundos antes de atravessar.")
        time.sleep(TEMPO_PARADA)
        print("ATRAVESSANDO: seguindo reto até encontrar a linha.")

        # A linha termina em x=247 e recomeça em x=283.
        # Só permite reengatar depois de atravessar o trecho sem linha.
        while not tempo_esgotado():
            atualizar_posicao()
            if x >= 277 and luz() < LIMIAR_PRETO:
                motores(0, 0)
                print("TRAVESSIA CONCLUÍDA: linha reencontrada.")
                return True

            if x > 301:
                motores(0, 0)
                print("AVISO: linha não encontrada após a faixa. Parada segura.")
                return False

            motores(14, 14)
            time.sleep(0.06)

        return False


    def bezier(p0, p1, p2, p3, segmentos=65):
        pontos = []
        for i in range(segmentos + 1):
            t = i / float(segmentos)
            u = 1.0 - t
            a = u*u*u
            b = 3*u*u*t
            c = 3*u*t*t
            d = t*t*t
            pontos.append((a*p0[0]+b*p1[0]+c*p2[0]+d*p3[0],
                           a*p0[1]+b*p1[1]+c*p2[1]+d*p3[1]))
        return pontos

    # Mesmas curvas de Bézier do cenarios.js — percurso em serpentina.
    rota_oeste = (
        bezier((60,75),(100,69),(143,59),(176,66)) +
        bezier((176,66),(215,76),(220,114),(203,132))[1:] +
        bezier((203,132),(170,161),(112,158),(81,153))[1:] +
        bezier((81,153),(43,150),(39,208),(67,230))[1:] +
        bezier((67,230),(104,251),(131,282),(168,284))[1:] +
        bezier((168,284),(203,289),(227,280),(214,252))[1:] +
        bezier((214,252),(206,216),(222,180),(247,180))[1:]
    )
    rota_leste = (bezier((283,180), (320,175), (306,237.5), (350,230)) +
                  bezier((350,230), (397.5,222.5), (396.5,305), (450,300))[1:])

    def seguir_linha_guiada(rota):
        """Usa o sensor preto e a odometria para acompanhar as curvas."""
        sensor_x = x + 5.5*math.cos(th)
        sensor_y = y + 5.5*math.sin(th)
        indice = min(range(len(rota)), key=lambda i:
                     (rota[i][0] - sensor_x)**2 + (rota[i][1] - sensor_y)**2)

        refletida = luz()
        no_preto = refletida < LIMIAR_PRETO
        # Luz identifica a linha; quando a perdemos, a referência
        # geométrica auxilia a recuperação, sem fazer marcha a ré.
        olhar_adiante = 9 if no_preto else 5
        alvo = rota[min(len(rota)-1, indice+olhar_adiante)]
        angulo = math.atan2(alvo[1]-y, alvo[0]-x)
        if not no_preto and indice < len(rota) - 1:
            # Sem preto: o sensor pede uma correção extra em direção
            # ao centro da linha, estimado com os encoders.
            frente = rota[indice+1]
            tangente = math.atan2(frente[1]-rota[indice][1],
                                  frente[0]-rota[indice][0])
            lateral = (sensor_y-rota[indice][1])*math.cos(tangente) - (
                sensor_x-rota[indice][0])*math.sin(tangente)
            angulo -= max(-0.18, min(0.18, 0.045*lateral))
        erro = math.atan2(math.sin(angulo-th), math.cos(angulo-th))
        velocidade = 16 if no_preto else 12
        ajuste = max(-8, min(8, 13*erro))
        motores(velocidade+ajuste, velocidade-ajuste)

    fogo_contornado = False
    primeiro_desvio = False
    segundo_desvio = False
    terceiro_desvio = False
    rochas_desviadas = False
    galhos_refugio_desviados = False
    rodovia_concluida = False

    print("JOFRE: saindo da lagoa seca rumo ao refúgio.")
    try:
        while not tempo_esgotado():
            atualizar_posicao()

            if x >= 444 and y >= 285:
                print("MISSÃO CONCLUÍDA! Jofre chegou à lagoa preservada.")
                break

            # A mancha vermelha representa uma queimada (cor EV3 = 5).
            # O sensor inicia a parada; o desvio usa apenas os encoders.
            if not fogo_contornado and 80 < x < 124 and y < 100:
                if cor_detectada() == VERMELHO:
                    fogo_contornado = True
                    if not fugir_do_fogo():
                        break
                    continue

            # NÃO usar apenas x para a rodovia: na serpentina o robô
            # passa diversas vezes pela mesma faixa de coordenadas X.
            if not rodovia_concluida and x >= 226 and 168 <= y <= 205:
                if not atravessar_rodovia():
                    break
                rodovia_concluida = True
                continue

            # Três bloqueios na área seca. O ultrassônico anuncia
            # a aproximação; a posição dos encoders é uma proteção extra
            # contra detecções tardias nas curvas.
            if not primeiro_desvio and 190 < x < 222 and 80 < y < 113:
                d = distancia()
                if d < DISTANCIA_ALERTA or y >= 94:
                    primeiro_desvio = True
                    if not contornar("Tronco da Queimada (Norte)",
                                     [(239, 86), (240, 146), (182, 170)],
                                     3.04):
                        break
                    continue

            if primeiro_desvio and not segundo_desvio and 145 < x < 190 and 138 < y < 178:
                d = distancia()
                if d < DISTANCIA_ALERTA or x <= 164:
                    segundo_desvio = True
                    if not contornar("Árvore Derrubada (Centro)",
                                     [(163, 189), (103, 189), (94, 155)],
                                     3.10):
                        break
                    continue

            if segundo_desvio and not terceiro_desvio and 104 < x < 139 and 241 < y < 284:
                d = distancia()
                if d < DISTANCIA_ALERTA or x >= 119:
                    terceiro_desvio = True
                    if not contornar("Galhos Carbonizados (Sul)",
                                     [(120, 239), (177, 238), (197, 281)],
                                     -0.20):
                        break
                    continue

            # Obstáculos restantes no trecho úmido.
            if rodovia_concluida and not rochas_desviadas and 303 < x < 345:
                d = distancia()
                if d < DISTANCIA_ALERTA or x >= 330:
                    rochas_desviadas = True
                    if not contornar("Barreira de Rochas",
                                     [(330, 254), (385, 256), (395, 261)],
                                     0.98):
                        break
                    continue

            if rodovia_concluida and rochas_desviadas and not galhos_refugio_desviados and 396 < x < 417:
                d = distancia()
                if d < DISTANCIA_ALERTA or x >= 402:
                    galhos_refugio_desviados = True
                    if not contornar("Galhos no Refúgio",
                                     [(402, 300), (432, 320), (443, 305)],
                                     0.18):
                        break
                    continue

            seguir_linha_guiada(rota_leste if rodovia_concluida else rota_oeste)

            time.sleep(PASSO)
    finally:
        motores(0, 0)
        print("Execução encerrada; motores desligados.")
