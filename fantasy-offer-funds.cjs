function offerFundsWarning(required,available){if(!Number.isFinite(required)||!Number.isFinite(available)||Math.round(required*100)<=Math.round(available*100))return '';const money=n=>n.toLocaleString('es-ES',{maximumFractionDigits:2})+' M';return 'No puedes enviar una oferta de '+money(required)+'. Tienes '+money(available)+' disponibles. El dinero reservado en pujas no se puede usar para esta oferta.'}
const isFundsError=error=>/saldo|presupuesto|fondos/i.test(error?.message||'');
module.exports={offerFundsWarning,isFundsError};
