const KEY='villalbilla.calendar.filter.v1';
const filters=['Próximos','Jugados','Todos'];
function allowed(value){return filters.includes(value)?value:'Próximos'}
module.exports={KEY,filters,allowed};
