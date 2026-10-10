import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile), image = 'ugso-blocks-for-ha:0.1.17';
let redirect = false, requests = 0, container;
const ha = createServer((req, res) => {
  requests++;
  assert.equal(req.url, '/api/states'); assert.equal(req.headers.authorization, 'Bearer dummy-integration-token');
  if (redirect) { res.writeHead(302, { Location: '/should-not-be-followed' }).end(); return; }
  res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify([{ entity_id: 'light.kitchen', state: 'on', attributes: { friendly_name: 'Kitchen', password: 'omit-me' } }]));
});
await new Promise(resolve => ha.listen(0, '0.0.0.0', resolve));
try {
  container = (await exec('docker', ['run', '--rm', '-d', '-p', '127.0.0.1::8099', '-e', `BLOCKS_HA_URL=http://host.docker.internal:${ha.address().port}`, '-e', 'BLOCKS_HA_TOKEN=dummy-integration-token', image])).stdout.trim();
  const mapping = (await exec('docker', ['port', container, '8099/tcp'])).stdout.trim();
  const base = `http://${mapping}`;
  let response;
  for (let i = 0; i < 20; i++) {
    try { response = await fetch(base + '/api/ha/entities'); if (response.ok) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert.equal(response.status, 200); const body = await response.text(); assert.ok(!body.includes('omit-me')); assert.ok(!body.includes('dummy-integration-token'));
  assert.equal(JSON.parse(body).entities[0].entity_id, 'light.kitchen');
  assert.equal((await fetch(base)).status, 200);
  assert.equal((await fetch(base + '/api/ha/entities', { method: 'POST' })).status, 405);
  const before = requests; redirect = true;
  assert.equal((await fetch(base + '/api/ha/entities')).status, 502); assert.equal(requests, before + 1);
  console.log('Docker frontend → nginx → Python → mock HA authenticated GET, metadata reduction, no credentials, rejected writes/redirects verified.');
} finally {
  if (container) await exec('docker', ['stop', container]);
  await new Promise(resolve => ha.close(resolve));
}
