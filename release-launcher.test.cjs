const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('prepare:release-data uses a cross-platform Node launcher with proxy set before Node starts',()=>{
 const pkg=require('./package.json');
 assert.match(pkg.scripts['prepare:release-data'],/^node scripts\/run-prepare-release-data\.cjs &&/);
 const source=fs.readFileSync(path.join(__dirname,'scripts/run-prepare-release-data.cjs'),'utf8');
 assert.match(source,/spawnSync\(process\.execPath/);
 assert.match(source,/NODE_USE_ENV_PROXY:'1'/);
 assert.match(source,/result\.status===null\?1:result\.status/);
});
