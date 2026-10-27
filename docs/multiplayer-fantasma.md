# Multiplayer fantasma — rede local

## Por que não funcionou só com Live Server Network?

`BroadcastChannel` / `localStorage` **não atravessam** celulares/PCs diferentes.
Cada aparelho tem o próprio armazenamento.

## Como usar em rede (Live Server Network)

### No PC do professor (host)

```bash
cd jacarEV3-IDE
npm install
npm run mp-relay
```

Deixe esse terminal aberto. O relay escuta em `0.0.0.0:3847`.

Suba o site com Live Server (ou `npx serve`).

### Em cada aparelho

1. Abra o link **Network** do Live Server (ex.: `http://192.168.0.15:5500/`).
2. Menu → **Multiplayer**.
3. Campo **Servidor de rede** deve vir `ws://192.168.0.15:3847` (mesmo IP).
4. Uma pessoa **Cria sala**, as outras **Entram** com o código.
5. **Teleop** ou rode script — nomes e robôs fantasmas aparecem.

Firewall: liberar porta **3847** TCP no host.

## Só duas abas no mesmo PC

Deixe o servidor **em branco** e use Criar / Entrar (modo local).
