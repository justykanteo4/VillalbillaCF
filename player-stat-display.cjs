const isKeeper=p=>!!p?.isGoalkeeper||p?.role==='Portero'||/portero|guardameta/i.test(String(p?.position||''));
const shouldShowGoals=p=>!isKeeper(p)||(typeof p?.goals==='number'&&Number.isFinite(p.goals)&&p.goals>0);
function cardStats(p){return isKeeper(p)?[['ENCAJADOS',p.goalsConceded],['A CERO',p.cleanSheets],['PARTIDOS',p.played],['AMARILLAS',p.yellow],['ROJAS',p.red],...(shouldShowGoals(p)?[['GOLES',p.goals]]:[])]:[['GOLES',p.goals],['AMARILLAS',p.yellow],['ROJAS',p.red],['PARTIDOS',p.played]]}
module.exports={isKeeper,shouldShowGoals,cardStats};
