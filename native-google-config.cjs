function nativeGoogleOptions(platform, webClientId, iosClientId) {
  if (!webClientId) throw Error('Falta el cliente web de Google en la configuración del club.');
  if (platform === 'ios' && !iosClientId) {
    throw Error('Falta el cliente de Google para iPhone. Configura EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID y genera una nueva compilación.');
  }
  return {
    webClientId,
    ...(platform === 'ios' ? { iosClientId } : {}),
    scopes: ['openid', 'profile', 'email'],
  };
}

function iosUrlScheme(clientId) {
  const suffix = '.apps.googleusercontent.com';
  if (typeof clientId !== 'string' || !clientId.endsWith(suffix)) {
    throw Error('El identificador de Google para iPhone no es válido.');
  }
  return 'com.googleusercontent.apps.' + clientId.slice(0, -suffix.length);
}

module.exports = { nativeGoogleOptions, iosUrlScheme };
