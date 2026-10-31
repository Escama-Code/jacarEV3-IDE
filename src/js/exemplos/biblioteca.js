/*
 * Biblioteca de exemplos jacarEV3.
 * Catálogo e códigos Python externos — sem dependências e sem código Python no HTML.
 * Permite evoluir exercícios sem editar sandbox.html.
 */
(function (global) {
  'use strict';

  const CAMINHO_BASE = new URL('../src/exemplos/', global.location.href);
  const CAMINHO_CATALOGO = new URL('exemplos.json', CAMINHO_BASE);
  const ARQUIVO_PERMITIDO = /^[a-z0-9][a-z0-9/_-]*\.py$/;

  function validarCatalogo(dados) {
    if (!dados || dados.versao !== 1 ||
        !Array.isArray(dados.categorias) || !Array.isArray(dados.exemplos)) {
      throw new Error('O catálogo de exemplos tem formato inválido.');
    }

    const categorias = new Set();
    for (const categoria of dados.categorias) {
      if (!categoria || typeof categoria.id !== 'string' ||
          typeof categoria.nome !== 'string' || categorias.has(categoria.id)) {
        throw new Error('Categoria duplicada ou inválida no catálogo.');
      }
      categorias.add(categoria.id);
    }

    const ids = new Set();
    for (const exemplo of dados.exemplos) {
      if (!exemplo || typeof exemplo.id !== 'string' || ids.has(exemplo.id) ||
          !categorias.has(exemplo.categoria) ||
          typeof exemplo.nome !== 'string' ||
          typeof exemplo.cenario !== 'string' ||
          typeof exemplo.inicio !== 'string' ||
          !ARQUIVO_PERMITIDO.test(exemplo.arquivo) ||
          exemplo.arquivo.split('/').includes('..')) {
        throw new Error('Exemplo duplicado ou inválido: ' + (exemplo?.id ?? '?'));
      }
      ids.add(exemplo.id);
    }

    if (!dados.exemplos.length) throw new Error('Catálogo de exemplos vazio.');
    return dados;
  }

  function criar({ categorias, exemplos, descricao }) {
    if (!categorias || !exemplos || !descricao) {
      throw new Error('Controles da biblioteca de exemplos não encontrados.');
    }

    let catalogo = null;
    let aoEscolher = null;
    let aoErro = null;
    let token = 0;
    const arquivos = new Map();

    function mostrarDescricao(exemplo) {
      descricao.textContent = exemplo
        ? [exemplo.dificuldade, exemplo.descricao].filter(Boolean).join(' · ')
        : 'Selecione um programa para ver sua descrição.';
    }

    function exemploAtual() {
      return catalogo?.exemplos.find(item => item.id === exemplos.value) ?? null;
    }

    function preencherProgramas(categoriaId, preferido = null) {
      exemplos.replaceChildren();

      const daCategoria = catalogo.exemplos.filter(
        item => item.categoria === categoriaId
      );
      for (const item of daCategoria) {
        exemplos.add(new Option(item.nome, item.id));
      }

      const selecionado = daCategoria.find(item => item.id === preferido);
      if (selecionado) exemplos.value = selecionado.id;
      mostrarDescricao(exemploAtual());
      return exemploAtual();
    }

    async function baixarCodigo(exemplo) {
      if (!exemplo) throw new Error('Nenhum programa selecionado.');
      if (!arquivos.has(exemplo.arquivo)) {
        const url = new URL(exemplo.arquivo, CAMINHO_BASE);
        const pedido = fetch(url.href, { cache: 'no-store' }).then(async resposta => {
          if (!resposta.ok) throw new Error('Falha ao abrir ' + exemplo.arquivo +
            ' (HTTP ' + resposta.status + ').');
          const codigo = await resposta.text();
          if (!codigo.trim()) throw new Error('O arquivo Python está vazio: ' + exemplo.arquivo);
          return codigo;
        }).catch(erro => {
          arquivos.delete(exemplo.arquivo); // permite tentar novamente
          throw erro;
        });
        arquivos.set(exemplo.arquivo, pedido);
      }
      return arquivos.get(exemplo.arquivo);
    }

    async function selecionar(exemplo) {
      if (!exemplo) return;
      const atual = ++token;
      mostrarDescricao(exemplo);
      descricao.textContent += ' · Carregando código…';

      try {
        const codigo = await baixarCodigo(exemplo);
        if (atual !== token) return; // resposta antiga: aluno já escolheu outro exemplo
        mostrarDescricao(exemplo);
        if (aoEscolher) aoEscolher(exemplo, codigo);
        return { exemplo, codigo };
      } catch (erro) {
        if (atual !== token) return;
        descricao.textContent = 'Não foi possível carregar: ' + erro.message;
        if (aoErro) aoErro(erro);
        throw erro;
      }
    }

    async function iniciar() {
      categorias.disabled = true;
      exemplos.disabled = true;

      const resposta = await fetch(CAMINHO_CATALOGO.href, { cache: 'no-store' });
      if (!resposta.ok) throw new Error('Catálogo indisponível (HTTP ' + resposta.status + ').');
      catalogo = validarCatalogo(await resposta.json());

      categorias.replaceChildren();
      for (const item of catalogo.categorias) {
        categorias.add(new Option(item.nome, item.id));
      }

      const inicial = catalogo.exemplos.find(item => item.id === catalogo.exemploInicial)
        ?? catalogo.exemplos[0];
      categorias.value = inicial.categoria;
      const escolhido = preencherProgramas(inicial.categoria, inicial.id);
      categorias.disabled = false;
      exemplos.disabled = false;
      return selecionar(escolhido);
    }

    function ativar(handler, handlerErro) {
      aoEscolher = handler;
      aoErro = handlerErro;

      categorias.addEventListener('change', () => {
        const atual = preencherProgramas(categorias.value);
        selecionar(atual).catch(() => {});
      });
      exemplos.addEventListener('change', () => {
        selecionar(exemploAtual()).catch(() => {});
      });
    }

    return {
      iniciar,
      ativar,
      get catalogo() { return catalogo; },
      get atual() { return exemploAtual(); },
    };
  }

  global.JacarBibliotecaExemplos = Object.freeze({ criar, validarCatalogo });
})(window);
