const {madridDay,dayLabel}=require('./fantasy-market-policy.cjs');
const DAY=86400000;
function parseDate(value){
 if(value===null||value===undefined||value==='')return null;
 if(typeof value!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value))throw Error('La fecha debe tener formato AAAA-MM-DD.');
 const parsed=Date.parse(value+'T00:00:00Z');
 if(!Number.isFinite(parsed)||new Date(parsed).toISOString().slice(0,10)!==value)throw Error('Fecha no válida.');
 return parsed/DAY;
}
function validWindow(start,end){
 if(start!==null&&!Number.isSafeInteger(start)||end!==null&&!Number.isSafeInteger(end))throw Error('Fecha de mercado no válida.');
 if(start!==null&&end!==null&&(end<start||end-start>730))throw Error('El cierre debe ser posterior a la apertura y el periodo no puede superar dos años.');
}
function isOpen(window,now=Date.now()){
 const day=madridDay(now);
 return (!window?.startDay||day>=window.startDay)&&(window?.endDay==null||day<=window.endDay);
}
function label(day){return day==null?'':dayLabel(day)}
module.exports={parseDate,validWindow,isOpen,label};
