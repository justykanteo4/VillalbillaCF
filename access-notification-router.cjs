const {notificationDestination}=require('./notification-open.cjs');
async function resolveAccessNotification(intent,account,{requestTarget,getProfile}){
 if(intent.type==='request'&&account?.status==='admin'){const target=await requestTarget(intent.requestId);return {area:'admin-approvals',requestUid:target.pending?target.uid:null}}
 if(intent.type==='accepted'){const fresh=await getProfile();return {area:notificationDestination(intent,fresh),account:fresh}}
 return {area:notificationDestination(intent,account)};
}
module.exports={resolveAccessNotification};
