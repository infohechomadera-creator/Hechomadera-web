# Traspaso: Web Hechomadera · Momento 1 (v0.1 · 2026-11-17)

> **Dónde va:** repositorio `Hechomadera-web`, como `docs/TRASPASO-MOMENTO-1.md`. Junto a este archivo va la copia de `docs/CONTRATO-INTEGRACION.md`.
> **Para Claude Code:** lee este archivo completo una vez. Luego aplica el kit técnico del estándar (sección 6) antes de construir cualquier cosa.

## 1. Qué es este proyecto
La web de Hechomadera, una carpintería digital (casi 100% remota, excepto la instalación), en varias ciudades y con miras a varios países. En el Momento 1 la web es la puerta de entrada del cliente y el centro comercial:
- Configurador de cocinas con agente de IA.
- Catálogo, tienda y rango de precio.
- **Leads y CRM.**
- Cobros con Mercado Pago.

Lo que pasa después de que el lead se aprueba (diseño, producción, calidad, instalación) vive en **Operflow**, que es otro repositorio. Este proyecto se comunica con Operflow **solo** a través del contrato de integración. No se copia código ni datos de Operflow aquí.

## 2. Estado actual (revisado el 2026-11-17, solo lectura)
- **Tecnología:** Next.js 15, React 19, Tailwind, Vercel, Upstash Redis y Vercel Analytics. **No tiene Supabase.**
- **Páginas:** inicio, nosotros, contacto, proyectos, inspiración, tienda y tienda/[slug], pago/resultado, pago/prueba (oculta en producción), legal (términos, privacidad, cookies), admin/login, admin/orders.
- **Pagos:** Mercado Pago Checkout Pro ya funciona. Crea la preferencia con `order_id` como referencia externa y tiene webhook con firma en `/api/payments/mercadopago/webhook`. También hay métricas y eventos del webhook.
- **Órdenes:** se guardan en Upstash Redis (si Redis falla, se guardan en memoria). Hay un panel admin protegido con un solo token (`ADMIN_API_TOKEN`) que exporta a CSV.
- **Contacto:** `POST /api/contact` envía el correo con Resend; hay botón de WhatsApp.
- **Catálogo:** `content/products.json`.
- **Reglas de negocio:** están en `lib/site-config.ts` (ciudades, marketplace a precio fijo, proyectos con "precio desde" y abono del 35%).
- **Documentos existentes:** `docs/` (dominio, cutover, Resend, admin, checklist de lanzamiento, migración, Mercado Pago). Algunos mencionan a Cursor como agente; desde ahora se trabaja con Claude Code.
- **Historia:** 55 commits; el último es del 2026-03-24 (SEO y páginas legales).
- **Limpieza hecha:** el 2026-11-17 se borraron dos archivos de otro proyecto que estaban en `docs/` (no estaban en git).
- **Falta el kit del estándar:** no hay `CLAUDE.md`, agentes, hook anti-secretos ni bloqueo de lectura de `.env`.

## 3. Decisiones tomadas (2026-11-17)
| Decisión | Motivo |
| --- | --- |
| Los leads y el CRM viven en la web | Alberto va a construir el CRM aquí; la web es el centro comercial |
| Operflow recibe solo proyectos que pasaron el filtro | Cada dato tiene un solo dueño; Operflow es para operar |
| **El filtro es pagar el diseño.** Tiene precio fijo por producto (cocina $300.000, closet $150.000, mueble de baño $150.000, centro de entretenimiento $200.000, puerta $100.000, escritorio $100.000) y se descuenta del anticipo. El pago confirmado por Mercado Pago envía el proyecto a Operflow automáticamente | Solo se diseña para quien ya puso dinero |
| El anticipo se paga cuando el cliente aprueba el diseño, para empezar a producir: 35% del valor final menos el diseño ya pagado | Se cobra sobre el valor final, no sobre un rango |
| No hay tolerancia de precio: el valor final se recalcula con las medidas confirmadas y la diferencia se refleja en el saldo | Decisión de Alberto |
| Si el cliente no aprueba, recibe **solo el render** | Protege planos y despiece |
| Supabase de la web en **plan gratis**, proyecto aparte del de Operflow | Decisión de Alberto; antes de recibir clientes reales se evalúa pasar a Pro (requiere aprobación) |
| Si tras medir el cliente no acepta el valor ajustado: se devuelve el anticipo menos el costo de la visita de medición; el diseño no se devuelve (2026-11-18) | Decisión de Alberto; va en los términos |
| Promesa al cliente: propuesta en **máximo 48 horas** después de pagar el diseño | Decisión de Alberto |
| Todas las facturas se hacen por fuera del sistema; la web solo registra los pagos | Decisión de Alberto |
| Mercado Pago ya está operativo en producción | Confirmado por Alberto |
| Ciudades: **Barranquilla y Santa Marta** el primer semestre; luego 5 ciudades más en Colombia. Precios por ciudad desde el inicio | Decisión de Alberto |
| Equipo hoy: 1 asesor y 1 diseñador; la gerencia asigna los leads a mano | Situación actual |
| Catálogo e imágenes: genéricos o provisionales; Alberto los cambia después. Precios genéricos de ejemplo, editables desde el panel | Decisión de Alberto |
| Avisos al cliente solo por correo (Resend, ya activo con dominio verificado); WhatsApp lo hace el asesor a mano | Decisión de Alberto |
| El dominio `hechomadera.com` ya apunta a Vercel | Confirmado por Alberto |
| Agente de IA (W6): aún no hay cuenta de API de Anthropic. Se crea al llegar a W6, con tope de gasto mensual aprobado por Alberto | Cuesta dinero: requiere aprobación |
| Se empieza por la web (sesión propia de Claude Code); Operflow va en otra sesión | Decisión de Alberto. W0–W4 no dependen de Operflow; W5 necesita el hito O3 de Operflow |
| Si el cliente no aprueba: no se devuelve el diseño, el diseño es suyo, Hechomadera no lo usa y se borran sus datos (excepto lo que la ley obliga a guardar del pago) | Decisión de Alberto; debe quedar en los términos y la política de privacidad |
| Cobros con Mercado Pago en la web; Operflow solo registra el pago | Mercado Pago ya está conectado aquí; los pagos de Operflow son otro tema (comercial, más adelante) |
| La web usa su propio Supabase para leads, CRM, usuarios, fotos y precios. **Hay que crearlo** (no existe) | Redis no sirve para un CRM con usuarios, permisos y relaciones. Proyectos separados por regla |
| La tabla de precios por ciudad vive en la web y es la única fuente. Operflow la consulta en modo lectura para la cotización final | Un solo lugar donde Alberto edita precios |
| Autonomía: Claude trabaja sin preguntar dentro de esta carpeta (editar, commits, push, pruebas), pero **pide autorización para borrar cualquier archivo o dato y para tocar algo fuera de la carpeta** | Decisión de Alberto |
| Siempre se pide permiso para: dinero, contraseñas o inicios de sesión, y aceptar términos | Estándar de proyecto |

**Recomendación (por aprobar):** pasar también las órdenes de Redis a Supabase durante el hito del CRM, para tener una sola base de datos. Mientras tanto, Redis sigue funcionando.

## 4. Alcance del Momento 1 en la web
**Entra:**
1. **Catálogo de cocinas:** 4 formas (lineal, L, U, isla) × 5 diseños base = 20 escenas con sus renders. Hasta tener renders se usan imágenes provisionales.
2. **Rango de precio:** fórmula fija por metro lineal más adicionales (diseño, colores, nivel de herrajes, isla) y por ciudad (Barranquilla y Santa Marta al inicio). Los precios son genéricos de ejemplo y editables por gerencia.
3. **Configurador:** primero un formulario guiado paso a paso (funciona sin IA). Recoge forma, diseño, colores, herrajes, electrodomésticos, medidas aproximadas, fotos del espacio, datos de contacto y autorización de datos. Al final muestra el rango y la imagen de referencia.
4. **Agente de IA** encima del configurador: conversa, resuelve dudas y llena el mismo formulario. Va después, cuando el formulario ya funciona.
5. **CRM mínimo:** lista de leads, estado, asesor asignado, notas, próximo contacto, qué pagó (nada, diseño, anticipo o saldo) y el estado que llega de Operflow. También tiene la acción "no aprobó", que entrega el diseño y borra los datos (contrato, mensaje E).
6. **Usuarios de la web:** gerencia (ve todo) y asesor (ve sus leads). Reemplaza el token único del admin.
7. **Integración con Operflow** según el contrato: enviar el proyecto, recibir avisos y registrar pagos.
8. **Cobros con Mercado Pago** (reusa lo que ya existe, con valor variable por lead):
   - Al final del configurador, el cliente ve el rango y el botón **"Pagar diseño $300.000 (se descuenta de tu cocina)"**.
   - Cuando aprueba la propuesta, paga el anticipo: 35% del valor final menos los $300.000 del diseño. El saldo se calcula con el valor recalculado tras confirmar medidas.
   - Cada pago confirmado se registra en el lead y se avisa a Operflow.
   - El valor del diseño por producto vive en la tabla de precios, editable por gerencia.
9. **Términos y privacidad:** agregar las reglas del pago del diseño (no se devuelve, el diseño es del cliente, no se reutiliza, borrado de datos). Lo revisa un abogado.

**No entra (Momento 2 o después):**
- Integración con WhatsApp: el asesor comparte el enlace a mano.
- Agenda sincronizada.
- Tablero de métricas avanzado.
- Otros productos además de cocinas.
- Motor CAD propio.

## 5. Hitos propuestos (borrador, para aprobar)
| # | Hito | Qué se ve funcionando | Depende de |
| --- | --- | --- | --- |
| W0 | Kit técnico y limpieza | `CLAUDE.md`, ajustes, agentes, `docs/ESTADO.md`; documentos de Cursor actualizados | – |
| W1 | Base de datos y usuarios | Alberto crea el proyecto de Supabase (inicio de sesión y plan son suyos); Supabase conectado; tablas de leads, clientes y actividades; login de gerencia y asesor; permisos por fila (RLS) con pruebas por rol | W0 |
| W2 | Catálogo y rango de precio | Página de cocinas con las 20 escenas (provisionales); tabla de precios por ciudad editable por gerencia; cálculo del rango probado; consulta de precios para Operflow (solo lectura) | W1 |
| W3 | Configurador guiado | Un cliente completa el formulario en el celular, sube fotos, autoriza datos, ve el rango y queda como lead | W2 |
| W4 | CRM mínimo | El asesor ve sus leads, cambia estados, deja notas y marca el filtro | W3 |
| W5 | Pagos y conexión con Operflow | El pago del diseño crea el proyecto en Operflow; el CRM recibe los avisos; el anticipo y el saldo se registran en Operflow; "no aprobó" entrega el diseño y borra los datos en ambos lados | W4 y el hito O3 de Operflow |
| W6 | Agente de IA | El cliente conversa y el agente llena el configurador | W3 |
| W7 | Prueba real | De 3 a 5 leads reales recorren el flujo completo | Todo |

## 6. Kit técnico a crear en W0 (según el estándar)
- `CLAUDE.md` con perímetro: carpeta `/Users/albertocotesd/Desktop/AUTOMATIZACION_IA/HECHOMADERA`, repositorio `infohechomadera-creator/Hechomadera-web`, servicios: Vercel, Supabase de la web, Upstash Redis, Mercado Pago y Resend de esta web.
- `.claude/settings.json` con la lista `deny` del estándar: no leer `.env`, sin force push, sin `reset --hard`, sin `git clean`, sin `rm -rf`, sin `rebase`.
- Además, que **cualquier borrado pase por autorización** (quitar `git rm` de la lista de permitidos) y el hook anti-secretos.
- **Riesgo:** los permisos actuales (`.claude/settings.local.json`) permiten `curl`, `python3` y `node` sin preguntar. Con esos comandos se podría borrar o enviar archivos sin pedir permiso. Recomiendo pasarlos a "preguntar".
- Agentes `validador`, `archivista` y `auditor`. Skills `retomar` y `cierre`.
- `PRODUCTO.md`, `PLAN.md` y `docs/` (ESTADO, DECISIONES, REFERENCIA, hitos/hito-0.md). Este traspaso es la base para llenarlos.

## 7. Preguntas abiertas
Ninguna bloquea el arranque. Para más adelante:
1. Los 5 diseños base definitivos. Propuesta provisional: moderno liso con gola, clásico (shaker), nórdico en madera clara, industrial oscuro y minimalista mate con madera.
2. El costo de la visita de medición, para el caso de devolución.
