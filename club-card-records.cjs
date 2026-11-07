const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/gi,'').toUpperCase();
const madridToday=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Madrid'});
const summaryFixture=(fixture,teamId)=>[fixture.homeId,fixture.awayId].map(String).includes(String(teamId))&&Number.isInteger(fixture.homeScore)&&Number.isInteger(fixture.awayScore)&&fixture.homeScore>=0&&fixture.awayScore>=0;
const knownCards=row=>row?.available===true&&row.closed===true&&Number.isInteger(row.yellow)&&row.yellow>=0&&Number.isInteger(row.red)&&row.red>=0;
function cardRecord(teamId,fixture,report){
 const base={teamId:String(teamId),id:String(fixture.id),available:false,closed:report?.closed===true,yellow:null,red:null,updatedAt:report?.updatedAt||null};
 if(!report||String(report.id)!==base.id||report.homeId&&String(report.homeId)!==String(fixture.homeId)||report.awayId&&String(report.awayId)!==String(fixture.awayId))return {...base,reason:'unavailable'};
 if(report.closed!==true)return {...base,reason:report.closed===false?'unclosed':'unavailable'};
 if(report.cardsAvailable!==true||!Array.isArray(report.cards))return {...base,reason:'unavailable'};
 const label=String(fixture.homeId)===base.teamId?fixture.home:fixture.away;if(!normalize(label))return {...base,reason:'unavailable'};
 const cards=report.cards.filter(card=>card.teamId?String(card.teamId)===base.teamId:normalize(card.team)===normalize(label));
 return {...base,available:true,yellow:cards.filter(c=>c.color==='yellow'||c.type==='Segunda amarilla').length,red:cards.filter(c=>c.color==='red').length,stale:!!report.error};
}
function mergeCardRecords(previous,incoming){const rows=new Map();for(const row of [...(previous||[]),...(incoming||[])]){if(!row?.teamId||!row?.id)continue;const key=row.teamId+':'+row.id,old=rows.get(key);if(old&&knownCards(old)&&!knownCards(row)){rows.set(key,{...old,stale:true});continue}if(old&&knownCards(old)&&knownCards(row)&&Number.isFinite(Date.parse(old.updatedAt))&&(!Number.isFinite(Date.parse(row.updatedAt))||Date.parse(row.updatedAt)<Date.parse(old.updatedAt)))continue;rows.set(key,old&&!knownCards(old)&&!knownCards(row)?{...old,...row,reason:row.reason||old.reason,updatedAt:row.updatedAt||old.updatedAt}:row)}return [...rows.values()]}
module.exports={madridToday,summaryFixture,knownCards,cardRecord,mergeCardRecords};
