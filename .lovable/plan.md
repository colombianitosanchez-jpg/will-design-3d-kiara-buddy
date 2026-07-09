
# Plan por fases — Will Design 3D

Avanzamos "todo por fases en Lovable". Esta iteración cubre **Fase 1** (contenido + feed real de Instagram). Las fases 2-4 quedan definidas para siguientes turnos.

---

## Fase 1 (ahora) — Contenido, navegación y feed real

### Nueva estructura de rutas
Cada sección importante pasa a ser una ruta propia (mejor SEO y compartibilidad). La home queda como landing resumen.

```
src/routes/
  index.tsx          → / (hero, servicios destacados, productos destacados, feed IG)
  servicios.tsx      → /servicios (detalle completo + formulario cotización)
  tienda.tsx         → /tienda (catálogo estático por categorías, placeholder de "próximamente comprar")
  galeria.tsx        → /galeria (feed Instagram grande + link a @will_design2020)
  nosotros.tsx       → /nosotros (historia, misión, visión, foto taller)
  contacto.tsx       → /contacto (form, WhatsApp, mapa Google, redes)
  admin.live.tsx     → (ya existe)
```

Cada ruta con su propio `head()` (title + description + og:title/description únicos).

### Header/nav global
- Nuevo `src/components/SiteHeader.tsx` con logo (`will_logo.asset.json`), menú horizontal en desktop, menú hamburguesa en móvil (usando `use-mobile`), y CTAs "Cotizar" + WhatsApp.
- Nuevo `src/components/SiteFooter.tsx` con logo, columnas (Servicios, Tienda, Empresa), redes, WhatsApp, "Supervisado por Kiara 🐾".
- Se montan en `__root.tsx` alrededor del `<Outlet />` para que aparezcan en todas las páginas.

### Servicios detallados (`/servicios`)
Tarjetas grandes con descripción profesional para: **Mantenimiento y arreglo**, **Upgrade y mejora**, **Diseño 3D personalizado**, **Impresión a pedido (FDM + Resina, PLA/PETG/ABS/Nylon/TPU)**, **Post-procesado y pintura**. Al final, versión compacta del `<Quoter />` existente pre-seleccionando el servicio elegido.

### Tienda (`/tienda`) — catálogo estático fase 1
- Componente `ProductCard` reutilizable.
- Datos en `src/data/products.ts` (array tipado: impresoras, repuestos, filamentos, resinas, escáners, lápices, cámaras).
- Filtros client-side simples (categoría, material, color) usando `useState`.
- Página de detalle `tienda.$slug.tsx` con fotos, descripción técnica, precio en COP, **"Consejo de Kiara"** (globo con avatar), botón **"Consultar por WhatsApp"** (aún sin carrito).
- Submenús en el nav para las categorías principales.

### Kiara: Consejos contextuales
- Nuevo `src/components/KiaraTip.tsx` (avatar pequeño + globo). Recibe `tip` como prop.
- Se usa en fichas de producto y en secciones clave (ej. cotizador, servicios).

### Feed real de Instagram (Elfsight)
- El componente `InstagramFeed.tsx` ya está listo para leer `VITE_ELFSIGHT_INSTAGRAM_ID`.
- **Acción del usuario**: crear el widget gratis en https://elfsight.com/instagram-feed-instashow/, apuntándolo a `@will_design2020`, copiar el ID (ej. `abc123def`) y guardarlo como variable de entorno. Le indico exactamente dónde pegarlo.
- Se monta en `/galeria` (grande) y en la home (versión compacta).

### Inicio (`/`) reestructurado
1. Hero con CTAs "Explorar tienda" / "Cotizar servicio" + globo de Kiara.
2. Servicios destacados (iconos, links a `/servicios`).
3. Productos destacados: carrusel simple (scroll horizontal) con 6 items del catálogo.
4. "Will Design 3D en acción" → feed Instagram.
5. CTA final a contacto.

### Contacto (`/contacto`)
- Form con validación Zod (nombre, email, tel, mensaje) que arma link `wa.me/573156724474`.
- Bloque con: dirección (pediré confirmación al construir), teléfono, email, botones redes.
- Google Maps embebido (iframe estándar, sin API key). **Necesito la dirección exacta**; si no la tienes aún, dejo Bogotá como centro.

### Otros
- `.env.example` con `VITE_ELFSIGHT_INSTAGRAM_ID=` documentado.
- Reveal-on-scroll aplicado a las nuevas secciones.
- Todo responsive (móvil / tablet / desktop) con Tailwind.

---

## Fase 2 (siguiente iteración) — E-commerce con Lovable Cloud
- Activar Lovable Cloud.
- Tablas: `products`, `product_images`, `categories`, `orders`, `order_items`, `customers`, `shipping_rules` + RLS.
- Migrar catálogo estático a base de datos.
- Carrito persistente (Zustand + Cloud).
- Panel `/admin` protegido con roles (`user_roles` + `has_role`): CRUD productos, pedidos, clientes, envíos.

## Fase 3 — Pasarela de pago
Decidir entre MercadoPago / PayU (integración manual con `add_secret` para llaves + server routes para webhooks en `/api/public/*`) o Stripe (integrado nativo). Checkout completo con confirmación por email.

## Fase 4 — Pulido y lanzamiento
SEO avanzado (sitemap, JSON-LD Product), analítica, optimización de imágenes, publicación + dominio custom.

---

## Sobre WordPress / Hostinger
Lovable **no exporta a WordPress/WooCommerce**. La plataforma se publica directamente desde Lovable (dominio custom incluido) y corre sobre su infraestructura serverless. Si estrictamente necesitas WordPress en Hostinger, tendríamos que rehacerlo fuera de Lovable — te recomiendo probar primero con el despliegue nativo, es más simple y no pierdes nada.

---

## Preguntas menores para cuando construya
1. Dirección física para el mapa (o dejo Bogotá centro).
2. Foto real del equipo/taller para `/nosotros` (o genero placeholder ilustrado).
3. Lista real de productos destacados para el catálogo inicial, o los genero yo con datos plausibles marcados como "demo".

¿Apruebas la Fase 1?
