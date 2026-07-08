
## Plan: Feed de Instagram, Alerta "EN VIVO" y consolidación de WhatsApp

### 1. Actualizar número de WhatsApp
Reemplazar el número placeholder `573000000000` por `573156724474` en:
- `src/components/Quoter.tsx` (submit del cotizador)
- `src/components/KiaraWidget.tsx` (botón de chat)
- `src/routes/index.tsx` (cualquier CTA/footer que use el número)

### 2. Portafolio: reemplazar galería estática por feed de Instagram
- Eliminar la sección de portafolio actual con imágenes generadas (`portfolio-1..6.jpg`) y su grid manual en `src/routes/index.tsx`.
- Crear `src/components/InstagramFeed.tsx`: grid responsivo (2 col móvil / 3-4 col desktop) con el estilo visual actual (bordes redondeados, hover, overlay).
- Preparar dos modos de integración, seleccionables por variable de entorno:
  - **Widget de terceros (Elfsight/SnapWidget)**: contenedor `<div>` con `data-*` + script cargado on-mount. Instrucciones en comentarios para pegar el ID del widget.
  - **API oficial de Instagram Basic Display**: server function `getInstagramFeed` en `src/lib/instagram.functions.ts` que lee `INSTAGRAM_ACCESS_TOKEN` desde `process.env`, hace fetch a `graph.instagram.com/me/media`, cachea con TanStack Query. Se cargará solo si el token está configurado.
- Mientras no haya token/widget: mostrar estado placeholder con enlace a `https://instagram.com/will_design2020` y mensaje "Conecta tu cuenta de Instagram para ver el feed automático".
- No se solicita el token ahora; queda documentado cómo agregarlo con `add_secret` cuando el usuario esté listo.

### 3. Sistema "EN VIVO"
- **Estado global** con Zustand ligero o Context: `src/lib/live-store.ts` expone `{ isLive, platform, url, setLive }`. Persistencia en `localStorage` para que el toggle sobreviva recargas (uso solo del admin; los visitantes leen el mismo valor localmente — para sincronización real entre dispositivos se necesitaría backend, se menciona como upgrade futuro).
- **Top Announcement Bar** (`src/components/LiveBanner.tsx`): barra superior fija en rojo/naranja con punto pulsante (`animate-pulse`), texto "🔴 ¡Estamos EN VIVO en {platform}! Haz clic aquí para unirte", enlace al `url`. Empuja el header hacia abajo cuando está activa. Solo se renderiza si `isLive`.
- **Kiara dinámica**: en `KiaraWidget.tsx`, si `isLive`, el globo cambia a "¡Guau! Mis humanos están en vivo ahora mismo, ¡ven a verlos!" y el botón de acción abre el `url` de la transmisión en lugar de WhatsApp.
- **Panel admin oculto** en `/admin/live` (`src/routes/admin.live.tsx`): ruta no enlazada en el nav, protegida por una contraseña simple guardada en `localStorage` (prompt inicial). Contiene:
  - Toggle On/Off "En Vivo"
  - Select de plataforma (Instagram / YouTube / TikTok)
  - Input para el URL de la transmisión
  - Botón Guardar
- Se documenta que esta protección es client-side; para seguridad real se recomendaría auth con Lovable Cloud (upgrade opcional).

### 4. Animaciones (mantener/asegurar)
- Verificar que la animación flotante de Kiara (`kiara-float`) siga activa en `styles.css`.
- Añadir utilidad `scroll-reveal` con `IntersectionObserver` en un hook `useScrollReveal` y aplicar a secciones principales (Servicios, Portafolio, Cotizador). Ya existe la base visual; solo se conecta.

### Archivos a crear
- `src/components/InstagramFeed.tsx`
- `src/components/LiveBanner.tsx`
- `src/lib/live-store.ts`
- `src/lib/instagram.functions.ts` (opcional, activa cuando exista el token)
- `src/hooks/use-scroll-reveal.ts`
- `src/routes/admin.live.tsx`

### Archivos a modificar
- `src/routes/index.tsx` — reemplazar galería, montar `<LiveBanner />`, aplicar scroll-reveal, actualizar número WhatsApp
- `src/routes/__root.tsx` — proveer estado live si se usa Context
- `src/components/KiaraWidget.tsx` — mensaje/enlace dinámico + número WhatsApp
- `src/components/Quoter.tsx` — número WhatsApp

### Notas para después de la implementación
- Para activar el feed real de Instagram: elegir entre widget de Elfsight (pegar el ID en `.env` como `VITE_ELFSIGHT_INSTAGRAM_ID`) o token de API (`INSTAGRAM_ACCESS_TOKEN` vía `add_secret`).
- El toggle "En Vivo" es local por navegador; si quieres que se sincronice para todos los visitantes en tiempo real, activamos Lovable Cloud y guardamos el estado en la base de datos.
