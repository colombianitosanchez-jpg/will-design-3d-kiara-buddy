# Taxonomía unificada: catálogo, atributos y menú conectados

Hoy el Panel tiene tres mundos separados: el menú guarda links escritos a mano (por ejemplo `filamentos-pet-g` o `pla-rosado` como si fuera una marca), mientras que los productos solo tienen una categoría plana y una marca. Por eso "PLA Rosado" y "PET G" existen en el menú pero no aparecen como opción al subir un producto, y algunos filtros no muestran nada.

La solución: una sola fuente de verdad (categorías con subniveles + marcas + atributos) que alimenta al mismo tiempo el formulario de productos, los filtros de la tienda y el menú de navegación.

## 1. Categorías con subniveles

- Las categorías pasan a ser un árbol: `Filamentos > PLA > PLA Rosado`, `Filamentos > PETG`, `Impresoras 3D > Filamento / Resina`.
- Se migran las 7 categorías actuales como raíces (nada se pierde) y se crean los subniveles que hoy solo existían en el menú.
- Un producto se asigna a la subcategoría más específica; la tienda muestra automáticamente los productos de esa categoría **y de todas sus hijas** (entrar a "Filamentos" muestra también los PLA y PETG).

## 2. Atributos filtrables

- Nueva definición de atributos gestionable desde el Panel: nombre (Material, Color, Diámetro, Peso…), tipo de valor y lista de opciones.
- Cada atributo se puede asociar a una categoría (por ejemplo Color solo aplica a Filamentos y Resinas).
- En el formulario de producto aparecen automáticamente los campos de atributo de la categoría elegida.
- La tienda gana filtros laterales por atributo y por marca, con conteos reales.

## 3. Marcas gestionables

- Nueva sección "Categorías y marcas" en el Panel: crear, renombrar, ordenar, activar/desactivar, logo de marca, borrado seguro (avisa si hay productos asociados).
- Además, botón "+ Crear" rápido dentro del formulario de producto para categoría, subcategoría o marca sin salir de la pantalla.

## 4. Menú de navegación: adiós a los links a mano (modo mixto)

- El modal del menú deja de pedir `link_type` + texto libre. En su lugar: un selector de **destino** con opciones reales del sitio:
  - Categoría / subcategoría (árbol desplegable)
  - Categoría + marca
  - Atributo (por ejemplo Color = Rosado dentro de Filamentos)
  - Servicio (lista de anclas reales de /servicios)
  - Página del sitio (Inicio, Galería, Nosotros, Contacto, Cotizador)
  - URL personalizada
  - Solo grupo (sin link)
- El destino se guarda por referencia (id), así que si renombras una categoría el menú no se rompe nunca.
- Botón "Generar desde catálogo": crea o actualiza la rama del menú a partir del árbol de categorías y marcas, respetando los ítems manuales que ya creaste.
- Vista previa en el propio panel: se muestra el link final y una advertencia si un ítem apunta a algo sin productos.
- Se conserva el anidado ilimitado, el orden con flechas, el switch de activo y el borrado en cascada que ya funcionan.

## 5. Migración de lo que ya existe

- Cada `menu_items` actual se convierte al nuevo formato automáticamente emparejando por slug/nombre.
- Los que hoy apuntan a algo inexistente (`filamentos-pet-g`, `pla-rosado`, `escaner-3d`, `lapices-3d`, `repuestos`) se resuelven creando la subcategoría correspondiente o corrigiendo el destino, y quedan listados en el panel para que los revises.
- No se toca nada del Contenido del Hero, Productos, Pedidos, Cotizador, Kiara ni el botón de WhatsApp.

## Detalles técnicos

- Migración: `categories.parent_id` + `is_active` + `image_url`; `brands.logo_url`, `is_active`, `sort_order`; nuevas tablas `attributes`, `attribute_values`, `category_attributes`, `product_attribute_values`; en `menu_items` se añaden `target_kind`, `category_id`, `brand_id`, `attribute_value_id`, `service_anchor`, `custom_url` (se conservan `link_type`/`link_value` como respaldo durante la migración). GRANT + RLS igual que el resto: lectura pública de taxonomía, escritura solo admin/staff.
- Función SQL recursiva `category_descendants(slug)` para que la tienda filtre por rama completa en una sola consulta.
- `src/lib/catalog.ts`: árbol de categorías, filtros por rama + marca + atributos, sustituyendo los alias hardcodeados de `CATEGORY_ALIASES`/`TECH_CATEGORY`.
- `src/lib/menu.ts`: `menuHref` construido desde las referencias nuevas, con fallback al formato antiguo.
- UI: `panel.taxonomia.tsx` (categorías/marcas/atributos), modal de menú con selector de destino, formulario de producto con selector de categoría en cascada + atributos dinámicos, `tienda.index.tsx` con panel de filtros.

## Verificación

- Crear "PLA Rosado" como subcategoría, asignarle un producto y comprobar que el ítem del menú lo muestra.
- Confirmar que "Filamentos" incluye los productos de sus subcategorías.
- Revisar cada ítem del menú actual en escritorio y móvil sin links roídos.
