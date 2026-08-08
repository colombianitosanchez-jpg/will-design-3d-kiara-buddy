# Kiara con enrutador de IA multi-proveedor (cascada anti-cuota)

Objetivo: Kiara responde con IA real usando varios proveedores compatibles con OpenAI, configurables desde el Panel. Si el proveedor 1 falla por cuota o error de servidor, el sistema salta al 2, al 3, etc., sin que el visitante lo note. La UI actual del widget, el cotizador, WhatsApp y el resto del sitio no cambian.

## 1. Nueva sección del Panel: "Configuración de LLM"

Nueva entrada en el menú lateral del Panel (`/panel/llm`), solo para administradores.

Tabla de proveedores con: Nombre, URL base de la API, Modelo, Prioridad (1 = primero), Activo, y estado de la clave ("Guardada" / "Sin clave").

- Crear, editar, activar/desactivar y eliminar proveedores.
- Reordenar con flechas arriba/abajo (actualiza la prioridad).
- La clave API se escribe una vez y nunca se vuelve a mostrar: el formulario muestra "•••• guardada" y solo la reemplaza si escribes una nueva. Esto evita que una clave pueda leerse desde el navegador.
- Botón "Probar" por proveedor: envía un mensaje mínimo y muestra si respondió, tardó o falló, con el código de error.
- Además: campos para los dos prompts de sistema (persona pública "Atención al cliente" y persona interna "Técnico"), editables desde la misma página.

Mismo estilo visual que las secciones existentes del Panel.

## 2. Base de datos

Nueva tabla `llm_providers`: nombre, URL base, modelo, prioridad, activo, fechas. La clave API se guarda en una columna aparte que **nunca** se expone al navegador (solo la lee el servidor); el cliente ve únicamente si existe o no.

Reglas de acceso: solo administradores autenticados pueden ver la lista y editarla; nadie anónimo. Los prompts de sistema se guardan en la tabla de contenido del sitio que ya existe.

## 3. Lógica de cascada (backend)

Este proyecto no usa Edge Functions: el chat vive en una ruta de servidor del propio sitio (`/api/kiara`), que es el equivalente y mejor opción aquí (misma URL, sin CORS, con streaming nativo).

Flujo:
1. Lee los proveedores activos ordenados por prioridad.
2. Arma el payload estándar `POST {base_url}/chat/completions` con `model`, `messages` (prompt de sistema + historial) y `stream: true` — formato OpenAI puro, así que funciona con OpenRouter, proxies, o un host local.
3. Intenta el proveedor 1. Si responde 429, 5xx, timeout o error de red, pasa silenciosamente al siguiente. Un 401/400 también avanza al siguiente y queda registrado como configuración inválida.
4. El primero que responde gana; su stream se reenvía tal cual al widget para que el texto aparezca token por token.
5. Si todos fallan, Kiara responde con el mensaje amable de siempre invitando a WhatsApp (comportamiento actual, sin pantalla de error).

## 4. Doble persona

El widget indica si hay sesión de equipo o no; el servidor verifica esa sesión (no confía en el cliente) y elige el prompt de sistema: público → atención al cliente, con catálogo/servicios/contacto; equipo → técnico interno. El prompt elegido viaja en el mismo payload, así que se aplica igual sea cual sea el proveedor que gane la cascada.

## 5. Frontend

`useKiaraChat` pasa a leer el stream de `/api/kiara` y a mostrar el texto progresivamente. No se modifica el diseño del widget ni sus estados (burbuja, "escribiendo…", botón de WhatsApp). Se elimina la respuesta simulada y la dependencia de `VITE_KIARA_CHAT_ENDPOINT`.

## Detalles técnicos

- Migración: `public.llm_providers` con GRANT a `authenticated`/`service_role`, RLS con `has_role(auth.uid(),'admin')` para lectura y escritura; columna de clave excluida de las lecturas del cliente mediante una vista/selección explícita de columnas.
- `src/routes/api/kiara.ts`: `createFileRoute` con handler POST; lee proveedores con el cliente admin dentro del handler; bucle de fallback con `AbortController` (timeout ~20s por proveedor); reenvía el `ReadableStream` upstream.
- `src/lib/llm-providers.functions.ts`: server functions con `requireSupabaseAuth` + verificación de rol admin para CRUD, reordenar y probar proveedor.
- `src/routes/panel.llm.tsx` + enlace en `src/routes/panel.tsx`.
- `src/lib/kiara-chat.ts` / `src/hooks/use-kiara-chat.ts`: lectura de stream SSE, sin cambios de UI.

## Verificación

Se probará en vivo: crear dos proveedores, forzar el fallo del primero y comprobar que la respuesta llega desde el segundo sin error visible, que el texto llega en streaming, y que la clave API nunca aparece en las respuestas del navegador.
