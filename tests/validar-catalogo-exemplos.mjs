/**
 * P0: valida se cada exemplo aponta a cenário/início existentes.
 * Uso (browser console after load) ou adaptar; aqui checagem estática via regex no arquivo.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'src/exemplos/exemplos.json'), 'utf8'));
const cenSrc = fs.readFileSync(path.join(root, 'src/js/cenarios.js'), 'utf8');

const ids = [...cenSrc.matchAll(/id:\s*'([^']+)'/g)].map(m => m[1]);
const uniqueIds = [...new Set(ids)];
let erros = 0;
for (const e of catalog.exemplos) {
  if (!uniqueIds.includes(e.cenario)) {
    console.error('CENÁRIO INEXISTENTE', e.id, e.cenario);
    erros++;
    continue;
  }
  // crude: search inicios near id - accept if inicio string appears after id block
  const re = new RegExp(`id:\\s*'${e.cenario}'[\\s\\S]{0,800}?inicios:\\s*\\{([^}]+)\\}`);
  const m = cenSrc.match(re);
  if (!m) {
    console.warn('não parseou inicios', e.cenario);
    continue;
  }
  if (!m[1].includes(e.inicio + ':')) {
    console.error('INÍCIO INEXISTENTE', e.id, e.cenario, e.inicio);
    erros++;
  } else {
    console.log('OK', e.id, e.cenario, e.inicio);
  }
  const arq = path.join(root, 'src/exemplos', e.arquivo);
  if (!fs.existsSync(arq)) {
    console.error('ARQUIVO FALTANDO', e.arquivo);
    erros++;
  }
}
process.exit(erros ? 1 : 0);
