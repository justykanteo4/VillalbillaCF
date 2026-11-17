const formations=['4-4-2','4-3-3','4-5-1','3-5-2','3-4-3','5-3-2','5-4-1'];
function formationSlots(formation='4-4-2'){const rows=(formations.includes(formation)?formation:'4-4-2').split('-').map(Number);return [[50,88],...rows.flatMap((n,row)=>Array.from({length:n},(_,i)=>[100*(i+1)/(n+1),67-row*25]))]}
module.exports={formations,formationSlots};
