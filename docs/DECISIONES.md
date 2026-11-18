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

## Por aprobar
- Pasar las órdenes de Redis a Supabase durante el hito del CRM (W4), para tener una sola base de datos. Mientras tanto, Redis sigue funcionando.
