const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const preference=require('./calendar-preference.cjs');

test('Calendar preference accepts the documented filters and rejects stale values',()=>{
 assert.deepEqual(preference.filters,['Próximos','Jugados','Todos']);
 for(const filter of preference.filters)assert.equal(preference.allowed(filter),filter);
 assert.equal(preference.allowed('bad'),'Próximos');
 assert.equal(preference.allowed(null),'Próximos');
});
test('Calendar preferences are saved and reflected in the actual calendar',()=>{
 const settings=fs.readFileSync('SettingsHub.js','utf8');
 const calendar=fs.readFileSync('Calendar.js','utf8');
 const page=fs.readFileSync('CalendarPreference.js','utf8');
 assert.match(settings,/calendar-preference'\?<CalendarPreference\/>/);
 assert.match(page,/AsyncStorage\.setItem\(calendarPreference\.KEY,value\)/);
 assert.match(calendar,/AsyncStorage\.getItem\(calendarPreference\.KEY\)/);
 assert.match(calendar,/AsyncStorage\.setItem\(calendarPreference\.KEY,t\)/);
 assert.match(calendar,/AppState\.addEventListener/);
});
