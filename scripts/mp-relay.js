#!/usr/bin/env node
/**
 * Relay WebSocket para multiplayer jacarEV3 (rede local).
 * Uso: npm run mp-relay
 * Na IDE (com "Usar rede"): ws://SEU_IP:3847
 */
import http from 'http';
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.MP_PORT) || 3847;

/** @type {Map<string, Set<import('ws').WebSocket>>} */
const salas = new Map();

function join(sala, ws) {
  if (!salas.has(sala)) salas.set(sala, new Set());
  salas.get(sala).add(ws);
  ws._sala = sala;
}

function leave(ws) {
  const sala = ws._sala;
  if (!sala) return;
  const set = salas.get(sala);
  if (set) {
    set.delete(ws);
    if (set.size === 0) salas.delete(sala);
  }
  if (ws._alunoId && sala) {
    broadcast(sala, { type: 'peer-left', sala, alunoId: ws._alunoId }, ws);
  }
}

function broadcast(sala, msg, except) {
  const set = salas.get(sala);
  if (!set) return;
  const raw = JSON.stringify(msg);
  for (const client of set) {
    if (client !== except && client.readyState === 1) {
      try { client.send(raw); } catch (_) {}
    }
  }
}

const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('jacarEV3 multiplayer relay OK\nPorta ' + PORT + '\nSalas: ' + salas.size + '\n');
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    let msg;
    try { msg = JSON.parse(String(data)); } catch { return; }
    if (!msg || !msg.sala) return;
    join(msg.sala, ws);
    if (msg.type === 'peer-pose' && msg.peer?.alunoId) ws._alunoId = msg.peer.alunoId;
    if (msg.type === 'peer-left' && msg.alunoId) ws._alunoId = msg.alunoId;
    broadcast(msg.sala, msg, ws);
  });
  ws.on('close', () => leave(ws));
  ws.on('error', () => leave(ws));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('  jacarEV3 multiplayer relay');
  console.log('  ws://0.0.0.0:' + PORT);
  console.log('  Na IDE (Usar rede): ws://SEU_IP_NA_REDE:' + PORT);
  console.log('');
});
