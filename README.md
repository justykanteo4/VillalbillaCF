# Villalbilla C.F.

## Trabajar desde otro ordenador

Clona el repositorio de GitHub y ejecuta `npm install` en la carpeta del proyecto. Para usar las funciones que dependen del servidor, crea `.env` a partir de `.env.example` y configura allí las credenciales privadas; `.env` y `server/data/` no se suben a GitHub. Transfiere esos datos privados desde el ordenador original mediante un medio seguro si necesitas conservar las cuentas locales. Las fotos de jugadores y el código de la app sí están incluidos.

App Expo para Android, iOS y web. Tema oscuro con rojo y azul y escudo transparente.

## Acceso público

Noticias es la pantalla inicial: no requiere cuenta. Resultados por semana de los 17 equipos en competición identificados en la ficha oficial https://www.rffm.es/fichaclub/4144. Los marcadores se extraen de los calendarios de la RFFM, se comprueban por identificador de equipo y grupo y se actualizan cada cinco minutos en el servidor. La app consulta al abrir Noticias, al volver al primer plano y cada cinco minutos mientras está en esa sección. Ante errores conserva el último dato y señala el equipo afectado. La copia inicial incluida tiene fecha de consulta; no supone actualización si el servidor está apagado. Algunas categorías de fútbol 7 tienen calendarios por fases: revisar el registro teams.json al cambiar de fase o temporada.

Noticias incluye Instagram de @villalbillacf. El servidor admite Instagram Login con instagram_business_basic o Facebook Login con pages_show_list, pages_read_engagement e instagram_basic. En ambos casos la cuenta debe ser profesional y el administrador debe autorizar el acceso; Facebook Login además requiere que Instagram esté enlazada a una página de Facebook que administre esa persona. La API comprueba el usuario villalbillacf antes de entregar fotos, álbumes, miniaturas de vídeo y textos. No muestra historias privadas. Los tokens se guardan solo en el servidor, nunca en el paquete de la app. Configurar INSTAGRAM_ACCESS_TOKEN o INSTAGRAM_FACEBOOK_ACCESS_TOKEN como secreto del servidor y renovarlo/reautorizarlo cuando caduque o se revoque. La conexión no está probada con una cuenta real.

Calendario muestra las 34 jornadas del primer equipo dentro de la app y ofrece actualización manual, filtros y copia local.

## Entrenadores

Acceso separado con clave de club validada en el servidor, sesiones aleatorias de ocho horas en memoria, cierre de sesión y límite de intentos. Está cerrado hasta definir TRAINER_PASSWORD. No es todavía un sistema de cuentas individuales o permisos por equipo. La asistencia, el material, las citas y los totales de goles/tarjetas siguen guardándose en el dispositivo; no hay sincronización entre entrenadores. Las sesiones no sobreviven al reinicio del servidor o de la app.

## Ejecutar la vista completa

Con Node 24 y npm, desde esta carpeta:

```
npm install
npx expo export --platform all
npm run serve
```

Abrir http://127.0.0.1:8081. El servicio incluye la web y los endpoints de noticias, calendario, Instagram y acceso de entrenadores. Copiar .env.example a .env y completar los valores necesarios de forma local. .env está excluido de Git. No pegar claves o tokens en chats ni en código.

Para desarrollar el móvil: `npm start`. Definir EXPO_PUBLIC_API_URL con la dirección HTTPS del servidor accesible desde el teléfono antes de compilar. Un teléfono no puede usar el 127.0.0.1 del ordenador. Expo Go debe ser compatible con SDK 55; alternativamente utilizar una compilación de desarrollo.

## Actualizaciones automáticas en móviles

EAS Update está configurado en el canal `preview` para Android e iOS. Instala una vez la nueva compilación que incluye `expo-updates`; las compilaciones anteriores no pueden recibir estas actualizaciones. Después, los cambios de JavaScript, pantallas, textos y estilos se publican con `eas update --channel preview --platform all`. El móvil los comprueba al abrir la app, los descarga en segundo plano y los activa al volver a abrirla. Los cambios nativos (icono, permisos o dependencias nativas) requieren una compilación nueva y un aumento de versión para separar su ejecución de las compilaciones anteriores.

Antes de distribuir: alojar el servidor en HTTPS, gestionar cuentas individuales y datos compartidos del equipo, verificar Instagram con su administrador, probar Android/iOS en teléfonos y revisar dependencias. No hay instaladores ni publicación en tiendas.

## Comprobaciones

`node logic.test.mjs` valida fechas y enlaces. `npx expo export --platform all` comprueba la compilación de las plataformas de Expo.

## Acceso con Google (actualización)

Se ha sustituido la clave compartida por verificación de identidad de Google en el servidor mediante google-auth-library. Administrador inicial: albaresfernandez@gmail.com, únicamente después de verificar su correo en un token firmado por Google. El correo nunca permite acceder por sí solo. Los demás usuarios solicitan un equipo/identidad y necesitan aprobación. El administrador puede aprobar, rechazar o retirar el acceso. La identidad elegida es una declaración que el administrador debe comprobar. Las cuentas se guardan en server/data/accounts.json: mantenerlo en almacenamiento persistente y con copias de seguridad. El servicio actual es para una sola instancia; usar una base de datos antes de desplegar varias réplicas.

Para activar la vista web: crear un cliente OAuth de tipo Aplicación web en Google Cloud, configurar la pantalla de consentimiento y añadir http://127.0.0.1:8081 como origen de JavaScript autorizado para desarrollo, además del dominio HTTPS definitivo al publicar. Guardar el identificador en GOOGLE_WEB_CLIENT_ID dentro de .env, reiniciar el servidor y recargar. El cliente usa Google Identity Services con nonce de un uso y el servidor verifica firma, audiencia, caducidad y correo verificado. No necesita la contraseña del usuario ni client secret para este flujo de ID token. Si la app de Google está en pruebas, añadir los usuarios de prueba correspondientes.

El botón nativo de Google para Android/iOS aún requiere implementar el flujo de sus clientes OAuth y configuración de firma/identificadores; la compilación móvil muestra una indicación y no simula un acceso. No se ha probado un inicio de sesión real con Google porque faltan los identificadores del proyecto. Las pruebas automáticas utilizan identidades simuladas y comprueban permisos, aprobaciones, retirada, nonce y rechazo de correo no verificado.

## Plantilla del club

La pestaña Plantilla reúne las fichas públicas de todas las categorías y permite buscar por nombre o filtrar por equipo. Incluye dorsal de la ficha, goles, amarillas y partidos jugados de la temporada 2026/27. Un guion indica dato no disponible y nunca se convierte en cero. Se respetan las marcas de visibilidad de las estadísticas de la RFFM. Si una ficha corresponde a otro equipo o temporada, no se atribuyen sus cifras al equipo solicitado. Los totales con participación en varias competiciones se identifican como totales de la ficha de temporada. No se guardan fotos, fechas de nacimiento ni contacto de los jugadores.

El servidor consulta las fichas bajo demanda y conserva una copia por equipo durante 30 minutos; el cliente ofrece actualización y refresco periódico. La copia inicial de players-seed.json permite mostrar los nombres mientras se consulta la fuente. Los dorsales pueden cambiar entre partidos: son los de la ficha, no una garantía del dorsal utilizado en cada acta. La fuente federativa puede omitir jugadores o estadísticas y modificar su estructura.

## Sesión recordada y métodos adicionales

La sesión dura 30 días. Web: cookie HttpOnly y SameSite=Lax; usar HTTPS y NODE_ENV=production o SESSION_COOKIE_SECURE=true al publicar. El servidor guarda solo el hash del identificador en server/data/sessions.json, fuera de dist y de Git, para sobrevivir a reinicios. Móvil: token de sesión en Expo SecureStore, no en AsyncStorage. Cerrar sesión revoca la sesión y borra su almacenamiento. Las sesiones anteriores al cambio necesitarán iniciar sesión una vez más. Hacer copias persistentes de accounts.json y sessions.json. El despliegue actual es de una sola instancia.

Métodos visibles: Google, correo con código de un uso y correo y contraseña. Google web está configurado. Correo: completar SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD y SMTP_FROM en .env del servidor; no se enviaron correos reales en las pruebas. Los códigos vencen en 10 minutos, admiten 5 intentos y tienen límites de envío; crear o recuperar una contraseña exige verificar el correo. Las contraseñas usan scrypt con sal; al cambiarlas se revocan las sesiones anteriores. Los correos verificados de proveedores distintos se vinculan a la misma cuenta y conservan sus permisos; no se devuelve el hash de contraseña al cliente.

PUBLIC_APP_URL puede fijar el origen HTTPS autorizado del servidor; los cambios de autenticación rechazan orígenes de navegador ajenos. No pegar contraseñas, tokens SMTP o claves privadas en el chat.
