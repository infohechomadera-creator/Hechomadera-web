# Hito W6 · Agente de IA en el configurador
> Diario del hito. Se agrega información; no se borra.

## 2026-11-19
**Hecho**
- Botón "Prefiero conversar" en `/cocinas/configurar`: abre un chat (panel abajo en celular, a la derecha en computador) que llena el mismo configurador. Código en `lib/agente/{catalogo,herramientas,guardia,prompt,conversar}.ts`, `app/api/configurador/agente/route.ts` y `components/configurador/Agente.tsx`; se tocó `Configurador.tsx`.
- Tres herramientas en el servidor: `actualizar_configuracion`, `calcular_rango` y `guardar_contacto`. Cada valor pasa por las mismas reglas del formulario (`validarConfiguracion`, `validarContacto`).
- No inventa precios: (1) la IA nunca ve la tabla ni el rango; `calcular_rango` responde "mostrado en pantalla"; (2) `quitarPrecios` cambia cualquier texto de la IA con dinero (incluye palos, lucas, k, M) y las cifras del cliente se tapan con `[cifra]`; (3) el rango sale de `calcularRango` y el lead lo crea solo `/api/configurador/lead` (recalcula) cuando el cliente marca la autorización y pulsa Enviar.
- Gasto: historial firmado con HMAC (clave derivada de `ANTHROPIC_API_KEY`), 60.000 caracteres y 30 mensajes; 40 mensajes por IP por hora y 1.500 llamadas por día en el sitio (`dentroDelLimite`); si no se puede contar, no atiende (`siFalla=false`, parámetro nuevo en `lib/limite.ts`, por defecto igual que antes); 50 s en total, sin reintentos, 5 vueltas. Interruptor `AGENTE_IA_ACTIVO` + `ANTHROPIC_API_KEY`: sin los dos, el botón no aparece y la API responde 503.
- Pruebas: 349 (nuevas `tests/agente.test.ts` y `tests/limite-falla.test.ts`); lint, tipos y build sin errores. Validador: 2 pasadas, 11 hallazgos corregidos (firma, tope por llamada, filtro, contacto oculto, tiempos, carrera en la pantalla, rango que no coincide). Auditor: sin violaciones graves.
- Pantalla probada en tamaño celular con respuestas simuladas, en localhost. `.claude/launch.json` tiene "web-agente-pantalla" con `AGENTE_IA_ACTIVO=true` y una llave FALSA solo para verla en local; nunca poner una real.
- SDK `@anthropic-ai/sdk` fijado en 1.5.0. Etiquetas `respaldo-2026-11-19-w6-agente` y `hito-6`; rama subida.
- No se tocó ningún servicio externo (ni Supabase, ni Vercel, ni Operflow). Sin migraciones.

**Aprendido**
- Modelo `claude-haiku-5-5` (lo eligió Alberto), ~US$0,01 por conversación. API de Mensajes con herramientas propias: Managed Agents guardaría el historial en Anthropic y cobra tiempo de sesión.
- La conversación no se guarda ni se registra (decisión de Alberto). Nombre y celular se borran de toda la conversación al pasar al formulario.
- Lo que protege el dinero es que la IA no vea cifras y que el servidor recalcule, no pedirle a la IA que "no diga precios".
- Riesgo aceptado: reenviar un historial firmado viejo para pasar de 30 mensajes (lo acotan el tope por IP y el diario). La ruta pública no tiene control de origen (acotada por los límites).

**Pendientes**
1. Alberto: crear la cuenta de Anthropic (https://platform.claude.com), cargar crédito y poner tope mensual (sugerido US$10).
2. Alberto: crear la llave; ponerla en Vercel como `ANTHROPIC_API_KEY` (Secret, Production y Preview) y en `.env.local`; poner `AGENTE_IA_ACTIVO=true` en Vercel.
3. Alberto: agregar `ANTHROPIC_API_KEY=` y `AGENTE_IA_ACTIVO=` sin valor a `.env.example` (el acceso de Claude a ese archivo está bloqueado).
4. Prueba real con la llave: conversación completa desde el celular en la vista previa hasta un lead guardado; confirmar que Haiku 5.5 acepta `thinking: disabled` y `output_config.effort: low`; revisar los registros "[agente]".
5. Abogado (Ley 1581): nombre y celular llegan a Anthropic (fuera de Colombia) antes de la autorización; el texto y la política no mencionan la IA. Alternativa: que el agente no pida contacto.
6. Con visto bueno de Alberto, pasar a `main`.

**Commits del hito (hito-5..HEAD):**
- c88e81f chore: SDK de Anthropic con versión fija para el agente
- bb3c2e5 feat: agente de IA que llena el configurador sin ver ni dar precios, con topes de uso
- 8cb5b06 feat: chat del asistente en el configurador, pensado para celular
- 9a10d8c fix: correcciones del validador al agente: historial firmado, tope por llamada, cifras tapadas, contacto oculto y tiempos
- d3ec51a fix: rango solo si coincide con el formulario, contacto oculto en toda la conversación y tope de tamaño amable
