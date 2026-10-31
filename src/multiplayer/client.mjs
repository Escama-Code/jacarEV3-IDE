import { createLocalTransport } from './transport-local.mjs';
import { createWsTransport, relayUrlPadrao } from './transport-ws.mjs';

function codigoSala() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}
function uuid() {
  return 'a-' + Math.random().toString(36).slice(2, 10);
}

/**
 * @param {{ transport?: 'local'|'ws', relayUrl?: string }} opts
 */
export function createMultiplayerClient(opts = {}) {
  let transport;
  const mode = opts.transport === 'ws' && opts.relayUrl ? 'ws' : 'local';

  if (mode === 'ws') {
    try {
      transport = createWsTransport(opts.relayUrl);
    } catch (e) {
      console.warn('[mp] WS falhou, usando local', e);
      transport = createLocalTransport();
    }
  } else {
    transport = createLocalTransport();
  }

  const state = {
    ativo: false,
    papel: null,
    sala: null,
    alunoId: uuid(),
    nome: 'Aluno',
    meta: null,
    peers: {},
    unsub: null,
    lastPublish: 0,
    lastPose: null,
    lastRealPoseAt: 0,
  };
  const listeners = new Set();

  function notify() {
    const view = getState();
    for (const l of listeners) {
      try { l(view); } catch (_) {}
    }
  }

  function pullSnapshot() {
    if (!state.sala) return;
    const snap = transport.snapshotSala(state.sala);
    if (snap.meta) state.meta = snap.meta;
    const peers = snap.peers || {};
    const next = {};
    for (const [id, p] of Object.entries(peers)) {
      if (id === state.alunoId) continue;
      next[id] = p;
    }
    state.peers = next;
    notify();
  }

  function onMsg(msg) {
    if (!msg) return;
    if (msg.type === 'relay-status') {
      notify();
      return;
    }
    if (msg.type === 'storage-sync') {
      pullSnapshot();
      return;
    }
    if (!state.sala || msg.sala !== state.sala) return;

    if (msg.type === 'room-meta') {
      state.meta = msg.meta;
      notify();
    }
    if (msg.type === 'peer-pose' && msg.peer) {
      if (msg.peer.alunoId === state.alunoId) return;
      state.peers[msg.peer.alunoId] = { ...msg.peer, _ts: Date.now() };
      notify();
    }
    if (msg.type === 'peer-left' && msg.alunoId) {
      delete state.peers[msg.alunoId];
      notify();
    }
  }

  function getState() {
    const now = Date.now();
    for (const id of Object.keys(state.peers)) {
      if (now - (state.peers[id]._ts || 0) > 12000) delete state.peers[id];
    }
    return {
      ativo: state.ativo,
      papel: state.papel,
      sala: state.sala,
      alunoId: state.alunoId,
      nome: state.nome,
      meta: state.meta,
      peers: { ...state.peers },
      transport: transport.id,
      relayUrl: transport.url || null,
    };
  }

  function publicarMeta(meta) {
    state.meta = meta;
    transport.publish({ type: 'room-meta', sala: state.sala, meta });
    notify();
  }

  /** Anuncia presença mesmo sem App.sim (posição inicial). */
  function publicarPresenca(pose) {
    if (!state.ativo || !state.sala) return;
    const est = pose || state.lastPose || { x: 20, y: 20, th: 0, led: 'VERDE', t: 0 };
    state.lastPose = est;
    transport.publish({
      type: 'peer-pose',
      sala: state.sala,
      peer: {
        alunoId: state.alunoId,
        nome: state.nome,
        x: est.x,
        y: est.y,
        th: est.th || 0,
        led: est.led || 'VERDE',
        t: est.t || 0,
        robo3d: state.meta?.robo3d || 'jacare',
        papel: state.papel,
      },
    });
  }

  state.unsub = transport.subscribe(onMsg);

  // reenvia última pose com frequência (mantém peer vivo + atualiza quem entrou tarde)
  const heartbeat = setInterval(() => {
    if (!state.ativo || !state.sala) return;
    if (state.lastPose) {
      // rebroadcast sem throttle de lastPublish
      const est = state.lastPose;
      transport.publish({
        type: 'peer-pose',
        sala: state.sala,
        peer: {
          alunoId: state.alunoId,
          nome: state.nome,
          x: est.x, y: est.y, th: est.th || 0,
          led: est.led || 'VERDE', t: est.t || 0,
          robo3d: state.meta?.robo3d || 'jacare',
          papel: state.papel,
        },
      });
    } else {
      publicarPresenca(null);
    }
  }, 200);

  return {
    getState,
    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    usarRelay(relayUrl) {
      if (state.unsub) state.unsub();
      if (transport.destroy) transport.destroy();
      if (transport.close) transport.close();
      transport = createWsTransport(relayUrl);
      state.unsub = transport.subscribe(onMsg);
      if (state.ativo && state.sala) {
        if (state.meta) publicarMeta(state.meta);
        publicarPresenca(state.lastPose);
      }
      notify();
    },

    usarLocal() {
      if (state.unsub) state.unsub();
      if (transport.destroy) transport.destroy();
      if (transport.close) transport.close();
      transport = createLocalTransport();
      state.unsub = transport.subscribe(onMsg);
      if (state.ativo && state.sala) {
        if (state.meta) publicarMeta(state.meta);
        publicarPresenca(state.lastPose);
      }
      notify();
    },

    criarSala({ nome, titulo, cenario, inicio, robo3d, pose } = {}) {
      state.papel = 'prof';
      state.nome = (nome || 'Professor').slice(0, 24);
      state.sala = codigoSala();
      state.ativo = true;
      state.peers = {};
      state.alunoId = uuid();
      publicarMeta({
        titulo: titulo || 'Corrida fantasma',
        cenario: cenario || 'treino',
        inicio: inicio || 'padrao',
        robo3d: robo3d || 'jacare',
        colisao: 'fantasma',
        profNome: state.nome,
        criadaEm: Date.now(),
      });
      publicarPresenca(pose || { x: 25, y: 30, th: 0, led: 'VERDE', t: 0 });
      pullSnapshot();
      return getState();
    },

    entrarSala({ codigo, nome, pose } = {}) {
      const code = String(codigo || '').trim().toUpperCase();
      if (!code) throw new Error('Informe o código da sala');
      state.papel = 'aluno';
      state.nome = (nome || 'Aluno').slice(0, 24);
      state.sala = code;
      state.ativo = true;
      state.peers = {};
      state.alunoId = uuid();
      pullSnapshot();
      if (!state.meta) {
        state.meta = {
          titulo: 'Sala ' + code,
          cenario: 'treino',
          inicio: 'padrao',
          robo3d: 'jacare',
          colisao: 'fantasma',
          criadaEm: Date.now(),
        };
      }
      publicarPresenca(pose || { x: 40, y: 40, th: 0, led: 'LARANJA', t: 0 });
      // puxa de novo após anunciar (vê quem já estava)
      setTimeout(() => pullSnapshot(), 200);
      setTimeout(() => pullSnapshot(), 600);
      notify();
      return getState();
    },

    sair() {
      if (state.ativo && state.sala) {
        transport.publish({ type: 'peer-left', sala: state.sala, alunoId: state.alunoId });
      }
      state.ativo = false;
      state.sala = null;
      state.meta = null;
      state.peers = {};
      state.lastPose = null;
      notify();
    },

    publicarPose(est) {
      if (!state.ativo || !state.sala || !est) return;
      const now = performance.now();
      if (now - state.lastPublish < 50) return;
      state.lastPublish = now;
      state.lastPose = { x: est.x, y: est.y, th: est.th, led: est.led, t: est.t };
      state.lastRealPoseAt = Date.now();
      transport.publish({
        type: 'peer-pose',
        sala: state.sala,
        peer: {
          alunoId: state.alunoId,
          nome: state.nome,
          x: est.x,
          y: est.y,
          th: est.th,
          led: est.led || 'DESLIGADO',
          t: est.t || 0,
          robo3d: state.meta?.robo3d || 'jacare',
          papel: state.papel,
        },
      });
    },

    destroy() {
      clearInterval(heartbeat);
      this.sair();
      if (state.unsub) state.unsub();
      if (transport.destroy) transport.destroy();
      if (transport.close) transport.close();
    },
  };
}

export { relayUrlPadrao };
