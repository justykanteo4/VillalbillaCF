const required=['EXPO_PUBLIC_FIREBASE_API_KEY','EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN','EXPO_PUBLIC_FIREBASE_PROJECT_ID','EXPO_PUBLIC_FIREBASE_APP_ID','EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID','EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID','EXPO_PUBLIC_API_URL'];
const missing=required.filter(key=>!process.env[key]);
if(missing.length){console.error('Faltan variables públicas para exportar Android: '+missing.join(', '));process.exitCode=1}
else{
 try{if(new URL(process.env.EXPO_PUBLIC_API_URL).protocol!=='https:')throw Error();console.log('Variables públicas Android: presentes y API HTTPS configurada.')}
 catch{console.error('EXPO_PUBLIC_API_URL debe ser una dirección HTTPS válida.');process.exitCode=1}
}
