# Cotizadores y servicios: funcionamiento y revisión

## Panel
- **Servicios 3D:** presentación comercial (título, descripción, fotos, puntos destacados y botones). Cada servicio elige contacto directo por WhatsApp o un cotizador vinculado. La elección explícita prevalece sobre coincidencias de nombres. Ocultar un servicio no elimina sus datos.
- **Cotizador 3D:** configuración de preguntas, tarifas y flujo de cada calculadora. Permite deslizadores, números, tarjetas de opciones, Sí/No y texto. Se configuran rango, paso, unidad, valor inicial, ayuda y obligatoriedad.
- **Variables globales:** costos reutilizables del taller. Cada pregunta elige costo fijo o una variable. El margen del servicio se aplica como porcentaje; la variable histórica `default_margin` es un multiplicador disponible para fórmulas, no un margen automático adicional.
- **Simulador:** muestra cambios de preguntas sin exigir guardarlos primero. La configuración del servicio y cada pregunta tienen guardado independiente. Cambiar el valor inicial de una pregunta no modifica la respuesta que ya se está probando en el simulador.
- **Revisión:** siempre obligatoria o desde un total configurado. Estas cotizaciones no pasan directamente al pago.
- **Descuentos por cantidad:** rangos no superpuestos con descuento porcentual o precio unitario fijo.

## Cliente
1. Desde un servicio comercial abre la calculadora vinculada o WhatsApp directo.
2. Ajusta parámetros y cantidad; el precio se calcula en el servidor. Durante actualizaciones no se permite añadir un precio antiguo al carrito.
3. Ve precio final, cantidad y aviso de revisión. Los costos internos y márgenes no aparecen en el desglose público.
4. Puede añadir al carrito únicamente un importe positivo sin revisión obligatoria. El servidor vuelve a calcular al crear el pedido con la cantidad real.
5. Para solicitar cotización completa introduce nombre, correo y WhatsApp; puede adjuntar un archivo permitido y notas. Se registra la solicitud y se prepara el mensaje de WhatsApp. Abrir WhatsApp no acredita envío, pago ni compra completada.

## Cálculo
- Base + costos de preguntas numéricas + recargos de opciones.
- Multiplicadores de opciones, luego margen porcentual del servicio.
- Precio mínimo y gastos extra por unidad, manteniendo el comportamiento existente.
- Fórmula maestra opcional reemplaza la suma de preguntas cuando devuelve un resultado positivo.
- Precio fijo no suma costos de preguntas ni margen, pero conserva respuestas, mínimo, extras, descuentos y revisión.
- El precio unitario se redondea a cientos de COP antes de multiplicar por la cantidad, evitando diferencias entre total y cobro.
- Modos por peso y horas usan las preguntas y sus fuentes de costo: seleccionar un modo no crea tarifas ni preguntas por sí solo.

## Correcciones verificadas
- Opciones del panel sin columnas de almacenamiento: guardado de servicios y preguntas recuperado.
- Servicios iniciales: ocho registros creados desde el panel, sin duplicar ni borrar registros existentes.
- Impresión a pedido vinculada al cotizador FDM existente; el resto conserva contacto directo.
- Fórmulas sin ejecución dinámica de JavaScript, compatibles con el entorno publicado.
- Rangos, opciones y claves validados; cantidades y revisión respetadas en el cobro.
- Errores de carga y cálculo visibles, sin pantalla vacía ni arrastre de archivos entre servicios.
- Editor de servicios con diálogo accesible y Escape; opciones con navegación de teclado; controles táctiles y vista estrecha comprobados.

## Pendiente de información o conexión
- El cotizador FDM existente tiene tarifa por unidad, mínimo y margen en cero. No se inventaron precios comerciales: debe configurarlos el propietario. Las compras por cero quedan bloqueadas.
- Notificaciones a un Telegram o un número adicional no forman parte de esta reparación y no están conectadas. Requieren elegir canal y destino. Un clic anónimo no identifica por sí mismo al cliente ni confirma una compra.
- No se efectuaron pagos reales ni se enviaron solicitudes de prueba para evitar avisos al equipo o cargos.