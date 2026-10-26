# Acceso Google y Apple

Las sesiones Firebase firmadas cuyo proveedor de inicio sea google.com cuentan como verificadas, además de las que tengan email_verified=true. La app comprueba los claims de un token renovado, y el Worker aplica el mismo criterio después de verificar firma, audiencia y emisor. Una cuenta solo vinculada a Google que inicia con contraseña no obtiene esta excepción. Los permisos de administrador y la aprobación del club no cambian. Firestore ya aceptaba el proveedor de sesión Google.

En iOS se añade el botón oficial Sign in with Apple, disponible únicamente en dispositivos compatibles. Solicita nombre/correo, utiliza nonce SHA-256 y canjea la identidad con Firebase OAuthProvider apple.com. No guarda tokens ni contraseñas. La cancelación no muestra un error. Conserva el flujo existente de solicitud/aprobación de acceso al club.

Antes de distribuir iOS hay que activar Sign in with Apple para com.villalbilla.cf en Apple Developer y habilitar el proveedor Apple en Firebase Authentication, con la configuración de Apple requerida por la consola. No se han creado ni inventado claves Apple. usesAppleSignIn y el plugin expo-apple-authentication preparan los entitlements de la próxima compilación iOS. Requiere nueva compilación iOS y prueba en iPhone; no puede incorporarse como módulo nativo a un binario ya instalado mediante OTA.

Android y web no muestran el botón Apple ni importan su módulo nativo. Las actualizaciones Android solo llevan la corrección del criterio Google y usan los módulos que ya estaban instalados.
