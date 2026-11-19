import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildImportedCatalog, importDatapack, parseNpcTemplate, parseSpawnClasses } from '../../scripts/import-c1-mobs.js';

test('parses C1 warrior stats needed by the farm model', () => {
  const template = parseNpcTemplate(`npc_begin\nwarrior\n545\n[young_keltir]\nlevel=1\nacquire_exp_rate=29.39\norg_hp=41.03\nbase_defend=45.00\nbase_magic_defend=32.00\nnpc_end`);
  assert.deepEqual(template, {
    name: 'young_keltir', level: 1, xp: 29, hp: 41.03,
    physicalDefense: 45, magicDefense: 32,
  });
});

test('ignores malformed templates and parses classes from spawn records', () => {
  assert.equal(parseNpcTemplate('[missing_stats]\nlevel=4'), null);
  assert.deepEqual(parseSpawnClasses('npc_begin [orc_fighter] total=2 npc_end npc_ex_begin [guard] npc_ex_end'), ['orc_fighter', 'guard']);
});

test('builds one record per spawned monster and region, excluding custom spawns', () => {
  const npcPos = 'C:\\datapack\\script\\NpcPos';
  const catalog = buildImportedCatalog(
    [{ path: 'NpcData/warriors/00001_orc_fighter.npc', text: '[orc_fighter]\nlevel=8\nacquire_exp_rate=120\norg_hp=180\nbase_defend=50\nbase_magic_defend=40' }],
    [
      { path: `${npcPos}\\01_talking_island_town\\16_24.pos`, text: 'npc_begin [orc_fighter] pos={1;2;3;0} npc_end' },
      { path: `${npcPos}\\01_talking_island_town\\16_25.pos`, text: 'npc_begin [orc_fighter] pos=anywhere npc_end' },
      { path: `${npcPos}\\99_customs\\event.pos`, text: 'npc_begin [orc_fighter] pos=anywhere npc_end' },
    ],
    npcPos,
  );
  assert.equal(catalog.length, 1);
  assert.equal(catalog[0].name, 'Orc Fighter');
  assert.equal(catalog[0].zone, 'C1 · Talking Island Town');
  assert.equal(catalog[0].agg, null);
  assert.deepEqual(catalog[0].spawnData.points, [{ x: 1, y: 2, z: 3 }]);
});

test('imports from either a datapack root or its script folder', async () => {
  const root = await mkdtemp(join(tmpdir(), 'farm-helper-c1-'));
  try {
    const script = join(root, 'script');
    await mkdir(join(script, 'NpcData', 'warriors'), { recursive: true });
    await mkdir(join(script, 'NpcPos', '01_talking_island_town'), { recursive: true });
    await writeFile(join(script, 'NpcData', 'warriors', '00001_orc_fighter.npc'), '[orc_fighter]\nlevel=8\nacquire_exp_rate=120\norg_hp=180\nbase_defend=50\nbase_magic_defend=40');
    await writeFile(join(script, 'NpcPos', '01_talking_island_town', '16_24.pos'), 'npc_begin [orc_fighter] pos={1;2;3;0} npc_end');
    const destination = join(root, 'output.js');
    const result = await importDatapack(root, destination);
    assert.equal(result.monsters, 1);
    const generated = await readFile(destination, 'utf8');
    assert.match(generated, /"name": "Orc Fighter"/);
    assert.match(generated, /"points": \[\s*\{\s*"x": 1/s);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
