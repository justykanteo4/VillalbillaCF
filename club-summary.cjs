// Aggregate only club participants; never include opponents' cards or infer missing data.
function buildClubSummary(teams,records,range){
 const total={teams:teams.length,matches:0,goalsFor:0,goalsAgainst:0,yellow:0,red:0,cardMatches:0,teamMatches:0,stale:false};
 const matches=new Set(),seen=new Set(),byMatch=new Map(records.map(row=>[row.teamId+':'+row.id,row]));
 for(const team of teams){
  total.stale ||= Boolean(team.error);
  for(const match of team.fixtures||[]){
   if(!Number.isInteger(match.homeScore)||!Number.isInteger(match.awayScore)||match.homeScore<0||match.awayScore<0)continue;
   if(range&&(!match.date||match.date<range.start||match.date>range.end))continue;
   const home=String(match.homeId)===String(team.id),away=String(match.awayId)===String(team.id);
   if(!home&&!away)continue;
   const key=team.id+':'+match.id;if(seen.has(key))continue;seen.add(key);
   matches.add(match.id);total.teamMatches++;
   total.goalsFor+=home?match.homeScore:match.awayScore;
   total.goalsAgainst+=home?match.awayScore:match.homeScore;
   const cards=byMatch.get(key);
   if(cards?.available){total.cardMatches++;total.yellow+=cards.yellow;total.red+=cards.red}
  }
 }
 total.matches=matches.size;
 total.cardsComplete=total.cardMatches===total.teamMatches;
 return total;
}
module.exports={buildClubSummary};
