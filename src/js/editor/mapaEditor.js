/**
 * jacarEV3 - Construtor de Mapas v2
 * Camadas: imagem-base (imutável), áreas coloridas, linha editável e objetos geométricos.
 * Os dados do .jmap são autorais e compartilhados pelo sensor, colisões e vista 3D.
 */
(() => {
  'use strict';
  const M = window.JacarMapaCore;
  if (!M) throw Error('mapaEditorCore.js precisa ser carregado antes do editor.');
  const $ = id => document.getElementById(id);
  const idTool = t => `[data-map-tool="${t}"]`;
  const TOOLS = new Set(['caneta','borracha','reta','curva','circulo','retangulo','parede','caixa','rampa','esfera','verde','vermelho','sala','editarSala','mover','excluir','inicio']);
  const LINE_TOOLS = new Set(['caneta','reta','curva','circulo','retangulo']);
  const DRAG_TOOLS = new Set(['caneta','borracha','reta','circulo','retangulo','parede','caixa','rampa']);
  let doc, baseImage=null, overlayImage=null, preview=null, stagedCurve=null, pointer=null, historico=[], futuro=[];
  let ferramenta='caneta', ativo=false, ocupado=false, moving=null;
  let selectedRoom=null, draftRotation=0;
  let repairedCache={key:null,image:null,canvas:null};
  const deep=M.copy;
  const CANVAS=()=> $('mapEditorCanvas');
  const aviso = (msg,erro=false)=>{const n=$('mapEditorAviso');n.textContent=msg;n.style.color=erro?'#ff9e9e':'';};
  const novoCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
  const pontosCenario=()=>[
    ...doc.caixas.map(b=>({tipo:'caixa',item:b})),
    ...doc.rampas.map(r=>({tipo:'rampa',item:r})),
    ...doc.decoracoes3d.map(o=>({tipo:'esfera',item:o})),
    ...doc.areas.map(a=>({tipo:'area',item:a})),
    ...doc.salas.map(s=>({tipo:'sala',item:s}))
  ];
  function mouse(e){
    const b=CANVAS().getBoundingClientRect();
    let x=M.clamp((e.clientX-b.left)/b.width*doc.w,0,doc.w);
    let y=M.clamp((e.clientY-b.top)/b.height*doc.h,0,doc.h);
    if($('mapEditorSnapGrid').checked){
      x=M.clamp(Math.round(x/5)*5,0,doc.w);
      y=M.clamp(Math.round(y/5)*5,0,doc.h);
    }
    return [Math.round(x*100)/100,Math.round(y*100)/100];
  }
  function pontas(p){
    if(!$('mapEditorSnap').checked)return p;
    return M.snapPonto(p,doc.tracos,Number($('mapEditorSnapDist').value)||3);
  }
  function estado(){return deep({borrachasBase:doc.borrachasBase,tracos:doc.tracos,caixas:doc.caixas,rampas:doc.rampas,decoracoes3d:doc.decoracoes3d,areas:doc.areas,salas:doc.salas,inicio:doc.inicio});}
  function gravar(){historico.push(estado());if(historico.length>70)historico.shift();futuro=[];}
  function desfazer(de,para){
    if(!de.length)return;
    para.push(estado());Object.assign(doc,de.pop());
    preview=null;stagedCurve=null;
    if(selectedRoom!==null && !doc.salas[selectedRoom])selectedRoom=null;
    if(selectedRoom!==null)preencherControlesSala(doc.salas[selectedRoom]);
    renderizar();
  }
  async function carregarImagem(src){
    if(!src)return null;
    const img=new Image();img.decoding='async';img.src=src;
    try{
      if(img.decode)await img.decode();
      else await new Promise((res,rej)=>{img.onload=res;img.onerror=rej;});
    }catch{throw Error('Imagem base inválida.');}
    return img;
  }
  function pincel(){return Number($('mapEditorBrush').value);}

  // Em mapas legados sem trilha vetorial: restaura APENAS pixels muito escuros
  // tocados pela borracha, usando a cor circundante do mapa original.
  // As faixas brancas, áreas coloridas e outros pixels claros NÃO são alterados.
  function fundoRestaurado(d,img) {
    if(!img || !d.legadoRaster || !d.borrachasBase?.length) return img;
    const key=JSON.stringify(d.borrachasBase);
    if(repairedCache.image===img&&repairedCache.key===key)return repairedCache.canvas;
    const w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;
    const fonte=novoCanvas(w,h),fc=fonte.getContext('2d',{willReadFrequently:true});
    fc.drawImage(img,0,0,w,h);
    const original=fc.getImageData(0,0,w,h),result=new ImageData(new Uint8ClampedArray(original.data),w,h);
    const mascara=novoCanvas(w,h),mc=mascara.getContext('2d',{willReadFrequently:true});
    mc.setTransform(w/d.w,0,0,h/d.h,0,0);
    for(const stroke of d.borrachasBase) M.tracar(mc,{...stroke,tipo:'caneta'});
    const mask=mc.getImageData(0,0,w,h).data,src=original.data,out=result.data;
    const k=w/d.w, radius=Math.max(3,Math.ceil(k*1.4)),maxRadius=Math.max(radius+3,Math.ceil(k*5));
    const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
    for(let i=0;i<w*h;i++){
      const q=i*4;
      if(mask[q+3]===0)continue;
      const r=src[q],g=src[q+1],b=src[q+2];
      if(r>58||g>58||b>58)continue; // Nunca remover branco, faixas ou pintura.
      const x=i%w,y=Math.floor(i/w),candidatos=[];
      for(const [dx,dy] of dirs){
        for(let step=radius;step<=maxRadius;step+=2){
          const xx=x+dx*step,yy=y+dy*step;
          if(xx<0||xx>=w||yy<0||yy>=h)break;
          const j=(yy*w+xx)*4;
          if(src[j]>75||src[j+1]>75||src[j+2]>75){
            candidatos.push([src[j],src[j+1],src[j+2]]);break;
          }
        }
      }
      if(!candidatos.length)continue;
      // A cor predominante entre os vizinhos mantém o asfalto/grama
      // mesmo perto de faixas de pedestres.
      const grupos=new Map();
      for(const c of candidatos){
        const key=c.map(v=>Math.round(v/24)).join(',');
        const group=grupos.get(key)||{n:0,rs:0,gs:0,bs:0};
        group.n++;group.rs+=c[0];group.gs+=c[1];group.bs+=c[2];grupos.set(key,group);
      }
      const top=[...grupos.values()].sort((a,b)=>b.n-a.n)[0];
      out[q]=Math.round(top.rs/top.n);out[q+1]=Math.round(top.gs/top.n);out[q+2]=Math.round(top.bs/top.n);
    }
    const canvas=novoCanvas(w,h);canvas.getContext('2d').putImageData(result,0,0);
    repairedCache={key,image:img,canvas};
    return canvas;
  }

  function pintarSinalUrbano(ctx,d,estado='VERMELHO') {
    if(!d.sinalUrbano)return;
    const cor={VERMELHO:'#ef4444',VERDE:'#22c55e',AMARELO:'#facc15'}[estado]||'#ef4444';
    ctx.save();ctx.fillStyle=cor;
    for(const b of d.sinalUrbano.semaforos)ctx.fillRect(b.x,b.y,b.w,b.h);
    ctx.restore();
  }

  function pintarBase(ctx,d,img,tracos=d.tracos,overlay=overlayImage,estado='VERMELHO'){
    ctx.fillStyle='#ffffff';ctx.fillRect(0,0,d.w,d.h);
    if(img)ctx.drawImage(fundoRestaurado(d,img),0,0,d.w,d.h);
    const dasSalas=M.elementosDasSalas(d.salas);
    M.pintarAreas(ctx,[...d.areas,...dasSalas.areas]);
    // Camada independente: borracha nunca remove as faixas do mapa original.
    M.pintarTracosSeparados(ctx,d,tracos,novoCanvas);
    if(overlay)ctx.drawImage(overlay,0,0,d.w,d.h);
    pintarSinalUrbano(ctx,d,estado);
  }
  function pintarObjetos(ctx,d){
    const retangulo=(x,y,w,h,cor)=>{ctx.fillStyle=cor;ctx.fillRect(x,y,w,h);ctx.strokeStyle='#27333d';ctx.lineWidth=.35;ctx.strokeRect(x,y,w,h);};
    for(const r of d.rampas){
      ctx.save();
      retangulo(r.x,r.y,r.w,r.h,'rgba(132,153,169,.3)');
      ctx.strokeStyle='#8699a7';
      ctx.setLineDash([2,2]);
      // Marcas transversais à direção da subida, inclusive nas rampas +Y/-Y.
      if ((r.dir||'+x').endsWith('y')) {
        for(let i=3;i<r.h;i+=5){
          ctx.beginPath();ctx.moveTo(r.x,r.y+i);ctx.lineTo(r.x+r.w,r.y+i);ctx.stroke();
        }
      } else {
        for(let i=3;i<r.w;i+=5){
          ctx.beginPath();ctx.moveTo(r.x+i,r.y);ctx.lineTo(r.x+i,r.y+r.h);ctx.stroke();
        }
      }
      ctx.restore();
    }
    for(const b of [...d.caixas,...M.caixasDasSalas(d.salas)]) {
      // A arte de prédios autorais já está pintada no piso desta cidade.
      if(d.desenhoCaixasNaTextura && String(b.modelo||'').startsWith('cidade')) {
        ctx.save();
        ctx.strokeStyle='rgba(60,80,100,.35)';ctx.lineWidth=.25;
        ctx.setLineDash([1.2,1.2]);ctx.strokeRect(b.x,b.y,b.w,b.h);
        ctx.restore();
      } else {
        retangulo(b.x,b.y,b.w,b.h,b.tipoEditor==='parede'||b.nome==='Parede da sala'?'#9da9ae':b.cor||'#aa906a');
      }
    }
    const esferas=[...d.decoracoes3d,...M.elementosDasSalas(d.salas).objetos];
    for(const o of esferas){ctx.beginPath();ctx.arc(o.x,o.y,o.raio,0,Math.PI*2);ctx.fillStyle=o.cor||'#d1d5d8';ctx.fill();ctx.strokeStyle='#3a454f';ctx.lineWidth=.25;ctx.stroke();}
  }
  function pintarInicio(ctx,d){
    ctx.save();ctx.translate(d.inicio.x,d.inicio.y);ctx.rotate(d.inicio.th);ctx.fillStyle='#f59c3b';ctx.strokeStyle='#543f21';
    ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(5,0);ctx.lineTo(-4,-3.5);ctx.lineTo(-4,3.5);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
  }
  function pintarPreview(ctx){
    if(preview?.traco?.tipo==='borracha' && doc?.legadoRaster) {
      // Indica a área de recuperação do fundo enquanto a borracha é arrastada.
      ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
      ctx.strokeStyle='rgba(234,139,20,.65)';
      ctx.lineWidth=preview.traco.espessura;ctx.beginPath();
      const ps=preview.traco.pontos;
      ctx.moveTo(...ps[0]);for(const q of ps.slice(1))ctx.lineTo(...q);
      ctx.stroke();ctx.restore();
    }
    if(preview){
      if(preview.traco&&!['caneta','borracha'].includes(preview.traco.tipo)){M.tracar(ctx,preview.traco);}
      if(preview.caixa) {const b=preview.caixa;ctx.save();ctx.fillStyle='rgba(67,161,211,.35)';ctx.fillRect(b.x,b.y,b.w,b.h);ctx.restore();}
    }
    if(stagedCurve){
      const p=stagedCurve.fixos;
      ctx.save();ctx.strokeStyle='#167fd3';ctx.lineWidth=.7;ctx.setLineDash([2,1]);
      if(p.length===1 && stagedCurve.hover){
        ctx.beginPath();ctx.moveTo(...p[0]);ctx.lineTo(...stagedCurve.hover);ctx.stroke();
      }
      if(p.length===2 && stagedCurve.hover){
        M.tracar(ctx,{tipo:'curva',espessura:pincel(),pontos:[p[0],p[1],stagedCurve.hover]});
      }
      ctx.restore();
    }
  }
  const roomField = (id) => $(id);
  function controlesSala() {
    return {
      w:Number(roomField('mapEditorRoomWidth').value),
      h:Number(roomField('mapEditorRoomHeight').value),
      entrada:Number(roomField('mapEditorEntrance').value),
      ladoEntrada:roomField('mapEditorRoomSide').value,
      segundaEntrada:roomField('mapEditorRoomSecond').checked,
      ladoEntrada2:roomField('mapEditorRoomSecondSide').value,
      entrada2:Number(roomField('mapEditorRoomSecondWidth').value),
      rotacao:draftRotation
    };
  }
  function preencherControlesSala(raw) {
    const s=M.normalizarSala(raw);
    const valores={
      mapEditorRoomWidth:s.w,mapEditorRoomHeight:s.h,
      mapEditorEntrance:s.entrada,mapEditorRoomSide:s.ladoEntrada,
      mapEditorRoomSecondSide:s.ladoEntrada2,mapEditorRoomSecondWidth:s.entrada2
    };
    for(const [id,value] of Object.entries(valores))roomField(id).value=String(value);
    roomField('mapEditorRoomSecond').checked=s.segundaEntrada;
    draftRotation=s.rotacao;
    roomField('mapEditorRoomRotation').value=String(draftRotation);
    atualizarControlesSala();
  }
  function atualizarControlesSala() {
    roomField('mapEditorRoomSecondOptions').hidden=!roomField('mapEditorRoomSecond').checked;
    roomField('mapEditorRoomSelection').textContent=selectedRoom===null
      ? 'Nova sala: ajuste e clique no mapa.'
      : `Editando sala ${selectedRoom+1}: alterações aparecem imediatamente no mapa.`;
    roomField('mapEditorRoomNew').disabled=selectedRoom===null;
  }
  function selecionarSala(index) {
    selectedRoom=index;
    if(index!==null)preencherControlesSala(doc.salas[index]);
    else atualizarControlesSala();
    renderizar();
  }
  function salaDeCampos() {
    const s=controlesSala();
    // Validação centralizada no core para usar as mesmas regras na simulação.
    M.validarSala({...s,x:0,y:0},doc);
    return s;
  }
  function atualizarSalaExistente() {
    if(selectedRoom===null){atualizarControlesSala();return;}
    const old=doc.salas[selectedRoom];
    try {
      const form=salaDeCampos();
      const cx=old.x+old.w/2,cy=old.y+old.h/2;
      const next={...old,...form,
        x:M.clamp(cx-form.w/2,0,doc.w-form.w),
        y:M.clamp(cy-form.h/2,0,doc.h-form.h)};
      M.validarSala(next,doc);
      gravar();doc.salas[selectedRoom]=next;renderizar();
      aviso('Sala atualizada.');
    }catch(err) {
      preencherControlesSala(old);
      aviso(err.message,true);
    }
  }
  function girarSala(novaRotacao) {
    try {
      if(selectedRoom===null) {
        const draft=controlesSala();
        const girada=M.rotacionarSala({...draft,x:0,y:0},novaRotacao,doc.w,doc.h);
        M.validarSala(girada,doc);
        preencherControlesSala(girada);
        aviso('Orientação da próxima sala atualizada.');
      } else {
        const atual=M.normalizarSala(doc.salas[selectedRoom]);
        const nova=M.rotacionarSala(atual,novaRotacao,doc.w,doc.h);
        M.validarSala(nova,doc);
        gravar();doc.salas[selectedRoom]=nova;preencherControlesSala(nova);renderizar();
        aviso('Sala girada: posições das aberturas e cantos coloridos atualizadas.');
      }
    } catch(err) {
      roomField('mapEditorRoomRotation').value=String(draftRotation);
      aviso(err.message,true);
    }
  }
  function renderizar(){
    if(!doc)return;
    const canvas=CANVAS(), scale=Math.min(4,1200/doc.w,900/doc.h);
    const w=Math.round(doc.w*scale),h=Math.round(doc.h*scale);
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    const ctx=canvas.getContext('2d');ctx.setTransform(w/doc.w,0,0,h/doc.h,0,0);
    const layerPreview=preview?.traco&&['caneta','borracha'].includes(preview.traco.tipo)
      ? [...doc.tracos,preview.traco] : doc.tracos;
    pintarBase(ctx,doc,baseImage,layerPreview);
    if($('mapEditorGrid').checked){
      ctx.save();ctx.strokeStyle='rgba(75,112,139,.45)';ctx.lineWidth=.25;
      for(let x=30;x<doc.w;x+=30){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,doc.h);ctx.stroke();}
      for(let y=30;y<doc.h;y+=30){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(doc.w,y);ctx.stroke();}
      ctx.restore();
    }
    pintarObjetos(ctx,doc);
    if(selectedRoom!==null && doc.salas[selectedRoom]){
      const s=doc.salas[selectedRoom];ctx.save();
      ctx.lineWidth=.65;ctx.setLineDash([2,1]);ctx.strokeStyle='#127ec4';
      ctx.strokeRect(s.x-.7,s.y-.7,s.w+1.4,s.h+1.4);
      ctx.restore();
    }
    pintarPreview(ctx);
    pintarInicio(ctx,doc);
    $('mapEditorUndo').disabled=!historico.length;
    $('mapEditorRedo').disabled=!futuro.length;
    $('mapEditorStatus').textContent=`${doc.w} × ${doc.h} cm · ${doc.tracos.length} traços · ${doc.caixas.length} obstáculos · ${doc.salas.length} salas · ${ferramenta==='curva'?'Curva: início → controle → fim':ferramenta==='inicio'?'Clique para definir a largada':'Edite o mapa'}`;
  }
  // Interface por grupos, sem alterar a ferramenta ativa ao trocar de aba.
  const TAB_NAMES = ['desenho','objetos','ajustes','obr','arquivo'];
  function selecionarAba(nome, focar=false) {
    if(!TAB_NAMES.includes(nome)) return;
    document.querySelectorAll('[data-map-tab]').forEach(tab=>{
      const on=tab.dataset.mapTab===nome;
      tab.setAttribute('aria-selected',String(on));
      tab.tabIndex=on?0:-1;
      if(on&&focar)tab.focus();
    });
    document.querySelectorAll('[data-map-panel]').forEach(panel=>{
      panel.hidden=panel.dataset.mapPanel!==nome;
    });
  }
  function atualizarOpcoesFerramenta() {
    document.querySelectorAll('[data-map-options]').forEach(container=>{
      const tipo=container.dataset.mapOptions;
      container.hidden=tipo==='sala'?!['sala','editarSala'].includes(ferramenta)
        :tipo==='area'?!['verde','vermelho'].includes(ferramenta)
        :ferramenta!=='inicio';
    });
    const item=document.querySelector(idTool(ferramenta));
    $('mapEditorCurrentTool').textContent='Ferramenta ativa: '+(item?.textContent.trim()||ferramenta);
  }
  function ferramentaSelecionada(t){
    if(!TOOLS.has(t))return;
    ferramenta=t;stagedCurve=null;preview=null;
    document.querySelectorAll('[data-map-tool]').forEach(b=>{
      b.classList.toggle('ativo',b.dataset.mapTool===t);b.setAttribute('aria-pressed',String(b.dataset.mapTool===t));});
    atualizarOpcoesFerramenta();
    renderizar();
  }
  function retanguloPontos(a,b){
    return {x:Math.min(a[0],b[0]),y:Math.min(a[1],b[1]),w:Math.max(.2,Math.abs(a[0]-b[0])),h:Math.max(.2,Math.abs(a[1]-b[1]))};
  }
  function clicou(e){
    if(!ativo||ocupado||e.button!==0||pointer!==null)return;
    e.preventDefault();
    let p=mouse(e);
    if(ferramenta==='editarSala'){
      const index=doc.salas.findLastIndex(s=>p[0]>=s.x&&p[0]<=s.x+s.w&&p[1]>=s.y&&p[1]<=s.y+s.h);
      if(index<0){aviso('Clique dentro de uma sala existente para selecioná-la.');return;}
      selecionarSala(index);aviso(`Sala ${index+1} selecionada. Edite os campos acima.`);
      return;
    }
    if(ferramenta==='inicio'){gravar();doc.inicio={...doc.inicio,x:p[0],y:p[1]};renderizar();return;}
    if(ferramenta==='mover'){
      const hit=proximoObjeto(p);
      if(!hit){aviso('Clique sobre um objeto para movê-lo.');return;}
      if(hit[0]==='salas')selecionarSala(hit[1]);
      gravar();moving={key:hit[0],index:hit[1],last:p};
      pointer=e.pointerId;
      try{e.currentTarget.setPointerCapture(pointer);}catch{}
      return;
    }
    if(ferramenta==='curva'){
      if(!stagedCurve)stagedCurve={fixos:[pontas(p)],hover:null};
      else if(stagedCurve.fixos.length===1)stagedCurve.fixos.push(p);
      else {
        gravar();
        doc.tracos.push({tipo:'curva',espessura:pincel(),
          pontos:[stagedCurve.fixos[0],stagedCurve.fixos[1],pontas(p)]});
        stagedCurve=null;
      }
      renderizar();return;
    }
    if(['esfera','verde','vermelho','sala','excluir'].includes(ferramenta)){criarObjetoClique(p);return;}
    if((LINE_TOOLS.has(ferramenta)||ferramenta==='borracha')&&doc.tracos.length>=1500){
      aviso('Número máximo de traços atingido.',true);return;
    }
    pointer=e.pointerId;
    try{e.currentTarget.setPointerCapture(pointer);}catch{}
    if(LINE_TOOLS.has(ferramenta))p=pontas(p);
    preview={start:p,last:p,points:[p],traco:{tipo:ferramenta,espessura:pincel(),pontos:[p]}};
    renderizar();
  }
  function moveu(e){
    if(!ativo||!doc)return;
    if(pointer!==e.pointerId||(!preview&&!moving)){
      if(stagedCurve){
        stagedCurve.hover=stagedCurve.fixos.length===2?pontas(mouse(e)):mouse(e);
        renderizar();
      }
      return;
    }
    e.preventDefault();
    if(moving){
      const p=mouse(e),obj=doc[moving.key][moving.index],dx=p[0]-moving.last[0],dy=p[1]-moving.last[1];
      const w=obj.w??obj.lado??0,h=obj.h??obj.lado??0;
      obj.x=M.clamp(obj.x+dx,0,doc.w-w);
      obj.y=M.clamp(obj.y+dy,0,doc.h-h);
      moving.last=p;
      if(moving.key==='salas'&&selectedRoom===moving.index)atualizarControlesSala();
      renderizar();return;
    }
    const p=mouse(e),prev=preview,tr=prev.traco;
    prev.last=p;
    if(ferramenta==='caneta'||ferramenta==='borracha'){
      if(M.hypot(tr.pontos[tr.pontos.length-1],p)>.18&&tr.pontos.length<4000)tr.pontos.push(p);
    } else {
      tr.pontos=[prev.start,LINE_TOOLS.has(ferramenta)?pontas(p):p];
      if(['parede','caixa','rampa'].includes(ferramenta))prev.caixa=retanguloPontos(prev.start,p);
    }
    renderizar();
  }
  function terminou(e){
    if(pointer!==e.pointerId)return;
    if(moving){moving=null;pointer=null;renderizar();return;}
    if(!preview)return;
    e.preventDefault();
    const t=preview.traco,last=mouse(e);
    if(['caneta','borracha'].includes(ferramenta)){
      if(M.hypot(t.pontos[t.pontos.length-1],last)>.15)t.pontos.push(last);
      if(t.tipo==='caneta'&&$('mapEditorSmooth').checked){
        t.pontos=M.suavizar(t.pontos);
      }
      if(t.tipo==='caneta'&&$('mapEditorRecognize').checked){
        const straight=M.reconhecer(t.pontos);
        if(straight){t.tipo='reta';t.pontos=straight;}
      }
      if(t.tipo==='caneta')t.pontos[t.pontos.length-1]=pontas(t.pontos[t.pontos.length-1]);
    } else t.pontos=[preview.start,LINE_TOOLS.has(ferramenta)?pontas(last):last];
    gravar();
    if(LINE_TOOLS.has(ferramenta)||ferramenta==='borracha'){
      doc.tracos.push(t);
      if(ferramenta==='borracha'&&doc.legadoRaster)
        doc.borrachasBase.push({espessura:t.espessura,pontos:deep(t.pontos)});
    }
    else if(ferramenta==='parede'||ferramenta==='caixa'){
      const b=retanguloPontos(preview.start,last);
      if(ferramenta==='parede'){
        const a=preview.start,z=last;
        // Sempre um segmento horizontal ou vertical de espessura 2 cm.
        if(Math.abs(z[0]-a[0])>=Math.abs(z[1]-a[1])){b.x=Math.min(a[0],z[0]);b.y=M.clamp(a[1]-1,0,doc.h-2);b.w=Math.max(2,Math.abs(a[0]-z[0]));b.h=2;}
        else {b.x=M.clamp(a[0]-1,0,doc.w-2);b.y=Math.min(a[1],z[1]);b.w=2;b.h=Math.max(2,Math.abs(a[1]-z[1]));}
      }
      if(b.x+b.w<=doc.w&&b.y+b.h<=doc.h)
        doc.caixas.push({...b,modelo:ferramenta==='parede'?'simples':undefined,tipoEditor:ferramenta,altura:ferramenta==='parede'?12:16,cor:ferramenta==='parede'?'#d3d8da':'#9c7a53'});
    } else if(ferramenta==='rampa'){
      const b=retanguloPontos(preview.start,last);
      if(b.w>=10&&b.h>=10)doc.rampas.push({...b,nome:'Rampa de treino',altura:4,subida:Math.min(18,b.w),dir:'+x'});
      else aviso('Rampa precisa de pelo menos 10 × 10 cm.',true);
    }
    preview=null;pointer=null;renderizar();
  }
  function proximoObjeto(p){
    const margem=5,dist=(a,b)=>M.hypot(a,b);
    const rect=(o)=>p[0]>=o.x-margem&&p[0]<=o.x+o.w+margem&&p[1]>=o.y-margem&&p[1]<=o.y+o.h+margem;
    for(const key of ['salas','decoracoes3d','areas','caixas','rampas']){
      const list=doc[key];
      for(let i=list.length-1;i>=0;i--){
        const o=list[i];
        if(key==='decoracoes3d'?dist(p,[o.x,o.y])<o.raio+4:key==='areas'?rect({...o,w:o.lado,h:o.lado}):rect(o))return [key,i];
      }
    }
    return null;
  }
  function criarObjetoClique(p){
    if(ferramenta==='excluir'){
      const hit=proximoObjeto(p);
      if(!hit){aviso('Clique sobre uma parede, caixa, rampa, sala ou marcador para remover.');return;}
      gravar();doc[hit[0]].splice(hit[1],1);
      if(hit[0]==='salas'){
        if(selectedRoom===hit[1])selectedRoom=null;
        else if(selectedRoom!==null&&selectedRoom>hit[1])selectedRoom--;
        atualizarControlesSala();
      }
      renderizar();return;
    }
    let salaNova=null;
    if(ferramenta==='sala'){
      try {
        const opts=salaDeCampos();
        const x=M.clamp(p[0]-opts.w/2,0,doc.w-opts.w);
        const y=M.clamp(p[1]-opts.h/2,0,doc.h-opts.h);
        salaNova={x,y,...opts};
        M.validarSala(salaNova,doc);
      }catch(err){aviso(err.message,true);return;}
    }
    gravar();
    if(ferramenta==='esfera')doc.decoracoes3d.push({tipo:'esfera',x:p[0],y:p[1],raio:2.25,nome:'Vítima de treino',cor:'#b9c3ca'});
    if(['verde','vermelho'].includes(ferramenta)){
      const lado=30,x=M.clamp(p[0]-15,0,doc.w-lado),y=M.clamp(p[1]-15,0,doc.h-lado);
      doc.areas.push({tipo:'triangulo',cor:ferramenta,x,y,lado,canto:$('mapEditorTriCorner').value});
    }
    if(salaNova){
      doc.salas.push(salaNova);
      selectedRoom=doc.salas.length-1;preencherControlesSala(salaNova);
      ferramentaSelecionada('editarSala');
      aviso('Sala criada. Você pode mudar as dimensões, girar e abrir uma segunda entrada.');
    }
    renderizar();
  }
  async function mostrarDocumento(input){
    const d=M.migrar(input);
    const [img,overlay]=await Promise.all([carregarImagem(d.basePNG),carregarImagem(d.sobreposicaoPNG)]);
    doc=d;baseImage=img;overlayImage=overlay;repairedCache={key:null,image:null,canvas:null};
    preview=null;stagedCurve=null;pointer=null;historico=[];futuro=[];
    selectedRoom=null;draftRotation=0;
    preencherControlesSala({x:0,y:0,w:90,h:90,entrada:27});
    $('mapEditorNome').value=d.nome;$('mapEditorPerfil').value=d.perfil;$('mapEditorNivel').value=String(d.nivel);
    const degrees=Math.round(d.inicio.th*180/Math.PI);
    $('mapEditorHeading').value=['-90','0','90','180'].includes(String(degrees))?String(degrees):'-90';
    renderizar();
    aviso(d.legadoRaster
      ? 'Mapa antigo: borracha restaura apenas pixels pretos próximos do traço. Faixas brancas permanecem protegidas.'
      : 'Mapa editável: a borracha remove a trilha, preservando chão, faixas de pedestres e objetos.');
  }
  function atual(){
    if(!doc)throw Error('Nenhum mapa aberto');
    const d=deep(doc);d.nome=$('mapEditorNome').value.trim();d.perfil=$('mapEditorPerfil').value;d.nivel=Number($('mapEditorNivel').value);
    return M.validar(d);
  }
  function copiarAtual(){
    const id=$('cenario').value,cen=Cenarios.lista[id];
    if(!cen)throw Error('Nenhum cenário selecionado.');
    if(cen.editorDocumento)return deep(cen.editorDocumento);
    if(cen.tilesOriginais)throw Error('Use um cenário nativo ou comece em branco.');
    const d=M.criarDocumento(cen.w,cen.h);
    // Cenários antigos podem usar 8–10 px/cm, acima do limite do .jmap.
    // Reamostramos somente a cópia, sem alterar a simulação original.
    d.pxPorCm=Math.max(2,Math.min(6,cen.pxPorCm||3,
      Math.floor(Math.sqrt(3000000/(cen.w*cen.h))*100)/100));
    d.nome=cen.nome+' (editado)';
    const k=d.pxPorCm;
    const base=novoCanvas(Math.round(cen.w*k),Math.round(cen.h*k));
    const ctx=base.getContext('2d');
    ctx.save();ctx.scale(k,k);
    if(Array.isArray(cen.linhasEditor) && cen.linhasEditor.length){
      // Linha nativa separada do asfalto, para que possa ser apagada.
      cen.desenhar(ctx,cen,{
        omitirLinha:true,omitirFaixas:true,omitirSemaforos:true,omitirCaixas:true,
        // Inclui a identidade visual da cidade na base do mapa editável.
        manterDecoracao:!!cen.desenhoCaixasNaTextura
      });
      d.tracos=deep(cen.linhasEditor);
      if(typeof cen.pintarFaixasPedestres==='function'){
        const sobreposicao=novoCanvas(base.width,base.height),g=sobreposicao.getContext('2d');
        g.save();g.scale(k,k);cen.pintarFaixasPedestres(g);g.restore();
        d.sobreposicaoPNG=sobreposicao.toDataURL('image/png');
      }
      if(cen.semaforos && cen.cicloSemaforo){
        d.sinalUrbano={semaforos:deep(cen.semaforos),ciclo:deep(cen.cicloSemaforo)};
      }
    }else{
      // Para outras pistas antigas, restauração de traços pretos por cor.
      cen.desenhar(ctx,cen);
      d.legadoRaster=true;
    }
    ctx.restore();
    d.basePNG=base.toDataURL('image/png');
    d.caixas=deep(cen.caixas||[]);
    d.pontosEducativos=deep(cen.pontosEducativos||[]);
    d.desenhoCaixasNaTextura=!!cen.desenhoCaixasNaTextura;
    d.rampas=deep(cen.rampas||[]);
    d.decoracoes3d=deep(cen.decoracoes3d||[]);
    const ini=Cenarios.inicioDe(cen,cen.inicioPadrao);
    d.inicio={x:ini.x,y:ini.y,th:ini.th};
    return d;
  }
  function montarCenario(d,img){
    const idBase=d.id&&/^autoral-[a-z0-9-]{1,60}$/.test(d.id)?d.id:'autoral-'+Date.now().toString(36);
    let id=idBase;
    if(Cenarios.lista[id]&&($('cenario').value!==id||!Cenarios.lista[id].editorDocumento)){
      let i=2;while(Cenarios.lista[`${idBase}-${i}`])i++;id=`${idBase}-${i}`;
    }
    const snapshot=deep({...d,id}),gerados=M.elementosDasSalas(d.salas);
    const overlay=overlayImage;
    const cen={id,nome:d.nome,w:d.w,h:d.h,pxPorCm:d.pxPorCm,inicioPadrao:'padrao',
      inicios:{padrao:{rotulo:'Início do editor',...d.inicio}},linhaAltaContraste:true,
      caixas:[...deep(d.caixas),...M.caixasDasSalas(d.salas)],
      rampas:deep(d.rampas),decoracoes3d:[...deep(d.decoracoes3d),...gerados.objetos],
      editorDocumento:snapshot,
      pontosEducativos:deep(snapshot.pontosEducativos||[]),
      desenhoCaixasNaTextura:!!snapshot.desenhoCaixasNaTextura,
      desenhar(ctx) {
        pintarBase(ctx,snapshot,img,snapshot.tracos,overlay,this.semaforoEstado||'VERMELHO');
      }
    };
    if(snapshot.sinalUrbano) {
      cen.semaforos=deep(snapshot.sinalUrbano.semaforos);
      cen.cicloSemaforo=deep(snapshot.sinalUrbano.ciclo);
      cen.semaforoEstado='VERMELHO';
      cen.estadoSemaforoEm=function(t=0) {
        const total=this.cicloSemaforo.reduce((sum,f)=>sum+f.duracao,0);
        let restante=((t%total)+total)%total;
        for(const fase of this.cicloSemaforo) {
          if(restante<fase.duracao)return fase.estado;
          restante-=fase.duracao;
        }
        return 'VERMELHO';
      };
    }
    Cenarios.registrarCenario(cen);
    let opt=Array.from($('cenario').options).find(o=>o.value===id);
    if(!opt){opt=new Option(cen.nome,id);$('cenario').add(opt);}else opt.textContent=cen.nome;
    Playback.escolher(id,'padrao');return cen;
  }
  function aplicar(){
    if(ocupado)return;
    try{const d=atual(),cen=montarCenario(d,baseImage);doc.id=cen.id;fechar();}
    catch(e){aviso(e.message,true);}
  }
  function baixar(){
    try{
      const d=atual(),blob=new Blob([JSON.stringify(d,null,2)],{type:'application/json'});
      const url=URL.createObjectURL(blob),link=document.createElement('a');
      link.href=url;link.download=d.nome.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9_-]/g,'-').slice(0,45)+'.jmap';
      document.body.appendChild(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1500);aviso('Arquivo .jmap salvo (versão 2).');
    }catch(e){aviso(e.message,true);}
  }
  async function importar(e){
    const f=e.target.files?.[0];e.target.value='';
    if(!f)return;
    if(f.size>3500000){aviso('Arquivo muito grande',true);return;}
    ocupado=true;
    try{await mostrarDocumento(JSON.parse(await f.text()));aviso('Mapa carregado. Agora você pode editar e aplicar.');}
    catch(err){aviso(err.message,true);}finally{ocupado=false;}
  }
  function validarOBR(){
    try{
      const d=atual(),res=M.validaOBR(d),box=$('mapEditorValidacao');
      box.replaceChildren();
      for(const r of res){const p=document.createElement('p');p.textContent=(r.tipo==='aviso'?'⚠ ':r.tipo==='ok'?'✓ ':'ℹ ')+r.texto;
        p.className='map-rule-'+r.tipo;box.appendChild(p);}
      box.hidden=false;
    }catch(e){aviso(e.message,true);}
  }
  async function abrir(){
    if(ativo)return;
    try{
      if(document.body.classList.contains('modo-campanha'))throw Error('Editor disponível no Sandbox.');
      Playback.prepararEdicao?.();
      ativo=true;$('mapEditorModal').hidden=false;
      await mostrarDocumento(copiarAtual());
    }catch(e){ativo=false;$('mapEditorModal').hidden=true;alert(e.message);}
  }
  function fechar(){if(ocupado)return;ativo=false;pointer=null;preview=null;stagedCurve=null;$('mapEditorModal').hidden=true;}
  function configurar(){
    document.querySelectorAll('[data-map-tab]').forEach((tab,indice)=>{
      tab.addEventListener('click',()=>selecionarAba(tab.dataset.mapTab));
      tab.addEventListener('keydown',e=>{
        let i=indice;
        if(e.key==='ArrowRight')i=(indice+1)%TAB_NAMES.length;
        else if(e.key==='ArrowLeft')i=(indice+TAB_NAMES.length-1)%TAB_NAMES.length;
        else if(e.key==='Home')i=0;
        else if(e.key==='End')i=TAB_NAMES.length-1;
        else return;
        e.preventDefault();selecionarAba(TAB_NAMES[i],true);
      });
    });
    selecionarAba('desenho');
    $('btnEditorMapa').addEventListener('click',abrir);
    $('mapEditorClose').addEventListener('click',fechar);
    $('mapEditorCancel').addEventListener('click',fechar);
    $('mapEditorBlank').addEventListener('click',()=>mostrarDocumento(M.criarDocumento(doc?.w,doc?.h)));
    $('mapEditorCopy').addEventListener('click',()=>{try{mostrarDocumento(copiarAtual());}catch(e){aviso(e.message,true);}});
    $('mapEditorUpload').addEventListener('click',()=>$('mapEditorFile').click());
    $('mapEditorFile').addEventListener('change',importar);
    $('mapEditorApply').addEventListener('click',aplicar);
    $('mapEditorDownload').addEventListener('click',baixar);
    $('mapEditorCheck').addEventListener('click',validarOBR);
    $('mapEditorUndo').addEventListener('click',()=>desfazer(historico,futuro));
    $('mapEditorRedo').addEventListener('click',()=>desfazer(futuro,historico));
    $('mapEditorRoomNew').addEventListener('click',()=>{
      selecionarSala(null);ferramentaSelecionada('sala');
      aviso('Configure a próxima sala e clique no mapa.');
    });
    for(const id of ['mapEditorRoomWidth','mapEditorRoomHeight','mapEditorEntrance',
      'mapEditorRoomSide','mapEditorRoomSecond','mapEditorRoomSecondSide','mapEditorRoomSecondWidth']){
      $(id).addEventListener('change',()=>{
        if(selectedRoom===null){
          try{salaDeCampos();aviso('Configuração pronta para a próxima sala.');}
          catch(err){aviso(err.message,true);}
          atualizarControlesSala();
        }else atualizarSalaExistente();
      });
    }
    $('mapEditorRoomRotation').addEventListener('change',()=>girarSala(Number($('mapEditorRoomRotation').value)));
    $('mapEditorRoomTurn').addEventListener('click',()=>girarSala((draftRotation+1)%4));
    $('mapEditorBrush').addEventListener('input',()=>$('mapEditorBrushValor').textContent=$('mapEditorBrush').value+' cm');
    $('mapEditorGrid').addEventListener('change',renderizar);
    $('mapEditorPerfil').addEventListener('change',()=>{
      if(!doc)return;gravar();doc.perfil=$('mapEditorPerfil').value;
      if(doc.perfil!=='livre'){$('mapEditorBrush').value='1.5';$('mapEditorBrushValor').textContent='1.5 cm';}
      renderizar();aviso(doc.perfil==='livre'?'Modo livre selecionado.':'Modo de treino OBR 2026: verifique o mapa com o botão de validação.');
    });
    $('mapEditorNivel').addEventListener('change',()=>{if(!doc)return;gravar();doc.nivel=Number($('mapEditorNivel').value);});
    $('mapEditorHeading').addEventListener('change',()=>{if(!doc)return;gravar();doc.inicio.th=Number($('mapEditorHeading').value)*Math.PI/180;renderizar();});
    document.querySelectorAll('[data-map-tool]').forEach(b=>b.addEventListener('click',()=>ferramentaSelecionada(b.dataset.mapTool)));
    const c=CANVAS();c.addEventListener('pointerdown',clicou);c.addEventListener('pointermove',moveu);
    c.addEventListener('pointerup',terminou);c.addEventListener('pointercancel',terminou);
    document.addEventListener('keydown',e=>{
      if(!ativo||e.target.closest('input,textarea,select'))return;
      if(e.key==='Escape'){if(stagedCurve){stagedCurve=null;renderizar();}else fechar();}
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();desfazer(e.shiftKey?futuro:historico,e.shiftKey?historico:futuro);}
    });
    atualizarControlesSala();
    ferramentaSelecionada('caneta');
  }
  document.addEventListener('DOMContentLoaded',configurar);
  window.JacarEditorMapa={carregar:mostrarDocumento,validar:M.validar};
})();
