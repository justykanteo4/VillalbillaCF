const {test}=require('node:test'),assert=require('node:assert/strict');
const {androidConfiguration}=require('./android-config.cjs');
const {googleLoginError,pushRegistrationError}=require('./native-errors.cjs');
const expected={packageName:'com.villalbilla.cf',projectId:'villalbillacf'};
const config=()=>({project_info:{project_id:'villalbillacf'},client:[{client_info:{android_client_info:{package_name:'com.villalbilla.cf'},mobilesdk_app_id:'1:758134560563:android:abc123'},oauth_client:[{client_type:1,android_info:{package_name:'com.villalbilla.cf'}},{client_type:3,client_id:'758134560563-public.apps.googleusercontent.com'}],api_key:[{current_key:'test-public-key'}]}]});
test('rechaza configuraciones nativas de otro proyecto o paquete',()=>{
 assert.throws(()=>androidConfiguration(config(),{...expected,projectId:'otro'}));
 assert.throws(()=>androidConfiguration(config(),{...expected,packageName:'otro'}));
});
test('exige registro Android y cliente web para no distribuir otro APK con Google sin configurar',()=>{
 const data=config();assert(androidConfiguration(data,expected).webClientId);
 data.client[0].oauth_client=data.client[0].oauth_client.filter(row=>row.client_type!==3);assert.throws(()=>androidConfiguration(data,expected));
 data.client[0].oauth_client=[];assert.throws(()=>androidConfiguration(data,expected));
});
test('los errores nativos no muestran instrucciones técnicas ni detalles de credenciales al usuario',()=>{
 const original='Default FirebaseApp is not initialized. Make sure FirebaseApp.initializeApp(Context) https://docs.expo.dev/push-notifications/fcm-credentials/';
 const push=pushRegistrationError({message:original});assert(!/FirebaseApp|https:|Context/.test(push));assert.match(push,/Actualiza/);
 const google=googleLoginError({code:'10',message:'DEVELOPER_ERROR missing web client ID'});assert(!/DEVELOPER|client ID/.test(google));assert.match(google,/correo y contraseña/);
 assert.match(googleLoginError({code:'auth/network-request-failed'}),/conexión/);
});
