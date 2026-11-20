import { access, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseRows, parseTerritories } from '../src/domain/spawn-parser.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, 'src/data/imported-monsters.js');
const MAX_MONSTER_LEVEL = 40;

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return walk(path);
    return [path];
  }));
  return nested.flat();
}

async function findDataRoots(source) {
  const candidates = [source, join(source, 'script')];
  for (const candidate of candidates) {
    const npcData = join(candidate, 'NpcData');
    const npcPos = join(candidate, 'NpcPos');
    try {
      await Promise.all([access(npcData), access(npcPos)]);
      return { npcData, npcPos };
    } catch { /* Try the alternate root layout. */ }
  }
  throw new Error('Expected a datapack root containing script/NpcData and script/NpcPos.');
}

const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function field(text, key) {
  const match = text.match(new RegExp(`^\\s*${key}\\s*=\\s*([^\\r\\n]+)`, 'im'));
  if (!match) return null;
  const value = Number(match[1].trim());
  return Number.isFinite(value) ? value : null;
}

export function parseNpcTemplate(text) {
  const name = text.match(/^\s*\[([^\]]+)\]\s*$/m)?.[1]?.trim();
  const level = field(text, 'level');
  const xp = field(text, 'acquire_exp_rate');
  const hp = field(text, 'org_hp');
  const physicalDefense = field(text, 'base_defend');
  const magicDefense = field(text, 'base_magic_defend');
  if (!name || level === null || xp === null || hp === null) return null;
  return {
    name,
    level: Math.round(level),
    xp: Math.floor(xp),
    hp,
    physicalDefense: physicalDefense ?? 0,
    magicDefense: magicDefense ?? 0,
  };
}

export function parseSpawnClasses(text) {
  return [...text.matchAll(/npc(?:_ex)?_begin\s*\[([^\]]+)\]/gi)]
    .map(match => match[1].trim())
    .filter(Boolean);
}

function regionFromPath(path, npcPos) {
  const parts = relative(npcPos, dirname(path)).split(sep);
  const region = parts[0];
  return !region || region === '.' || /^99_customs$/i.test(region) ? null : region.toLowerCase();
}

function regionLabel(region) {
  return region.replace(/^\d+_/, '').replace(/_(?:castle_)?town$/i, '').replace(/_/g, ' ')
    .replace(/\b[a-z]/g, letter => letter.toUpperCase());
}

function recordId(name, region) {
  const slug = value => normalize(value).replace(/\s+/g, '-');
  return `c1-${slug(name)}-${slug(region)}`;
}

export function buildImportedCatalog(npcFiles, spawnFiles, npcPosRoot) {
  const templates = new Map();
  const territories = new Map();
  for (const file of npcFiles) {
    if (!/(?:^|[/\\])(?:warriors|bosses)(?:[/\\])/i.test(file.path)) continue;
    const template = parseNpcTemplate(file.text);
    if (template && template.level <= MAX_MONSTER_LEVEL) templates.set(normalize(template.name), template);
  }
  for (const file of spawnFiles) parseTerritories(file.text, territories);

  const records = new Map();
  for (const file of spawnFiles) {
    const region = regionFromPath(file.path, npcPosRoot);
    if (!region) continue;
    for (const row of parseRows(file.text, territories, region)) {
      const template = templates.get(normalize(row.name));
      if (!template) continue;
      const id = recordId(template.name, region);
      let record = records.get(id);
      if (!record) {
        record = {
          id,
          name: template.name.replace(/[_-]+/g, ' ').replace(/\b[a-z]/g, letter => letter.toUpperCase()),
          sourceName: template.name,
          sourceRegion: region,
          lv: template.level,
          hp: template.hp,
          xp: template.xp,
          zone: `C1 · ${regionLabel(region)} (spawn region)`,
          agg: null,
          pLo: template.physicalDefense,
          pHi: template.physicalDefense,
          mRef: template.magicDefense,
          defQuality: 'ref',
          link: '',
          dataStatus: 'imported',
          spawnData: { points: [], areas: [], source: 'Master Toma C1 datapack (used with permission)' },
        };
        records.set(id, record);
      }
      if (row.point && Number.isFinite(row.point.x) && Number.isFinite(row.point.y)) {
        record.spawnData.points.push(row.point);
      }
      if (row.area) record.spawnData.areas.push(row.area);
    }
  }
  for (const record of records.values()) {
    const points = new Map(record.spawnData.points.map(point => [`${point.x}|${point.y}|${point.z || 0}`, point]));
    const areas = new Map(record.spawnData.areas.map(area => [area.vertices.map(point => `${point.x},${point.y},${point.z || 0}`).join('|'), area]));
    record.spawnData.points = [...points.values()];
    record.spawnData.areas = [...areas.values()];
  }
  return [...records.values()].filter(record => record.spawnData.points.length || record.spawnData.areas.length)
    .sort((a, b) => a.zone.localeCompare(b.zone) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}

async function readFiles(paths) {
  return Promise.all(paths.map(async path => ({ path, text: await readFile(path, 'utf8') })));
}

export async function importDatapack(source, destination = output) {
  const { npcData, npcPos } = await findDataRoots(source);
  const npcPaths = (await walk(npcData)).filter(path => /\.npc$/i.test(path) && /(?:^|[/\\])(?:warriors|bosses)(?:[/\\])/i.test(path));
  const spawnPaths = (await walk(npcPos)).filter(path => /\.pos$/i.test(path));
  if (!npcPaths.length || !spawnPaths.length) {
    throw new Error('No warrior/boss NPC templates or .pos spawn files were found.');
  }
  const [npcFiles, spawnFiles] = await Promise.all([readFiles(npcPaths), readFiles(spawnPaths)]);
  const catalog = buildImportedCatalog(npcFiles, spawnFiles, npcPos);
  if (!catalog.length) throw new Error('No spawned monsters with matching NPC templates were found.');
  await writeFile(destination, `export const IMPORTED_MOBS = ${JSON.stringify(catalog, null, 2)};\n`, 'utf8');
  return {
    templates: npcFiles.length,
    spawnFiles: spawnFiles.length,
    monsters: catalog.length,
    uniqueClasses: new Set(catalog.map(mob => mob.sourceName)).size,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const source = process.argv[2] ? resolve(process.argv[2]) : '';
  if (!source) {
    console.error('Usage: npm run import:c1 -- "<datapack root or script folder>"');
    process.exitCode = 1;
  } else {
    try {
      const result = await importDatapack(source);
      console.log(`Imported ${result.monsters} regional entries (${result.uniqueClasses} unique classes, level ≤ ${MAX_MONSTER_LEVEL}) from ${result.templates} templates and ${result.spawnFiles} spawn files.`);
      console.log(`Output: ${relative(root, output)}`);
    } catch (error) {
      console.error(`C1 import failed: ${error.message}`);
      process.exitCode = 1;
    }
  }
}
