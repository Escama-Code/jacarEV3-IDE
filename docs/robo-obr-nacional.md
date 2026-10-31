# Robô perfil OBR Nacional (simulador)

Configuração padrão do `SimEV3` para treino no nível **nacional** (Rescue Line + base de resgate).

## Portas de sensor

| Porta | Tipo | Uso OBR |
|------:|------|---------|
| **1** | Cor (esquerda) | Borda esquerda da linha / array |
| **2** | Cor (centro) | Linha + **marcação verde** (modo COR) |
| **3** | Cor (direita) | Borda direita da linha / array |
| **4** | Ultrassônico | Obstáculos, aproximação de parede/sala |

Espaçamento lateral padrão: **2,0 cm** entre sensores.  
Avanço à frente do centro do robô: **5,5 cm**.

## Modos do sensor de cor (EV3)

| Modo | Constante | Retorno |
|------|-----------|---------|
| 0 | `MODO_COR_REFLETIDA` | 0–100 (preto baixo, claro alto) |
| 1 | ambiente | fixo ~10 no sim |
| 2 | `MODO_COR_COR` | id: 3=verde, 1=preto, 6=branco… |

## Giroscópio

No EV3 físico o giro ocupa uma porta. No simulador o ângulo vem da **odometria** (`th` do robô). Use para curvas de 90° estáveis sem gastar porta de cor.

## Resgate

- Mapas com **sala de resgate** (editor modular / livre).
- Áreas triangulares verde/vermelho.
- Ultrassom + cor para entrar, identificar vítimas/áreas e sair pela fita.

## Exemplo

`src/exemplos/obr-nacional/array-linha-verde.py`

## Garra (motor A)

No modelo 3D a **garra de resgate** responde ao **encoder do motor A**:

| Encoder A | Garra |
|-----------|--------|
| ~0° | Aberta |
| ~85°+ (\|ângulo\|) | Fechada |

```python
robo.mover_graus('A', 90, 40)   # fecha
robo.mover_graus('A', -90, 40)  # abre
```

Motores **B** e **C** = tração diferencial.  
Exemplo: `src/exemplos/obr-nacional/teste-garra.py`
