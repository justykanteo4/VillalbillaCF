# VillalbillaFantasy — primera publicación

El acceso está en la cabecera pública, entre el nombre del club e «Ir a noticias», tal como se indicó en la captura. Se adapta a pantallas estrechas sin añadir otro botón a la navegación inferior.

Jugadores, entrenadores, aficionados y usuarios sin sesión ven «Está en construcción» y «¡Ya queda poco!». No hacen peticiones al API privado del Fantasy. Los administradores abren una vista previa de las reglas acordadas, después de verificar su sesión en el servidor. No se publican ligas, mercado ni alineaciones jugables en esta primera fase: la pantalla lo indica expresamente.

Todas las rutas `/api/fantasy` y `/api/fantasy/*` comprueban `verifyAdmin`. Solo hay lecturas de la vista previa; las escrituras siguen deshabilitadas. No se almacenan respuestas privadas en la copia pública ni en la caché del dispositivo. El rol mostrado por el cliente no permite saltarse la autorización del servidor.

Las reglas de la vista previa están en `fantasy-config.cjs`: 15 participantes, 100 millones, once titular, dos fichajes por jornada, viernes 23:59 de Madrid, resultado 6/5/4, gol +1, portería a cero del portero que completa +1, MVP +1, once ideal +1, capitán un único +1, amarilla −1, doble amarilla −3 en total, roja directa −4 y propia puerta −1. MVP: tres jugadores por equipo ganador, elegidos por administradores; el once ideal sale de esos MVP.

El icono exclusivo está en `assets/villalbilla-fantasy-icon.png` y se conserva en su resolución original. `FantasyIcon` lo reutiliza en la cabecera, la noticia destacada y las pantallas de acceso. Noticias muestra `FantasyNewsAccess` debajo del resumen del club; su botón abre la misma sección que el icono superior y respeta el mismo control de acceso. No aparece en el listado de Resultados.
