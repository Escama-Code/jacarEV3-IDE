<p align="center">
  <img src="https://raw.githubusercontent.com/i-barbosa/jacarEV3/main/assets/logo.png" width="120" alt="jacarEV3">
</p>

<h1 align="center">jacarEV3 IDE</h1>

<p align="center">
  IDE educacional no navegador para programar com a biblioteca
  <a href="https://pypi.org/project/jacarev3/"><strong>jacarev3</strong></a>
  — robótica LEGO EV3 em <strong>Python em português</strong>, com simulação 2D e 3D.
</p>

<p align="center">
  <a href="https://escama-code.github.io/jacarEV3-IDE/public/"><img src="https://img.shields.io/badge/Demo-GitHub%20Pages-emerald?style=flat" alt="Demo"></a>
  <a href="https://github.com/i-barbosa/jacarEV3"><img src="https://img.shields.io/badge/Biblioteca-jacarev3-blue?style=flat" alt="jacarev3"></a>
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="MIT">
</p>

---

## O que é?

A **jacarEV3 IDE** é um ambiente de programação que roda **inteiro no navegador**: você escreve código Python, executa de verdade (via [Pyodide](https://pyodide.org/)) e vê o robô se mover na arena — em **2D** ou **3D** — sem instalar Python local nem o software oficial do LEGO.

Ela usa a mesma API da biblioteca [jacarev3](https://github.com/i-barbosa/jacarEV3) (`RoboEV3`, motores, sensores, LED, etc.), para o aluno treinar na tela e depois levar o código para o brick físico.

---

## Para que serve?

| Uso | Descrição |
|-----|-----------|
| **Aula sem robô** | Laboratório só com computador e navegador |
| **Sandbox** | Experimentar a biblioteca livremente |
| **Campanha** | Missões guiadas (códigos-base, leis de trânsito…) com dicas e estrelas |
| **Simulação** | Tapete 2D (sensor de cor) e vista 3D (Three.js) com modelos (EV3, jacaré, etc.) |
| **Teleop** | Controle por teclado ou gamepad na simulação |

Público-alvo: escolas, oficinas de robótica e projetos de **pensamento computacional** que usam EV3 e sintaxe em português.

---

## Experimentar

**IDE online:**  
https://escama-code.github.io/jacarEV3-IDE/public/

**Biblioteca e documentação:**  
https://github.com/escama-code/jacarEV3

---

## Colaboradores

<p align="center">
  <a href="https://github.com/Escama-Code/jacarEV3-IDE/graphs/contributors">
    <img src="https://contrib.rocks/image?repo=Escama-Code/jacarEV3-IDE" alt="Contributors" />
  </a>
</p>

<p align="center">
  <a href="https://github.com/Escama-Code/jacarEV3-IDE/graphs/contributors">Ver contribuições no GitHub</a>
</p>

### Quem fez o quê (resumo)

| Pessoa | Papel / contribuições principais |
|--------|-----------------------------------|
| **[Ítalo Vinicius](https://github.com/i-barbosa)** | Idealização, biblioteca jacarev3, IDE e documentação |
| **[Miguel Arcanjo](https://github.com/MiguelAR098)** | Recursos de motor/base na lib e apoio ao ecossistema |
| **[Adrews](https://github.com/Adrews1)** | Ajustes de API (`portas=`) usados na lib e na IDE |

A imagem de avatares **atualiza sozinha** quando entram novos contributors. A tabela acima é um resumo editorial.

---

## Organização

Projeto do ecossistema **[Escama Code](https://github.com/Escama-Code)**, alinhado ao Programa Embarque Digital e à biblioteca **jacarev3**.

---

## Licença

MIT — uso livre em escolas, projetos e pesquisa.

## Arenas sBotics (.sArena) — correção de altura e apoio

Em `public/sandbox.html`, use **Importar .sArena** e em seguida **3D**.
O renderizador mantém os pisos sobre suportes, com espessura e rampas fechadas,
e alinha a altura do robô ao mesmo relevo da arena. A simulação continua 2D:
colisões bloqueiam saída da borda e saltos verticais, mas não simulam gravidade
3D. Veja `docs/importar-sarena.md`.

Validação local: `node tests/teste-sarena.mjs`.
