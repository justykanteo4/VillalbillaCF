// Admin-only league test reset. Never runs without server-side authorization.
const identifier = name => {
 if(!/^fantasy_[a-z0-9_]+$/.test(name))throw Error('Nombre de tabla no permitido');
 return '"'+name+'"';
};
const preserved = new Set(['fantasy_leagues','fantasy_members','fantasy_league_groups',
 'fantasy_official_leagues','fantasy_wallet_cents','fantasy_wallet_values',
 'fantasy_wallets','fantasy_messages','fantasy_message_reads']);
const walletFields = [['fantasy_wallet_cents','delta_cents'],['fantasy_wallet_values','delta_tenths'],['fantasy_wallets','delta_units']];
const rows=async statement=>(await statement.all()).results;
export async function resetLeague({db,leagueId,confirm,expectedCreatedAt,now,apply=false}){
 if(!/^[a-zA-Z0-9-]{1,80}$/.test(leagueId))throw Object.assign(Error('Liga no válida.'),{status:400});
 const league=await db.prepare('SELECT id,name,created_at FROM fantasy_leagues WHERE id=?').bind(leagueId).first();
 if(!league)throw Object.assign(Error('Liga no encontrada.'),{status:404});
 const memberCount=(await db.prepare('SELECT COUNT(*) AS n FROM fantasy_members WHERE league_id=?').bind(leagueId).first()).n;
 const tables=await rows(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'fantasy_%' ORDER BY name"));
 const byName=new Map();
 for(const {name} of tables){
  const columns=await rows(db.prepare('PRAGMA table_info('+identifier(name)+')'));
  const foreign=await rows(db.prepare('PRAGMA foreign_key_list('+identifier(name)+')'));
  byName.set(name,{name,columns,foreign});
 }
 // A table without league_id may be scoped via foreign keys pointing to a
 // directly scoped Fantasy table. Build those associations without touching
 // global statistics, other leagues, identities or public club data.
 const scoped=new Map();
 for(const [name,table] of byName)if(table.columns.some(c=>c.name==='league_id')&&!preserved.has(name))
  scoped.set(name,{where:'"league_id"=?',joins:0});
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
    const predicate=fks.map(fk=>'p."'+fk.to+'"='+identifier(name)+'."'+fk.from+'"').join(' AND ');
    scoped.set(name,{where:'EXISTS(SELECT 1 FROM '+identifier(parent)+' p WHERE '+predicate+' AND ('+entry.where.replaceAll('"league_id"','p."league_id"')+'))',joins:entry.joins+1});
    changed=true;break;
   }
  }
 }
 // Any new scoped table participates in the reset through its league ID.
 // Explicitly protect the league definition and its member accounts.
 const dataTables=[...scoped.keys()];
 const counts={};
 for(const name of dataTables){
  const row=await db.prepare('SELECT COUNT(*) AS n FROM '+identifier(name)+' WHERE "league_id"=?').bind(leagueId).first().catch(()=>null);
  if(row)counts[name]=row.n;
 }
 const preview={leagueId,name:league.name,createdAt:league.created_at,membersPreserved:memberCount,rowsToClear:counts,
    instructions:'Se mantienen la liga, sus participantes, la configuración, los mensajes y los precios globales. Se borran plantillas, saldos de prueba, operaciones, pujas, alineaciones y premios.'};
 if(!apply)return preview;
 if(confirm!=='REINICIAR '+league.name||expectedCreatedAt!==league.created_at||!Number.isSafeInteger(now)||now<=league.created_at)
  throw Object.assign(Error('Confirmación no válida o la liga ha cambiado.'),{status:409});
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
 statements.push(db.prepare("SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM fantasy_leagues WHERE id=? AND created_at=?) THEN RAISE(ABORT,'FANTASY_RESET_STALE') END").bind(leagueId,league.created_at));
 for(const name of order){
  const {where,joins}=scoped.get(name);
  if(joins>0)continue; // Scopes through FK need a separate verified key binding; fail safely below.
  statements.push(db.prepare('DELETE FROM '+identifier(name)+' WHERE '+where).bind(leagueId));
 }
 for(const [name,col] of walletFields)
  if(byName.has(name))statements.push(db.prepare('UPDATE '+identifier(name)+' SET "'+col+'"=0 WHERE league_id=?').bind(leagueId));
 statements.push(db.prepare('UPDATE fantasy_members SET joined_at=? WHERE league_id=?').bind(now,leagueId));
 statements.push(db.prepare('UPDATE fantasy_leagues SET created_at=? WHERE id=? AND created_at=?').bind(now,leagueId,league.created_at));
 if([...scoped.values()].some(v=>v.joins>0))throw Object.assign(Error('Hay tablas dependientes que requieren una revisión adicional. No se ha modificado la liga.'),{status:409});
 await db.batch(statements);
 return {reset:true,leagueId,memberCount,resetAt:now};
}
