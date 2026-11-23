const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

test('la apariencia puede actualizarse después de que React Native congele los estilos',()=>{
 const source=fs.readFileSync('FantasyUI.js','utf8');
 const start=source.indexOf('export let text='),end=source.indexOf('export const money=');
 assert(start>=0&&end>start);
 const declarations=source.slice(start,end).replace('export let ','let ').replace('export function ','function ');
 const theme={...require('./fantasy-theme.cjs')};
 const result=vm.runInNewContext(declarations+';({get text(){return text},get panel(){return panel},get title(){return title},get input(){return input},applyFantasyPalette})',{theme});
 const old=result.text;
 for(const name of ['text','panel','title','input'])Object.freeze(result[name]);
 assert.doesNotThrow(()=>result.applyFantasyPalette({text:'#123456',border:'#abcdef'}));
 assert.notEqual(result.text,old);
 assert.equal(result.text.color,'#123456');
 assert.notEqual(old.color,result.text.color);
 for(const name of ['text','panel','title','input'])Object.freeze(result[name]);
 assert.doesNotThrow(()=>result.applyFantasyPalette({text:'#ffffff'}));
 assert.equal(result.text.color,'#ffffff');
});
