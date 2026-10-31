# Biblioteca de exemplos da jacarEV3

Os programas do menu do **Sandbox** agora ficam em arquivos Python separados.
A interface usa um catálogo JSON para organizar os programas por categorias.

## Arquivos

- `src/exemplos/exemplos.json`: categorias, descrições, cenários e caminhos.
- `src/exemplos/**/*.py`: os códigos Python que o aluno vê no editor.
- `src/js/exemplos/biblioteca.js`: carrega o catálogo e os arquivos Python.
- `public/sandbox.html`: apresenta os dois seletores (categoria e programa).

Os 11 exemplos que já existiam no Sandbox foram preservados. Adicionamos:
**Primeiros movimentos**, **Ler cor, luz e distância** e
**Seguidor urbano — linha + semáforo + faixas + curvas**.
O seguidor urbano usa o arquivo do programa que funcionou na versão anterior.

## Como acrescentar um programa

1. Crie um `.py` em `src/exemplos/`, por exemplo `sensores/meu-teste.py`.
2. Escreva o código Python com a biblioteca `jacarev3`.
3. Adicione uma entrada ao array `exemplos` em `src/exemplos/exemplos.json`:

```json
{
  "id": "meu_teste",
  "nome": "Meu teste",
  "descricao": "Exercício de leitura dos sensores.",
  "categoria": "sensores",
  "dificuldade": "Iniciante",
  "cenario": "treino",
  "inicio": "padrao",
  "arquivo": "sensores/meu-teste.py"
}
```

`cenario` deve corresponder à chave de um cenário já registrado na IDE;
`inicio`, à chave de uma posição inicial daquele cenário.
Os identificadores devem ser únicos, e os caminhos são relativos
à pasta `src/exemplos/`, usando apenas letras ASCII minúsculas, números,
`_`, `-` e `/`.

Não é necessário editar o HTML toda vez que for adicionar um exemplo.

## Como usar

Execute a IDE por um servidor HTTP (`npm run dev`) e abra
`http://localhost:8000/public/sandbox.html`.

1. Escolha a **Categoria**.
2. Escolha o **Programa**.
3. O código é carregado no editor e o cenário recomendado é selecionado.
4. Edite o programa livremente e clique em **Rodar script**.

**Atenção:** mudar de programa substitui o código atual do editor. Salve
suas alterações antes de trocar a seleção. A migração não modifica a Campanha.

## Testes

```bash
node tests/teste-biblioteca-exemplos.mjs
```

Também é possível validar a sintaxe de todos os arquivos `.py`
com Python 3 (`ast.parse`). O teste não substitui a simulação integral
dos programas com Pyodide no navegador.

Se o catálogo não carregar, confirme que os arquivos `src/exemplos/`
foram copiados e que a página está aberta via servidor, não como `file://`.

## Escopo e compatibilidade

Esta alteração reorganiza a biblioteca de exemplos do **Sandbox**.
Não altera a física, os mapas, sensores, semáforo, editor de mapas ou
os exemplos próprios das missões da Campanha.

A pasta `src/exemplos/` e o loader são independentes da biblioteca Python
`jacarev3`; os programas continuam importando a biblioteca normalmente.
