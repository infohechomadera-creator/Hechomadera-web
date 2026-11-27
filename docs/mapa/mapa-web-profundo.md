# Mapa profundo de la web Hechomadera
> Hecho el 2026-11-26 leyendo el **código actual** de la rama `w1-w2-base` (commit `0cf9626`), no el mapa viejo `mapa-hechomadera.html`.
> Para el PDF conjunto web + Operflow. En español simple. Donde dice "archivo:línea" es para quien quiera revisar el código.

---

## 0. Resumen en 10 líneas
1. La web tiene tres partes: **la vitrina** (portada, tienda, proyectos, inspiración, nosotros, contacto), **el configurador de cocinas** (da un rango de precio y crea un "lead") y **el panel interno** `/admin` (CRM de leads, precios y órdenes).
2. Hay dos roles con cuenta: **gerencia** y **asesor**. El cliente nunca tiene cuenta.
3. La cocina a medida se cobra en tres partes: **diseño** (fijo, hoy $300.000 de prueba), **anticipo** (35 % del valor final menos el diseño) y **saldo** (valor medido menos lo pagado).
4. **Los cobros a clientes están en pausa en producción** (`COBROS_LEADS_ACTIVOS` sin valor). Nadie puede pagar un diseño en hechomadera.com hoy. La tienda sí cobra.
5. Al pagarse el diseño, la base deja en una bandeja el **mensaje A** para crear el proyecto en Operflow; con cada anticipo o saldo, un **mensaje C**; al "No aprobó", un **mensaje E**.
6. Operflow avisa a la web con el **mensaje B** (cambios de etapa, propuesta lista, valor ajustado, entregado, cancelado).
7. Hoy la web **no está conectada** a Operflow: faltan las variables en Vercel. Los mensajes esperan en la bandeja.
8. El asistente de IA está **construido pero apagado** (no hay llave de Anthropic).
9. Precios y fotos son **de prueba**. Lo legal se dio por revisado sin abogado.
10. Hitos W0 a W7 cerrados (W7 sin dinero real). Falta W7b (clientes reales con dinero) después de que Operflow O3 esté conectado.

---

## 1. Roles

| Rol | Quién es | Cómo entra | Qué menú ve |
| --- | --- | --- | --- |
| **Cliente sin cuenta** | Cualquier visitante | Abre hechomadera.com. No inicia sesión nunca | Menú público: Inicio, Tienda, Proyectos a medida, Inspiración, Nosotros, Contacto. Botones arriba: "Comprar" (tienda), "Cotizar" (configurador), "WhatsApp". Botón flotante de WhatsApp. Pie con legal (términos, privacidad, cookies), Instagram y WhatsApp |
| **Asesor** | Vendedor del equipo | `/admin/login` con correo y contraseña (Supabase). Al entrar va a `/admin/leads` | Solo **"Mis leads"**, "Ver sitio" y "Salir". Solo ve **sus** leads (los que gerencia le asignó) |
| **Gerencia** | Alberto (y quien tenga ese rol) | Igual que el asesor | **"Leads"**, **"Precios"**, **"Órdenes de tienda"**, "Ver sitio" y "Salir". Ve todo |
| **Sistema: Mercado Pago** | El aviso automático de pago (webhook) | `POST /api/payments/mercadopago/webhook` | — |
| **Sistema: tarea diaria** | Cron de Vercel, 8:00 a. m. Colombia | `/api/integraciones/reintentar` con `CRON_SECRET` | — |
| **Sistema: Operflow** | La app de producción | Envía B a `/api/integraciones/operflow` (firmado) y consulta D en `/api/integraciones/precios` (con clave) | — |

**Cómo se protege cada rol**
- Los roles viven en la tabla `perfiles` (`gerencia` o `asesor`, y si está activo). Un perfil inactivo no entra.
- Un "portero" (`middleware.ts`) revisa cada visita a `/admin`:
  - sin sesión → al login;
  - asesor → solo `/admin/leads` y la ficha de un lead; si intenta otra página, vuelve al login con "Tu usuario no tiene acceso a esta sección".
- Además, la base de datos tiene **reglas por fila (RLS)**: aunque alguien se saltara la pantalla, el asesor solo puede leer o cambiar sus leads, sus clientes, sus fotos y sus pagos.
- Hay campos que **nadie con sesión** puede cambiar a mano, ni gerencia: estado del pago, valor final, enlace de pago, datos de Operflow y la marca "es de prueba". Solo los cambia el sistema.
- **No hay pantalla para crear usuarios.** Los asesores se crean por fuera, en Supabase.

---

## 2. Pantallas por rol

### 2.1 Cliente sin cuenta

| Ruta | Qué muestra | Botones y a dónde llevan | Qué guarda o activa |
| --- | --- | --- | --- |
| `/` Inicio | Portada: "Cotiza tu cocina", 3 pasos del proceso, tarjetas Tienda / Cocinas / Proyectos (dice "abono del 35 %"), galería (fotos de prueba), 10 ciudades de cobertura | "Cotiza tu cocina" → configurador; "Ver cómo funciona" → misma página; "Ver el proceso completo" y "Cotizar mi proyecto" → `/proyectos`; "Consultar disponibilidad" → `/contacto`; WhatsApp | Nada. Las reseñas están ocultas (pendiente) |
| `/tienda` | Catálogo de productos (archivo `content/products.json`), filtros por categoría, precio y orden | Cada producto → su ficha | Nada (solo analítica) |
| `/tienda/<producto>` | Fotos, precio, "envío no incluido" | **"Comprar"** → Mercado Pago (ver flujo Tienda); "Preguntar por WhatsApp"; "Volver a la tienda" | Crea una **orden de tienda** y va a Mercado Pago. Promete "confirmación por email inmediata" y "asesor en menos de 3 horas" |
| `/cocinas` | 20 combinaciones (4 formas × 5 diseños) con precio "Desde" por ciudad, y los pasos (paga el diseño, anticipo 35 %) | "Quiero mi cocina" → configurador | Nada. No está en el menú y no la indexa Google |
| `/cocinas/configurar` | **El configurador** (9 pasos, ver 4.1) | "Siguiente", "Ver mi rango", subir fotos, "Prefiero conversar" (asistente) | Crea cliente + lead + fotos; correo a gerencia |
| `/proyectos` | Qué incluye un proyecto a medida, línea de tiempo de 5 fases, calculadora rápida (tabla fija propia, no la de precios real), test de estilo de 8 preguntas, guía de medidas en PDF | WhatsApp, `/contacto`, configurador, `/cocinas` | Nada |
| `/inspiracion` | Galería (imágenes de prueba) | `/proyectos`, `/tienda`, `/contacto` | Nada |
| `/nosotros` | Texto de la empresa | `/proyectos`, WhatsApp | Nada |
| `/contacto` | Formulario y caja "¿Es una cocina?" | "Enviar" → correo a gerencia; "¿Es una cocina?" → configurador | **No guarda** nada en la base; solo manda el correo |
| `/legal/terminos` | Términos; sección 4: diseño no reembolsable, anticipo 35 % menos diseño, saldo, devolución del anticipo menos la visita | — | — |
| `/legal/privacidad` | Ley 1581: fotos, asistente de IA (Anthropic, EE. UU.), proveedores fuera de Colombia, borrado al "No aprobó" | — | — |
| `/legal/cookies` | Cookies | — | — |
| `/pago/lead/<enlace>` | Página de pago del cliente (diseño, anticipo o saldo). Solo muestra producto, ciudad y valor, nunca datos personales | "Pagar $X con Mercado Pago" | Hoy en producción **muestra "el pago en línea está en pausa"** |
| `/pago/resultado` | Resultado al volver de Mercado Pago: aprobado, pendiente o rechazado | "Intentar de nuevo", "Volver a la tienda", "Ir al inicio", WhatsApp | Consulta el estado real en Mercado Pago |
| `/pago/prueba` | Cobro de prueba de $5.000 | — | Solo gerencia y solo si `ENABLE_PAYMENT_TEST_PAGE=true` |

**Aviso de cookies:** el cliente elige "aceptar" o "solo necesarias". Google Analytics solo se carga si acepta. En la página de pago nunca se carga.

### 2.2 Asesor

| Ruta | Qué muestra | Qué puede hacer | Qué guarda o activa |
| --- | --- | --- | --- |
| `/admin/leads` "Mis leads" | Sus leads, ordenados por **próximo contacto** (los vencidos en rojo). Cada fila: nombre y teléfono, ciudad, forma, diseño, fotos, "Pasó el filtro" (pagó el diseño) o "Sin pagar el diseño", rango, estado, fecha | Filtrar por estado y por "pagó el diseño" | Nada |
| `/admin/leads/<id>` Ficha | Datos del cliente y la cocina, fotos (enlace de 10 min), rango, autorización de datos, historial, pagos, mensajes a Operflow | Ver abajo | Ver abajo |

**Botones del asesor en la ficha**

| Botón | Qué guarda | Qué activa |
| --- | --- | --- |
| Cambiar estado (Nuevo / Contactado / Perdido) | `leads.estado` | Anota en el historial. Solo entre esos 3; los demás estados los pone el sistema |
| Próximo contacto + "Guardar" | `leads.proximo_contacto` (de hoy a un año) | Ordena su lista |
| "Guardar nota" | Nota en el historial (hasta 2.000 letras) | — |
| **"Marcar 'No aprobó'"** (con la casilla "Ya le entregué el render al cliente") | Borra datos personales, fotos y notas; estado "No aprobó" | **Mensaje E** a Operflow; cierra los cobros abiertos en Mercado Pago |
| Copiar enlace de pago | — | Solo aparece si los cobros están activos (hoy no en producción) |

El asesor **no** puede: asignar leads, poner el valor final, registrar pagos a mano, resolver devoluciones, reenviar a Operflow ni borrar un cliente.

### 2.3 Gerencia
Todo lo del asesor, más:

| Ruta | Qué muestra | Botones | Qué guarda o activa |
| --- | --- | --- | --- |
| `/admin/leads` "Leads" | Todos los leads, del más nuevo al más viejo; columna de asesor | Filtro extra por asesor ("Sin asignar" o una persona) | — |
| `/admin/leads/<id>` | Igual que el asesor y además: | **Asignar asesor** | `leads.asesor_id`; anota "Asignado a X" |
| | | **"Valor final de la propuesta"** / **"con medidas confirmadas"** (y "Corregir") | `valor_final` (pasa a "Propuesta enviada") o `valor_final_medido`. Con eso se calcula el anticipo o el saldo. No avisa a nadie |
| | | **"Registrar a mano: <tipo> por $X"** (nota obligatoria) | Crea una orden y un pago "a mano" por el monto que calcula el servidor. Igual que un pago real: cambia el estado, deja el **mensaje A o C** y manda correos. **Con cobros en pausa solo funciona en leads de prueba** |
| | | **"Se devolvió todo"** / **"Se queda (abono)"** (en pagos "para revisar") | Resuelve el pago. "Se queda" puede completar el tipo y soltar el A o C |
| | | **"Reenviar a Operflow"** | Vuelve a intentar ya los mensajes pendientes o fallidos de ese lead |
| | | **"Borrar los datos de este cliente"** (hay que escribir BORRAR) | Si nunca pagó nada: borra todo. Si hay pagos: deja el cliente anónimo y conserva los pagos (ver 4.4) |
| `/admin/precios` | Precios vigentes por ciudad (Barranquilla, Santa Marta) y las últimas 15 versiones con su autor | "Guardar precios de <ciudad>" con fecha de inicio | Publica una **versión nueva** (las viejas no se cambian). Actualiza `/cocinas` y el configurador. Operflow los lee con D |
| `/admin` "Órdenes de tienda" | Resumen (total vendido, tasa de aprobación, ticket promedio, aprobadas, pendientes, abandonadas) y lista de órdenes | Filtros por estado y fechas; "Exportar CSV" | — |
| `/admin/orders/<id>` | Detalle de una orden y su pago | — | Solo lectura |

**Ojo en "Órdenes de tienda":** a pesar del nombre, la lista y el CSV **también incluyen los cobros de leads** (diseño, anticipo, saldo, a mano), sin columna de tipo. Y los estados se ven en inglés y se mezclan (ver 3.4).

---

## 3. Estados

### 3.1 Estado del lead (`leads.estado`)

| Estado | Qué significa | Quién lo pone |
| --- | --- | --- |
| **Nuevo** | Acaba de llegar del configurador | El sistema al crearlo; o una persona |
| **Contactado** | El asesor ya habló con él | Asesor o gerencia |
| **Perdido** | No siguió | Asesor o gerencia |
| **Diseño pagado** | Pagó el diseño ("pasó el filtro") | El sistema, al contar el pago del diseño (Mercado Pago, pago a mano o "se queda") |
| **Propuesta enviada** | Ya tiene valor final | Gerencia al poner el valor final, **o** Operflow con B `propuesta_lista` |
| **Aprobado** | Pagó el anticipo | El sistema, al contar el anticipo |
| **No aprobó** | No aceptó la propuesta; datos borrados | Asesor o gerencia con "Marcar 'No aprobó'" |

Regla: una vez pagado el diseño, el lead **no puede volver** a Nuevo, Contactado o Perdido.

### 3.2 Qué ha pagado el lead (`leads.pago_estado`)
`nada` → `diseno` → `anticipo` → `saldo`. Solo avanza cuando lo que falta de ese tipo llega a cero, y **nunca retrocede**: una devolución no lo baja, solo deja de contar el pago. El orden es obligatorio (no se puede pagar el anticipo sin el diseño).

### 3.3 Estado de cada pago (`pagos.estado`)

| Estado | Cuándo |
| --- | --- |
| **Pendiente** | Mercado Pago dice pending, en proceso, en mediación o autorizado |
| **Aprobado** | Pagado y cuenta |
| **Rechazado** | Mercado Pago lo rechazó |
| **Devuelto** | Reembolso o contracargo |
| **Para revisar** | Pagado pero **no cuenta** hasta que gerencia decida. Pasa si: el monto no cuadra; el lead está cerrado (no aprobó, borrado u Operflow canceló); es un pago de prueba en un lead real; hay otro pago sin resolver; viene fuera de orden |

Mientras haya un pago "para revisar" o "devuelto" sin resolver, **no se puede cobrar lo siguiente**.

### 3.4 Estado de las órdenes (`ordenes.estado`)
Creada → pendiente / aprobada / rechazada / devuelta / repetida (fuera de orden) / revisar. Tipos de orden: tienda, diseño, anticipo, saldo. Origen: Mercado Pago, a mano o Redis (las viejas). En la pantalla de gerencia se ven en inglés (created, pending, approved, rejected, unknown): "devuelta" sale como rejected y "repetida" y "revisar" salen como unknown.

### 3.5 Estado de cada mensaje a Operflow (`mensajes_operflow.estado`)

| Estado | Cuándo |
| --- | --- |
| **Pendiente** | Recién creado, o esperando reintento (o esperando que el A salga primero) |
| **Enviado** | Operflow respondió bien (2xx). Para E, un 404 también cuenta como hecho |
| **Fallido** | Operflow respondió 400 o 422 (datos rechazados), o se acabaron los 12 intentos |
| **Cancelado** | Se borraron los datos del cliente antes de que saliera |

### 3.6 Datos de Operflow en el lead
`operflow_proyecto_id`, `operflow_etapa`, `operflow_estado` (además `entregado` o `cancelado`), `operflow_url_propuesta`. **Solo los cambia el mensaje B** (y el id, la respuesta del A). `entregado` y `cancelado` son finales: un aviso posterior no los cambia.

---

## 4. Flujos completos paso a paso

### 4.1 Cocina a medida (el flujo principal)

**Paso 1 · Configurador** (`/cocinas/configurar`, 9 pasos)
1. **Forma:** primero la ciudad (Barranquilla o Santa Marta); luego lineal, L, U o isla.
2. **Diseño:** D1 a D5.
3. **Colores:** según la tabla de precios de la ciudad (hoy blanco, madera, color).
4. **Herrajes:** estándar, premium o alta.
5. **Electrodomésticos:** estufa, horno, campana, etc. No cambian el precio; se puede saltar.
6. **Medidas:** en metros por pared (lineal 1 pared, L 2, U 3, isla 1 + la isla). Enlace a la guía de medidas en PDF. Botón "Ver mi rango".
7. **Tu rango:** mínimo y máximo. Cálculo **en el servidor**: metros × precio del diseño (+ isla), × recargo del color, × recargo de herrajes, ± 12 % de incertidumbre, redondeado a $50.000.
8. **Fotos** del espacio: opcionales, hasta 5 (se achican en el celular antes de subir).
9. **Tus datos:** nombre, celular, correo (opcional) y **casilla de autorización de datos** obligatoria (versión `2026-11-24-v1`, con enlaces a privacidad y términos).

**Paso 2 · Se crea el lead** (`POST /api/configurador/lead`)
- Guarda: **cliente** (nombre, celular, correo, ciudad, fecha y versión de la autorización), **lead** (cocina, ciudad, rango, toda la configuración, estado "Nuevo", pagado "nada"), **fotos** en una carpeta privada de Supabase y su registro en `archivos`.
- Si se crea fuera de producción (vista previa) queda marcado **"LEAD DE PRUEBA"**.
- **Correo a gerencia** "Lead nuevo: <nombre> (<ciudad>)" con enlace a la ficha. El cliente **no** recibe correo.
- Pantalla final para el cliente: "¡Listo!", su rango y un número de referencia (8 letras). **Si los cobros están activos**, también el botón "Pagar el diseño". Hoy en producción no aparece.
- **Operflow todavía no sabe nada.** Protecciones: tope de 8 leads por hora por conexión, campo trampa contra robots, y si alguien envía dos veces, no se duplica.

**Paso 3 · El asesor trabaja el lead** (CRM)
Gerencia asigna el asesor; el asesor llama, cambia a "Contactado", deja notas y pone la fecha del próximo contacto.

**Paso 4 · Pago del diseño** (hoy $300.000 de prueba)
- El cliente abre su enlace `/pago/lead/<enlace>` (el asesor lo copia del panel) → "Pagar con Mercado Pago" → paga.
- Mercado Pago avisa a la web → la web **vuelve a consultar el pago** en Mercado Pago (no se fía del aviso) → la base revisa que el monto y el orden cuadren.
- Si todo cuadra: pago **aprobado**, lead a **"Diseño pagado"** ("pasó el filtro"), y la base deja en la bandeja el **mensaje A** para Operflow.
- Enseguida: se envía el A a Operflow y salen los **correos**: al cliente "Recibimos el pago del diseño" (si dejó correo) y a gerencia "Pago de diseño: $X".
- Alternativa sin Mercado Pago: gerencia usa **"Registrar a mano"** (mismo resultado).

**Paso 5 · Operflow crea el proyecto** (mensaje A)
- Operflow recibe el brief completo: cliente, asesor, configuración, rango, **enlaces de las fotos (vencen en 15 min)** y el pago del diseño.
- Responde con su `proyecto_id`, que la web guarda en el lead. El historial dice "Proyecto enviado a Operflow".

**Paso 6 · Propuesta y valor final**
- Con O3/O6: Operflow avisa `propuesta_lista` con el valor → la web pone el **valor final** y el estado **"Propuesta enviada"**.
- Hoy, sin conexión: gerencia escribe el valor a mano en la ficha.

**Paso 7 · Anticipo**
- Monto = **35 % del valor final menos lo pagado por el diseño** (el 35 % sale de la tabla de precios).
- Se paga con el mismo enlace (o a mano). Lead a **"Aprobado"**; se envía el **mensaje C**; correos al cliente y a gerencia.

**Paso 8 · Medidas**
- Con O3/O6: Operflow avisa `valor_ajustado` con el valor tras medir → la web guarda el **valor con medidas**.
- Hoy: gerencia lo escribe a mano.

**Paso 9 · Saldo**
- Monto = **valor con medidas menos todo lo pagado**. Mismo enlace (o a mano). Pagado: "saldo"; se envía el **mensaje C**; correos.
- Si con el valor nuevo no queda saldo (o queda negativo), se manda a gerencia el correo "Revisar pago".

**Paso 10 · Entrega**
Operflow avisa `entregado` → la web marca el proyecto como entregado (solo en el panel).

### 4.2 "No aprobó"
1. Cuándo se puede: el cliente ya pagó el diseño (estado "Diseño pagado" o "Propuesta enviada") y no siguió.
2. Lo hace el asesor o gerencia, marcando "Ya le entregué el render al cliente".
3. La web:
   - cierra en Mercado Pago cualquier cobro abierto del cliente;
   - borra las fotos;
   - borra nombre, celular, correo, dirección y notas (el cliente queda como "Cliente borrado");
   - **conserva** los pagos, las órdenes, la cocina configurada, los valores y el historial de estados (sin notas);
   - pone el estado "No aprobó".
4. Si el A ya salió (o se intentó), deja el **mensaje E** para Operflow. Si el A no había salido, lo **cancela** y Operflow nunca se entera del proyecto.
5. No manda correo.

### 4.3 Borrar datos (pedido del cliente, Ley 1581)
- Solo gerencia, escribiendo BORRAR.
- **Si el cliente nunca pagó nada:** se borra por completo (cliente, leads, fotos, historial). Vuelve a la lista.
- **Si hay pagos:** igual que el "No aprobó" pero sin cambiar el estado: datos anónimos, fotos y notas borradas, pagos conservados. Si el A ya había salido, manda el **mensaje E**.

### 4.4 Tienda
1. El cliente abre un producto → "Comprar" (un producto por compra; **no hay carrito**).
2. El servidor toma el precio del catálogo (nunca del navegador), crea la orden de tienda y la preferencia de Mercado Pago (vence en 24 h).
3. El cliente paga en Mercado Pago y vuelve a `/pago/resultado`.
4. Mercado Pago avisa → orden aprobada → correos: al comprador "Tu pedido está confirmado" (al correo que usó en Mercado Pago) y a gerencia "[Nuevo pago] $X".
5. La tienda **no** usa el interruptor de cobros: funciona en producción.

### 4.5 Contacto
Formulario (nombre, correo, teléfono opcional, ciudad, mensaje) → **correo a gerencia** con "responder a" el cliente. **No se guarda en la base** y no crea lead. No tiene tope de envíos. WhatsApp está en toda la web (número 573012890552 si no se configura otro).

### 4.6 Asistente de IA ("Prefiero conversar")
- Qué hace: conversa con el cliente y **llena el configurador por él** (ciudad, forma, diseño, color, herrajes, electrodomésticos, medidas y contacto). **Nunca da precios:** el rango lo calcula el servidor y se muestra en pantalla, y si la IA escribe una cifra de dinero, se reemplaza.
- No puede marcar la autorización ni enviar: eso lo hace el cliente.
- Modelo: Claude Haiku 5.5. Topes: 40 mensajes por hora por persona, 1.500 llamadas al día en toda la web.
- **No guarda la conversación** en la web (vive en el navegador).
- **Hoy:** el botón "Prefiero conversar" **sí aparece**, pero el chat dice "disponible muy pronto" y no deja escribir, porque faltan `ANTHROPIC_API_KEY` y `AGENTE_IA_ACTIVO=true`.

### 4.7 Pagos a mano y devoluciones
- **Pago a mano** (solo gerencia): siempre es el siguiente cobro, por el monto que calcula el servidor, con nota obligatoria y confirmación. Pasa por las mismas reglas que un pago de Mercado Pago (puede quedar "para revisar"). Hoy, con cobros en pausa, **solo en leads de prueba**.
- **Pago "para revisar"** (monto raro, repetido, prueba en lead real, lead cerrado…): correo "Revisar pago" a gerencia. Gerencia decide en la ficha:
  - **"Se devolvió todo":** el pago no cuenta. La devolución real **se hace por fuera, en Mercado Pago**.
  - **"Se queda (abono)":** cuenta lo neto (si no pasa de lo que falta).
- **Devolución desde Mercado Pago** (reembolso o contracargo) de un pago que contaba: el pago pasa a "Devuelto", deja de contar y bloquea el siguiente cobro hasta que gerencia lo resuelva. **No se avisa a Operflow.**
- **`cancelado_tras_medicion`** (de Operflow): la web bloquea los cobros y anota "Devolución pendiente: anticipo menos la visita". **No hay devolución automática ni correo:** gerencia la hace en Mercado Pago.

---

## 5. Conexión con Operflow

### 5.1 Lo que la web manda

| Msg | Cuándo se crea | Ruta en Operflow | Datos |
| --- | --- | --- | --- |
| **A** crear proyecto | Cuando cuenta el pago del diseño (Mercado Pago, a mano o "se queda") | `POST {OPERFLOW_URL}/api/v1/proyectos` | `id_externo` (`lead_<id>`), producto, ciudad, cliente (nombre, teléfono, email, dirección), `asesor_email`, configuración (forma, diseño base, colores, herrajes, electrodomésticos, medidas en mm, notas), rango de precio, **fotos (enlaces de 15 min)**, pago del diseño (valor, referencia, fecha) |
| **C** pago registrado | Cuando cuenta un anticipo o un saldo | `POST .../proyectos/lead_<id>/pagos` | tipo (anticipo o saldo), valor, moneda, referencia (`mp_<id>` o `manual_<orden>`), fecha |
| **E** no aprobó | "No aprobó" o "Borrar" con pagos, solo si el A ya salió o se intentó | `POST .../proyectos/lead_<id>/eliminar` | cuerpo vacío `{}` |

- Todas van con `Authorization: Bearer <OPERFLOW_API_KEY>` y esperan 10 segundos como máximo.
- **Orden:** C espera a que el A esté enviado. E sale si el A salió o se intentó.
- **Producción solo manda leads reales; la vista previa solo manda leads de prueba.**
- Uno solo por tipo: un A y un E por lead, un C por pago. Si se repite el envío, `id_externo` evita duplicados en Operflow.
- De la respuesta del A, la web guarda `proyecto_id` (ignora `url`).

### 5.2 La bandeja `mensajes_operflow` y los reintentos
- Cada mensaje guarda su estado, intentos, último error, respuesta y la hora del próximo intento. Gerencia lo ve en la ficha del lead.
- **Cuándo se intenta enviar:** justo después de cada pago o acción, con el botón "Reenviar a Operflow" y con la tarea diaria (8:00 a. m. Colombia, hasta 50 mensajes; necesita `CRON_SECRET`).
- **Respuestas:**
  - 2xx: enviado.
  - 400 o 422: fallido al instante.
  - Cualquier otra (sin conexión, 401, 403, 404 en A/C, **410**, 5xx): sigue pendiente y se reintenta con espera creciente (5, 10, 20… minutos, hasta 24 h). Tras 12 intentos, fallido.
- Si faltan `OPERFLOW_URL` u `OPERFLOW_API_KEY`, los mensajes quedan pendientes con "SIN_CONEXION". **Así están hoy.**
- Un mensaje fallido **no manda correo**: se ve solo en el panel.

### 5.3 Lo que la web hace con cada aviso B
Entrada: `POST /api/integraciones/operflow`.
- **Firma:** encabezado `X-Operflow-Firma: t=<segundos>,v1=<HMAC-SHA256 de "t.cuerpo">` con `OPERFLOW_WEBHOOK_SECRET`, con 5 minutos de margen.
- **Repetidos:** se reconocen por la huella del cuerpo completo; el mismo aviso responde 200 sin repetir nada.
- **Avisos viejos:** si llega uno con fecha anterior al último, se anota y no cambia nada.
- **Respuestas:** 200 bien; 400 datos inválidos; 401 firma mala; 404 el lead no existe o no ha pagado el diseño; 413 demasiado grande; 429 demasiados; 500 error; 503 sin secreto configurado.

| Evento | Qué cambia en el lead | Historial | Correo | Qué ve el cliente |
| --- | --- | --- | --- | --- |
| `etapa_cambiada` | Etapa y estado de Operflow (solo en el panel) | "Operflow: etapa X · estado" | No | Nada |
| `propuesta_lista` | **Valor final** (si viene y es mayor que 0) y la URL de la propuesta (si empieza con https). De "Diseño pagado" pasa a **"Propuesta enviada"** | "Operflow: propuesta lista por $X" | Solo a gerencia, si con ese valor no queda anticipo por cobrar | Su enlace de pago ya cobra el **anticipo**. **No ve la URL de la propuesta** (solo el panel) |
| `valor_ajustado` | **Valor con medidas** | "Operflow: valor ajustado tras medir a $X" | Solo a gerencia, si no queda saldo o queda negativo | Su enlace ya cobra el **saldo** |
| `entregado` | Operflow: entregado (final) | "Operflow: proyecto entregado" | No | Nada |
| `cancelado_tras_medicion` | Operflow: cancelado (final). Se bloquean los cobros | "…Devolución pendiente: anticipo menos la visita (la hace gerencia en Mercado Pago)" | No | Su enlace dice "ya no está activo" |

De `datos`, la web **solo lee** `valor_final` y `url_propuesta`. Todo lo demás se ignora.

### 5.4 Precios para Operflow (D)
- `GET /api/integraciones/precios?ciudad=Barranquilla` (o `Santa Marta`) con `Authorization: Bearer <OPERFLOW_API_KEY>`.
- Devuelve: ciudad, moneda, vigente desde, `version_id`, metro lineal por diseño, metro de isla, colores, herrajes, valor del diseño, % de anticipo y % de incertidumbre.
- Si la ciudad no tiene precios vigentes en la base, responde 404 (no usa los de ejemplo). Tope: 30 por minuto por conexión y 60 por minuto en total.

### 5.5 Variables de Vercel que faltan para conectar

| Variable | Para qué | Sin ella |
| --- | --- | --- |
| `OPERFLOW_URL` | Dirección de Operflow para A, C y E | Nada sale (SIN_CONEXION) |
| `OPERFLOW_API_KEY` | Clave para A, C, E y D | Nada sale; D responde 503 |
| `OPERFLOW_WEBHOOK_SECRET` | Firma de B | B responde 503 |
| `CRON_SECRET` | Tarea diaria de reintentos | La tarea diaria no corre |

Plan: ponerlas **primero solo en Preview**, apuntando a un Operflow de prueba, y probar con el lead de ensayo `521787A3` (1 A y 2 C esperando).

---

## 6. Correos y avisos
Todos salen por Resend desde "Hechomadera <info@hechomadera.com>". Sin `RESEND_API_KEY` no sale ninguno. "Gerencia" = `CONTACT_TO_EMAIL` (por defecto infohechomadera@gmail.com).

| Evento | Para quién | Qué dice |
| --- | --- | --- |
| Lead nuevo en el configurador | Gerencia | "Lead nuevo: <nombre> (<ciudad>)": cocina, forma, diseño, número de fotos, rango y enlace a la ficha (sin teléfono ni fotos) |
| Pago de diseño, anticipo o saldo (Mercado Pago o a mano) | Cliente (si dejó correo y no se borraron sus datos) | "Recibimos el pago de <el diseño / el anticipo / el saldo>", monto, ciudad, qué sigue, WhatsApp |
| Lo mismo | Gerencia | "Pago de <concepto>: $X (<ciudad>)" con enlace al lead |
| Pago raro (monto, repetido, devuelto, reclamo, sin orden, prueba en producción, lead cerrado, en revisión, error de base, devolución parcial, sin saldo, saldo negativo) | Gerencia | "Revisar pago <id>" con el motivo, el valor y el enlace |
| Compra en la tienda aprobada | Comprador (correo de Mercado Pago) | "Tu pedido está confirmado": productos, total, número de orden, próximos pasos |
| Lo mismo | Gerencia | "[Nuevo pago] $X · Orden …" con comprador, productos y enlace |
| Formulario de contacto | Gerencia | "[Web] Contacto — <nombre>", todos los campos; responder va al cliente |

**No hay correo** para: el cliente al crear el lead, "No aprobó", borrado, mensajes de Operflow fallidos, ni avisos B (salvo las dos alertas de valor).

---

## 7. Interruptores y variables que cambian el comportamiento

| Variable | Qué hace | Hoy |
| --- | --- | --- |
| `COBROS_LEADS_ACTIVOS` | En producción, `true` enciende los cobros a clientes (diseño, anticipo, saldo). Sin ella: la página de pago dice "en pausa", el configurador no muestra "Pagar el diseño", el panel no muestra el enlace y el pago a mano solo sirve para leads de prueba. En la vista previa no se usa: allí cobra solo si la credencial de Mercado Pago es de prueba (`TEST-`) | Sin valor (en pausa) |
| `ENABLE_PAYMENT_TEST_PAGE` | `true` abre `/pago/prueba` en producción (cobra $5.000 reales; solo gerencia) | Por confirmar que no esté en true |
| `AGENTE_IA_ACTIVO` + `ANTHROPIC_API_KEY` | Encienden el asistente de IA (los dos) | Apagado |
| `VERCEL_ENV` (lo pone Vercel) | "production" decide: leads reales o de prueba, qué se manda a Operflow, rechazar pagos de prueba, exigir la firma de Mercado Pago, ocultar `/api/salud` | — |
| `MERCADOPAGO_ACCESS_TOKEN` | Credencial de Mercado Pago. Si empieza con `TEST-`, usa el modo prueba | Real en producción; de prueba en la vista previa |
| `MERCADOPAGO_WEBHOOK_SECRET` + `MERCADOPAGO_WEBHOOK_ENFORCE` | Firma del aviso de Mercado Pago. Solo bloquea avisos sin firma si ENFORCE=true en producción (igual siempre se reconsulta el pago) | ENFORCE no está en true |
| `OPERFLOW_URL`, `OPERFLOW_API_KEY`, `OPERFLOW_WEBHOOK_SECRET`, `CRON_SECRET` | Conexión con Operflow (ver 5.5) | Faltan |
| `RESEND_API_KEY`, `RESEND_FROM`, `CONTACT_TO_EMAIL` | Correos | Configurados |
| `SUPABASE_SECRET_KEY` | Llave del servidor. Sin ella, los precios caen a los de ejemplo y los topes no bloquean | Configurada |
| `NEXT_PUBLIC_WHATSAPP_PHONE` | Número de WhatsApp | — |
| `NEXT_PUBLIC_PROMO_ENABLED/TEXT/LINK` | Franja de promoción arriba | — |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Google Analytics (si el cliente acepta cookies) | — |
| `DEBUG_WEBHOOK_TOKEN` | Abre dos rutas técnicas de revisión de pagos | — |

Upstash Redis **ya no se usa** en el código (las órdenes y los topes pasaron a Supabase).

---

## 8. Qué está hecho, qué está en pausa y qué falta

| Hito | Qué es | Estado |
| --- | --- | --- |
| W0 | Kit de trabajo, permisos, documentación | ✅ Hecho |
| W1 | Base de datos, login de gerencia y asesor, permisos por fila | ✅ En producción. Falta: pantalla para crear asesores (se hace en Supabase) |
| W2 | Catálogo de 20 cocinas, tabla de precios por ciudad editable, precios para Operflow (D) | ✅ En producción. **Precios de prueba** |
| W3 | Configurador con fotos y autorización de datos | ✅ En producción. **Fotos de la web de prueba** |
| W4 | CRM: leads, estados, notas, asignación, próximo contacto | ✅ En producción. Con "Asesor Prueba"; **falta un asesor real** |
| W5 | Pagos por lead (diseño, anticipo, saldo), devoluciones, conexión con Operflow (A, B, C, D, E), borrado | ✅ Construido y en producción. ⏸️ **Cobros a clientes en pausa**. ⏸️ **Operflow sin conectar** (faltan variables) |
| W6 | Asistente de IA | ✅ Construido. ⏸️ **Apagado** (sin llave de Anthropic, a decisión de Alberto) |
| W7 | Prueba del flujo completo sin dinero | ✅ Cerrado con 2 ensayos (`521787A3` completo y `637D0BD9` "No aprobó"), sin fallas |
| W7b | Prueba con clientes reales y dinero real | ⏳ Falta |

**Falta para W7b (de ESTADO)**
1. Conectar Operflow: Alberto pone las 4 variables en Vercel, primero en Preview, y se prueba con los mensajes del ensayo `521787A3`.
2. Precios reales en `/admin/precios`.
3. Asesor real.
4. Fotos reales.
5. Encender `COBROS_LEADS_ACTIVOS=true` solo en producción.
6. Llave de Anthropic (al final).
7. Por definir: los 5 diseños base, el costo de la visita de medición y las métricas de conversión.

**Riesgos abiertos**
- Vercel en plan Hobby, que no permite uso comercial (Pro: US$20/mes, decide Alberto). Supabase gratis se pausa tras una semana sin uso.
- `MERCADOPAGO_WEBHOOK_ENFORCE` no está en true en producción.
- Confirmar que `ENABLE_PAYMENT_TEST_PAGE` no esté en true en producción.
- Legal sin abogado (riesgo aceptado).

**Detalles pequeños encontrados al hacer este mapa** (no arreglados)
- "Órdenes de tienda" mezcla tienda y leads, y muestra estados en inglés que se confunden.
- El filtro de estado de `/admin/leads` ofrece solo 4 de los 7 estados (faltan Propuesta enviada, Aprobado y No aprobó).
- El botón "Prefiero conversar" aparece aunque el asistente esté apagado (el chat dice "pronto").
- La ruta pública que consulta una orden por su número no pide sesión (el número es difícil de adivinar, pero devuelve la orden entera).
- El formulario de contacto no guarda nada ni tiene tope de envíos.
- La calculadora de `/proyectos` usa su propia tabla fija de precios, no la oficial.
- La página de la tienda promete "asesor en menos de 3 horas".

---

## 9. Choques con Operflow (según lo que informó Operflow tras O6)

| # | Tema | Qué hace la web hoy | Qué hace Operflow (O6) | Qué hay que decidir o ajustar |
| --- | --- | --- | --- | --- |
| 1 | **Firma de B** | `X-Operflow-Firma: t=..,v1=..` sobre "t.cuerpo", 5 min | Igual | ✅ Coinciden. Falta quitar de la web la nota "por confirmar" |
| 2 | **Repetidos de B** | Reconoce un aviso repetido por la huella del **cuerpo completo**. No lee `aviso_id` | Cada aviso trae `aviso_id` | Si Operflow reenvía el mismo aviso con algún byte distinto (por ejemplo otra `fecha`), la web lo toma como nuevo. Conviene que la web use `aviso_id` |
| 3 | **`etapa_cambiada`** | Guarda `etapa` y `estado` como texto y los muestra en el panel | `etapa` = nombre, `estado` = pendiente / en_curso / terminada, más `datos.etapa_clave` y `datos.orden` | La web ignora `etapa_clave` y `orden`: no puede ordenar etapas ni reaccionar a una en particular. Y el estado de Operflow va al mismo campo que `entregado` y `cancelado` |
| 4 | **`propuesta_lista`** | Lee `valor_final` y `url_propuesta` | Manda además `datos.vence_en` | La web ignora el vencimiento. **El cliente no ve la URL de la propuesta** (solo el panel): hoy el asesor se la tiene que pasar |
| 5 | **Etapa nueva "Aprobación y anticipo"** | El anticipo pone el lead en "Aprobado" y manda C | Esa etapa se cierra con el C | Coincide en la idea. Revisar que Operflow no espere el C antes de que la web lo pueda mandar (el C solo sale si el A ya está enviado) |
| 6 | **E (`/eliminar`)** | Al "No aprobó" la web **borra** datos, fotos y notas y manda E con cuerpo vacío. Toma 2xx o 404 como hecho; no lee la respuesta | E **no borra: archiva** el proyecto en una "biblioteca" y responde 200 con `archivado` true o false | **Diferencia de fondo:** la web borra y Operflow conserva todo (cliente, fotos copiadas, brief). Hay que alinear qué dice la política de privacidad (hoy dice que se borra al "No aprobó") con lo que guarda Operflow. Además la web no lee `archivado` |
| 7 | **Borrado por Ley 1581** | "Borrar datos" de gerencia borra o anonimiza en la web y manda E (que ahora solo archiva) | Se hace aparte, solo por gerencia de Operflow | **El borrado de la web no borra en Operflow.** Hace falta un mensaje o un paso de gerencia en Operflow cada vez que un cliente pide borrar sus datos |
| 8 | **410 en A y C** | No reconoce el 410: reintenta hasta 12 veces y luego marca fallido | Tras el borrado Ley 1581, A y C responden 410 | La web debería tratar el 410 como "ya no existe, no reintentar" |
| 9 | **`valor_ajustado` y `cancelado_tras_medicion`** | Los maneja (valor con medidas; cancelado bloquea cobros) | En O6 solo se nombran `etapa_cambiada`, `propuesta_lista` y `entregado` | Confirmar si Operflow manda estos dos o si el valor con medidas sigue en gerencia de la web |
| 10 | **Colores en A** | Manda el mismo color en `cuerpos` y `frentes` | El contrato los separa | El configurador solo pregunta un color. Decidir si basta |
| 11 | **Respuesta de A** | Guarda `proyecto_id`; ignora `url` | — | Confirmar el nombre del campo |
| 12 | **Devoluciones** | Una devolución en Mercado Pago no se avisa a Operflow | — | Decidir si Operflow debe saberlo (por ejemplo, un C negativo o un mensaje nuevo) |
| 13 | **Copia del contrato** | La copia de la web es v0.1 del 2026-11-17 y dice "nada está construido" | El original está en el repositorio de Operflow, ya actualizado | Al volver a la web: copiar el contrato nuevo y ajustar los puntos 2, 3, 4, 6, 7 y 8 |
