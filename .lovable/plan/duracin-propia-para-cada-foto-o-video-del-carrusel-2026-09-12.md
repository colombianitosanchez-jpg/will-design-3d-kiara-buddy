# Duración propia para cada foto o video del carrusel

Hoy todas las piezas del carrusel del inicio cambian cada 4,5 segundos. Con este cambio cada elemento puede tener su propio tiempo en pantalla.

## Qué verá el equipo

- En "Carrusel del inicio", cada elemento de la lista tendrá un campo "Duración (segundos)".
- Se guarda al salir del campo o al presionar Enter, con aviso de confirmación.
- Valor por defecto: 5 segundos. Mínimo 1, máximo 60.
- Los elementos nuevos se crean con 5 segundos.

## Qué verá el visitante

- El carrusel avanza según el tiempo definido para cada elemento.
- Se pausa al pasar el mouse por encima o al arrastrar, y continúa después.
- Mismo diseño exacto: esquinas redondeadas, sombra, borde y proporción 4:3 sin cambios.

## Detalles técnicos

Base de datos
- Migración: `ALTER TABLE public.hero_carousel ADD COLUMN duration_ms integer NOT NULL DEFAULT 5000` con `CHECK (duration_ms BETWEEN 500 AND 120000)`. No cambian grants ni RLS.

`src/lib/hero-carousel.ts`
- Añadir `duration_ms: number` a `HeroSlide` y al `select` de `fetchActiveSlides`.
- Exportar `DEFAULT_SLIDE_MS = 5000`.

`src/routes/panel.carrusel.tsx`
- Añadir `duration_ms` al `select` y al `insert` (5000 por defecto).
- Nueva columna con `<Input type="number">` por fila: estado local en segundos, `onBlur`/Enter dispara `update({ duration_ms: Math.round(seg*1000) })`, luego `refreshPublic()`.

`src/components/HeroMedia.tsx`
- Quitar `embla-carousel-autoplay`; usar la API de Embla: `setApi` en `<Carousel>`, y un efecto que escuche `select`/`reInit`/`pointerDown`/`settle` para reprogramar un `setTimeout` con el `duration_ms` de la diapositiva activa y llamar `scrollNext()`.
- Pausa: `onMouseEnter`/`onMouseLeave` en el contenedor y `pointerDown` de Embla; se reanuda al salir o al terminar el arrastre.
- Limpieza del timeout al desmontar. El `fallbackImage` y las clases actuales se mantienen intactos.

No se toca el resto del panel, el cotizador, la tienda ni el menú.
