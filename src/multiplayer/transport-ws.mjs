/**
 * Transporte WebSocket para multiplayer em rede (vários PCs).
 * Requer o relay: node scripts/mp-relay.js
 */
export function createWsTransport(url) {
  if (!url) throw new Error('URL do relay obrigatória');
  let ws = null;
  let closed = false;
  const handlers = new Set();
  const queue = [];
  // snapshot local (o relay não guarda histórico; peers entram e esperam poses)
  const rooms = {};

  function emit(msg) {
    for (const h of handlers) {
      try { h(msg); } catch (e) { console.warn(e); }
    }
  }

  function connect() {
    if (closed) return;
    try {
      ws = new WebSocket(url);
    } catch (e) {
      console.error('WS connect', e);
      setTimeout(connect, 2000);
      return;
    }
    ws.onopen = () => {
      console.log('[mp] relay conectado', url);
      emit({ type: 'relay-status', ok: true, url });
      while (queue.length) {
        try { ws.send(queue.shift()); } catch (_) {}
      }
    };
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        // mantém snapshot local
        if (msg.type === 'room-meta' && msg.sala) {
          if (!rooms[msg.sala]) rooms[msg.sala] = { meta: null, peers: {} };
          rooms[msg.sala].meta = msg.meta;
        }
        if (msg.type === 'peer-pose' && msg.sala && msg.peer) {
          if (!rooms[msg.sala]) rooms[msg.sala] = { meta: null, peers: {} };
          rooms[msg.sala].peers[msg.peer.alunoId] = { ...msg.peer, _ts: Date.now() };
        }
        if (msg.type === 'peer-left' && msg.sala && msg.alunoId) {
          if (rooms[msg.sala]) delete rooms[msg.sala].peers[msg.alunoId];
        }
        emit(msg);
      } catch (_) {}
    };
    ws.onclose = () => {
      emit({ type: 'relay-status', ok: false, url });
      ws = null;
      if (!closed) setTimeout(connect, 1500);
    };
    ws.onerror = () => { /* onclose reconecta */ };
  }

  connect();

  return {
    id: 'ws',
    url,
    publish(msg) {
      const raw = JSON.stringify(msg);
      if (ws && ws.readyState === WebSocket.OPEN) ws.send(raw);
      else queue.push(raw);
      // snapshot local também
      if (msg.type === 'room-meta' && msg.sala) {
        if (!rooms[msg.sala]) rooms[msg.sala] = { meta: null, peers: {} };
        rooms[msg.sala].meta = msg.meta;
      }
      if (msg.type === 'peer-pose' && msg.sala && msg.peer) {
        if (!rooms[msg.sala]) rooms[msg.sala] = { meta: null, peers: {} };
        rooms[msg.sala].peers[msg.peer.alunoId] = { ...msg.peer, _ts: Date.now() };
      }
      if (msg.type === 'peer-left' && msg.sala && msg.alunoId) {
        if (rooms[msg.sala]) delete rooms[msg.sala].peers[msg.alunoId];
      }
    },
    subscribe(fn) {
      handlers.add(fn);
      return () => handlers.delete(fn);
    },
    snapshotSala(codigo) {
      return rooms[codigo] || { meta: null, peers: {} };
    },
    close() {
      closed = true;
      try { ws?.close(); } catch (_) {}
    },
  };
}

/** Sugere ws://HOST:3847 a partir da URL HTTP atual (Live Server network). */
export function relayUrlPadrao() {
  try {
    const u = new URL(location.href);
    const host = u.hostname || '127.0.0.1';
    return `ws://${host}:3847`;
  } catch {
    return 'ws://127.0.0.1:3847';
  }
}
