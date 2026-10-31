"""
Tapete Urbano Ilustrativo — seguidor de linha e semáforo.
Biblioteca jacarev3. Porta 3: sensor de cor; B/C: motores.

Recuperação: gira no lugar, SEM recuar. Se não encontra a linha, para.
"""
import math
import time
from jacarev3 import RoboEV3, protocolo as p

# Portas e cores
SENSOR = 3
PRETO = 1
VERDE = 3
AMARELO = 4
VERMELHO = 5
BRANCO = 6

# Ajustes didáticos (velocidades em porcentagem)
VELOCIDADE_LENTA = 9
VELOCIDADE_RAPIDA = 19
VELOCIDADE_RETA = 16
VELOCIDADE_BUSCA = 10

LIMIAR_PRETO = 17
LIMIAR_BRANCO = 62
INTERVALO = 0.10
TEMPO_MAXIMO = 270

# Atravessa as listras sem tentar corrigi-las individualmente
TRAVESSIA_CM = 29
DISTANCIA_SINAL_CM = 10
INTERVALO_ENTRE_FAIXAS_S = 2

# Tempo em que a linha pode desaparecer antes de procurar novamente
TOLERANCIA_LINHA_S = 0.50
TEMPO_BUSCA_1_S = 2.6
TEMPO_BUSCA_2_S = 5.2

# Medidas usadas pelo simulador do EV3
GRAUS_POR_CM = 360 / (math.pi * 5.6)

with RoboEV3("00:16:53:64:F8:B8") as robo:
    ultimo_comando = [None]
    ultimo_aviso = [None]
    modo = "linha"
    inicio = time.time()
    ultimo_preto = inicio
    fim_ultima_faixa = inicio - 100
    direcao_busca = 1  # +1 = direita; -1 = esquerda
    inicio_busca = inicio
    marco = (0.0, 0.0)
    pausa_sinal_ate = inicio

    def avisar(mensagem):
        if ultimo_aviso[0] != mensagem:
            print(mensagem)
            ultimo_aviso[0] = mensagem

    def mover(esquerdo, direito):
        comando = (int(esquerdo), int(direito))
        if ultimo_comando[0] == comando:
            return
        if comando == (0, 0):
            robo.parar_motor("B")
            robo.parar_motor("C")
        else:
            robo.mover_continuo("B", comando[0])
            robo.mover_continuo("C", comando[1])
        ultimo_comando[0] = comando

    def encoders():
        return (
            float(robo.ler_graus_motor("B")),
            float(robo.ler_graus_motor("C")),
        )

    def distancia_desde(referencia):
        b, c = encoders()
        return (
            abs(b - referencia[0]) + abs(c - referencia[1])
        ) / (2 * GRAUS_POR_CM)

    def girar_para(direcao):
        # O centro fica no lugar: não há comando de marcha a ré.
        if direcao < 0:
            mover(-VELOCIDADE_BUSCA, VELOCIDADE_BUSCA)
        else:
            mover(VELOCIDADE_BUSCA, -VELOCIDADE_BUSCA)

    try:
        while time.time() - inicio < TEMPO_MAXIMO:
            agora = time.time()
            cor = int(robo.ler_sensor(SENSOR, p.MODO_COR_COR))
            luz = float(robo.ler_sensor(SENSOR, p.MODO_COR_REFLETIDA))

            # 1. Vermelho/amarelo têm prioridade sobre seguir a linha.
            if cor in (VERMELHO, AMARELO) and (
                modo == "esperando" or
                agora - ultimo_preto < 0.8
            ) and agora >= pausa_sinal_ate:
                modo = "esperando"
                mover(0, 0)
                avisar("SEMÁFORO: aguarde o verde")
                time.sleep(INTERVALO)
                continue

            if modo == "esperando":
                if cor != VERDE:
                    mover(0, 0)
                    time.sleep(INTERVALO)
                    continue
                modo = "passando_sinal"
                marco = encoders()
                avisar("VERDE: atravessando o sinal")

            # Pode chegar ao sinal quando já estiver verde.
            if (
                modo == "linha" and cor == VERDE
                and agora - ultimo_preto < 0.35
                and agora >= pausa_sinal_ate
            ):
                modo = "passando_sinal"
                marco = encoders()
                avisar("VERDE: siga em frente")

            if modo == "passando_sinal":
                if distancia_desde(marco) < DISTANCIA_SINAL_CM:
                    mover(VELOCIDADE_RETA, VELOCIDADE_RETA)
                    time.sleep(INTERVALO)
                    continue
                modo = "linha"
                ultimo_preto = agora
                pausa_sinal_ate = agora + 1.0

            # 2. Cruzamento: ignorar os espaços escuros entre faixas brancas.
            if modo == "travessia":
                if distancia_desde(marco) < TRAVESSIA_CM:
                    mover(VELOCIDADE_RETA, VELOCIDADE_RETA)
                    time.sleep(INTERVALO)
                    continue
                modo = "linha"
                ultimo_preto = agora
                fim_ultima_faixa = agora
                avisar("Faixa concluída; retomando a linha")

            if (
                modo == "linha" and cor == BRANCO
                and luz >= LIMIAR_BRANCO
                and agora - ultimo_preto < 0.5
                and agora - fim_ultima_faixa > INTERVALO_ENTRE_FAIXAS_S
            ):
                modo = "travessia"
                marco = encoders()
                mover(VELOCIDADE_RETA, VELOCIDADE_RETA)
                avisar("Faixa de pedestres: seguindo reto")
                time.sleep(INTERVALO)
                continue

            # 3. Seguir a borda da linha.
            if modo == "linha":
                if luz < LIMIAR_PRETO:
                    ultimo_preto = agora
                    direcao_busca = -1
                    mover(VELOCIDADE_LENTA, VELOCIDADE_RAPIDA)
                    avisar("Acompanhando a linha")
                elif agora - ultimo_preto < TOLERANCIA_LINHA_S:
                    direcao_busca = 1
                    mover(VELOCIDADE_RAPIDA, VELOCIDADE_LENTA)
                    avisar("Acompanhando a linha")
                else:
                    modo = "busca"
                    inicio_busca = agora
                    avisar("Linha perdida: procurando sem recuar")

            # 4. Busca limitada: gira sobre o próprio eixo.
            if modo == "busca":
                if luz < LIMIAR_PRETO:
                    modo = "linha"
                    ultimo_preto = agora
                    avisar("Linha recuperada")
                    mover(VELOCIDADE_LENTA, VELOCIDADE_RAPIDA)
                else:
                    busca = agora - inicio_busca
                    if busca < TEMPO_BUSCA_1_S:
                        girar_para(direcao_busca)
                    elif busca < TEMPO_BUSCA_1_S + TEMPO_BUSCA_2_S:
                        girar_para(-direcao_busca)
                    else:
                        mover(0, 0)
                        avisar("Não encontrou a linha. Robô parado.")
                        break

            time.sleep(INTERVALO)

    finally:
        mover(0, 0)
        print("Execução encerrada; motores parados.")
