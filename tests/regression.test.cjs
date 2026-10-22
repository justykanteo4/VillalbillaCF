const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { createSaveQueue } = require('../workspace-save.cjs');
const { nativeGoogleOptions, iosUrlScheme } = require('../native-google-config.cjs');
const root = path.resolve(__dirname, '..');

async function loadModule(file, mocks = {}, environment = {}, globals = {}) {
  const context = vm.createContext({ console, process: { env: environment }, ...globals });
  const module = new vm.SourceTextModule(fs.readFileSync(path.join(root, file), 'utf8'), { context });
  await module.link(async name => {
    assert.ok(Object.hasOwn(mocks, name), `Unexpected import: ${name}`);
    const values = mocks[name];
    return new vm.SyntheticModule(Object.keys(values), function () {
      for (const [key, value] of Object.entries(values)) this.setExport(key, value);
    }, { context });
  });
  await module.evaluate();
  return module.namespace;
}

async function firebaseFixture(overrides = {}) {
  const writes = [];
  const profile = { uid: 'trainer-1', email: 'trainer@example.com', status: 'unassigned', claim: null };
  const noop = () => {};
  const firebase = await loadModule('firebase.js', {
    'react-native': { Platform: { OS: 'web' } },
    '@react-native-async-storage/async-storage': { default: {} },
    'firebase/app': { initializeApp: () => ({}), getApps: () => [] },
    'firebase/auth': { getAuth: () => ({}), initializeAuth: noop, getReactNativePersistence: noop, onAuthStateChanged: noop, signOut: noop },
    'firebase/firestore': {
      getFirestore: () => ({}), collection: noop, doc: (...args) => args.slice(1),
      getDoc: async () => ({ exists: () => true, id: profile.uid, data: () => profile }),
      getDocs: noop, onSnapshot: noop, orderBy: noop, query: noop, serverTimestamp: noop,
      setDoc: async (...args) => writes.push(['set', ...args]),
      updateDoc: async (...args) => writes.push(['update', ...args]),
      ...overrides,
    },
  }, Object.fromEntries(['API_KEY', 'AUTH_DOMAIN', 'PROJECT_ID', 'APP_ID', 'MESSAGING_SENDER_ID'].map(key => ['EXPO_PUBLIC_FIREBASE_' + key, 'test'])));
  return { firebase, writes };
}

test('team claims update only fields permitted by Firestore rules', async () => {
  const { firebase, writes } = await firebaseFixture();
  const next = await firebase.claimTeam({ uid: 'trainer-1', emailVerified: true }, { id: '680163', name: 'Villalbilla', category: 'Sénior' }, '  Entrenador  ');
  assert.equal(next.id, 'trainer-1');
  assert.equal(next.status, 'pending');
  assert.equal(next.claim.name, 'Entrenador');
  assert.equal(writes.length, 1);
  assert.equal(writes[0][0], 'update');
  assert.deepEqual(Object.keys(writes[0][2]).sort(), ['claim', 'status', 'updatedAt']);
});

test('unverified email never reads or creates a trainer profile', async () => {
  const { firebase, writes } = await firebaseFixture();
  await assert.rejects(firebase.getProfile({ uid: 'unverified', emailVerified: false }), /Verifica tu correo/);
  assert.equal(writes.length, 0);
});

test('a profile load finishing after logout cannot restore the old account', async () => {
  let snapshotCallback, release;
  const pending = new Promise(resolve => { release = resolve; });
  const { firebase } = await firebaseFixture({
    onSnapshot: (_ref, callback) => { snapshotCallback = callback; return () => {}; },
    getDoc: () => pending,
  });
  const received = [];
  const unsubscribe = firebase.watchProfile({ uid: 'old-user', emailVerified: true }, value => received.push(value));
  const loading = snapshotCallback({ exists: () => false });
  unsubscribe();
  release({ exists: () => true, id: 'old-user', data: () => ({ status: 'approved' }) });
  await loading;
  assert.deepEqual(received, []);
});

test('a slow old save cannot overwrite newer changes', async () => {
  const save = createSaveQueue(), events = [];
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const first = save(async () => { events.push('old:start'); await gate; events.push('old:saved'); });
  const second = save(async () => { events.push('new:saved'); });
  await Promise.resolve();
  assert.deepEqual(events, ['old:start']);
  release();
  await Promise.all([first, second]);
  assert.deepEqual(events, ['old:start', 'old:saved', 'new:saved']);
});

test('a failed save does not block the next edit', async () => {
  const save = createSaveQueue();
  await assert.rejects(save(async () => { throw Error('offline'); }), /offline/);
  assert.equal(await save(async () => 'saved'), 'saved');
});

test('video accepts apostrophes, accents and HTML-like names without breaking its script', async () => {
  const video = await loadModule('LineupVideo.js');
  const title = "O'Connor </script><script>throw Error('bad')</script> ⚽";
  const html = video.makeLineupVideoHtml({ players: [{ name: "José O'Neil", x: 50, y: 50 }], pitchBase64: '', title, formation: '4-4-2' });
  assert.equal((html.match(/<script>/g) || []).length, 1);
  const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
  assert.doesNotThrow(() => new vm.Script(script));
  const encoded = script.match(/decodeURIComponent\('([^']*)'\)/)[1];
  assert.equal(JSON.parse(decodeURIComponent(encoded)).title, title);
});

test('web video resolves a bundled pitch without React Native Image APIs', async () => {
  let loaded, drawn;
  class BrowserImage {
    set src(uri) {
      assert.equal(typeof this.onload, 'function');
      assert.equal(typeof this.onerror, 'function');
      loaded = uri;
      this.onload();
    }
  }
  const canvas = {
    getContext: () => ({ drawImage: (...args) => { drawn = args; } }),
    toDataURL: type => { assert.equal(type, 'image/jpeg'); return 'data:image/jpeg;base64,TEST'; },
  };
  const video = await loadModule('video-pitch.js', {
    'expo-asset': { Asset: { fromModule: source => { assert.equal(source, 42); return { uri: '/assets/pitch.png' }; } } },
  }, {}, { window: { Image: BrowserImage }, document: { createElement: tag => { assert.equal(tag, 'canvas'); return canvas; } } });
  assert.equal(await video.pitchBase64ForWeb(42), 'TEST');
  assert.equal(loaded, '/assets/pitch.png');
  assert.deepEqual(drawn.slice(1), [0, 0, 720, 1080]);
});

test('web video reports an unreadable pitch instead of hanging', async () => {
  class BrokenImage { set src(value) { this.onerror(); } }
  const video = await loadModule('video-pitch.js', {
    'expo-asset': { Asset: { fromModule: () => ({ uri: '/missing.png' }) } },
  }, {}, { window: { Image: BrokenImage } });
  await assert.rejects(video.pitchBase64ForWeb(42), /No se pudo leer/);
});

test('native Google uses separate web and iPhone client identifiers', () => {
  assert.throws(() => nativeGoogleOptions('android', '', ''), /cliente web/);
  assert.throws(() => nativeGoogleOptions('ios', 'web-client', ''), /cliente de Google para iPhone/);
  const android = nativeGoogleOptions('android', 'web-client', 'iphone-client');
  assert.equal(android.webClientId, 'web-client');
  assert.equal(Object.hasOwn(android, 'iosClientId'), false);
  assert.equal(nativeGoogleOptions('ios', 'web-client', 'iphone-client').iosClientId, 'iphone-client');
});

test('the iPhone return scheme matches its OAuth client without changing other plugins', () => {
  const previous = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const clientId = '123-iphone.apps.googleusercontent.com';
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = clientId;
  try {
    const config = { name: 'Villalbilla', plugins: [['expo-image-picker', { microphonePermission: false }], ['@react-native-google-signin/google-signin', { iosUrlScheme: 'old' }]] };
    const next = require('../app.config.js')({ config });
    assert.equal(iosUrlScheme(clientId), 'com.googleusercontent.apps.123-iphone');
    assert.equal(next.plugins[1][1].iosUrlScheme, 'com.googleusercontent.apps.123-iphone');
    assert.deepEqual(next.plugins[0], config.plugins[0]);
    assert.equal(config.plugins[1][1].iosUrlScheme, 'old');
    assert.throws(() => iosUrlScheme('not-a-client'), /no es válido/);
  } finally {
    if (previous === undefined) delete process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
    else process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = previous;
  }
});
