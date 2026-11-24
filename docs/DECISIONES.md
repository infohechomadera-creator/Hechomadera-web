# Decisiones de Hechomadera-web
> Cada decisión con fecha y motivo. Se agregan al final. No se borran: si una cambia, se agrega otra que la reemplaza.
> Origen de las decisiones del 2026-11-17: `docs/TRASPASO-MOMENTO-1.md` §3.

## 2026-11-17 · Reparto web / Operflow
- **Leads y CRM viven en la web.** Motivo: Alberto construye el CRM aquí; la web es el centro comercial.
- **Operflow recibe solo proyectos que pasaron el filtro.** Motivo: cada dato tiene un solo dueño; Operflow es para operar.
- **Cobros con Mercado Pago en la web; Operflow solo registra el pago.** Motivo: Mercado Pago ya está conectado aquí.
- **La web usa su propio Supabase** para leads, CRM, usuarios, fotos y precios (hay que crearlo). Motivo: Redis no sirve para un CRM con usuarios, permisos y relaciones; proyectos separados por regla.
- **La tabla de precios por ciudad vive en la web y es la única fuente**; Operflow la consulta en modo lectura. Motivo: un solo lugar donde Alberto edita precios.
- **Supabase de la web en plan gratis**, proyecto aparte del de Operflow. Antes de clientes reales se evalúa Pro (requiere aprobación). Motivo: decisión de Alberto.
- **Se empieza por la web** en sesión propia; Operflow va en otra. W0–W4 no dependen de Operflow; W5 necesita O3.

## 2026-11-17 · Pagos y reglas comerciales
- **El filtro es pagar el diseño.** Precio fijo por producto (COP): cocina 300.000, closet 150.000, mueble de baño 150.000, centro de entretenimiento 200.000, puerta 100.000, escritorio 100.000. Se descuenta del anticipo. El pago confirmado por Mercado Pago envía el proyecto a Operflow automáticamente. Motivo: solo se diseña para quien ya puso dinero.
- **Anticipo al aprobar el diseño:** 35% del valor final menos el diseño pagado. Motivo: se cobra sobre el valor final, no sobre un rango.
- **Sin tolerancia de precio:** el valor final se recalcula con medidas confirmadas y la diferencia va al saldo. Motivo: decisión de Alberto.
- **Si el cliente no aprueba:** recibe solo el render; no se devuelve el diseño; el diseño es suyo; Hechomadera no lo usa y se borran sus datos (excepto lo que la ley obliga a guardar del pago). Debe ir en términos y privacidad. Motivo: protege planos y despiece; decisión de Alberto.
- **Promesa:** propuesta en máximo 48 horas después de pagar el diseño.
- **Facturas por fuera del sistema;** la web solo registra los pagos.
- **Mercado Pago ya está operativo en producción.** Confirmado por Alberto.

## 2026-11-17 · Operación y contenido
- **Ciudades:** Barranquilla y Santa Marta el primer semestre; luego 5 ciudades más en Colombia. Precios por ciudad desde el inicio.
- **Equipo:** 1 asesor y 1 diseñador; gerencia asigna los leads a mano.
- **Catálogo e imágenes genéricos o provisionales;** precios de ejemplo editables desde el panel.
- **Avisos al cliente solo por correo (Resend);** WhatsApp lo hace el asesor a mano.
- **El dominio `hechomadera.com` ya apunta a Vercel.** Confirmado por Alberto.
- **Agente de IA (W6):** la cuenta de API de Anthropic se crea al llegar a W6, con tope de gasto mensual aprobado por Alberto. Motivo: cuesta dinero.

## 2026-11-17 · Permisos
- **Autonomía:** Claude trabaja sin preguntar dentro de esta carpeta (editar, commits, push, pruebas), pero pide autorización para borrar cualquier archivo o dato y para tocar algo fuera de la carpeta.
- **Siempre se pide permiso para:** dinero, contraseñas o inicios de sesión, aceptar términos.

## 2026-11-18 · Devolución tras medición
- Si tras medir el cliente no acepta el valor ajustado: se devuelve el anticipo menos el costo de la visita de medición; el diseño no se devuelve. Va en los términos. Motivo: decisión de Alberto.

## 2026-11-18 · Nivel de autonomía 2 (inicio del kit, hito W0)
- **Alcance:** equivale al nivel 2 del estándar (editar, commits, push, etiquetas, dependencias, pruebas y build) **con borrados siempre autorizados** (`rm`, `git rm`, `mv`, borrar ramas o etiquetas van a "preguntar"). Niveles 3 y 4 no liberados. Motivo: instrucción de Alberto al iniciar el Momento 1 (se aparta del nivel 0 del estándar).
- **Perímetro:** carpeta real `/Users/albertocotesd/Desktop/HECHOMADERA` (el traspaso mencionaba `Desktop/AUTOMATIZACION_IA/HECHOMADERA`, que no es la ubicación actual). Motivo: plan W0 aprobado.
- **`curl`, `python3`, `node`, `pip3 install` y `npx` de herramientas externas pasan a "preguntar".** Motivo: con ellos se podría borrar o enviar archivos sin permiso (riesgo señalado en el traspaso §6).
- **Lista `deny`:** lectura de `.env` y `.env.*`, force push, `reset --hard`, `git clean`, `rm -rf`, `rebase`. Hook anti-secretos activo en commit y push.

## 2026-11-18 · Autonomía ampliada para avanzar de forma fluida
- Alberto autoriza a Claude a avanzar en el desarrollo sin pedir aprobación de cada plan, y a crear agentes, subagentes, artifacts, skills, hooks, MCP y otras herramientas. **Límites que siguen:** nada que cueste dinero; no borrar fuera de las carpetas autorizadas; se mantiene pedir permiso para borrar, salir de la carpeta, contraseñas o inicios de sesión y aceptar términos. Motivo: instrucción de Alberto.
- Mientras no exista el proyecto de Supabase (lo crea Alberto), W1 se adelanta con migraciones SQL y pruebas de permisos en una base Postgres local dentro del proyecto (PGlite, gratis). La conexión real a Supabase queda para cuando exista. Motivo: avanzar sin depender de una cuenta.
- W2 se adelanta en paralelo (motor de precios y página de cocinas), porque no depende de la base de datos para probarse. Los precios de ejemplo viven en una semilla que se cargará a la tabla de precios en Supabase, que sigue siendo la única fuente.

## 2026-11-18 · Trabajo en rama, no en main
- El trabajo de W1/W2 y el rediseño van en la rama `w1-w2-base`. Motivo: Vercel publica en producción todo lo que llega a `main`, y producción (nivel 4) no está liberada. La rama solo genera una vista previa. Se pasa a `main` cuando Alberto apruebe.

## 2026-11-18 · Rediseño visual inspirado en awesomic.com
- Nuevo sistema de diseño (zinc monocromático, tarjetas de 36px, botones de 14px, un solo acento naranja en etiquetas, una sola tipografía: DM Sans como sustituto de Cosmica). Reglas en `docs/DISENO.md`; guía original en `docs/DISENO-REFERENCIA.md`. Motivo: pedido de Alberto.
- **Los textos de la web no se cambian:** cada frase pasó por un filtro de tono y contenido. Se permite reorganizar textos e imágenes, no reescribirlos. Se verifica comparando el texto renderizado antes y después. Motivo: instrucción de Alberto.
- Respaldo antes del rediseño: etiqueta `respaldo-2026-11-18-antes-rediseno` (subida a GitHub). Para volver atrás basta con regresar a esa etiqueta.

## 2026-11-18 · Rediseño descartado (reemplaza la decisión anterior)
- Alberto revisó el rediseño en la vista previa y **prefiere el diseño anterior**. Se restauraron páginas, componentes y estilos desde la etiqueta `respaldo-2026-11-18-antes-rediseno`. Se conserva el resto del trabajo (base de datos, precios, clientes de Supabase, documentos). `docs/DISENO.md` y `docs/DISENO-REFERENCIA.md` quedan solo como registro. Motivo: decisión de Alberto.
- Se mantiene la regla: los textos de la web no se cambian sin aprobación.

## 2026-11-18 · Proyecto de Supabase creado
- Alberto creó el proyecto de Supabase de la web, llamado `hechomadera`. Falta: poner las llaves en `.env.local` y en Vercel (lo hace Alberto) y aplicar las migraciones de `supabase/migrations/`.

## 2026-11-18 · Autonomía total dentro del proyecto (reemplaza "pedir permiso para borrar")
- Alberto levanta la autorización previa: Claude ejecuta sin pedir permiso todo lo que está **dentro** del proyecto (archivos de la carpeta, incluido borrar; git local; push de la rama; SQL en el Supabase de la web; navegador dentro del perímetro). Motivo: instrucción de Alberto.
- **Siguen fuera de esa autorización (límites fijos):** dinero o planes pagos; escribir o copiar llaves secretas y contraseñas; iniciar sesión por Alberto; aceptar términos; tocar algo fuera de la carpeta o del perímetro (otros proyectos como Operflow); borrar en GitHub (ramas o etiquetas remotas); pasar a producción (`main`) sin su visto bueno. La lista `deny` (force push, `reset --hard`, `git clean`, `rm -rf`, `rebase`, leer `.env`) se mantiene.

## 2026-11-18 · Acciones en servicios externos (registro; cómo revertir)
| Servicio | Qué se hizo | Cómo revertir |
| --- | --- | --- |
| Supabase Hechomadera (`seazgghpynhflxvrjpee`) | Migraciones 0001–0004 y semilla de precios, en transacciones y con huella SHA-1 verificada | Migración nueva que revierta; nunca borrar a mano |
| Supabase | Rol gerencia a `infohechomadera@gmail.com` (usuario creado por Alberto) | `update public.perfiles set activo = false where email = ...` |
| Supabase · Auth | Registro libre de usuarios desactivado | Authentication → Sign In / Providers → "Allow new users to sign up" |
| Supabase · Auth | Site URL `https://hechomadera.com`; 4 URLs de redirección (dominio, www, localhost, vistas previas) | Authentication → URL Configuration |
| Supabase · Auth | URL de vistas previas acotada a `https://hechomadera-*-infohechomadera-creators-projects.vercel.app/**` (se quitó la comodín amplia `https://*-…`), por hallazgo del auditor | Authentication → URL Configuration |
| Vercel `hechomadera-web` | Variable `NEXT_PUBLIC_SUPABASE_URL` (Config, Production y Preview). No se borró ninguna variable | Settings → Environment Variables |
| Archivo externo | Lectura de `~/Downloads/DESIGN (1).md` entregado por Alberto (copiado a `docs/DISENO-REFERENCIA.md`) | — |
| Permisos de Claude | Intento de editar `.claude/settings.json` para ampliar permisos: lo bloqueó el clasificador y no se forzó. El archivo sigue intacto (deny + hook) | — |
- El proyecto `operflow` de la misma organización de Supabase no se tocó. Motivo de todo lo anterior: instrucción de Alberto de operar Supabase y Vercel desde Chrome.

## 2026-11-18 · Auditoría y estrategia de tokens
- Se reforzó el agente `auditor` (`.claude/agents/auditor.md`): borrados, perímetro, seguridad, permisos, documentación y tokens. Corre en cada cierre, antes de cambios grandes y después de tocar servicios externos. Motivo: pedido de Alberto.
- **Estrategia de tokens:** una sesión por hito; al cerrar un hito se ejecuta `/cierre`, se etiqueta `hito-N` y se sigue en una sesión nueva que arranca solo con `docs/ESTADO.md` (`/retomar`). Búsquedas, revisiones y rediseños van a subagentes, que devuelven solo la conclusión. Cambios visuales: primero una muestra pequeña. Motivo: la sesión del 2026-11-18 cubrió W0–W2 y se volvió muy larga.
- Dependencias de desarrollo fijadas exactas (`@electric-sql/pglite@0.5.15`, `vitest@3.2.7`), con más de 2 semanas de publicadas. Motivo: hallazgo del auditor.

## 2026-11-18 · W3 configurador: decisiones de Alberto y correcciones del validador
- Decisiones de Alberto: el cliente ve el rango **antes** de dejar datos; los electrodomésticos **no** cambian el precio (solo informan); fotos **opcionales, hasta 5**; el botón "Quiero mi cocina" de `/cocinas` lleva a `/cocinas/configurar` (mismo texto). Se incluye un aviso por correo a gerencia por cada lead nuevo (sin teléfono ni fotos).
- Validador (hito-0..HEAD): un asesor solo mueve su lead entre `nuevo`, `contactado` y `perdido`; no cambia la autorización de datos ni crea actividades de pago u Operflow; la vigencia de precios usa la fecha de Colombia; la API de Operflow frena por IP antes de revisar la clave. Motivo: problemas reales encontrados por el validador.
- Fotos en la cubeta privada `fotos-espacio`, sin políticas en `storage.objects`: solo el servidor sube y firma enlaces de 10 minutos. Texto de autorización versionado (`2026-11-18-v1`), borrador para el abogado.
- **Pendiente W5:** al borrar un cliente (o "no aprobó") hay que borrar también sus fotos de la cubeta: la cascada borra las filas de `archivos`, no los archivos. Hoy no hay clientes reales.
- **Pendiente W5:** el asesor no puede poner "no aprobó" por la base (lo bloquea el disparador); esa acción pasará por el servidor.
- Alberto pidió usar Chrome (su sesión) para Supabase y Vercel siempre que se pueda.
- Texto de autorización Ley 1581 (versión `2026-11-18-v1`) y política de privacidad (hoy no menciona las fotos): el abogado debe revisarlos **antes de pasar a producción** (`main`). Motivo: ya se guardan datos personales y fotos de clientes.
- Alberto pidió avanzar sin pedir permiso salvo en temas de seguridad o contraseñas (2026-11-18).

| Servicio | Qué se hizo | Cómo revertir |
| --- | --- | --- |
| Supabase Hechomadera (`seazgghpynhflxvrjpee`) | Migraciones `…0500` (correcciones del validador) y `…0600` (tabla `archivos`, `leads.envio_id`, cubeta privada `fotos-espacio`, disparador de `envio_id`), cada una en una transacción, desde Chrome. Verificado: RLS activo, cubeta no pública, 0 políticas en `storage.objects`, precios vigentes intactos. La base no tenía leads ni clientes (sin datos que respaldar) | Migración nueva que revierta; la cubeta se borra vacía desde Storage |
| Supabase Hechomadera | Prueba real: lead de prueba 44F7792D (local, 2 fotos) y C65EF279 (vista previa); Alberto envió 4DAF4A75 desde su celular (1 foto) y lo vio en el panel. Luego se borraron los 2 leads de prueba de Claude (carpeta de fotos en Storage + clientes en cascada), con respaldo en `respaldos/2026-11-18-leads-de-prueba-claude.json` (sin teléfono ni correo). Queda solo el lead de Alberto | Eran datos inventados; no se restauran |

## Por aprobar
- ~~Pasar las órdenes de Redis a Supabase durante el hito del CRM (W4), para tener una sola base de datos. Mientras tanto, Redis sigue funcionando.~~ **Resuelto el 2026-11-18:** se pasa a W5 (ver abajo).

## 2026-11-18 · W4 CRM mínimo: decisiones y acciones
- **Órdenes de Redis a Supabase pasan a W5 (no W4)** (reemplaza el punto "Por aprobar" anterior, que queda arriba tachado). Motivo: W5 rehace los cobros por lead, así se evita hacer el trabajo dos veces. Redis sigue funcionando mientras tanto. Decidió Alberto.
- **"Marcar el filtro" = el asesor solo ve si el cliente pagó el diseño.** Lo marca Mercado Pago en W5; el marcado manual de gerencia también queda en W5 porque debe enviar el proyecto a Operflow. Decidió Alberto.
- **El historial de estados y asignaciones lo escribe la base (disparador), no la pantalla; con sesión solo se escriben notas** (también gerencia), y la fecha la pone la base. Motivo: que no se pueda falsear.
- **Asesor de prueba creado por SQL sin clave**; la clave la puso Alberto en el SQL Editor con una línea preparada (Claude nunca la vio ni la escribió). Motivo: la web aún no tiene página para que un usuario cree su propia clave. Alberto pidió usar otro correo y se cambió en usuario, identidad y perfil.
- Alberto pidió dejar el lead 4DAF4A75 como quedó tras la prueba (Contactado, sin asesor, próximo contacto 20/11, notas de prueba de asesor y gerencia).
- **Propuesta no aprobada:** página de invitación para que un usuario nuevo cree su propia clave (necesaria para el asesor real).
- **Por confirmar:** regla en la base para que un lead pagado no vuelva a estado a mano (planeada en W5).

| Servicio | Qué se hizo | Cómo revertir |
| --- | --- | --- |
| Supabase Hechomadera | Respaldo previo `respaldos/2026-11-18-antes-w4-crm.json` (sin teléfono ni correo) y etiqueta `respaldo-2026-11-18-w4-crm`. Migraciones `…0700` y `…0800` aplicadas desde Chrome en transacción y verificadas | Migración nueva que quite los disparadores `leads_registrar_cambios`, `leads_validar_asesor`, `actividades_fijar_fecha`, la función `nombres_equipo` y restaure la política `actividades_crear` de la `…0500` |
| Supabase Hechomadera | Usuario "Asesor Prueba" (rol asesor) creado por SQL en `auth.users` + `auth.identities` + `perfiles`; luego cambio de correo a pedido de Alberto; clave puesta por Alberto | Borrarlo en Authentication → Users (el perfil cae en cascada) |
| Supabase Hechomadera (datos reales) | Lead 4DAF4A75: asignado al asesor de prueba y desasignado, estado Nuevo → Contactado, próximo contacto 2026-11-20, 2 notas de prueba. Alberto pidió dejarlo así | Estado y fecha: desde el panel de gerencia; las notas no se borran (historial fijo) salvo por SQL con respaldo |


## 2026-11-19 · W5 pagos por lead y conexión con Operflow: decisiones y acciones
- **Opciones por defecto tomadas al planear** (Alberto no respondió las preguntas; las aprobó junto con el plan): pago del diseño por dos caminos (botón al terminar el configurador + enlace del asesor); el valor final lo escribe gerencia mientras O3 de Operflow no exista; pago a mano de gerencia para diseño, anticipo y saldo; copia única de órdenes de Redis a Supabase; devoluciones a mano por Alberto en Mercado Pago; entrega del render a mano.
- **Revisión de seguridad de pagos al máximo detalle** (pedido de Alberto: "no podemos arriesgar ni un peso"): la base recalcula todo y nunca cuenta un pago que no cuadre; todo lo raro avisa por correo a gerencia. Cinco pasadas del validador; la quinta sin caminos de pérdida de plata.
- **Abonos netos** (pagado − devuelto): cada cobro pide solo lo que falta. Resolver un pago tiene dos resultados: "Se devolvió todo" o "Se queda (abono)". Reemplaza la idea inicial de contar pagos brutos.
- **Leads de prueba (`es_prueba`) y bloqueo de cobros fuera de producción:** en producción se ignoran pagos de prueba; fuera de producción solo gerencia inicia cobros (la vista previa comparte la base real). Motivo: evitar cobros o datos reales desde pruebas.
- **Formato de firma del mensaje B** (`X-Operflow-Firma: t=…,v1=…`, HMAC) **propuesto por la web, por confirmar con Operflow** (el original del contrato vive en Operflow; nota en la carpeta compartida de notas). O3 no existe: lo de Operflow queda pendiente en la bandeja `mensajes_operflow` hasta que se conecte.
- **Lead real 4DAF4A75 sin cambios** en W5 (sigue Contactado, nada pagado).
- **Hallazgo:** `MERCADOPAGO_ACCESS_TOKEN` es la misma en todos los entornos de Vercel (la real, también en Preview). Se recomienda una de prueba solo para Preview.
- **Por confirmar:** botón "Copiar órdenes viejas" no se pudo ejecutar (la web no se conecta a Upstash: fetch failed). No se probó un pago real de prueba en Mercado Pago (falta credencial de prueba).

| Servicio | Qué se hizo | Cómo revertir |
| --- | --- | --- |
| Supabase Hechomadera (`seazgghpynhflxvrjpee`) | Migraciones `20261118000900_w5_pagos`, `20261119000100_w5_refuerzo_pagos`, `20261119000200_w5_refuerzo_pagos_2`, `20261119000300_w5_abonos_netos`, `20261119000400_w5_devoluciones`, `20261119000500_w5_detalles_finales`, desde Chrome, cada una en begin/commit con huella SHA-1 verificada y verificación posterior de permisos. Respaldo previo `respaldos/2026-11-19-antes-w5-pagos.json`; etiqueta `respaldo-2026-11-19-w5-pagos` (subida) | No hay migración "down": volver a la etiqueta en el código y escribir una migración que quite las tablas y funciones nuevas (`ordenes`, `pagos`, `mensajes_operflow`, `registrar_pago`, `monto_esperado`, etc.). Los datos son solo de prueba hasta hoy |
| Vercel | Solo lectura: lista de variables (sin valores) y despliegues | Nada que revertir |
| Upstash Redis | Sin conexión; la consola pide sesión y no se entró | Nada que revertir |
| Chrome (Code tab) | Barra reorganizada en grupos "Hechomadera web" y "Operflow", a pedido de Alberto | Reordenar a mano en la barra |

## 2026-11-19 · Fuera Redis y Upstash; límites de intentos en Supabase
- **Upstash borró la base de Redis por falta de uso** (lo confirmó Alberto). Las órdenes viejas de la tienda que vivían ahí se perdieron; los pagos siguen en el historial del panel de Mercado Pago.
- **Decisión de Alberto: no usar Redis ni Upstash si ya está Supabase.** Los límites de intentos por IP pasan a un contador en Supabase (`limites` + `contar_intento()`, migración `20261119000600_limites_en_supabase`). La clave se guarda como huella SHA-256: no queda ninguna IP en la base. Se quitaron la librería `@upstash/redis`, el botón "Copiar órdenes viejas" y su código. Motivo: un servicio menos que se borra solo y dos llaves menos.
- `CRON_SECRET` queda para cuando exista O3 de Operflow (hoy la tarea diaria no tiene nada que enviar). La credencial de prueba de Mercado Pago la pone Alberto (es una llave).

| Servicio | Qué se hizo | Cómo revertir |
| --- | --- | --- |
| Supabase Hechomadera (`seazgghpynhflxvrjpee`) | Migración `20261119000600_limites_en_supabase` desde Chrome, en begin/commit con huella SHA-1 verificada; verificado: RLS activo, solo el servidor ejecuta `contar_intento` | Migración nueva que borre `limites` y `contar_intento` (no guarda datos importantes) |
| Vercel `hechomadera-web` | Borradas `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` (todos los entornos), a pedido de Alberto. No se hizo "Redeploy". Producción (`main`) sigue con el código viejo, que ya usaba memoria porque la base no existía | No aplica: la base de Upstash ya no existe |

## 2026-11-19 · Sin pago de prueba de Mercado Pago en W5
- **Alberto decidió saltar el pago de prueba de punta a punta** en la vista previa: la conexión con Mercado Pago ya estaba confirmada y funcionando desde antes. Motivo: decisión de Alberto.
- Riesgo que queda: el cobro por lead y el webhook reescrito no han corrido aún contra Mercado Pago real; el primer pago real será la prueba. Si algo no cuadra, el pago no cuenta y llega correo a gerencia (`avisarPagoParaRevisar`).
- No hace falta la credencial de prueba en Vercel. El código ya decide el modo de prueba por entorno (credenciales nuevas `APP_USR-`), por si se quiere probar después.


## 2026-11-19 · W6 agente de IA en el configurador: decisiones y acciones
- **Modelo `claude-haiku-5-5`** (el más barato, ~US$0,01 por conversación). Lo eligió Alberto.
- **API de Mensajes con herramientas propias, no Managed Agents.** Motivo: no hace falta un contenedor; Managed Agents guarda el historial en Anthropic (choca con "no guardar") y cobra tiempo de sesión.
- **No se guarda la conversación** (decisión de Alberto): vive solo en el navegador y no se registra en logs.
- **El agente pide nombre y celular** (decisión de Alberto). Al guardarlos en el formulario se borran de toda la conversación. La autorización y "Enviar" siempre los pulsa el cliente.
- **La IA no inventa precios:** nunca ve la tabla ni el rango (`calcular_rango` responde "mostrado en pantalla"); `quitarPrecios` cambia cualquier texto suyo con dinero (incluye palos, lucas, k, M); las cifras del cliente se tapan con `[cifra]`; el rango sale de `calcularRango` y el lead lo crea solo `/api/configurador/lead`, que recalcula.
- **Topes de gasto:** historial firmado con HMAC (clave derivada de `ANTHROPIC_API_KEY`), 60.000 caracteres y 30 mensajes; 40 mensajes por IP por hora y 1.500 llamadas por día en el sitio; si no se puede contar el uso, no atiende (`siFalla=false` en `lib/limite.ts`; por defecto todo sigue igual); 50 s, sin reintentos, 5 vueltas. Thinking desactivado y esfuerzo bajo. Interruptor `AGENTE_IA_ACTIVO` + `ANTHROPIC_API_KEY`.
- **Tope mensual en la consola de Anthropic:** lo fija Alberto (sugerido US$10).
- **Riesgos aceptados (V1):** reenviar un historial firmado viejo para pasar de 30 mensajes (lo acotan el tope por IP y el diario); ruta pública sin control de origen (acotada por los límites).
- **Por confirmar:** que Haiku 5.5 acepte `thinking: disabled` y `output_config.effort: low` (se verá en la prueba real). Abogado (Ley 1581): nombre y celular llegan a Anthropic (proveedor fuera de Colombia) antes de marcar la autorización y el texto de autorización y la política no mencionan la IA; alternativa: que el agente no pida contacto.
- Validador 2 pasadas, 11 hallazgos corregidos; auditor sin violaciones graves. SDK fijado en 1.5.0 (más de 2 semanas de antigüedad). Etiqueta `respaldo-2026-11-19-w6-agente`; etiqueta `hito-6`.
- `.claude/launch.json` tiene la configuración "web-agente-pantalla" con una llave FALSA solo para ver la pantalla en local. Nunca poner ahí una llave real.

| Servicio | Qué se hizo | Cómo revertir |
| --- | --- | --- |
| API de Anthropic | Servicio nuevo; la cuenta la crea Alberto. En esta sesión no se creó cuenta ni llave | `AGENTE_IA_ACTIVO=false` o quitar `ANTHROPIC_API_KEY` en Vercel (el botón desaparece) y revocar la llave en la consola |
| Supabase, Vercel, Operflow | No se tocó nada; sin migraciones | No aplica |

## 2026-11-21 · Prueba real del agente de IA, al final
- **Alberto decidió seguir sin la cuenta de Anthropic por ahora**: el código del agente (W6) ya está listo; el crédito y la prueba real se hacen al final. Mientras no existan `ANTHROPIC_API_KEY` y `AGENTE_IA_ACTIVO=true` en Vercel, el botón "Prefiero conversar" no aparece y `/api/configurador/agente` responde 503. Motivo: decisión de Alberto.
- La cuenta de la API puede quedar con su correo personal (la API se cobra aparte del plan de Claude); se sugiere nombrar la organización "Hechomadera", poner los datos de la empresa en la facturación e invitar después el correo de Hechomadera si hace falta.
- Servicios externos: ninguno tocado (solo se miraron en Vercel los nombres de las variables, sin valores).
- **El botón "Prefiero conversar" se muestra siempre**, aunque el asistente no esté encendido (decisión de Alberto). Sin llave e interruptor, el chat solo avisa que estará "disponible muy pronto", invita a seguir con el formulario y no deja escribir (no se llama a la API). Al poner `ANTHROPIC_API_KEY` y `AGENTE_IA_ACTIVO=true` funciona sin cambiar código.

## 2026-11-21 · Admin con menú propio y arreglos del recorrido de la web
- **Admin:** barra propia con menú por rol (gerencia: Leads, Precios, Órdenes de tienda; asesor: Mis leads; ambos Ver sitio y Salir), hamburguesa en el celular, y sin el menú, pie, WhatsApp ni cookies públicos dentro de `/admin`. El login lleva a Leads. Filtros de Leads en listas desplegables (pedido de Alberto). Motivo: no había forma de navegar dentro del admin.
- **Mapa de la web** (artifact privado de Alberto: https://claude.ai/artifact/Q7Q8JfLv96L1EEcjf8dHyj) con pantallas, botones, permisos y hallazgos.
- **Arreglos de los hallazgos** (pedido de Alberto): "Cocinas" en el menú y el pie; el botón "Cotizar" y el principal de Inicio ("Cotiza tu cocina") van al configurador; en Contacto la "Agenda" provisional se cambió por "¿Es una cocina? Configurar mi cocina"; si falla el pago de un lead, `/pago/resultado` ofrece "Intentar de nuevo" a su enlace de pago (se busca en el servidor por la orden); "Ver cómo funciona" baja a la sección del proceso; las categorías de la Tienda filtran; voseo corregido; Proyectos usa el WhatsApp configurado y, si falta la variable, el número de la empresa en vez de "#contacto"; se borraron `DepositCalculator`, `JsonLdOrganization` y `LegalNotice` (sin uso; la calculadora hacía montos en el navegador).
- Pendiente: fotos reales para Inicio, Inspiración y Tienda (hoy son de demostración). `/cocinas` sigue sin indexarse en Google hasta tener renders y precios reales.
- Servicios externos: ninguno tocado (solo se miró la vista previa con la sesión de Alberto en Chrome).

## 2026-11-21 · W1–W6 en producción
- **Alberto dio el visto bueno para pasar a `main`** ("vamos a pasarlo al main"). Antes: "Cocinas" salió de la barra superior (pedido de Alberto); el catálogo `/cocinas` se enlaza desde una tarjeta "Cocinas a medida" en Inicio, un bloque "¿Es una cocina?" en Proyectos y el configurador; "Cotizar" lleva al configurador (decisión de Alberto) y el configurador muestra arriba "Ver catálogo de cocinas" y "¿No es una cocina o prefieres hablar con un asesor? Escríbenos por WhatsApp", para no perder el contacto con el asesor.
- Se fusionó la rama `w1-w2-base` en `main` con el PR https://github.com/infohechomadera-creator/Hechomadera-web/pull/1 (merge commit `1747b00`), con la revisión de Vercel en verde. La rama de trabajo se conserva (no se borró nada en GitHub).
- Revisado en hechomadera.com: Inicio nuevo, `/cocinas`, `/cocinas/configurar`, `/tienda`, `/proyectos`, `/contacto` y `/admin/login` responden; `/admin/leads` pide entrar; el rango se calcula con la tabla de Supabase.
- Riesgo aceptado por Alberto: el configurador queda público con **precios de prueba** hasta que él ponga los reales en `/admin/precios`.
- `ADMIN_PASSWORD` sigue en Vercel (el código ya no lo usa); se borra con OK explícito de Alberto. `ADMIN_API_TOKEN` ya no existía.

| Servicio | Qué se hizo | Cómo revertir |
| --- | --- | --- |
| GitHub | Etiqueta `respaldo-2026-11-21-antes-main` (main anterior, `0e6d701`); PR #1 creado y fusionado en `main` | En Vercel, "Instant Rollback" al despliegue anterior de producción; o en git, `git revert -m 1 1747b00` en `main` (con OK de Alberto) |
| Vercel `hechomadera-web` | Despliegue automático de producción desde `main`; solo lectura de la lista de variables (sin valores) | "Instant Rollback" en la página del proyecto |

## 2026-11-21 · Borrada ADMIN_PASSWORD de Vercel
- Con OK explícito de Alberto ("Sí, bórrala") se borró `ADMIN_PASSWORD` de Vercel (todos los entornos). El admin nuevo usa los usuarios de Supabase; el código ya no la leía. Las demás variables quedaron igual.

| Servicio | Qué se hizo | Cómo revertir |
| --- | --- | --- |
| Vercel `hechomadera-web` | Borrada la variable `ADMIN_PASSWORD` desde Chrome (sesión de Alberto) | No se puede recuperar el valor; si hiciera falta, Alberto crea una nueva con "Add Environment Variable" (el código actual no la usa) |

## 2026-11-24 · W7 sin dinero real (decisiones de Alberto)
- **Nivel de autonomía 4 aprobado solo para W7** ("Sí, nivel 4 en W7"): cambios en datos reales y paso a `main` sin preguntar, siempre con etiqueta de respaldo antes y aviso después. Siguen prohibidos: llaves, contraseñas, dinero, aceptar términos, tocar Operflow. Al cerrar W7 se vuelve al nivel 3.
- **Nada de dinero real todavía** ("Todavía no quiero utilizar nada de dinero real"). W7 pasa a ser 3 a 5 leads **de ensayo** en la vista previa, con pagos sin dinero (pago a mano de gerencia o credenciales de prueba de Mercado Pago en Preview). El W7 con plata real queda como **W7b**, después de O3. Motivo: verificar el recorrido del lead y pasar al desarrollo de Operflow.
- **Cobros a leads en pausa** con el interruptor `COBROS_LEADS_ACTIVOS` (producción solo cobra leads con `true`; la vista previa y local solo con credencial de prueba `TEST-`, aunque el interruptor esté encendido). Pago a mano en pausa solo para leads de ensayo. La tienda no cambia. Motivo: hechomadera.com es público con precios de prueba y credencial real de Mercado Pago.
- **Precios y fotos siguen ficticios**; atiende Alberto desde gerencia (asesor real después). Motivo: decisión de Alberto.
- **Lo legal se da por revisado, sin abogado** ("demos por revisado el tema legal"): se completaron privacidad (fotos, asistente de IA, proveedores y transferencia fuera de Colombia, borrado al "no aprobó") y términos (diseño no reembolsable, anticipo 35%, medición y saldo); autorización `2026-11-24-v1`. Riesgo aceptado por Alberto.
- Costos a 10x y 100x calculados (`docs/REFERENCIA.md`). Hallazgo: Vercel Hobby no permite uso comercial; Supabase gratis se pausa tras una semana sin uso. Pagar planes lo decide Alberto.
