function matchesNotification(message,subscription){
 if(!subscription?.enabled)return false;
 return message.all===true||(message.teamIds||[]).some(id=>(subscription.teamIds||[]).includes(id))||(message.playerIds||[]).some(id=>(subscription.playerIds||[]).includes(id));
}
module.exports={matchesNotification};
