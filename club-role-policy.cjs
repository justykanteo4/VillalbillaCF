// Alcance de consulta del directorio interno según el perfil aprobado.
// Las autorizaciones de escritura deben comprobarse también en el servidor.
function visibleClubTeamIds(account,allTeamIds=[]){
 if(account?.status==='admin')return [...new Set(allTeamIds.map(String))];
 if(account?.status!=='approved')return [];
 if(account.claim?.role==='editor')return [...new Set(allTeamIds.map(String))];
 if(account.claim?.role!=='trainer')return [];
 const allowed=new Set(allTeamIds.map(String));
 return [...new Set([account.claim.teamId,...(Array.isArray(account.claim.teamIds)?account.claim.teamIds:[])].filter(Boolean).map(String))].filter(id=>allowed.has(id));
}
function canEditClubTeam(account,teamId,{capability='results'}={}){
 if(account?.status==='admin')return true;
 if(account?.status!=='approved'||!teamId)return false;
 const role=account.claim?.role;
 if(role==='editor')return Array.isArray(account.claim?.editorPermissions)&&account.claim.editorPermissions.includes(capability);
 return role==='trainer'&&['results','goals','assists','cards','mvp'].includes(capability)&&visibleClubTeamIds(account,[String(teamId)]).includes(String(teamId));
}
module.exports={visibleClubTeamIds,canEditClubTeam};
