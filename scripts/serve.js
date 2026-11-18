import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg' };

export function createDevServer({ root = projectRoot } = {}) {
  root = resolve(root);
  return createServer(async (request, response) => {
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return; }
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      const relative = pathname.replace(/^\/+/, '') || 'index.html';
      const path = resolve(root, relative);
      // Serve only the public application, never repository metadata or source HTML backups.
      const allowed = relative === 'index.html' || relative === 'favicon.svg' || relative.startsWith('src/');
      const hiddenOrParent = relative.split('/').some(segment => segment.startsWith('.'));
      if (!allowed || hiddenOrParent || relative.includes('\\') || path !== root && !path.startsWith(root + sep)) {
        response.writeHead(404); response.end('Not found'); return;
      }
      if (!(await stat(path)).isFile()) throw new Error('Not a file');
      const body = await readFile(path);
      response.writeHead(200, { 'Content-Type': `${types[extname(path)] || 'application/octet-stream'}${['.html', '.js', '.css', '.json', '.svg'].includes(extname(path)) ? '; charset=utf-8' : ''}`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch { response.writeHead(404); response.end('Not found'); }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = process.argv.includes('--dist') ? resolve(projectRoot, 'dist') : projectRoot;
  const port = Number(process.env.PORT || 5173);
  const server = createDevServer({ root });
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log(`Farm Helper: http://localhost:${port}`));
}
