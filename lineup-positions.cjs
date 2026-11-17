const point=p=>Array.isArray(p)?{x:p[0],y:p[1]}:p;
function playerRole(value){const v=String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();if(/portero|guardameta/.test(v))return 'Portero';if(/defens|central|lateral|carriler|libero/.test(v))return 'Defensa';if(/medio|medioc|centrocamp|mediapunta|pivote|interior|volante/.test(v))return 'Mediocentro';if(/delanter|extremo|punta|atacante/.test(v))return 'Delantero';return null}
function slotRole(p){const {y}=point(p);return y>=84?'Portero':y>=65?'Defensa':y>=39?'Mediocentro':'Delantero'}
function assignPositions(players,slots,preferred={},allowAny=false){if(allowAny){
 const remaining=[...new Map(players.map(p=>[p.id,p])).values()],taken=new Map(),used=new Set(),edges=[];
 for(const p of remaining){const old=preferred[p.id]&&point(preferred[p.id]);if(old&&Number.isFinite(old.x)&&Number.isFinite(old.y))slots.forEach((raw,i)=>{const pt=point(raw);edges.push({id:p.id,index:i,distance:Math.hypot(old.x-pt.x,old.y-pt.y)})})}
 edges.sort((a,b)=>a.distance-b.distance||a.index-b.index);for(const e of edges)if(!used.has(e.id)&&!taken.has(e.index)){taken.set(e.index,e.id);used.add(e.id)}
 for(let i=0;i<slots.length;i++){if(taken.has(i))continue;const available=remaining.filter(p=>!used.has(p.id)),p=available.find(p=>(playerRole(p.position)||p.legacyRole)===slotRole(slots[i]))||available[0];if(p){taken.set(i,p.id);used.add(p.id)}}
 const starters=[],positions={},byId={};for(let i=0;i<slots.length;i++)if(taken.has(i)){const id=taken.get(i);starters.push(id);positions[id]={...point(slots[i])};byId[id]=i}
 return {starters,positions,byId,bench:remaining.filter(p=>!used.has(p.id)).map(p=>p.id)};
 }const remaining=players.slice(),starters=[],positions={},byId={};slots.forEach((raw,index)=>{const pt=point(raw),role=slotRole(pt);let best=-1,score=Infinity;remaining.forEach((p,i)=>{if((playerRole(p.position)||p.legacyRole)!==role)return;const old=preferred[p.id],distance=old?Math.hypot(old.x-pt.x,old.y-pt.y):1000+i;if(distance<score){score=distance;best=i}});if(best<0)return;const p=remaining.splice(best,1)[0];starters.push(p.id);positions[p.id]={...pt};byId[p.id]=index});return {starters,positions,byId,bench:remaining.map(p=>p.id)}}
module.exports={playerRole,slotRole,assignPositions};
