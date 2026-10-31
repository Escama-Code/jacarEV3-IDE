/**
 * Transporte local entre abas do mesmo origin.
 * BroadcastChannel + localStorage + polling (fallback se BC falhar).
 */
const CH = 'jacar-mp-v1';
const LS_ROOMS = 'jacar-mp-rooms-v1';
const LS_TICK = 'jacar-mp-tick-v1';

function loadRooms() {
  try { return JSON.parse(localStorage.getItem(LS_ROOMS) || '{}'); }
  catch { return {}; }
}
function saveRooms(rooms) {
  try {
    localStorage.setItem(LS_ROOMS, JSON.stringify(rooms));
    // força evento storage em outras abas mesmo se o conteúdo de peers for igual em alguns browsers
    localStorage.setItem(LS_TICK, String(Date.now()));
  } catch (_) {}
}

export function createLocalTransport() {
  const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CH) : null;
  const handlers = new Set();
  let lastTick = localStorage.getItem(LS_TICK) || '';

  function emit(msg) {
    for (const h of handlers) {
      try { h(msg); } catch (e) { console.warn('[mp local]', e); }
    }
  }

  if (bc) {
    bc.onmessage = (ev) => {
      if (ev.data) emit(ev.data);
    };
  }

  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('storage', (ev) => {
      if (ev.key === LS_TICK || ev.key === LS_ROOMS) {
        emit({ type: 'storage-sync' });
      }
    });
  }

  // polling: garante sync mesmo se storage/BC falharem
  const poll = setInterval(() => {
    const tick = localStorage.getItem(LS_TICK) || '';
    if (tick && tick !== lastTick) {
      lastTick = tick;
      emit({ type: 'storage-sync' });
    }
  }, 100);

  return {
    id: 'local',
    publish(msg) {
      try {
        if (bc) bc.postMessage(msg);
      } catch (e) { console.warn('[mp bc]', e); }

      if (msg.type === 'room-meta' || msg.type === 'peer-pose' || msg.type === 'peer-left') {
        const rooms = loadRooms();
        const code = msg.sala;
        if (!code) return;
        if (!rooms[code]) rooms[code] = { meta: null, peers: {} };
        if (msg.type === 'room-meta') rooms[code].meta = msg.meta;
        if (msg.type === 'peer-pose' && msg.peer) {
          rooms[code].peers[msg.peer.alunoId] = { ...msg.peer, _ts: Date.now() };
        }
        if (msg.type === 'peer-left' && msg.alunoId) {
          delete rooms[code].peers[msg.alunoId];
        }
        const now = Date.now();
        for (const id of Object.keys(rooms[code].peers || {})) {
          if (now - (rooms[code].peers[id]._ts || 0) > 12000) delete rooms[code].peers[id];
        }
        saveRooms(rooms);
        lastTick = localStorage.getItem(LS_TICK) || '';
      }
    },
    subscribe(fn) {
      handlers.add(fn);
      return () => handlers.delete(fn);
    },
    snapshotSala(codigo) {
      const rooms = loadRooms();
      return rooms[codigo] || { meta: null, peers: {} };
    },
    destroy() {
      clearInterval(poll);
      try { bc?.close(); } catch (_) {}
    },
  };
}
