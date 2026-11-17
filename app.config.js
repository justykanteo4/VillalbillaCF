// Target only known installed Android runtime versions for OTA updates.
// Native builds keep the default appVersion runtime policy.
module.exports=({config})=>{
 const runtime=process.env.VILLALBILLA_UPDATE_RUNTIME;
 if(!runtime)return config;
 if(!['0.1.11','0.1.12','0.1.13'].includes(runtime))throw Error('Runtime de actualización no verificado.');
 if(process.env.EAS_BUILD==='true')throw Error('No uses el runtime de OTA para una compilación nativa.');
 return {...config,runtimeVersion:runtime};
};
