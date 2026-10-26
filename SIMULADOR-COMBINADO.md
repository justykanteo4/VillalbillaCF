# Simulador combinado

Alineación usa una escena WebGL con Three.js: césped con textura generada localmente, líneas, porterías y redes, entorno abierto de entrenamiento con barandillas, banquillos y árboles, iluminación y sombras. Los jugadores son modelos geométricos con cuerpo, cara, pelo, equipación y botas, con dorsal/nombre en rótulos. No son escaneos fotográficos ni modelos de un videojuego comercial. La cámara permite órbita, zoom y desplazamiento, vista cercana y reinicio. Mover jugadores separa el arrastre del control de cámara, con intersección del rayo con el plano de césped y conservación del punto agarrado.

Jugadas usa una pizarra SVG de medio campo y permite previsualizar esa misma jugada en 3D. Balón, conos, círculos y flechas se añaden tocando el campo. Se pueden mover, colorear y borrar; las flechas muestran extremos arrastrables al seleccionarlas, y el radio de círculos se edita. Coordenadas X/Y y pasos de 0,25% permiten correcciones pequeñas. El arrastre usa la matriz inversa del SVG y conserva la diferencia entre el punto pulsado y el centro: no salta el jugador al tocar el borde. Deshacer/rehacer conserva hasta 40 operaciones de la sesión de edición.

Las posiciones de jugada siguen en playPositions y los objetos en playItems dentro del plan de alineación. No cambia starters ni positions al editar una jugada. El vestuario existente guarda y sincroniza el plan por cuenta/equipo; objetos con id permiten fusión de cambios. El puente WebView valida coordenadas finitas, jugadores autorizados por el once, tipos, colores, radios, IDs únicos y máximo de 120 objetos. No se descargan scripts ni modelos desde CDN.

SimulatorBoard usa iframe en web y el WebView nativo ya incluido en Android/iOS. Si WebGL no está disponible se ofrece la pizarra. Los controles antiguos que inclinaban una imagen plana se han retirado. La exportación de imagen conserva su representación anterior. La presentación dorada genera ahora su propio fondo WebGL 3D con cámara fija y coloca los jugadores en él; no graba los movimientos de la cámara interactiva.

Fuente del motor: simulator/board.js y stadium.js. Ejecutar npm run build:simulator tras cambiarlas y versionar simulator-bundle.cjs, que permite abrir sin red. Three.js 0.160.1, licencia MIT en simulator/THREE-LICENSE.txt. Es JavaScript dentro del WebView existente, no incorpora un módulo nativo nuevo.

Validación: 99 pruebas, validación del puente, fusión de objetos y posiciones entre entrenadores sin alterar el once. Playwright con WebGL y datos simulados comprueba cámara giratoria, vista cercana, once, cuatro herramientas, color, extremos de flecha, ajuste de 0,25%, deshacer/rehacer, cambio 2D/3D y persistencia del plan entre modos. Pendiente probar rendimiento y gestos de dos dedos en teléfonos reales.

## Sistemas y nombres

Sistema permite añadir manualmente distribuciones como 3-5-2 o 4-1-4-1 (F11) y 2-2-2 (F7). Se validan los jugadores de campo y se añade el portero. Las variantes se guardan en customSystems dentro del plan y se ofrecen en las demás alineaciones del mismo equipo. Se conservan los planes existentes con sus identificadores; su selector y botones usan Alineación, sin campo editable de rival/partido.

Alineación también tiene campo completo 2D. Jugadas conserva medio campo. La vista elegida se mantiene al abrir/cerrar pantalla completa durante la sesión. Rótulos: alias manual/de plantilla primero; en su defecto, nombre de pila (respeta los nombres compuestos después de la coma de una ficha oficial), junto con el dorsal. No se muestran los apellidos en los rótulos del simulador.

En Alineación los jugadores ocupan únicamente los puestos del sistema compatibles con su posición asignada en Plantilla. El campo 2D/3D no permite arrastrarlos libremente. Pulsar un titular abre los suplentes compatibles para sustituirlo conservando el puesto. Los jugadores nuevos sin posición deben configurarse primero en Plantilla; los titulares antiguos sin posición conservan su rol previo. Al cambiar de sistema se retiran al banquillo los jugadores sin un puesto compatible. Jugadas conserva la colocación libre y las herramientas precisas.
