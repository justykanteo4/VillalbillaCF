// Run the data collector with Node's proxy setting on Windows, macOS and Linux.
// NODE_USE_ENV_PROXY must be present when the child Node process starts.
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const result=spawnSync(process.execPath,[path.join(__dirname,'prepare-release-data.cjs')],{
 env:{...process.env,NODE_USE_ENV_PROXY:'1'},
 stdio:'inherit'
});
if(result.error)throw result.error;
process.exitCode=result.status===null?1:result.status;
