# Enlaces clickeables en cada diapositiva del carrusel del inicio

Permitir que cada foto o video del carrusel del hero lleve a una URL configurada desde el panel, sin alterar el diseño, los tiempos ni la navegación actual.

## Qué verá el visitante

- Si una diapositiva tiene URL de destino, todo el área de la imagen o video será clickeable y abrirá esa ruta.
- Si no tiene URL, el carrusel sigue funcionando exactamente igual que ahora.
- La etiqueta flotante "Pieza destacada" permanece en su lugar, sin cambios.
- Los tiempos por diapositiva, la pausa al pasar el mouse y el diseño redondeado se mantienen intactos.

## Qué podrá hacer el equipo

En "Carrusel del inicio" del panel, cada elemento tendrá un campo opcional:

- **URL de destino / Enlace (Opcional)**: texto libre. Puede ser una ruta interna (`/tienda`, `/cotizador`) o una URL externa.
- El valor se guarda en la base de datos y se aplica inmediatamente al carrusel público.

## Detalles técnicos

Base de datos
- Migración: `ALTER TABLE public.hero_carousel ADD COLUMN action_url text`.
- No cambian grants ni RLS; la columna es lectura pública para filas activas y editable por staff.

`src/lib/hero-carousel.ts`
- Añadir `action_url?: string` al tipo `HeroSlide`.
- Incluir `action_url` en el `select` de `fetchActiveSlides`.

`src/routes/panel.carrusel.tsx`
- Añadir `action_url` al `select` de carga.
- Añadir un campo `<Input>` de "URL de destino / Enlace (Opcional)" en cada fila de la lista.
- Guardar el valor con `update({ action_url: ... })` al salir del campo o presionar Enter.
- Los nuevos elementos se crean con `action_url` vacío por defecto.

`src/components/HeroMedia.tsx`
- Para cada slide, si `item.action_url` existe y no está vacía, envolver el `<img>` o `<video>` con el componente `<Link>` del proyecto (`@tanstack/react-router`), usando `to={item.action_url}` y las clases necesarias para que toda el área sea clickeable.
- Si no hay URL, renderizar el media directamente sin envoltura.
- Conservar exactamente las clases actuales del media: `aspect-[4/3] w-full rounded-3xl object-cover shadow-2xl ring-1 ring-border`.
- No modificar la lógica de temporizadores, pausa ni reproducción de videos.

No se toca el cotizador, la tienda, el menú, Kiara, el panel de contenido ni las reglas de tablas existentes.
