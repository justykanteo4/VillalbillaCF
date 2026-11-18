const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
test('Reportar un problema pide una descripción y deja al usuario controlar el envío',()=>{
 const source=fs.readFileSync('ReportProblem.js','utf8');
 const settings=fs.readFileSync('SettingsHub.js','utf8');
 assert.match(source,/details\.trim\(\)\.length<10/);
 assert.match(source,/Share\.share/);
 assert.match(source,/navigator\.clipboard/);
 assert.match(source,/no se envía hasta que tú lo compartas/i);
 assert.match(settings,/\['report-problem','Reportar un problema'\]/);
 assert.match(settings,/page==='report-problem'\?<ReportProblem\/>/);
});
