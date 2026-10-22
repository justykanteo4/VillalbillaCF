const isMap = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function failure(stage, cause) {
  const error = new Error('No se pudo cargar el vestuario.', { cause });
  error.code = cause?.code || 'invalid-data';
  error.workspaceStage = stage;
  return error;
}

function normalizeWorkspace(value, initial) {
  if (!isMap(value)) throw Error('Formato de vestuario inválido.');
  for (const key of ['players', 'lineups', 'materials', 'events']) {
    if (key in value && (!Array.isArray(value[key]) || !value[key].every(isMap))) {
      throw Error('Lista de vestuario inválida.');
    }
  }
  for (const key of ['attendance', 'stats']) {
    if (key in value && (!isMap(value[key]) || !Object.values(value[key]).every(isMap))) {
      throw Error('Registros de vestuario inválidos.');
    }
  }
  if ('team' in value && typeof value.team !== 'string') throw Error('Equipo inválido.');
  return { ...initial, ...value };
}

function mergeWorkspaces(local, cloud) {
  const mergeList = (a, b) => [...new Map([...a, ...b].map(item => [item.id, item])).values()];
  const attendance = { ...local.attendance };
  for (const [day, entries] of Object.entries(cloud.attendance)) attendance[day] = { ...(attendance[day] || {}), ...entries };
  const stats = { ...local.stats };
  for (const [id, values] of Object.entries(cloud.stats)) stats[id] = { ...(stats[id] || {}), ...values };
  return { ...local, ...cloud, players: mergeList(local.players, cloud.players),
    lineups: mergeList(local.lineups, cloud.lineups), materials: mergeList(local.materials, cloud.materials),
    events: mergeList(local.events, cloud.events), attendance, stats };
}

async function loadWorkspace({ storage, key, initial, readCloud }) {
  let raw;
  try { raw = await storage.getItem(key); } catch (error) { throw failure('local-read', error); }
  let local = initial, localInvalid = false, backupNeeded = false;
  if (raw !== null) {
    try {
      const parsed = JSON.parse(raw);
      local = normalizeWorkspace(parsed, initial);
      backupNeeded = Object.keys(initial).some(field => !(field in parsed));
    } catch { localInvalid = true; backupNeeded = true; }
  }
  let cloud;
  try { cloud = await readCloud(); } catch (error) { throw failure('cloud-read', error); }
  if (cloud !== null) {
    try { cloud = normalizeWorkspace(cloud, initial); } catch (error) { throw failure('cloud-format', error); }
  }
  if (localInvalid && cloud === null) throw failure('local-format');
  if (backupNeeded) {
    // Preserve the exact old bytes before allowing any migrated/recovered save.
    try { await storage.setItem(key + '.recovery.' + Date.now(), raw); }
    catch (error) { throw failure('local-backup', error); }
  }
  return cloud ? (localInvalid ? cloud : mergeWorkspaces(local, cloud)) : local;
}

function workspaceLoadMessage(error) {
  const code = String(error?.code || 'unknown').replace(/^firestore\//, '');
  if (code === 'permission-denied') return 'Firebase ha rechazado el acceso a este equipo. Comprueba la cuenta y la aprobación del entrenador.';
  if (code === 'unauthenticated') return 'La sesión ha caducado. Cierra sesión y vuelve a entrar.';
  if (['unavailable', 'deadline-exceeded', 'network-request-failed'].includes(code)) return 'No se pudo conectar con los datos del equipo. Comprueba la conexión y pulsa Reintentar.';
  if (error?.workspaceStage === 'local-backup') return 'No se pudo conservar una copia de los datos anteriores. Comprueba el espacio disponible en el móvil.';
  if (error?.workspaceStage?.startsWith('local')) return 'No se pudieron leer los datos guardados en este móvil. Se conservan sin modificar.';
  if (error?.workspaceStage === 'cloud-format') return 'Los datos del equipo tienen un formato que esta versión no puede leer. Se conservan sin modificar.';
  return 'No se pudieron cargar los datos del equipo. Pulsa Reintentar o vuelve a iniciar sesión.';
}

module.exports = { loadWorkspace, normalizeWorkspace, workspaceLoadMessage };
