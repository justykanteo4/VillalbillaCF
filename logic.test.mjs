import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const source=readFileSync(new URL('./logic.js',import.meta.url),'utf8');
const {validDate,validOfficialUrl}=await import('data:text/javascript,'+encodeURIComponent(source));
assert(validDate('2028-02-29'));
for(const v of ['2026-02-29','2026-13-01','2026-04-31','21-10-2026',''])assert(!validDate(v),v);
assert(validOfficialUrl('https://www.rffm.es/competicion/clasificaciones?grupo=26737710'));
for(const v of ['https://rffm.es.evil.com','http://rffm.es','javascript:alert(1)','https://user:pass@rffm.es'])assert(!validOfficialUrl(v),v);
console.log('Fechas y validación de enlaces: correcto.');
