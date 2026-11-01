# Chat retirado

El chat se ha eliminado de las áreas de jugador y entrenador, del tutorial y de los procesos de inicio de sesión. Todas las rutas `/api/chats/*` devuelven 410. Firestore deniega cualquier lectura o escritura de `teamChats`. Los Durable Objects antiguos conservan únicamente un cierre de conexiones y respuesta 410; no procesan mensajes.

No se borraron las tablas anteriores ni sus mensajes, ni se ejecutó una migración destructiva de Durable Objects. Sus recursos permanecen inactivos para conservar el historial. Las tablas de participación de partidos y votaciones usan la base gratuita existente con tablas independientes. No se crea un servicio de pago.

Ver `PARTICIPACION.md` para comentarios, me gusta y votaciones.
