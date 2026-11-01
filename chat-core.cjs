function chatTeams(account){if(!['approved','admin'].includes(account?.status)||!['trainer','player'].includes(account?.claim?.role))return [];return [...new Set([account.claim.teamId,...(account.claim.teamIds||[])].filter(Boolean).map(String))]}
function directChatId(a,b){if(!a||!b||a===b)throw Error('Selecciona otra persona.');return [String(a),String(b)].sort().map(v=>encodeURIComponent(v).replace(/~/g,'%7E')).join('~')}
function messageText(value){const text=String(value||'').trim();if(!text||text.length>2000)throw Error('Escribe entre 1 y 2000 caracteres.');return text}
function mergeChatMessages(old,incoming){const byId=new Map(old.map(m=>[m.id,m]));for(const m of incoming)byId.set(m.id,m);return [...byId.values()].sort((a,b)=>(a.createdAt||0)-(b.createdAt||0)||a.id.localeCompare(b.id)).slice(-500)}
module.exports={chatTeams,directChatId,messageText,mergeChatMessages};
