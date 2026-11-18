// Resumen calculado exclusivamente sobre jornadas confirmadas recibidas del servidor.
// No inventar puntos para actas pendientes o jornadas sin datos.
function advancedStats(rounds){
 const valid=(Array.isArray(rounds)?rounds:[]).filter(r=>Number.isFinite(r?.points)).sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))||Number(a.week||0)-Number(b.week||0));
 const points=valid.map(r=>r.points),count=points.length;
 const sum=points.reduce((a,b)=>a+b,0);
 const lastFive=points.slice(-5);
 let best=null,worst=null,positive=0;
 for(const r of valid){if(!best||r.points>best.points)best=r;if(!worst||r.points<worst.points)worst=r;if(r.points>0)positive++}
 return {count,average:count?Math.round(sum/count*10)/10:null,best,worst,lastFive,positive,trend:count>=2?points[count-1]-points[count-2]:null};
}
module.exports={advancedStats};
