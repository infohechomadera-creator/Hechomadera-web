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

| Servicio | Qué se hizo | Cómo revertir |
| --- | --- | --- |
| Supabase Hechomadera (`seazgghpynhflxvrjpee`) | Migraciones `…0500` (correcciones del validador) y `…0600` (tabla `archivos`, `leads.envio_id`, cubeta privada `fotos-espacio`, disparador de `envio_id`), cada una en una transacción, desde Chrome. Verificado: RLS activo, cubeta no pública, 0 políticas en `storage.objects`, precios vigentes intactos. La base no tenía leads ni clientes (sin datos que respaldar) | Migración nueva que revierta; la cubeta se borra vacía desde Storage |
| Supabase Hechomadera | Prueba real: lead de prueba 44F7792D (local, 2 fotos) y C65EF279 (vista previa); Alberto envió 4DAF4A75 desde su celular (1 foto) y lo vio en el panel. Luego se borraron los 2 leads de prueba de Claude (carpeta de fotos en Storage + clientes en cascada), con respaldo en `respaldos/2026-11-18-leads-de-prueba-claude.json` (sin teléfono ni correo). Queda solo el lead de Alberto | Eran datos inventados; no se restauran |

## Por aprobar
- Pasar las órdenes de Redis a Supabase durante el hito del CRM (W4), para tener una sola base de datos. Mientras tanto, Redis sigue funcionando.
