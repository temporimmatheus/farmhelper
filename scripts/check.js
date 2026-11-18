import { readdir, readFile, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
let count = 0;
async function check(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const url = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
    if (entry.isDirectory()) { await check(url); continue; }
    if (!entry.name.endsWith('.js')) continue;
    const result = spawnSync(process.execPath, ['--check', fileURLToPath(url)], { encoding: 'utf8', windowsHide: true });
    if (result.status !== 0) throw new Error(result.stderr || result.error?.message || `Falha: ${url}`);
    const source = await readFile(url, 'utf8');
    for (const match of source.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)) await access(new URL(match[1], url));
    count++;
  }
}
for (const dir of ['src/', 'scripts/', 'tests/']) await check(new URL(dir, root));
console.log(`${count} módulos verificados: sintaxe e imports locais válidos.`);
