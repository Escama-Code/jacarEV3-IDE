# Física do robô (SimEV3)

Modelo **diferencial** mais realista para treino OBR — não é motor de jogo AAA.

## O que mudou

| Recurso | Efeito |
|---------|--------|
| `acelMotor` / `freioMotor` | Potência sobe/desce aos poucos (não teleporta) |
| `maxOmega` | Limite de guinada — menos “pião” |
| `escorregaCurva` | Curva fechada perde um pouco de avanço |
| `atritoLin` | Ajuda a dissipar movimento residual |
| Colisão | Ainda resvala na parede, mas amortece as rodas |

## Ajustar

No construtor / cfg:

```js
new SimEV3('treino', {
  acelMotor: 280,      // %/s
  freioMotor: 420,
  maxOmega: 4.2,       // rad/s
  escorregaCurva: 0.32,
  atritoLin: 0.18,
});
```

Mais “pesado”: baixe `acelMotor`, suba `escorregaCurva`.  
Mais “ágil”: o contrário.
