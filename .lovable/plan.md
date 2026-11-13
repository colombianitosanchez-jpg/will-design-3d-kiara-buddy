# Productos y variantes sin pérdidas

1. Restaurar descripción corta y larga, especificaciones, texto de WhatsApp, consejo de Kiara y controles comerciales propios; conservar herencia cuando no se personalicen.
2. Permitir destacar variantes activas en Inicio y abrirlas preseleccionadas con su foto, precio, stock y botones.
3. Conectar los seis puntos al arrastre y separar las franjas de orden de los destinos de conversión.
4. Convertir padre y variantes en hermanos del nuevo padre, congelando la configuración heredada del origen y conservando identidades.
5. Guardar cada movimiento completo de forma indivisible y ofrecer Deshacer / Ctrl+Z, sin interferir con la edición de texto ni sobrescribir cambios posteriores.
6. Comprobar pruebas y flujo real con la cuenta del panel, restaurando cualquier cambio de comprobación.

## Detalles técnicos
- Reutilizar @dnd-kit y los editores existentes.
- Operaciones transaccionales con validación de permisos y concurrencia en Lovable Cloud.
- Conservar la ficha original de productos absorbidos fuera del catálogo para mantener relaciones con pedidos y permitir restauración completa.
- Historial acotado de movimientos por usuario; no es un deshacer universal de formularios o eliminaciones.