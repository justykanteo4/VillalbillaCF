const fs=require('node:fs'),path=require('node:path');
const {androidConfiguration}=require('../android-config.cjs');
const root=path.resolve(__dirname,'..'),app=require('../app.json').expo;
try{
 const file=path.resolve(root,app.android.googleServicesFile||'google-services.json');
 if(!fs.existsSync(file))throw Error('Falta google-services.json del proyecto Firebase. No se debe distribuir un APK sin configurar las notificaciones Android.');
 const result=androidConfiguration(JSON.parse(fs.readFileSync(file,'utf8')),{packageName:app.android.package,projectId:process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID||'villalbillacf'});
 if(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID!==result.webClientId)throw Error('Configura EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID con el cliente web incluido en google-services.json antes de compilar.');
 console.log('Configuración Android: Firebase, paquete y clientes Google presentes.');
}catch(error){console.error(error.message);process.exitCode=1}
