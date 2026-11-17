// Cambio acordado el 15/11/2026: desde la jornada de la semana del 9/11.
const IDEAL_CASH_FROM_WEEK=2967;
function awardBonus(kind,points,week){if(kind==='mvp')return points.mvp||0;if(kind==='idealXI'&&Number.isSafeInteger(week)&&week<IDEAL_CASH_FROM_WEEK)return 1;return 0}
module.exports={IDEAL_CASH_FROM_WEEK,awardBonus};
