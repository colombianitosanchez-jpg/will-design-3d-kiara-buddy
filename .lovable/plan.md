# Plan: Kiara no intrusiva dentro del panel

## Objetivo
Permitir que Kiara también esté disponible en `/panel`, sin tapar botones, tablas ni acciones críticas del administrador, especialmente en móvil.

## Cambios propuestos

1. **Volver a mostrar Kiara en el panel**
   - Quitar el bloqueo actual que hace que `KiaraWidget` no se renderice cuando la ruta empieza por `/panel`.
   - Mantener la ocultación solo si existiera otra condición explícita futura, pero no por estar en el panel.

2. **Detectar contexto de panel**
   - Usar la ruta actual para calcular `isPanel = pathname.startsWith("/panel")`.
   - Aplicar clases distintas al contenedor, al botón flotante y a la ventana abierta cuando `isPanel` sea verdadero.

3. **Comportamiento visual en páginas públicas**
   - Conservar el comportamiento actual: botón flotante abajo a la derecha.
   - En móvil público, mantener la experiencia tipo bandeja inferior amplia.

4. **Comportamiento visual dentro del panel**
   - Mover el botón flotante a la esquina inferior izquierda para evitar chocar con acciones frecuentes del panel.
   - Usar un tamaño un poco más compacto en el botón dentro del panel.
   - Al abrirse dentro del panel, usar una ventana compacta y no invasiva:
     - escritorio: panel flotante abajo a la izquierda, aproximadamente 350px de ancho y 500px de alto como máximo.
     - móvil: ventana compacta con ancho casi completo pero altura reducida, sin cubrir toda la pantalla.
   - Mantener el botón de minimizar visible en el encabezado.

5. **Ajuste preventivo del panel**
   - Añadir espacio inferior al layout de `/panel` para que, al hacer scroll, los últimos botones o formularios no queden detrás de Kiara.
   - Hacerlo con clases responsivas, sin alterar rutas, permisos ni contenido del panel.

## Archivos a tocar

- `src/components/KiaraWidget.tsx`
  - Quitar el `return null` en `/panel`.
  - Añadir `isPanel`.
  - Aplicar clases condicionales para posición, tamaño y comportamiento móvil.

- `src/routes/panel.tsx`
  - Añadir espacio inferior seguro al contenedor principal del panel.

## Validación

- Abrir una ruta pública y confirmar que Kiara se comporta como antes.
- Abrir `/panel` y confirmar que Kiara aparece abajo a la izquierda.
- Probar en móvil que el chat abierto no tapa toda la pantalla y se puede minimizar fácilmente.
- Confirmar que el panel mantiene su navegación y permisos actuales.
- Revisar el resultado de compilación después del cambio.
