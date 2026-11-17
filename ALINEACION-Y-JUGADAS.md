# Alineación y jugadas

Alineación muestra el campo en perspectiva con figuras y rótulos rojos de dorsal y nombre/alias. Mantiene selección por puesto, arrastre, sistemas, planes guardados y presentación en pantalla completa. lineup-projection.cjs transforma las posiciones de vista y deshace la proyección al soltar; no cambia el formato de las posiciones guardadas.

Jugadas usa medio campo desde la línea central hasta la portería, tanto en la vista normal como en pantalla completa. Conserva el once de la alineación y guarda sus movimientos en playPositions, separado de positions. Restablecer posiciones no borra la alineación.

Validación: navegador con once simulado, cambio de modos conservando titulares, comprobación visual y proyección/inversa. Pendiente comprobación de gestos físicos Android.
