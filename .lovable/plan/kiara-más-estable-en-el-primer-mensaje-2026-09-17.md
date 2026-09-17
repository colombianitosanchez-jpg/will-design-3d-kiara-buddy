# Kiara más estable en el primer mensaje

Hoy, cuando el servidor lleva un rato inactivo, el primer mensaje a Kiara tarda más de lo normal y a veces muestra "Kiara no disponible" aunque el proveedor de IA esté bien. El plan hace que Kiara espere lo suficiente, reintente sola y cambie de proveedor sin que el visitante lo note.

## Qué va a cambiar

1. **Paciencia en el chat (navegador)**
   - El envío del mensaje espera hasta 25 segundos antes de dar error, en lugar de cortarse antes.
   - Mientras espera, si pasan ~6 segundos sin respuesta se muestra un aviso suave del tipo "Kiara está despertando…", para que no parezca congelado.
   - Si finalmente falla, reintenta una vez sola antes de mostrar el error, y el mensaje de error es claro ("No pudimos conectar con Kiara, inténtalo de nuevo").

2. **Reintentos automáticos en el servidor**
   - Cada llamada al proveedor de IA se reintenta hasta 2 veces más (3 intentos en total), con 1 segundo de espera entre intentos, cuando hay corte de red, tiempo agotado o error interno del proveedor (500+).
   - Los errores que no se arreglan reintentando (clave inválida, petición rechazada) no se reintentan: se salta directo al siguiente proveedor.

3. **Cascada de proveedores realmente activa**
   - Se conserva el orden por prioridad de Configuración de LLM. Si el proveedor 1 devuelve "demasiadas solicitudes" (429) o falla tras sus reintentos, pasa automáticamente al proveedor 2, luego al 3, sin aviso al visitante.
   - Se registra en el historial interno qué proveedor respondió y por qué falló cada uno, para poder revisarlo después.

4. **Tiempos del propio servidor**
   - El corte interno por proveedor se ajusta para que quepan los reintentos dentro del límite del hosting, y el límite se aplica solo a la conexión inicial, no al texto que ya está llegando (así una respuesta larga nunca se corta a mitad).

Nota: el sitio no corre en Vercel/Next.js, así que `export const maxDuration = 30` no aplica aquí; el equivalente se logra con los tiempos y reintentos descritos arriba.

## No se toca

- La personalidad, los prompts duales, el contexto de tienda, las herramientas de cotización/catálogo/pedidos ni el widget flotante de Kiara.
- La configuración de proveedores en el panel se sigue usando tal cual.

## Detalle técnico

- `src/lib/kiara-chat.ts`: `sendChat` usa `AbortController` con 25 s aplicados solo hasta la primera respuesta (se limpia al empezar a leer el stream); nuevo callback opcional `onSlow` (~6 s) y un reintento único ante fallo de red/`AbortError` antes de propagar el error.
- `src/components/KiaraWidget.tsx`: consume `onSlow` para mostrar el aviso de arranque y el texto de error amigable (sin cambios de lógica de IA).
- `src/routes/api/kiara.ts`: helper `fetchWithRetry(endpoint, init, { attempts: 3, delayMs: 1000, retryOn })` que reintenta ante `AbortError`, error de red y HTTP ≥ 500; `shouldFallback` deja de tratar 400/401/403/404 como reintentables (siguen provocando salto de proveedor); timer de 20 s por intento cancelado al recibir cabeceras; la segunda pasada (`followUp`) usa el mismo helper con 2 intentos; `X-Kiara-Provider` se mantiene.
