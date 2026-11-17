const normalizeTeamName=value=>typeof value==='string'?value.trim().replace(/\s+/g,' '):'';
function validTeamName(value){return value.length>=2&&value.length<=32&&!/[\x00-\x1f\x7f<>]/.test(value)}
function validTeamPhoto(photo){return photo===null||typeof photo==='string'&&photo.length<=65000&&/^data:image\/(?:jpeg|png|webp);base64,[a-zA-Z0-9+/]+={0,2}$/.test(photo)}
module.exports={normalizeTeamName,validTeamName,validTeamPhoto};
