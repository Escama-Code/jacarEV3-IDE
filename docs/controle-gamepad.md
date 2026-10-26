# Controle (gamepad) na IDE

A IDE **não usa pygame**. O controle entra pela **Gamepad API do navegador** e o teleop roda em JS com `requestAnimationFrame`, para a arena 2D/3D atualizar ao vivo.

## Uso rápido

1. Conecte o controle USB/Bluetooth.
2. Clique na página e **aperte qualquer botão** no pad (Chrome exige isso).
3. Exemplo **Controle (gamepad) — teleop ao vivo** → Rodar script.

| Input | Ação |
|-------|------|
| Stick esquerdo ou D-pad | Move o robô |
| **B** | Para |
| **A** | Apita |
| **X** / **Y** | LED vermelho / verde |
| **Start** | Encerra o teleop |

## Código Python (IDE)

```python
from js import gamepadPonte

# 60 segundos, velocidade base 40
await gamepadPonte.teleop(60, 40)
```

O `await` é obrigatório: o teleop devolve uma Promise e a IDE usa `runPythonAsync`.

## API

| Método | Descrição |
|--------|-----------|
| `gamepadPonte.ler()` | Snapshot atual ou `None` |
| `gamepadPonte.conectado()` | `True`/`False` |
| `gamepadPonte.teleop(segundos, vel)` | Teleop ao vivo (Promise) |
| `gamepadPonte.pararTeleop()` | Encerra o teleop |
| `gamepadPonte.mostrarAoVivo()` | Redesenha a pose de `App.sim` |

## Por que o loop `while True` + `time.sleep` “não mexia” o robô na tela

Esse loop roda **síncrono** na thread do navegador: a física até grava frames, mas a página **não pinta** até o script acabar. O `teleop()` evita isso usando `requestAnimationFrame`.

## pygame no PC

Fora da IDE, no Python do sistema, continue com `pygame.joystick` normalmente.
