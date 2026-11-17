function androidConfiguration(value,{packageName,projectId}={}){
 if(!value?.project_info||value.project_info.project_id!==projectId)throw Error('La configuración Android debe pertenecer al proyecto Firebase de la app.');
 const client=value.client?.find(row=>row.client_info?.android_client_info?.package_name===packageName);
 if(!client||!/^1:\d+:android:[a-f0-9]+$/i.test(client.client_info?.mobilesdk_app_id||''))throw Error('Falta la app Android registrada con el paquete correcto en Firebase.');
 const webClientId=client.oauth_client?.find(row=>row.client_type===3)?.client_id;
 if(!/^\d+-[\w-]+\.apps\.googleusercontent\.com$/.test(webClientId||''))throw Error('La configuración Android no incluye el cliente web de Google. Revisa el proveedor Google en Firebase.');
 if(!client.oauth_client?.some(row=>row.client_type===1&&row.android_info?.package_name===packageName))throw Error('Falta el cliente OAuth Android. Registra la huella SHA de la firma en Firebase y descarga la configuración actualizada.');
 if(!client.api_key?.some(row=>row.current_key))throw Error('La configuración Firebase Android está incompleta.');
 return {webClientId};
}
module.exports={androidConfiguration};
