// Admin-only league test reset. Never runs without server-side authorization.
const identifier = name => {
 if(!/^fantasy_[a-z0-9_]+$/.test(name))throw Error('Nombre de tabla no permitido');
 return '"'+name+'"';
};
const preserved = new Set(['fantasy_leagues','fantasy_members','fantasy_league_groups',
 'fantasy_official_leagues','fantasy_league_lifecycle','fantasy_league_lifecycle_events','fantasy_player_blocks','fantasy_market_windows','fantasy_market_slot_settings','fantasy_team_photo_privacy','fantasy_wallet_cents','fantasy_wallet_values',
 'fantasy_wallets','fantasy_messages','fantasy_message_reads']);
const walletFields = [['fantasy_wallet_cents','delta_cents'],['fantasy_wallet_values','delta_tenths'],['fantasy_wallets','delta_units']];
const rows=async statement=>(await statement.all()).results;
export async function resetLeague({db,leagueId,confirm,expectedCreatedAt,now,apply=false}){
 if(!/^[a-zA-Z0-9-]{1,80}$/.test(leagueId))throw Object.assign(Error('Liga no válida.'),{status:400});
 const league=await db.prepare('SELECT id,name,created_at FROM fantasy_leagues WHERE id=?').bind(leagueId).first();
 if(!league)throw Object.assign(Error('Liga no encontrada.'),{status:404});
 const memberCount=(await db.prepare('SELECT COUNT(*) AS n FROM fantasy_members WHERE league_id=?').bind(leagueId).first()).n;
 // GET is a read-only confirmation preview, not a schema audit. Production D1
 // databases can have many more Fantasy tables than the isolated test schema.
 // Avoid SQLite metadata PRAGMAs, compound SELECTs and long-running scans here.
 if(!apply){
  const rosterCount=(await db.prepare('SELECT COUNT(*) AS n FROM fantasy_roster WHERE league_id=?').bind(leagueId).first()).n;
  return {leagueId,name:league.name,createdAt:league.created_at,
   membersPreserved:memberCount,rowsToClear:{fantasy_roster:rosterCount},
   instructions:'Se conservan los participantes, la configuración y los mensajes. El reinicio elimina las operaciones de juego de esta liga y restablece sus saldos.'};
 }
 if(confirm!=='REINICIAR '+league.name||expectedCreatedAt!==league.created_at||!Number.isSafeInteger(now)||now<=league.created_at)
  throw Object.assign(Error('Confirmación no válida o la liga ha cambiado.'),{status:409});

 // One D1 query instead of 2 PRAGMA calls per Fantasy table. On Workers
 // Free each invocation is limited to 50 D1 subrequests. This preview must
 // remain available even when the database has dozens of Fantasy tables.
 const tables=await rows(db.prepare(`SELECT m.name,
  (SELECT json_group_array(json_object('name',p.name)) FROM pragma_table_info(m.name) AS p) AS columns_json,
  (SELECT json_group_array(json_object('id',f.id,'table',f."table",'from',f."from",'to',f."to")) FROM pragma_foreign_key_list(m.name) AS f) AS foreign_json
  FROM sqlite_master AS m WHERE m.type='table' AND m.name LIKE 'fantasy_%' ORDER BY m.name`));
 const byName=new Map();
 for(const {name,columns_json,foreign_json} of tables){
  const columns=JSON.parse(columns_json||'[]'),foreign=JSON.parse(foreign_json||'[]');
  byName.set(name,{name,columns,foreign});
 }
 // A table without league_id may be scoped via foreign keys pointing to a
 // directly scoped Fantasy table. Build those associations without touching
 // global statistics, other leagues, identities or public club data.
 const scoped=new Map();
 for(const [name,table] of byName)if(table.columns.some(c=>c.name==='league_id')&&!preserved.has(name))
  scoped.set(name,{where:identifier(name)+'."league_id"=?',joins:0});
 let changed=true;
 for(let pass=0;pass<byName.size&&changed;pass++){
  changed=false;
  for(const [name,table] of byName){
   if(scoped.has(name)||preserved.has(name))continue;
   const groups=new Map();
   for(const fk of table.foreign){
    if(!groups.has(fk.id))groups.set(fk.id,[]);
    groups.get(fk.id).push(fk);
   }
   for(const fks of groups.values()){
    const parent=fks[0].table,entry=scoped.get(parent);
    if(!entry||!byName.has(parent))continue;
    if(!fks.every(fk=>/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(fk.from)&&/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(fk.to)))continue;
    const predicate=fks.map(fk=>identifier(parent)+'."'+fk.to+'"='+identifier(name)+'."'+fk.from+'"').join(' AND ');
    scoped.set(name,{where:'EXISTS(SELECT 1 FROM '+identifier(parent)+' WHERE '+predicate+' AND ('+entry.where+'))',joins:entry.joins+1});
    changed=true;break;
   }
  }
 }
 // Any new scoped table participates in the reset through its league ID.
 // Explicitly protect the league definition and its member accounts.
 const dataTables=[...scoped.keys()];
 const counts={};
 if(dataTables.length){
  // Count all scoped rows in one statement, not one D1 subrequest per table.
  const sql=dataTables.map(name=>"SELECT '"+name.replace(/'/g,"''")+"' AS name, COUNT(*) AS n FROM "+identifier(name)+' WHERE '+scoped.get(name).where).join(' UNION ALL ');
  const totals=await rows(db.prepare(sql).bind(...dataTables.map(()=>leagueId)));
  for(const {name,n} of totals)counts[name]=n;
 }
 const preview={leagueId,name:league.name,createdAt:league.created_at,membersPreserved:memberCount,rowsToClear:counts,
    instructions:'Se mantienen la liga, sus participantes, la configuración, los mensajes y los precios globales. Se borran plantillas, saldos de prueba, operaciones, pujas, alineaciones y premios.'};

 // Remove children before parents, and managers before roster, to preserve
 // the roster-minimum trigger while wiping a test squad.
 const dependencies=new Map([...scoped.keys()].map(name=>[name,new Set()]));
 for(const [name,table] of byName){
  if(!scoped.has(name))continue;
  for(const fk of table.foreign)if(scoped.has(fk.table)&&fk.table!==name)dependencies.get(name).add(fk.table);
 }
 if(scoped.has('fantasy_managers')&&scoped.has('fantasy_roster'))dependencies.get('fantasy_managers').add('fantasy_roster');
 const order=[],remaining=new Set(scoped.keys());
 while(remaining.size){
  const next=[...remaining].find(n=>![...dependencies].some(([child,parents])=>remaining.has(child)&&child!==n&&parents.has(n)));
  if(!next)throw Object.assign(Error('Dependencias circulares: no se ha modificado la liga.'),{status:409});
  order.push(next);remaining.delete(next);
 }
 const statements=[];
 // The reset guard is inside the same transaction as all changes.
 statements.push(db.prepare("SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM fantasy_leagues WHERE id=? AND created_at=?) THEN json('RESET_STALE') ELSE 'ok' END").bind(leagueId,league.created_at));
 // Legacy notification job tables do not declare foreign keys or league_id.
 // Delete their rows using the original league-scoped notices/offers before
 // deleting those parent records, avoiding stale pushes after a reset.
 const orphanJobs=[
  ['fantasy_market_push_jobs','notice_id','fantasy_market_notices','id'],
  ['fantasy_offer_push_jobs','offer_id','fantasy_offers','id'],
  ['fantasy_offer_response_jobs','offer_id','fantasy_offers','id'],
  ['fantasy_offer_notice_events','offer_id','fantasy_offers','id'],
  ['fantasy_prize_seen','event_id','fantasy_prize_events','id']
 ];
 for(const [child,key,parent,parentKey] of orphanJobs){
  const childTable=byName.get(child),parentTable=byName.get(parent);
  if(!childTable||!parentTable||!scoped.has(parent)||!counts[parent])continue;
  if(!childTable.columns.some(c=>c.name===key)||!parentTable.columns.some(c=>c.name===parentKey))continue;
  const parentScope=scoped.get(parent).where;
  statements.push(db.prepare('DELETE FROM '+identifier(child)+' WHERE "'+key+'" IN (SELECT "'+parentKey+'" FROM '+identifier(parent)+' WHERE '+parentScope+')').bind(leagueId));
 }
 for(const name of order){
  // Avoid needless DELETE queries on empty league-scoped tables. This reduces
  // transaction work and D1 row scans while preserving the same result.
  if(!counts[name])continue;
  const {where}=scoped.get(name);
  statements.push(db.prepare('DELETE FROM '+identifier(name)+' WHERE '+where).bind(leagueId));
 }
 for(const [name,col] of walletFields)
  if(byName.has(name))statements.push(db.prepare('UPDATE '+identifier(name)+' SET "'+col+'"=0 WHERE league_id=?').bind(leagueId));
 statements.push(db.prepare('UPDATE fantasy_members SET joined_at=? WHERE league_id=?').bind(now,leagueId));
 statements.push(db.prepare('UPDATE fantasy_leagues SET created_at=? WHERE id=? AND created_at=?').bind(now,leagueId,league.created_at));
 // D1 batch() is a single database subrequest and executes the statements
 // transactionally; do not impose a per-statement Workers Free limit here.
 await db.batch(statements);
 return {reset:true,leagueId,memberCount,resetAt:now};
}
