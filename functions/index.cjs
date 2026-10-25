const {onDocumentCreated}=require('firebase-functions/v2/firestore');
const {onSchedule}=require('firebase-functions/v2/scheduler');
const {initializeApp}=require('firebase-admin/app');
const {getFirestore,FieldValue}=require('firebase-admin/firestore');
const {getMessaging}=require('firebase-admin/messaging');
initializeApp();
const db=getFirestore();
const {matchesNotification:matches}=require('./targets.cjs');
exports.deliverClubNotification=onDocumentCreated({document:'clubNotifications/{notificationId}',retry:true},async event=>{
 const message=event.data.data();
 // Persist one delivery record per notification/device; retries never resend accepted pushes.
 const snapshot=await db.collection('notificationSubscriptions').get(),tokens=new Map();
 for(const row of snapshot.docs){const s={id:row.id,...row.data()};const old=tokens.get(s.token);if(!old||(s.updatedAt?.toMillis()||0)>(old.updatedAt?.toMillis()||0))tokens.set(s.token,s)}
 let accepted=0,failed=0;
 for(const subscription of tokens.values()){
  if(!matches(message,subscription))continue;
  const delivery=event.data.ref.collection('deliveries').doc(subscription.id);
  const claimed=await db.runTransaction(async tx=>{
   const previous=await tx.get(delivery),old=previous.data();
   if(old&&['accepted','delivered'].includes(old.status))return false;
   if(old?.status==='sending'&&Date.now()-(old.updatedAt?.toMillis()||0)<120000)return false;
   tx.set(delivery,{status:'sending',updatedAt:FieldValue.serverTimestamp(),attempts:(old?.attempts||0)+1},{merge:true});return true;
  });
  if(!claimed)continue;
  try{
   if(subscription.provider==='fcm'){
    const id=await getMessaging().send({token:subscription.token,notification:{title:message.title,body:message.body},data:{notificationId:event.params.notificationId}});
    await delivery.update({status:'accepted',providerId:id});
   }else{
    const response=await fetch('https://exp.host/--/api/v2/push/send',{method:'POST',headers:{'Content-Type':'application/json',...(process.env.EXPO_ACCESS_TOKEN?{Authorization:'Bearer '+process.env.EXPO_ACCESS_TOKEN}:{})},body:JSON.stringify({to:subscription.token,title:message.title,body:message.body,sound:'default',channelId:'club',data:{notificationId:event.params.notificationId}})});
    const result=await response.json(),ticket=result.data;
    if(!response.ok||ticket?.status!=='ok')throw Error(ticket?.details?.error||'Expo rechazó el envío');
    await delivery.update({status:'accepted',providerId:ticket.id,provider:'expo',subscriptionId:subscription.id});
   }
   accepted++;
  }catch(error){failed++;await delivery.update({status:'failed',error:String(error.message).slice(0,200)});if(/not-registered|DeviceNotRegistered/.test(error.message))await db.collection('notificationSubscriptions').doc(subscription.id).update({enabled:false})}
 }
 const records=await event.data.ref.collection('deliveries').get();
 await event.data.ref.update({delivery:{accepted:records.docs.filter(row=>['accepted','delivered'].includes(row.data().status)).length,failed:records.docs.filter(row=>row.data().status==='failed').length,processedAt:FieldValue.serverTimestamp()}});
 if(failed)throw Error('Hay envíos pendientes de reintento');
});
// Expo acceptance is not delivery: check receipts and retire unregistered devices.
exports.checkPushReceipts=onSchedule('every 15 minutes',async()=>{
 const notices=await db.collection('clubNotifications').orderBy('createdAt','desc').limit(50).get();
 for(const notice of notices.docs){
  const deliveries=await notice.ref.collection('deliveries').where('status','==','accepted').get();
  const expo=deliveries.docs.filter(row=>row.data().provider==='expo');
  for(let i=0;i<expo.length;i+=100){
   const batch=expo.slice(i,i+100),response=await fetch('https://exp.host/--/api/v2/push/getReceipts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids:batch.map(row=>row.data().providerId)})});
   if(!response.ok)throw Error('No se pudieron consultar los recibos Expo');
   const receipts=(await response.json()).data||{};
   for(const row of batch){const receipt=receipts[row.data().providerId];if(!receipt)continue;await row.ref.update({status:receipt.status==='ok'?'delivered':'failed',error:receipt.details?.error||null});if(receipt.details?.error==='DeviceNotRegistered')await db.collection('notificationSubscriptions').doc(row.data().subscriptionId).update({enabled:false})}
  }
 }
});
