const {GOALKEEPER_VERSION}=require('./goalkeeper-stats.cjs');
function reusableReport(report){return !!report&&report.closed===true&&!report.error&&report.schemaVersion===5&&report.goalkeeperVersion===GOALKEEPER_VERSION&&report.goalsAvailable===true&&report.cardsAvailable===true&&Array.isArray(report.goals)&&Array.isArray(report.cards)&&Array.isArray(report.minutesSource?.jugadores_equipo_local)&&Array.isArray(report.minutesSource?.jugadores_equipo_visitante)}
module.exports={reusableReport};
