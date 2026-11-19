import test from 'node:test';
import assert from 'node:assert/strict';
import { memoryStorage } from '../support/memory-storage.js';
import { STORAGE_KEYS } from '../../src/core/storage.js';
import { parseRows, parseTerritories } from '../../src/domain/spawn-parser.js';
import { createSpawnRepository } from '../../src/services/spawn-repository.js';
import { createSpawnSync, createSpawnSource, fetchText } from '../../src/services/spawn-sync.js';

const monsters = [{ id: 'a', name: 'Young Keltir' }];
const fixed = 'npc_begin [young_keltir] pos={-12672;122776;-20;0} npc_end';
const territoryText = 'territory_begin [test_area] {{1;2;3;4};{5;6;7;8};{9;10;11;12}} territory_end';

test('parser resolves territories defined separately from npc makers', () => {
  const territories = new Map();
  parseTerritories(territoryText, territories);
  const rows = parseRows(`npcmaker_begin [maker] territory=[test_area] npc_begin [young_keltir] total=5 npc_end npcmaker_end`, territories);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].area.vertices.length, 3);
  assert.deepEqual(parseRows(fixed, territories)[0].point, { x: -12672, y: 122776, z: -20 });
});

test('repository normalizes NPC names, deduplicates and restores valid cache only', () => {
  const storage = memoryStorage({ [STORAGE_KEYS.spawns]: JSON.stringify({ a: { points: [{ x: 'bad', y: 1 }], areas: null } }) });
  const repo = createSpawnRepository(storage, monsters);
  assert.equal(repo.count(), 0);
  const rows = parseRows(fixed, new Map());
  repo.incorporate([...rows, ...rows, { name: 'unknown', point: { x: 1, y: 2 } }]);
  assert.equal(repo.get('a').points.length, 1);
  assert.equal(repo.count(), 1);
  repo.persist();
  assert.equal(createSpawnRepository(storage, monsters).get('a').points.length, 1);
});

test('repository routes duplicate imported NPC classes to their source region', () => {
  const entries = [
    { id: 'm-west', name: 'Cave Servant', sourceName: 'cave_servant', sourceRegion: 'west', zone: 'C1 · West' },
    { id: 'm-east', name: 'Cave Servant', sourceName: 'cave_servant', sourceRegion: 'east', zone: 'C1 · East' },
  ];
  const repo = createSpawnRepository(memoryStorage(), entries);
  repo.incorporate([
    { name: 'cave_servant', sourceRegion: 'east', point: { x: 1, y: 2 } },
    { name: 'cave_servant', sourceRegion: 'west', point: { x: 3, y: 4 } },
  ]);
  assert.deepEqual(repo.get('m-east').points, [{ x: 1, y: 2 }]);
  assert.deepEqual(repo.get('m-west').points, [{ x: 3, y: 4 }]);
});

test('repository seeds imported spawn data when no browser cache exists', () => {
  const repo = createSpawnRepository(memoryStorage(), [{
    id: 'imported-mob',
    name: 'Orc Fighter',
    spawnData: { points: [{ x: 4, y: 5 }], areas: [], source: 'Local C1 datapack' },
  }]);
  assert.deepEqual(repo.get('imported-mob').points, [{ x: 4, y: 5 }]);
});

test('sync reads all territories first, caches results and skips fresh complete syncs', async () => {
  const storage = memoryStorage();
  const repository = createSpawnRepository(storage, monsters);
  let calls = 0, completed = 0;
  const source = { async listFiles() { calls++; return ['territories', 'npcs']; }, async getFile(path) { return path === 'territories' ? territoryText : `npcmaker_begin [test_area] npc_begin [young_keltir] total=5 npc_end npcmaker_end`; } };
  const sync = createSpawnSync({ repository, storage, monsters, source, onComplete() { completed++; } });
  await sync.sync();
  assert.equal(repository.get('a').areas.length, 1);
  assert.equal(storage.read(STORAGE_KEYS.metadata).complete, true);
  await sync.sync();
  assert.equal(calls, 1);
  assert.equal(completed, 1);
  await sync.sync(true);
  assert.equal(calls, 2);
  assert.equal(repository.get('a').areas.length, 1);
});

test('partial sync keeps successful results and remains eligible for retry', async () => {
  const storage = memoryStorage(), repository = createSpawnRepository(storage, monsters);
  const statuses = [];
  const sync = createSpawnSync({ repository, storage, monsters,
    source: { async listFiles() { return ['good', 'bad']; }, async getFile(path) { if (path === 'bad') throw new Error('offline'); return fixed; } },
    onStatus(message) { statuses.push(message); },
  });
  await sync.sync();
  assert.equal(repository.count(), 1);
  assert.equal(storage.read(STORAGE_KEYS.metadata).complete, false);
  assert.match(statuses.at(-1), /parcial/);
  assert.equal(sync.busy, false);
});

test('sync prevents concurrent duplicate requests', async () => {
  const storage = memoryStorage(), repository = createSpawnRepository(storage, monsters);
  let release, calls = 0;
  const gate = new Promise(resolve => { release = resolve; });
  const sync = createSpawnSync({ repository, storage, monsters, source: {
    async listFiles() { calls++; await gate; return ['file']; }, async getFile() { return fixed; },
  } });
  const first = sync.sync();
  await sync.sync(true);
  assert.equal(calls, 1);
  release(); await first;
});

test('public source falls back to CDN for listing and file downloads', async () => {
  const urls = [];
  const source = createSpawnSource({ async fetchImpl(url) {
    urls.push(url);
    if (url.includes('github.com') || url.includes('githubusercontent.com')) throw new Error('offline');
    return { ok: true, async text() { return url.includes('/flat') ? JSON.stringify({ files: [{ name: '/npcpos/a.pos' }, { name: '/npcpos/99_customs/event.pos' }, { name: '/other.txt' }] }) : fixed; } };
  } });
  assert.deepEqual(await source.listFiles(), ['npcpos/a.pos']);
  assert.equal(await source.getFile('npcpos/a.pos'), fixed);
  assert.equal(urls.length, 4);
});

test('fetch deadline covers slow response body', async () => {
  await assert.rejects(fetchText('test', { timeout: 5, fetchImpl: async (_url, { signal }) => ({ ok: true, text: () => new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')))) }) }), /aborted/);
});
