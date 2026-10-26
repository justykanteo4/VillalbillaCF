import {handleActivity} from './activity-service.mjs';
import {handleVisits} from './visits-service.mjs';
import {handleFreeNotifications,scheduledNotifications} from './free-notifications.mjs';
import news from './server/news.cjs';
import clubStats from './server/club-stats.cjs';
import calendar from './calendar-source.cjs';
import standings from './server/standings.cjs';
import matches from './server/match.cjs';
import sanctions from './server/sanctions.cjs';
import scorers from './server/scorers.cjs';
import fields from './server/fields.cjs';
import weather from './server/weather.cjs';
import players from './server/players.cjs';
import minutes from './server/minutes.cjs';
import staff from './server/staff.cjs';

const json = (value, status = 200, origin = '*', maxAge = 0) => new Response(JSON.stringify(value), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': maxAge ? `public, max-age=0, s-maxage=${maxAge}` : 'no-store',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-App-Platform',
    'X-Content-Type-Options': 'nosniff',
  },
});

async function data(request, env) {
  const url = new URL(request.url), p = url.searchParams;
  if (url.pathname === '/api/club-stats') {
    const offset=Number(p.get('offset')||0);
    if(!Number.isSafeInteger(offset)||offset<0||offset>1000)return [{error:'Página no válida.'},400,0];
    const result=await clubStats.clubStats(p.get('team'),offset);
    return result?[result,200,result.error?0:300]:[{error:'Equipo no encontrado.'},404,0];
  }
  if (url.pathname === '/api/team-calendar') {const result=await news.teamCalendar(p.get('team'),p.get('current')==='1');return result?[result,200,result.error?0:60]:[{error:'Equipo no encontrado.'},404,0] }
  if (url.pathname === '/api/news') return [await news.refreshNews({ persistComments: false }), 200, 60];
  if (url.pathname === '/api/instagram') return [await news.instagram(env.INSTAGRAM_ACCESS_TOKEN, env.INSTAGRAM_FACEBOOK_ACCESS_TOKEN), 200, 60];
  if (url.pathname === '/api/calendar') {
    const response = await fetch(calendar.SOURCE, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw Error('calendar');
    return [calendar.parseCalendar(await response.text()), 200, 300];
  }
  if (url.pathname === '/api/standings') {
    const result = await standings.standings(p.get('team'));
    return result ? [result, 200, 300] : [{ error: 'Equipo no encontrado.' }, 404, 0];
  }
  if (url.pathname === '/api/match') {
    const result = await matches.matchDetails(p.get('team'), p.get('match'),{refresh:p.get('refresh')==='1',db:env.VISITS_DB});
    return result ? [result, 200, result.error||p.get('refresh')==='1'?0:60] : [{ error: 'Partido no encontrado.' }, 404, 0];
  }
  if (url.pathname === '/api/sanctions') {
    const result = await sanctions.sanctions(p.get('team'),{scope:p.get('scope')==='team'?'team':'all',db:env.VISITS_DB});
    return result ? [result, 200, 300] : [{ error: 'Equipo no encontrado.' }, 404, 0];
  }
  if (url.pathname === '/api/scorers') return [await scorers.scorers(), 200, 300];
  if (url.pathname === '/api/league-scorers') {
    const result = await scorers.leagueScorers(p.get('team'));
    return result ? [result, 200, 300] : [{ error: 'Equipo no encontrado.' }, 404, 0];
  }
  if (url.pathname === '/api/field') {
    const result = await fields.field(p.get('id'));
    return result ? [result, 200, 86400] : [{ error: 'Campo no encontrado.' }, 404, 0];
  }
  if (url.pathname === '/api/weather') return [await weather.weather(p.get('field'), p.get('date'), p.get('time')), 200, 1800];
  if (url.pathname === '/api/players') {
    const result = await players.getPlayers(p.get('team'));
    return result ? [result, 200, 1800] : [{ error: 'Equipo no encontrado.' }, 404, 0];
  }
  if (url.pathname === '/api/player-minutes') {
    const result = await minutes.playerMinutes(p.get('team'), p.get('player'));
    return result ? [result, 200, 1800] : [{ error: 'Jugador no encontrado.' }, 404, 0];
  }
  if (url.pathname === '/api/team-roster') {
    const result = await players.teamRoster(p.get('team'));
    return result ? [result, 200, 300] : [{ error: 'Equipo no encontrado.' }, 404, 0];
  }
  if (url.pathname === '/api/team-staff') {
    const result = await staff.teamStaff(p.get('team'));
    return result ? [result, 200, 300] : [{ error: 'Equipo no encontrado.' }, 404, 0];
  }
  if (url.pathname === '/api/team-ranking') {
    const result = await players.getPlayers(p.get('team'));
    if (!result) return [{ error: 'Equipo no encontrado.' }, 404, 0];
    let minutesError = false;
    const rows = result.players.map(player => ({ ...player, minutes: null }));
    if (p.get('metric') === 'minutes') {
      try {
        const totals = await minutes.teamMinutes(result);
        if (!totals.unsupported) for (const player of rows) {
          if (player.minutesAllowed !== true) continue;
          let total = 0, partial = false;
          for (const record of totals.records) {
            if (record.error || record.minutes[player.id] === null) partial = true;
            else total += record.minutes[player.id] ?? 0;
          }
          player.minutes = total;
          player.minutesPartial = partial;
        }
      } catch { minutesError = true; }
    }
    return [{ players: rows, minutesError }, 200, 1800];
  }
  return [{ error: 'Servicio no disponible.' }, 404, 0];
}

export default {
  async scheduled(event,env,ctx){ctx.waitUntil(scheduledNotifications(env))},
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '*';
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-App-Platform',
    } });
    const activityResponse=await handleActivity(request,env);if(activityResponse)return activityResponse;
    const visitResponse=await handleVisits(request,env);
    if(visitResponse)return visitResponse;
    const notificationResponse=await handleFreeNotifications(request,env,ctx);
    if(notificationResponse)return notificationResponse;
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    if (request.method !== 'GET') return json({ error: 'Método no permitido.' }, 405, origin);
    const cacheKey = new Request(url.toString(), { method: 'GET' });
    try {
      const cached = url.pathname==='/api/match'&&url.searchParams.get('refresh')==='1'?null:await caches.default.match(cacheKey);
      if (cached) {
        const headers = new Headers(cached.headers);
        headers.set('Access-Control-Allow-Origin', origin);
        return new Response(cached.body, { status: cached.status, headers });
      }
    } catch { /* Local development may not provide the Cloudflare cache API. */ }
    try {
      const [value, status, maxAge] = await data(request, env);
      const response = json(value, status, origin, maxAge);
      if (status === 200 && maxAge) {
        try { ctx.waitUntil(caches.default.put(cacheKey, response.clone())); } catch { /* Cache is an optimization. */ }
      }
      return response;
    } catch {
      return json({ error: 'No se pudo consultar la fuente. Inténtalo más tarde.' }, 502, origin);
    }
  },
};
