const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const babel=require('@babel/core');

test('la apariencia puede actualizarse después de que React Native congele los estilos',()=>{
 const {code}=babel.transformSync(fs.readFileSync('FantasyUI.js','utf8'),{
  configFile:false,babelrc:false,plugins:['@babel/plugin-transform-modules-commonjs',['@babel/plugin-transform-react-jsx',{runtime:'classic'}]],
 });
 const result={};
 vm.runInNewContext(code,{exports:result,require:id=>{
  if(id==='./fantasy-theme.cjs')return {...require('./fantasy-theme.cjs')};
  return {};
 }});
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
