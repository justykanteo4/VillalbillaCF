const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadWorkspace, workspaceLoadMessage } = require('../workspace-load.cjs');
const initial = { team: 'Equipo', players: [], lineups: [], materials: [], events: [], attendance: {}, stats: {} };
function fixture(raw) {
  const writes = [];
  return { writes, storage: { getItem: async () => raw, setItem: async (key, value) => { writes.push([key, value]); } } };
}

test('legacy Android cache missing new fields loads without losing attendance', async () => {
  const legacy = { team: 'Infantil', players: [{ id: '1', name: 'Jugador' }], materials: [], attendance: { '2026-10-22': { '1': 'Sí' } }, stats: {} };
  const raw = JSON.stringify(legacy), f = fixture(raw);
  const value = await loadWorkspace({ ...f, key: 'team', initial, readCloud: async () => null });
  assert.deepEqual(value.attendance, legacy.attendance);
  assert.deepEqual(value.players, legacy.players);
  assert.deepEqual(value.events, []);
  assert.equal(f.writes.length, 1);
  assert.match(f.writes[0][0], /^team\.recovery\./);
  assert.equal(f.writes[0][1], raw);
});

test('local and cloud records retain both dates and players during migration', async () => {
  const f = fixture(JSON.stringify({ players: [{ id: 'local', name: 'Local' }], attendance: { yesterday: { local: 'Sí' } } }));
  const cloud = { players: [{ id: 'cloud', name: 'Nube' }], attendance: { today: { cloud: 'Sí' } } };
  const value = await loadWorkspace({ ...f, key: 'team', initial, readCloud: async () => cloud });
  assert.equal(value.players.length, 2);
  assert.deepEqual(value.attendance, { yesterday: { local: 'Sí' }, today: { cloud: 'Sí' } });
});

test('permission failure does not replace the local cache or load an empty workspace', async () => {
  const raw = JSON.stringify({ players: [{ id: '1' }] }), f = fixture(raw);
  await assert.rejects(loadWorkspace({ ...f, key: 'team', initial, readCloud: async () => { throw Object.assign(Error(), { code: 'permission-denied' }); } }), error => {
    assert.equal(error.workspaceStage, 'cloud-read');
    assert.match(workspaceLoadMessage(error), /rechazado el acceso/);
    return true;
  });
  assert.deepEqual(f.writes, []);
});

test('damaged cache is recoverable only with a valid cloud copy and a saved backup', async () => {
  const f = fixture('damaged JSON');
  const value = await loadWorkspace({ ...f, key: 'team', initial, readCloud: async () => ({ players: [{ id: 'cloud' }] }) });
  assert.equal(value.players[0].id, 'cloud');
  assert.equal(f.writes.length, 1);
  assert.equal(f.writes[0][1], 'damaged JSON');
  const absent = fixture('damaged JSON');
  await assert.rejects(loadWorkspace({ ...absent, key: 'team', initial, readCloud: async () => null }), error => error.workspaceStage === 'local-format');
  assert.deepEqual(absent.writes, []);
});

test('failed backup prevents migration from enabling subsequent workspace saves', async () => {
  const f = fixture(JSON.stringify({ players: [] }));
  f.storage.setItem = async () => { throw Error('storage full'); };
  await assert.rejects(loadWorkspace({ ...f, key: 'team', initial, readCloud: async () => null }), error => error.workspaceStage === 'local-backup');
});

test('incompatible cloud shapes are rejected instead of breaking merge or overwriting local records', async () => {
  for (const cloud of [{ players: null }, { lineups: {} }, { players: [null] }, { attendance: { today: null } }]) {
    const f = fixture(JSON.stringify(initial));
    await assert.rejects(loadWorkspace({ ...f, key: 'team', initial, readCloud: async () => cloud }), error => error.workspaceStage === 'cloud-format');
    assert.deepEqual(f.writes, []);
  }
});

test('network and expired-session errors have different recovery instructions', () => {
  assert.match(workspaceLoadMessage({ code: 'firestore/unavailable' }), /conectar/);
  assert.match(workspaceLoadMessage({ code: 'unauthenticated' }), /sesión ha caducado/);
});
