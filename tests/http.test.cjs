const { test } = require('node:test');
const assert = require('node:assert/strict');
const { server } = require('../server/index.cjs');

test('HTTP: public configuration, missing files and private access checks', async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    for (const [url, expected] of [
      ['/api/trainer/session', 401], ['/api/admin/users', 403],
      ['/api/team-roster?team=invalid', 404], ['/api/instagram', 200],
      ['/api/auth/config', 200], ['/missing-file.js', 404],
    ]) {
      const response = await fetch(base + url);
      assert.equal(response.status, expected, url);
      assert.match(response.headers.get('content-type'), /application\/json/);
    }
    const response = await fetch(base + '/api/auth/challenge', {
      method: 'POST', headers: { Origin: 'https://untrusted.example' },
    });
    assert.equal(response.status, 403);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
