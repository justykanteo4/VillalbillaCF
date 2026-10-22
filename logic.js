export function validDate(value){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const d=new Date(value+'T12:00:00Z');
 return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===value;
}
export function validOfficialUrl(value){
 try{const u=new URL(value.trim());return u.protocol==='https:'&&(u.hostname==='rffm.es'||u.hostname.endsWith('.rffm.es'))&&!u.username&&!u.password}catch{return false}
}
