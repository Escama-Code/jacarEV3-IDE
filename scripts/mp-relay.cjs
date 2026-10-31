#!/usr/bin/env node
const http = require('http');
const { WebSocketServer } = require('ws');
const PORT = Number(process.env.MP_PORT) || 3847;
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
  if (set) { set.delete(ws); if (set.size === 0) salas.delete(sala); }
  if (ws._alunoId && sala) broadcast(sala, { type: 'peer-left', sala, alunoId: ws._alunoId }, ws);
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
  res.end('jacarEV3 multiplayer relay OK\nPorta ' + PORT + '\n');
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
  console.log('jacarEV3 relay ws://0.0.0.0:' + PORT);
});
