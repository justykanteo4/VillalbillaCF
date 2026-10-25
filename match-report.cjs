function reportScore(value){
 if(typeof value==='string'&&/^\d+$/.test(value))value=Number(value);
 return Number.isSafeInteger(value)&&value>=0?value:null;
}
function matchWithReport(match,report){
 if(!report||report.error||String(report.id)!==String(match.id))return match;
 const homeScore=reportScore(report.homeScore),awayScore=reportScore(report.awayScore);
 if(homeScore===null||awayScore===null||homeScore===match.homeScore&&awayScore===match.awayScore)return match;
 return {...match,homeScore,awayScore,comment:undefined};
}
module.exports={matchWithReport};
