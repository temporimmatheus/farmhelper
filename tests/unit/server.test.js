import test from 'node:test';
import assert from 'node:assert/strict';
import { createDevServer } from '../../scripts/serve.js';

test('server serves ESM with correct types and refuses repository/config files', async () => {
  const server = createDevServer();
  const handler = server.listeners('request')[0];
  // Exercise the real HTTP handler without requiring a loopback socket.
  async function request(url, method = 'GET') {
    let status, headers;
    return new Promise((resolve, reject) => {
      handler({ url, method }, {
        writeHead(code, values = {}) { status = code; headers = values; },
        end(body) { resolve({ status, headers, body: body?.toString() || '' }); },
      }).catch(reject);
    });
  }
  const app = await request('/');
  assert.equal(app.status, 200);
  assert.match(app.body, /type="module"/);
  const module = await request('/src/main.js');
  assert.match(module.headers['Content-Type'], /text\/javascript/);
  for (const path of ['/.git/config', '/.env', '/package.json', '/FARM_HELPER.html', '/src/%2e%2e/%2e%2e/.git/config', '/src/%2e%2e%2f.git%2fconfig', '/src/%5c..%5c.git%5cconfig']) {
    assert.equal((await request(path)).status, 404, path);
  }
  assert.equal((await request('/', 'POST')).status, 405);
});
