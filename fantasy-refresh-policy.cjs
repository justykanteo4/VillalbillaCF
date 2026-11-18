// Intervalos elegidos para las lecturas de Villalbilla Fantasy (issue #22).
// La caché solo evita consultas repetidas: operaciones, permisos y saldo efectivo
// siguen validándose en el servidor. No se ejecuta polling en segundo plano.
const MINUTE=60*1000;
const SECOND=1000;
function fantasyRefreshAge(path){
 const pathname=String(path||'').split('?')[0];
 if(pathname==='/preview'||pathname==='/leagues')return 15*SECOND;
 if(pathname==='/inbox')return 2*MINUTE;
 if(/^\/leagues\/[^/]+\/market$/.test(pathname)||/^\/leagues\/[^/]+\/search$/.test(pathname))return 2*MINUTE;
 if(/^\/leagues\/[^/]+\/alerts$/.test(pathname))return 2*MINUTE;
 if(/^\/leagues\/[^/]+\/rivals$/.test(pathname))return 15*MINUTE;
 if(/^\/leagues\/[^/]+\/table$/.test(pathname))return 10*MINUTE;
 if(/^\/leagues\/[^/]+\/(squad|lineup|transactions)$/.test(pathname))return 5*MINUTE;
 if(/^\/leagues\/[^/]+\/(coaches|players|market-history)$/.test(pathname))return 10*MINUTE;
 return 15*SECOND;
}
module.exports={fantasyRefreshAge};
