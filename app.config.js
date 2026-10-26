// These two released APKs contain the same native modules. Only OTA publishing
// may target an earlier native runtime; normal builds keep appVersion policy.
module.exports=({config})=>{
 const runtime=process.env.VILLALBILLA_UPDATE_RUNTIME;
 if(!runtime)return config;
 if(!['0.1.11','0.1.12'].includes(runtime))throw Error('Runtime de actualización no verificado.');
 if(process.env.EAS_BUILD==='true')throw Error('No uses el runtime de OTA para una compilación nativa.');
 return {...config,runtimeVersion:runtime};
};
