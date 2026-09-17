# Kiara como chat flotante y colapsable

## Objetivo
Convertir la interfaz de Kiara en una ventana flotante compacta en la esquina inferior derecha, sin bloquear la navegación ni modificar mensajes, IA, llamadas API, herramientas o contexto.

## Cambios
- Sustituir el `Sheet` lateral actual —que añade una capa oscura y ocupa toda la altura— por un contenedor flotante controlado por el estado `open` existente.
- Mantener el botón circular con la foto de Kiara únicamente cuando el chat esté cerrado; conservar el aviso corto encima del botón.
- Mostrar al abrir una ventana de `350 × 500 px`, limitada al 80% de la altura disponible, con fondo, borde, sombra, esquinas redondeadas y contenido recortado.
- Añadir al encabezado un botón de minimizar/cerrar accesible con icono, nombre de Kiara, avatar y estado “escribiendo / Asistente virtual”.
- Conservar dentro de la ventana, sin cambios funcionales, el aviso de transmisión, historial, tarjetas de resultados, indicador de escritura, campo de mensaje y acceso a WhatsApp.
- En pantallas pequeñas, convertir la ventana en una bandeja inferior de ancho completo y 85% de alto, con esquinas superiores redondeadas y sin desbordar la pantalla.
- Usar el componente `Button` existente para los controles y preservar el desplazamiento automático del historial.

## Verificación
- Comprobar cerrado, apertura, envío de mensaje y cierre sin perder la conversación.
- Confirmar que no aparece fondo bloqueante y que el resto de la página sigue visible.
- Revisar el resultado en móvil y escritorio, incluyendo alturas reducidas.
- Confirmar que la compilación queda sin errores y que no cambió ninguna llamada de Kiara.

## Alcance técnico
Solo se modificará la presentación de `KiaraWidget`; no se tocarán `useKiaraChat`, `/api/kiara`, el enrutamiento de proveedores, las herramientas ni el contexto dinámico.
