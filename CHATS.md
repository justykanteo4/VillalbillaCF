# Chats de equipo y privados

La sección Chats está en las áreas de entrenador y jugador. Solo usa equipos asignados a un perfil aprobado. Los contactos se registran con nombre y rol al abrir la app actualizada; no se publica el perfil ni su correo. Cada equipo tiene un grupo y conversaciones privadas entre dos personas. No hay chat de hinchas ni conversaciones entre equipos distintos.

Firestore comprueba los perfiles vigentes para cada lectura y escritura. Las conversaciones privadas requieren que ambos participantes mantengan acceso al equipo. Los mensajes son inmutables y el remitente se valida con el perfil, con un máximo de 2000 caracteres. Retirar el acceso bloquea las nuevas consultas y envíos; las copias que ya se leyeron sin conexión no se pueden retirar remotamente. Los nombres de contactos antiguos pueden permanecer en el directorio, pero ya no permiten abrir o enviar mensajes.

Se escuchan los últimos 100 mensajes y se conservan hasta 500 mensajes consultados por conversación y usuario en el dispositivo. La cola de salida se guarda antes de mostrar el envío. Las transacciones con identificador estable permiten reintentar sin duplicados; los mensajes pendientes vuelven a intentarse al abrir el chat, recuperar primer plano o cada 15 segundos mientras esté abierto. Sin conexión no se marca un envío como confirmado. Al denegar acceso se elimina la copia local de esa conversación. No se incluyen mensajes privados en la copia pública de la app.

Esta entrega incluye texto dentro de la app. No incorpora adjuntos, notificaciones push de chat ni confirmaciones de lectura.

## Verificación

`npm test` incluye validación de roles, identificadores, textos y combinación de mensajes. `npm run test:chat:rules` requiere Firestore Emulator en 127.0.0.1:8185 con proyecto demo-villalbilla y las reglas actuales. El script solo usa ese emulador y borra sus datos de prueba. Verifica lectura y envío en grupo, privados, terceros, suplantación, límite y revocación. No usar datos reales en ese emulador.

Antes de publicar la app hay que desplegar `firestore.rules` en el proyecto Firebase. No se añaden módulos nativos.
