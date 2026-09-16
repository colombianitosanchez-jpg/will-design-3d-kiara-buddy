# Arreglar el panel de IA y darle a Kiara el contexto vivo de la tienda

## Qué está pasando realmente (verificado)

El error "Forbidden: se requiere rol de administrador" **no** viene de los permisos de las tablas. Las reglas de acceso de `llm_providers` y de la base de conocimiento ya son correctas: solo el equipo autenticado puede leerlas y escribirlas, y el público no puede leer los proveedores (las claves de API están protegidas).

La causa real: durante el arreglo de seguridad anterior, la función interna que verifica el rol se movió a un espacio privado. La página de Configuración de LLM sigue llamándola en el sitio antiguo, así que la comprobación falla siempre y devuelve "Forbidden" incluso siendo Super Admin. Las demás secciones del panel (Pagos, Pedidos) ya usan la forma nueva y funcionan.

También verifiqué:
- No existe una tabla separada de "prompts": los dos textos de Kiara (público y equipo) se guardan en los ajustes de contenido del sitio, que ya tienen lectura pública y escritura solo para el equipo. No hace falta crear nada.
- La base de conocimiento no tiene columna de "visibilidad": la separación pública/interna se hace por categoría (`public_web` / `internal_team`), que ya funciona. La lectura no es pública: la hace el servidor. Eso es más seguro y se mantiene.
- La llamada real a la IA ya ocurre en el servidor (`/api/kiara`), nunca en el navegador. Las claves nunca salen del servidor. Eso se mantiene tal cual.
- Lo que **sí falta**: el contexto que recibe Kiara incluye catálogo, servicios cotizables y conocimiento, pero **no incluye los métodos de pago activos**. Por eso no sabe responder cómo se puede pagar.

## Cambios

### 1. Arreglar el acceso del panel de IA
Cambiar la comprobación de rol de la Configuración de LLM para que use el mismo método que ya funciona en el resto del panel: leer el rol del usuario autenticado y exigir Super Admin (o miembro activo del equipo con rol de administración). Sin tocar rutas ni la interfaz.

No se cambian reglas de base de datos: ya son las correctas (equipo con acceso total, público sin acceso a proveedores). Solo se corrige la verificación en el código.

### 2. Métodos de pago en el "cerebro" de Kiara
Añadir al contexto que arma el servidor un bloque con los métodos de pago activos: nombre, tipo (transferencia/QR, pasarela, contra entrega, punto de efectivo, cripto) y, en los manuales, las instrucciones para el cliente. Nunca se incluyen credenciales ni claves.

En modo interno se añade además qué métodos están desactivados, para que el equipo lo sepa.

Se añade una línea de instrucción al prompt: si el cliente pregunta cómo pagar, Kiara responde con los métodos realmente activos y remite al carrito, sin inventar opciones.

El catálogo de productos y los precios ya viajan en el contexto; se mantienen como están.

### 3. Verificación del chat
El widget de Kiara ya habla con el endpoint seguro del servidor y muestra la respuesta en streaming; no se modifica su diseño. Se comprobará en vivo que el panel de IA abre sin error y que Kiara contesta correctamente a "¿cómo puedo pagar?".

## Detalles técnicos

- `src/lib/llm-providers.functions.ts`: reemplazar `assertAdmin` (que llama `supabase.rpc("has_role")` en el esquema público, ya inexistente) por la lectura de `user_roles` con el cliente autenticado del middleware, exigiendo `is_active` y rol `super_admin` — mismo patrón que `payment-methods.functions.ts`. El resto de las funciones (CRUD, reordenar, probar) queda intacto.
- `src/lib/kiara-context.server.ts`: nueva función `paymentBlock(isInternal)` que consulta `payment_methods` (`name, type, instructions, is_active`, nunca `credentials`/`config.payment_url`) y devuelve `## FORMAS DE PAGO ACTIVAS`; se inserta en `buildPublicContext` y `buildInternalContext`. Añadir la regla de uso al bloque `RAG_RULES`.
- Sin migraciones nuevas. Las políticas actuales de `llm_providers` y `knowledge_base` (`private.has_role(auth.uid(),'admin')` para lectura y ALL, sin acceso `anon`) se conservan.
- Verificación: `bunx tsgo --noEmit`, build, y Playwright con sesión de Super Admin en `/panel/llm` (guardar y probar un proveedor) más una consulta de pago al widget.
