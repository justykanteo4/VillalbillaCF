import {weeklyFormation} from './fantasy-weekly-formation.cjs';
import {matchPlayerPoints} from './fantasy-lineup-points.cjs';
import {weekKey,dayLabel} from './fantasy-game-policy.cjs';
export function weeklyEleven(players,matches,awards,points,now){
 const available=matches.filter(m=>m.startsAt<=now&&m.week<=weekKey(now)),week=available.length?Math.max(...available.map(m=>m.week)):weekKey(now),totals=new Map(),positions=new Map(players.map(p=>[p.id,p.position]));
 for(const m of available.filter(m=>m.week===week))for(const p of m.players){const score=matchPlayerPoints(p,m,points,awards,positions.get(p.id));if(p.played||score!==0){const old=totals.get(p.id)||{points:0,partial:false};totals.set(p.id,{points:old.points+score,partial:old.partial||!!p.partial})}}
 const ranked=[...new Map(players.map(p=>[p.id,p])).values()].filter(p=>totals.has(p.id)).map(p=>({...p,weekPoints:totals.get(p.id).points,weekPartial:totals.get(p.id).partial})).sort((a,b)=>b.weekPoints-a.weekPoints||a.name.localeCompare(b.name,'es'));
 return {week,date:dayLabel(week*7-3),...weeklyFormation(ranked)};
}
