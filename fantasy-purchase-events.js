import {createPurchaseEvents} from './fantasy-purchase-events.cjs';
const events=createPurchaseEvents();
export const watchFantasyPurchases=(uid,callback)=>events.subscribe(uid,callback);
export const observeFantasyPurchases=(uid,path,data)=>events.observe(uid,path,data);
