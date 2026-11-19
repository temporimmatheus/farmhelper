import { STORAGE_KEYS } from '../core/storage.js';
import { parseRows, parseTerritories } from '../domain/spawn-parser.js';

export async function fetchText(url, { timeout = 18000, fetchImpl = globalThis.fetch } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetchImpl(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    // Await the body too: a stalled response must obey the same deadline.
    return await response.text();
  } finally { clearTimeout(timer); }
}

export function createSpawnSource({ fetchImpl = globalThis.fetch } = {}) {
  const read = url => fetchText(url, { fetchImpl });
  const isSpawn = path => /(?:^|\/)npcpos(?:\/|[._-])/i.test(path)
    && !/(?:^|\/)99_customs(?:\/|$)/i.test(path)
    && /\.(?:pos|txt|npcpos)$/i.test(path);
  return {
    async listFiles() {
      try {
        const data = JSON.parse(await read('https://api.github.com/repos/master-toma/l2datapack/git/trees/c1_public?recursive=1'));
        const files = (data.tree || []).filter(f => f.type === 'blob' && isSpawn(f.path)).map(f => f.path);
        if (files.length) return files;
      } catch { /* Try the public CDN when GitHub is unavailable. */ }
      const data = JSON.parse(await read('https://data.jsdelivr.com/v1/package/gh/master-toma/l2datapack@c1_public/flat'));
      return (data.files || []).filter(f => isSpawn(f.name)).map(f => f.name.replace(/^\//, ''));
    },
    async getFile(path) {
      const encoded = path.split('/').map(encodeURIComponent).join('/');
      try { return await read(`https://raw.githubusercontent.com/master-toma/l2datapack/c1_public/${encoded}`); }
      catch { return read(`https://cdn.jsdelivr.net/gh/master-toma/l2datapack@c1_public/${encoded}`); }
    },
  };
}

/** Synchronization coordinates I/O; the views receive only status callbacks. */
export function createSpawnSync({ repository, storage, monsters, source = createSpawnSource(), onStatus = () => {}, onBusy = () => {}, onComplete = () => {} }) {
  let busy = false;
  const refresh = () => {
    const count = repository.count();
    onStatus(count ? `${count}/${monsters.length} mobs com spawns C1` : 'Sem spawns em cache', count ? 'ok' : 'loading');
  };
  async function sync(force = false) {
    if (busy) return;
    const count = repository.count();
    const metadata = storage.read(STORAGE_KEYS.metadata, {});
    if (!force && count && metadata?.complete && Date.now() - metadata.lastSync < 7 * 86400000) { refresh(); return; }
    busy = true; onBusy(true);
    onStatus(count ? `Atualizando · ${count} mobs no cache` : 'Conectando ao C1…', 'loading');
    try {
      const files = await source.listFiles();
      if (!files.length) throw new Error('Nenhum arquivo C1 listado');
      const texts = new Array(files.length);
      let next = 0, done = 0, failed = 0;
      await Promise.all(Array.from({ length: Math.min(5, files.length) }, async () => {
        while (next < files.length) {
          const index = next++;
          try { texts[index] = await source.getFile(files[index]); } catch { failed++; }
          done++;
          if (done % 6 === 0) onStatus(`Sincronizando C1 · ${done}/${files.length}`, 'loading');
        }
      }));
      const valid = texts.flatMap((text, index) => text ? [{ text, path: files[index] }] : []);
      const territories = new Map();
      for (const file of valid) parseTerritories(file.text, territories);
      let matched = 0;
      for (let i = 0; i < valid.length; i++) {
        const parts = valid[i].path.replaceAll('\\', '/').split('/');
        const npcPosIndex = parts.findIndex(part => part.toLowerCase() === 'npcpos');
        const sourceRegion = npcPosIndex >= 0 ? parts[npcPosIndex + 1]?.toLowerCase() : undefined;
        matched += repository.incorporate(parseRows(valid[i].text, territories, sourceRegion));
        if (i % 12 === 0) await new Promise(resolve => setTimeout(resolve, 0));
      }
      if (!matched) throw new Error('Nenhum mob associado aos arquivos C1');
      const persisted = repository.persist();
      storage.write(STORAGE_KEYS.metadata, { lastSync: Date.now(), complete: failed === 0 && persisted, mapped: repository.count() });
      onComplete();
      refresh();
      if (failed) onStatus(`${repository.count()} mobs · atualização parcial`, 'error');
      else if (!persisted) onStatus(`${repository.count()} mobs · cache não pôde ser salvo`, 'error');
    } catch (error) {
      onStatus(repository.count() ? 'Cache C1 disponível · conexão falhou' : 'Falha ao consultar C1', 'error');
      console.warn('Sincronização C1:', error);
    } finally { busy = false; onBusy(false); }
  }
  return { sync, refresh, get busy() { return busy; } };
}
