# Fase 2 — Panel de Administración privado

Esto activa **Lovable Cloud** (backend gestionado: base de datos, autenticación, almacenamiento de archivos). Sin él no hay login real, ni inventario persistente, ni subida de imágenes desde el navegador.

## 1. Activar Lovable Cloud
- Crea automáticamente base de datos, auth y storage.
- Sin cuentas externas ni configuración manual.

## 2. Autenticación
- Login con **email + contraseña** en `/auth` (público).
- Todo `/admin/*` protegido: solo usuarios con rol `admin` entran; el resto se redirige.
- Tabla `user_roles` separada (`admin` / `staff`) + función `has_role` (seguridad estándar, sin escalada de privilegios).
- **Primer admin**: te creas la cuenta en `/auth`, y yo te doy un botón "hacerme admin" que solo funciona si aún no hay ningún admin (bootstrap seguro). Después ese botón deja de funcionar.

## 3. Base de datos (tablas nuevas)
- `categories` (id, nombre, slug)
- `brands` (id, nombre)
- `products` (id, nombre, slug, precio COP, categoria_id, brand_id, descripcion corta/larga, specs JSON, kiara_tip, imagen_url, destacado, activo, stock)
- `orders` (id, cliente nombre/email/tel, dirección envío, total, estado: `pendiente|empacando|enviado|entregado|cancelado`, fecha)
- `order_items` (id, order_id, product_id, cantidad, precio unitario)
- `site_content` (clave, valor) — para textos editables (hero título, hero subtítulo, mensaje Kiara, etc.) y URL de la foto de Kiara.
- Bucket de Storage **público** `product-images` para fotos de productos y mascota.
- RLS estricto: lectura pública solo de `products/categories/brands/site_content` activos; escritura solo admin; `orders` solo admin lee/edita, clientes pueden insertar la suya.

## 4. Panel `/admin` (layout con sidebar)

```text
┌──────────────┬──────────────────────────────┐
│  Will Design │  [Dashboard actual]          │
│  ─────────   │                              │
│  📦 Productos│                              │
│  🛒 Pedidos  │                              │
│  ✏️  Contenido│                              │
│  📡 Live     │                              │
│  🚪 Salir    │                              │
└──────────────┴──────────────────────────────┘
```

### 4.1 `/admin` (home) — Resumen
Tarjetas: nº productos activos, pedidos pendientes, pedidos del mes, estado Live.

### 4.2 `/admin/productos` — Gestor de productos
- Tabla con: miniatura, nombre, categoría, marca, precio, stock, activo (switch), acciones (editar/eliminar).
- Buscador + filtro por categoría.
- Botón grande naranja **"+ Añadir Producto"** arriba a la derecha.

### 4.3 `/admin/productos/nuevo` y `/admin/productos/$id/editar`
Formulario visual (labels claros, sin jerga técnica):
- Nombre, Precio (COP), Descripción corta, Descripción larga
- Categoría (dropdown, con botón "+ nueva categoría")
- Marca (dropdown, con botón "+ nueva marca")
- Specs (lista dinámica label/valor, botón "+ agregar spec")
- Consejo de Kiara (textarea corto)
- Destacado (checkbox), Activo (checkbox), Stock (número)
- **Imagen**: botón "Subir imagen" (input file estándar) → sube a Storage → preview inmediato.
- Botón **Guardar** grande → actualiza y vuelve a la tabla. La tienda pública se actualiza al instante (los productos se leen de la BD, no del archivo estático).

### 4.4 `/admin/pedidos` — Gestor de pedidos
- Tabla: fecha, cliente, total, estado (badge de color), acciones.
- Click en fila → panel lateral con detalle: items comprados, dirección de envío, teléfono, email, notas.
- Dropdown grande para cambiar estado: **Pendiente → Empacando → Enviado → Entregado**. Guarda al instante.
- Filtro por estado + búsqueda por cliente.
- (En Fase 3 se conectará con la pasarela de pago para que los pedidos entren solos; por ahora podrás crear pedidos de prueba manualmente y ver la interfaz completa.)

### 4.5 `/admin/contenido` — Textos e imágenes del sitio
Formulario con campos editables clave por clave:
- Título del hero
- Subtítulo del hero
- Mensaje de bienvenida de Kiara
- Texto "Nosotros" corto
- **Foto de Kiara**: botón subir imagen → preview → guardar.
- Botón Guardar por sección. Los cambios se reflejan en la web pública inmediatamente (la home leerá de `site_content` con fallback a los textos actuales).

### 4.6 `/admin/live`
El actual (toggle live) migrado a la BD para que persista entre dispositivos (hoy es solo localStorage). Mismo UI.

## 5. Migración del catálogo estático
- El array de `src/data/products.ts` se **importa una vez** a la BD como seed inicial (para que veas la tienda igual el primer día).
- La tienda pública (`/tienda`, `/tienda/$slug`, home) pasa a leer de la BD.

## 6. Seguridad
- RLS activo en todas las tablas.
- Roles en tabla separada + `has_role` (nunca en `profiles`).
- Storage con políticas: lectura pública, escritura solo admin.
- Validación Zod en cliente y servidor (server functions con `requireSupabaseAuth` + chequeo `admin`).
- El PIN `kiara2024` del panel live actual se elimina (reemplazado por login real).

## Detalles técnicos (para referencia)
- Server functions TanStack con `requireSupabaseAuth` para escrituras admin.
- Uploads: `supabase.storage.from('product-images').upload(...)` desde el cliente admin.
- Reads públicos: cliente publishable + políticas `TO anon` de solo lectura en columnas seguras.
- Migraciones SQL con `GRANT`s explícitos + `ENABLE RLS` + policies en el mismo archivo.

## Lo que NO incluye esta fase
- Carrito de compra público y checkout (Fase 3, con pasarela).
- Emails automáticos (Fase 3).
- Multi-imagen por producto (esta fase: 1 imagen principal; ampliable después sin romper nada).

## Preguntas antes de construir
1. **Email del primer admin**: ¿qué email vas a usar para tu cuenta? (lo mencionamos en el mensaje de bienvenida del bootstrap).
2. ¿Confirmas que el catálogo actual (11 productos demo) sirve como semilla inicial, o prefieres empezar con la tabla vacía?
3. ¿Quieres que los empleados de ventas tengan un rol `staff` con permisos limitados (ver pedidos, cambiar estados, pero no borrar productos), o por ahora todos son `admin` completo?

¿Apruebas la Fase 2 así?
