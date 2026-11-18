// Reglas puras para préstamos temporales de futbolistas.
// Duración en jornadas semanales (no se convierte silenciosamente en días de calendario).
const ALLOWED_WEEKS=Object.freeze([1,2,3,4]);
const MIN_ROSTER=12,MAX_ROSTER=16;
function loanError(message){return Object.assign(new Error(message),{status:409});}
function validateLoanProposal({lenderUid,borrowerUid,lenderCount,borrowerCount,weeks,playerListed=false,playerLocked=false,leagueActive=true,startsAt,endsAt}){
 if(!leagueActive)throw loanError('La liga está pausada o archivada.');
 if(typeof lenderUid!=='string'||typeof borrowerUid!=='string'||!lenderUid||!borrowerUid||lenderUid===borrowerUid)throw loanError('El préstamo debe ser entre dos equipos distintos de la misma liga.');
 if(!ALLOWED_WEEKS.includes(weeks))throw loanError('Elige un préstamo de 1, 2, 3 o 4 semanas.');
 if(!Number.isSafeInteger(lenderCount)||!Number.isSafeInteger(borrowerCount))throw loanError('Actualiza ambas plantillas.');
 if(lenderCount<=MIN_ROSTER)throw loanError('El equipo que presta debe conservar al menos 12 jugadores.');
 if(borrowerCount>=MAX_ROSTER)throw loanError('El equipo receptor no puede superar los 16 jugadores.');
 if(playerListed||playerLocked)throw loanError('El jugador tiene una operación activa incompatible con el préstamo.');
 if(!Number.isSafeInteger(startsAt)||!Number.isSafeInteger(endsAt)||endsAt<=startsAt)throw loanError('El período de préstamo no es válido.');
 return {weeks,startsAt,endsAt};
}
function validateLoanReturn({currentHolderUid,lenderUid,borrowerUid,borrowerCount,lenderCount,ownershipId,expectedOwnershipId}){
 if(!lenderUid||!borrowerUid||currentHolderUid!==borrowerUid||!ownershipId||ownershipId!==expectedOwnershipId)throw loanError('La propiedad del jugador cambió; no se puede devolver sin revisar.');
 if(!Number.isSafeInteger(lenderCount)||lenderCount>=MAX_ROSTER)throw loanError('El club propietario debe tener reservada una plaza para la devolución.');
 if(!Number.isSafeInteger(borrowerCount)||borrowerCount<=MIN_ROSTER)throw loanError('El equipo receptor debe mantener al menos 12 jugadores tras devolverlo.');
 return {returnTo:lenderUid,ownershipId};
}
module.exports={ALLOWED_WEEKS,MIN_ROSTER,MAX_ROSTER,validateLoanProposal,validateLoanReturn};
