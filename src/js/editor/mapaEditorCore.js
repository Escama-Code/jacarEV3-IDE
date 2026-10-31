/* jacarEV3 Editor - lógica independente de DOM para mapas autorais.
 * Não usa formatos, texturas ou recursos proprietários.
 * Pode ser carregado no browser e em Node para testes.
 */
(function (global) {
  'use strict';
  const copy = (x) => JSON.parse(JSON.stringify(x));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const hypot = (a, b) => Math.hypot(a[0]-b[0], a[1]-b[1]);
  const SOURCE = 'https://obr.robocup.org.br/documentos-e-manuais/';
  const REGRAS = Object.freeze({
    regional: { nome: 'Presencial Regional/Estadual 2026', linhaMin: 1, linhaMax: 2, bordaReferencia: 11.5, entradaMin: 25, entradaMax: 30, paredeMin: 10, ladoArea: 30, tempo: 300 },
    nacional: { nome: 'Presencial Nacional 2026', linhaMin: 1, linhaMax: 2, bordaReferencia: 10, entradaMin: null, entradaMax: null, paredeMin: 10, ladoArea: 30, tempo: 300 }
  });
  function criarDocumento(w=260,h=180) {
    return { formato:'jacarev3-mapa', versao:2, nome:'Meu circuito', w, h, pxPorCm:5,
      basePNG:'', sobreposicaoPNG:'', legadoRaster:false, borrachasBase:[], sinalUrbano:null, tracos:[], caixas:[], rampas:[], decoracoes3d:[], areas:[], salas:[],
      pontosEducativos:[], desenhoCaixasNaTextura:false,
      perfil:'livre', nivel:1, inicio:{ x:28, y:h-25, th:-Math.PI/2 } };
  }
  function migrar(data) {
    if (!data || data.formato!=='jacarev3-mapa' || ![1,2].includes(data.versao))
      throw new Error('Formato .jmap inválido (suportadas versões 1 e 2).');
    const d = copy(data);
    d.versao=2;
    d.areas ||= []; d.salas ||= [];
    d.sobreposicaoPNG ||= ''; d.legadoRaster ||= false; d.borrachasBase ||= []; d.sinalUrbano ||= null;
    d.salas = d.salas.map(normalizarSala);
    d.perfil ||= 'livre'; d.nivel ||= 1;
    d.caixas ||= []; d.rampas ||= []; d.decoracoes3d ||= []; d.tracos ||= [];
    d.pontosEducativos ||= [];
    d.desenhoCaixasNaTextura ??= false;
    for (const t of d.tracos) { if (t.tipo==='borracha') t.espessura=Math.max(.5,t.espessura); }
    return validar(d);
  }
  function num(x,a,b,label) {
    if (typeof x!=='number' || !Number.isFinite(x) || x<a || x>b) throw Error('Número inválido: '+label);
  }
  function pontos(d,pts,limite=4000) {
    if (!Array.isArray(pts) || !pts.length || pts.length>limite) throw Error('Quantidade de pontos inválida');
    for (const p of pts) { if(!Array.isArray(p)||p.length!==2) throw Error('Ponto inválido'); num(p[0],0,d.w,'x');num(p[1],0,d.h,'y');}
  }
  const LADOS = ['cima','direita','baixo','esquerda'];
  const girarLado = (lado, passos) => LADOS[(LADOS.indexOf(lado)+passos+4)%4];
  function normalizarSala(s) {
    return {
      ...s,
      entrada: s.entrada ?? 27,
      ladoEntrada: s.ladoEntrada ?? 'esquerda',
      segundaEntrada: Boolean(s.segundaEntrada ?? false),
      ladoEntrada2: s.ladoEntrada2 ?? 'direita',
      entrada2: s.entrada2 ?? 27,
      rotacao: s.rotacao ?? 0
    };
  }
  // A rotação gira a sala inteira em torno do centro, inclusive as aberturas.
  // As dimensões são trocadas após um giro de 90° ou 270°.
  function rotacionarSala(s, novaRotacao, mapaW, mapaH) {
    const atual=normalizarSala(s);
    const passos=((novaRotacao-atual.rotacao)%4+4)%4;
    if(!Number.isInteger(novaRotacao)||novaRotacao<0||novaRotacao>3)throw Error('Rotação da sala inválida');
    const w=passos%2?atual.h:atual.w, h=passos%2?atual.w:atual.h;
    const cx=atual.x+atual.w/2,cy=atual.y+atual.h/2;
    if(w>mapaW||h>mapaH)throw Error('Sala girada não cabe no mapa');
    return {...atual,x:clamp(cx-w/2,0,mapaW-w),y:clamp(cy-h/2,0,mapaH-h),w,h,
      ladoEntrada:girarLado(atual.ladoEntrada,passos),
      ladoEntrada2:girarLado(atual.ladoEntrada2,passos),
      rotacao:novaRotacao
    };
  }
  function aberturasDaSala(s) {
    const sala=normalizarSala(s);
    return [{lado:sala.ladoEntrada,largura:sala.entrada},
      ...(sala.segundaEntrada?[{lado:sala.ladoEntrada2,largura:sala.entrada2}]:[])];
  }
  function validarSala(s,d) {
    num(s.x,0,d.w,'sala x');num(s.y,0,d.h,'sala y');
    num(s.w,35,180,'sala largura');num(s.h,35,180,'sala altura');
    if(s.x+s.w>d.w+.01||s.y+s.h>d.h+.01)throw Error('Sala fora do mapa');
    if(!Number.isInteger(s.rotacao)||s.rotacao<0||s.rotacao>3)throw Error('Rotação inválida');
    if(typeof s.segundaEntrada!=='boolean')throw Error('Segunda entrada inválida');
    const usados=new Set();
    for(const a of aberturasDaSala(s)){
      if(!LADOS.includes(a.lado))throw Error('Lado da entrada inválido');
      if(usados.has(a.lado))throw Error('Escolha paredes diferentes para as duas entradas');
      usados.add(a.lado);
      const comprimento=['cima','baixo'].includes(a.lado)?s.w:s.h;
      num(a.largura,10,70,'largura da entrada');
      if(a.largura>comprimento-8)throw Error(`A entrada na parede ${a.lado} precisa deixar pelo menos 4 cm em cada ponta.`);
    }
  }
  function validar(d) {
    if (!d || d.formato!=='jacarev3-mapa' || d.versao!==2) throw Error('Formato inválido');
    if (typeof d.nome!=='string'||!d.nome.trim()||d.nome.length>70) throw Error('Nome inválido');
    num(d.w,40,480,'largura');num(d.h,40,600,'altura');num(d.pxPorCm,2,6,'resolução');
    if(d.w*d.h*d.pxPorCm**2>3000000)throw Error('Resolução do mapa muito grande');
    if (typeof d.basePNG!=='string'||(d.basePNG!==''&&(!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(d.basePNG)||d.basePNG.length>3000000))) throw Error('Imagem base inválida');
    if(typeof d.sobreposicaoPNG!=='string'||(d.sobreposicaoPNG!==''&&(!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(d.sobreposicaoPNG)||d.sobreposicaoPNG.length>3000000))) throw Error('Sobreposição inválida');
    if(typeof d.legadoRaster!=='boolean'||!Array.isArray(d.borrachasBase)||d.borrachasBase.length>1000) throw Error('Restaurações da linha inválidas');
    for(const b of d.borrachasBase) {num(b.espessura,.5,20,'espessura da borracha');pontos(d,b.pontos);}
    if(d.sinalUrbano!==null) {
      if(!d.sinalUrbano || !Array.isArray(d.sinalUrbano.semaforos) || d.sinalUrbano.semaforos.length>12) throw Error('Semáforos inválidos');
      for(const b of d.sinalUrbano.semaforos){
        num(b.x,0,d.w,'sinal x');num(b.y,0,d.h,'sinal y');num(b.w,.1,d.w,'sinal largura');num(b.h,.1,d.h,'sinal altura');
        if(b.x+b.w>d.w||b.y+b.h>d.h)throw Error('Sinal fora do mapa');
      }
      if(!Array.isArray(d.sinalUrbano.ciclo)||d.sinalUrbano.ciclo.length<1||d.sinalUrbano.ciclo.length>12)
        throw Error('Ciclo do semáforo inválido');
      for(const fase of d.sinalUrbano.ciclo){
        if(!['VERMELHO','AMARELO','VERDE'].includes(fase.estado))throw Error('Estado do semáforo inválido');
        num(fase.duracao,.1,300,'duração do semáforo');
      }
    }
    if (!['livre','regional','nacional'].includes(d.perfil)||![1,2].includes(d.nivel))throw Error('Perfil inválido');
    if(!Array.isArray(d.tracos)||d.tracos.length>1500)throw Error('Traços inválidos');
    for(const t of d.tracos) {
      if(!['caneta','borracha','reta','curva','circulo','retangulo'].includes(t.tipo))throw Error('Tipo de traço inválido');
      num(t.espessura,.5,20,'espessura'); pontos(d,t.pontos);
      if (t.tipo==='curva'&&t.pontos.length!==3)throw Error('Curva requer 3 pontos');
      if (['reta','circulo','retangulo'].includes(t.tipo)&&t.pontos.length!==2)throw Error('Forma requer 2 pontos');
    }
    if(!d.inicio)throw Error('Início ausente');
    num(d.inicio.x,0,d.w,'início x');num(d.inicio.y,0,d.h,'início y');num(d.inicio.th,-2*Math.PI,2*Math.PI,'orientação');
    if (!Array.isArray(d.caixas)||d.caixas.length>200)throw Error('Obstáculos inválidos');
    for(const b of d.caixas) { num(b.x,0,d.w,'caixa x');num(b.y,0,d.h,'caixa y');num(b.w,.1,d.w,'caixa largura');num(b.h,.1,d.h,'caixa profundidade');if(b.x+b.w>d.w+.01||b.y+b.h>d.h+.01)throw Error('Obstáculo fora do mapa');if(b.altura!==undefined)num(b.altura,.1,60,'caixa altura'); }
    if(!Array.isArray(d.rampas)||d.rampas.length>30)throw Error('Rampas inválidas');
    for (const r of d.rampas) {
      num(r.x,0,d.w,'rampa x');
      num(r.y,0,d.h,'rampa y');
      num(r.w,1,d.w,'rampa largura');
      num(r.h,1,d.h,'rampa comprimento');
      num(r.altura,.1,40,'rampa altura');
      if (!['+x','-x','+y','-y'].includes(r.dir)) {
        throw Error('Direção da rampa inválida');
      }
      // A subida acontece ao longo do eixo indicado, não necessariamente em X.
      // Ex.: uma rampa 24 x 52 cm orientada em +Y pode ter subida de 30 cm.
      const eixo = r.dir.endsWith('x') ? r.w : r.h;
      num(r.subida,1,eixo,'rampa subida');
      if (r.x+r.w>d.w+0.01 || r.y+r.h>d.h+0.01) {
        throw Error('Rampa fora do mapa');
      }
    }
    if(!Array.isArray(d.decoracoes3d)||d.decoracoes3d.length>120)throw Error('Objetos inválidos');
    for(const o of d.decoracoes3d){if(o.tipo!=='esfera')throw Error('Tipo de objeto inválido');num(o.x,0,d.w,'esfera x');num(o.y,0,d.h,'esfera y');num(o.raio,.1,10,'raio');}
    if(!Array.isArray(d.areas)||d.areas.length>120)throw Error('Áreas inválidas');
    for(const a of d.areas){if(a.tipo!=='triangulo'||!['verde','vermelho'].includes(a.cor)||!['tl','tr','bl','br'].includes(a.canto))throw Error('Área inválida');num(a.x,0,d.w,'área x');num(a.y,0,d.h,'área y');num(a.lado,2,60,'lado da área');if(a.x+a.lado>d.w+.01||a.y+a.lado>d.h+.01)throw Error('Área fora do mapa');}
    if(!Array.isArray(d.salas)||d.salas.length>12)throw Error('Salas inválidas');
    for(const original of d.salas){validarSala(normalizarSala(original),d);}
    // Metadados didáticos persistidos no .jmap: nunca executados como HTML.
    if(d.desenhoCaixasNaTextura!==undefined&&typeof d.desenhoCaixasNaTextura!=='boolean')
      throw Error('Configuração visual inválida');
    if(d.pontosEducativos!==undefined) {
      if(!Array.isArray(d.pontosEducativos)||d.pontosEducativos.length>40)throw Error('Pontos educativos inválidos');
      for(const p of d.pontosEducativos) {
        num(p.x,0,d.w,'ponto educativo x');num(p.y,0,d.h,'ponto educativo y');
        num(p.raio,1,40,'raio educativo');
        for(const [chave,limite] of [['titulo',100],['mensagem',420],['fundamento',100],['icone',20]]) {
          const texto=p[chave];
          if(texto===undefined && ['fundamento','icone'].includes(chave))continue;
          if(typeof texto!=='string'||!texto.trim()||texto.length>limite)throw Error('Texto educativo inválido: '+chave);
        }
      }
    }
    return d;
  }
  function getPontosFinais(t) {
    if (!t || t.tipo==='borracha') return [];
    if (['circulo','retangulo'].includes(t.tipo)) return [];
    return [t.pontos[0],t.pontos[t.pontos.length-1]];
  }
  function snapPonto(p, tracos, raio=3) {
    let found=null,dist=raio;
    for(const t of tracos) for (const q of getPontosFinais(t)) {
      const nd=hypot(p,q);if(nd<=dist){found=q;dist=nd;}
    }
    return found ? [...found] : [...p];
  }
  function simplificar(pontos, tolerancia=.45) {
    if(pontos.length<3)return pontos.map(p=>[...p]);
    const res=[pontos[0]];let last=pontos[0];
    for(let i=1;i<pontos.length-1;i++){if(hypot(pontos[i],last)>=tolerancia){res.push(pontos[i]);last=pontos[i];}}
    res.push(pontos[pontos.length-1]);return res;
  }
  // Chaikin: retira tremores, preserva extremidades para não abrir a junção.
  function suavizar(pontos, iter=2) {
    let out=simplificar(pontos);
    for(let k=0;k<iter;k++){
      if(out.length<3)break;
      const next=[out[0]];
      for(let i=0;i<out.length-1;i++){
        const a=out[i],b=out[i+1];
        next.push([a[0]*.75+b[0]*.25,a[1]*.75+b[1]*.25],[a[0]*.25+b[0]*.75,a[1]*.25+b[1]*.75]);
      }
      next.push(out[out.length-1]);out=next;
    }
    return out;
  }
  function reconhecer(pontos) {
    if(pontos.length<5)return null;
    const a=pontos[0],b=pontos[pontos.length-1],dist=hypot(a,b);
    if(dist<8)return null;
    let soma=0;
    for(const p of pontos) soma+=Math.abs((b[0]-a[0])*(a[1]-p[1])-(a[0]-p[0])*(b[1]-a[1]))/dist;
    return soma/pontos.length < .95 ? [a,b] : null;
  }
  function tracar(ctx,t) {
    const p=t.pontos; if(!p.length)return;
    ctx.save();ctx.lineWidth=t.espessura;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#050505';ctx.fillStyle='#050505';
    ctx.beginPath();
    if(t.tipo==='curva'&&p.length===3){ctx.moveTo(...p[0]);ctx.quadraticCurveTo(p[1][0],p[1][1],p[2][0],p[2][1]);}
    else if(t.tipo==='retangulo'&&p.length===2){ctx.rect(p[0][0],p[0][1],p[1][0]-p[0][0],p[1][1]-p[0][1]);}
    else if(t.tipo==='circulo'&&p.length===2){const cx=(p[0][0]+p[1][0])/2,cy=(p[0][1]+p[1][1])/2,rx=Math.abs(p[1][0]-p[0][0])/2,ry=Math.abs(p[1][1]-p[0][1])/2;ctx.ellipse(cx,cy,Math.max(rx,.01),Math.max(ry,.01),0,0,2*Math.PI);}
    else if(p.length===1){ctx.arc(p[0][0],p[0][1],t.espessura/2,0,2*Math.PI);ctx.fill();}
    else {ctx.moveTo(...p[0]);for(let i=1;i<p.length;i++)ctx.lineTo(...p[i]);}
    ctx.stroke();ctx.restore();
  }
  // Borracha elimina APENAS pixels da camada de linha (destination-out).
  function pintarTracosSeparados(ctx,d,tracos,criarCanvas) {
    const layer=criarCanvas(Math.round(d.w*d.pxPorCm),Math.round(d.h*d.pxPorCm));
    const g=layer.getContext('2d');
    g.setTransform(layer.width/d.w,0,0,layer.height/d.h,0,0);
    for(const t of tracos) {
      g.save();if(t.tipo==='borracha')g.globalCompositeOperation='destination-out';
      tracar(g,t);g.restore();
    }
    ctx.drawImage(layer,0,0,d.w,d.h);
  }
  function vertices(a) {
    const {x,y,lado}=a;
    const corners={tl:[[x,y],[x+lado,y],[x,y+lado]],tr:[[x+lado,y],[x,y],[x+lado,y+lado]],bl:[[x,y+lado],[x,y],[x+lado,y+lado]],br:[[x+lado,y+lado],[x+lado,y],[x,y+lado]]};
    return corners[a.canto];
  }
  function pintarAreas(ctx,areas) {
    for(const a of areas){const v=vertices(a);ctx.save();ctx.fillStyle=a.cor==='verde'?'#229c51':'#d43d36';
      ctx.beginPath();ctx.moveTo(...v[0]);ctx.lineTo(...v[1]);ctx.lineTo(...v[2]);ctx.closePath();ctx.fill();ctx.restore();}
  }
  function caixasDasSalas(salas) {
    const boxes=[],t=1.8;
    for(const original of salas) {
      const s=normalizarSala(original), aberturas=aberturasDaSala(s);
      const comum={cor:'#d5d9da',altura:12,modelo:'simples',nome:'Parede da sala'};
      for(const lado of LADOS) {
        const abertura=aberturas.find(e=>e.lado===lado);
        const horizontal=lado==='cima'||lado==='baixo';
        // As bordas horizontais incluem os cantos; as verticais começam
        // após os cantos para evitar colisores sobrepostos.
        const comprimento=horizontal?s.w:s.h-2*t;
        const larguraAbertura=abertura?.largura??0;
        const antes=(comprimento-larguraAbertura)/2;
        const secao=(inicio,extensao)=>{
          if(extensao<.05)return;
          const b=horizontal
            ? {x:s.x+inicio,y:lado==='cima'?s.y:s.y+s.h-t,w:extensao,h:t}
            : {x:lado==='esquerda'?s.x:s.x+s.w-t,y:s.y+t+inicio,w:t,h:extensao};
          boxes.push({...comum,...b});
        };
        if(!abertura)secao(0,comprimento);
        else {secao(0,antes);secao(antes+larguraAbertura,antes);}
      }
    }
    return boxes;
  }
  function elementosDasSalas(salas) {
    const areas=[],objetos=[];
    for(const original of salas) {
      const s=normalizarSala(original);
      const lado=Math.min(30,Math.max(8,Math.min(s.w,s.h)*.32));
      const cantoVermelho=['tr','br','bl','tl'][s.rotacao];
      const cantoVerde=['bl','tl','tr','br'][s.rotacao];
      const cantoPos=(canto)=>{
        return {x:s.x+(canto.endsWith('r')?s.w-lado:0),
          y:s.y+(canto.startsWith('b')?s.h-lado:0)};
      };
      areas.push({tipo:'triangulo',...cantoPos(cantoVermelho),lado,canto:cantoVermelho,cor:'vermelho'});
      areas.push({tipo:'triangulo',...cantoPos(cantoVerde),lado,canto:cantoVerde,cor:'verde'});
      const cx=s.x+s.w/2,cy=s.y+s.h/2,sep=Math.min(9,s.w/5);
      for(let i=-1;i<=1;i++)objetos.push({tipo:'esfera',nome:'Vítima de treino',
        x:cx+i*sep,y:cy,raio:2.25,cor:i===1?'#222222':'#c6c9ca'});
    }
    return {areas,objetos};
  }
  function validaOBR(d) {
    const avisos=[],ok=[];
    if(d.perfil==='livre')return [{tipo:'info',texto:'Modo livre: sem restrições OBR.'}];
    const r=REGRAS[d.perfil];
    for(const [i,t] of d.tracos.entries()){
      if(t.tipo==='borracha')continue;
      if(t.espessura<r.linhaMin||t.espessura>r.linhaMax)avisos.push({tipo:'aviso',texto:`Traço ${i+1}: ${t.espessura} cm; referência ${r.linhaMin}–${r.linhaMax} cm.`});
    }
    for(const [i,s] of d.salas.entries()){
      if(![[90,90],[120,90],[90,120]].some(([w,h])=>Math.abs(w-s.w)<.5&&Math.abs(h-s.h)<.5))avisos.push({tipo:'aviso',texto:`Sala ${i+1}: conferir dimensões de 90×90 ou 120×90 cm.`});
      if(r.entradaMin!==null&&(s.entrada<r.entradaMin||s.entrada>r.entradaMax))avisos.push({tipo:'aviso',texto:`Sala ${i+1}: entrada precisa estar entre ${r.entradaMin}–${r.entradaMax} cm.`});
      if(s.segundaEntrada)avisos.push({tipo:'aviso',texto:`Sala ${i+1}: segunda entrada ativa — confirmar se o regulamento da prova permite duas aberturas.`});
      if(s.segundaEntrada&&r.entradaMin!==null&&(s.entrada2<r.entradaMin||s.entrada2>r.entradaMax))avisos.push({tipo:'aviso',texto:`Sala ${i+1}: segunda entrada fora da referência ${r.entradaMin}–${r.entradaMax} cm.`});
    }
    for(const [i,b] of d.caixas.entries()){
      if(b.modelo==='simples'&&b.tipoEditor==='parede'&&(b.altura||0)<r.paredeMin)avisos.push({tipo:'aviso',texto:`Parede ${i+1}: altura inferior a ${r.paredeMin} cm.`});
    }
    for(const [i,a] of [...d.areas,...elementosDasSalas(d.salas).areas].entries()){
      if(Math.abs(a.lado-r.ladoArea)>.2)avisos.push({tipo:'aviso',texto:`Área ${i+1}: lado diferente de 30 cm.`});
    }
    for(const [i,v] of d.decoracoes3d.entries()) if(v.tipo==='esfera'&&(2*v.raio<4||2*v.raio>5))avisos.push({tipo:'aviso',texto:`Esfera ${i+1}: diâmetro fora da referência 4–5 cm.`});
    for(const [i,rampa] of d.rampas.entries()){
      if(Math.atan(rampa.altura/rampa.subida)*180/Math.PI>25)avisos.push({tipo:'aviso',texto:`Rampa ${i+1}: inclinação maior que 25°.`});
    }
    if(d.basePNG)avisos.push({tipo:'info',texto:'Imagem base copiada: seus traços e medidas não são verificáveis individualmente.'});
    if(!d.tracos.length&&!d.basePNG)avisos.push({tipo:'aviso',texto:'Desenhe ao menos uma linha para treino de seguimento.'});
    if(!avisos.some(v=>v.tipo==='aviso'))ok.push({tipo:'ok',texto:'Nenhuma divergência detectada nos elementos estruturados verificados.'});
    return [...avisos,...ok,{tipo:'info',texto:`Treino inspirado no manual ${r.nome}. Não é certificação oficial OBR. Referência: ${SOURCE}`}];
  }
  const api={copy,clamp,hypot,REGRAS,SOURCE,criarDocumento,migrar,validar,normalizarSala,rotacionarSala,aberturasDaSala,validarSala,snapPonto,simplificar,suavizar,reconhecer,tracar,pintarTracosSeparados,vertices,pintarAreas,caixasDasSalas,elementosDasSalas,validaOBR};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  global.JacarMapaCore=api;
})(typeof window!=='undefined'?window:globalThis);
