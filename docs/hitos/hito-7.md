# Hito W7 · Prueba del flujo completo sin dinero real
> Diario del hito. Se agrega información; no se borra.

## Cómo quedó definido (2026-11-24, decisiones de Alberto)
- **Nada de dinero real todavía.** W7 = 3 a 5 **leads de ensayo** recorren todo el flujo en la **vista previa**, con pagos sin dinero. Luego se sigue con Operflow (O3). El W7 con plata real queda como **W7b**.
- Precios y fotos siguen ficticios. Atiende Alberto desde gerencia (y el "Asesor Prueba" si hace falta).
- Lo legal se da por revisado (sin abogado).
- Nivel de autonomía 4 aprobado **solo para W7**.

## Requisitos antes de clientes reales (W7b)
| Requisito | Estado | Quién |
| --- | --- | --- |
| Cobros reales apagados mientras tanto | Hecho y en producción (PR #2, 2026-11-24); hechomadera.com responde "pago en línea en pausa" | Claude |
| Precios reales en `/admin/precios` | Ficticios por decisión de Alberto (2026-11-24) | Alberto, antes de W7b |
| Asesor real | No hay; se usa gerencia y el "Asesor Prueba" | Alberto |
| Textos legales | Completados (fotos, asistente, proveedores, diseño no reembolsable, anticipo y saldo) y **dados por revisados** por Alberto; autorización `2026-11-24-v1` | Hecho |
| Costos a 10x y 100x | Hecho: tabla en `docs/REFERENCIA.md`. Ojo: Vercel Hobby no permite uso comercial | Alberto decide planes |
| Operflow O3 | No existe; los mensajes quedan en la bandeja ("pendiente – SIN_CONEXION") y se reintentan | Proyecto Operflow |
| Llave de Anthropic | Al final (decisión de Alberto) | Alberto |
| Fotos reales | Ficticias por ahora | Alberto |

## Cómo se paga sin dinero
- **Camino A (desde ya, sin llaves):** en `/admin/leads/<id>` de un lead de ensayo, gerencia usa "Registrar a mano" con una nota tipo "ensayo W7". Con los cobros en pausa, el sistema solo deja registrar a mano pagos de leads de ensayo (`es_prueba`).
- **Camino B (opcional, más completo):** Alberto saca las **credenciales de prueba** de Mercado Pago (panel de desarrolladores → tu aplicación → Credenciales de prueba) y en Vercel cambia `MERCADOPAGO_ACCESS_TOKEN` (y la clave del webhook de prueba) **solo en Preview**. Con eso la vista previa cobra con tarjetas de prueba y se prueba el aviso real de Mercado Pago. Producción no se toca. Claude no copia ni escribe llaves.

## Ficha por lead de ensayo (copiar para cada uno)
```
### Lead XXXXXXXX · fecha · quién lo hizo · celular/computador
- [ ] 1. Configurador en la vista previa: terminó sin error; NO aparece botón de pago; llegó el correo "nuevo lead" a gerencia
- [ ] 2. CRM: aparece en /admin/leads con "LEAD DE PRUEBA", fotos visibles, rango correcto, autorización 2026-11-24-v1
- [ ] 3. CRM: asignar asesor, Contactado, nota y próximo contacto
- [ ] 4. Diseño pagado (camino A o B): estado "Diseño pagado"; pago en la lista; correo al cliente (si dejó correo) y a gerencia; mensaje A en la bandeja
- [ ] 5. Valor final → anticipo pagado: estado "Aprobado"; mensaje C
- [ ] 6. Valor con medidas → saldo pagado: pago_estado "saldo"; mensaje C
- [ ] 7. (al menos en 1 lead, en vez de 5–6) "No aprobó": datos, fotos y notas borrados; pagos conservados; mensaje E
- [ ] 8. Registros de Vercel sin errores (ver abajo)
Fallas: …   Corrección: … (commit)
```

## Qué revisar en cada ronda
**Registros de Vercel** (proyecto → Logs, filtrar por la vista previa). Buscar: `[configurador]`, `[email-notifications]`, `[ordenes]`, `[preferencia]`, `[Mercado Pago webhook]`, `[eventos_pago]`, `[pago manual]`, `[borrado]`, `[agente]`.

**Correos** (a `CONTACT_TO_EMAIL`): "nuevo lead" al guardar; aviso de pago al registrar cada pago; "pago para revisar" si algo raro pasa (monto distinto, repetido, devuelto, prueba en producción…). Si un correo no llega, el lead igual queda guardado: revisar `[email-notifications]` en los registros.

**Consultas SQL de solo lectura** (SQL Editor de Supabase; cambiar `abcd1234` por la referencia en minúscula):
```sql
select l.id,l.estado,l.pago_estado,l.asesor_id,l.es_prueba,l.valor_final,l.valor_final_medido,l.operflow_proyecto_id,c.datos_borrados_at,c.autorizacion_version from leads l join clientes c on c.id=l.cliente_id where l.id::text like 'abcd1234%';
select count(*) from archivos where lead_id::text like 'abcd1234%';
select id,tipo,estado,total_cop,preferencia_id,creado_at from ordenes where lead_id::text like 'abcd1234%';
select id,tipo,estado,estado_mp,monto,cuenta,monto_devuelto,mp_pago_id,resuelto_at from pagos where lead_id::text like 'abcd1234%';
select mensaje,estado,intentos,ultimo_error,respuesta_http,proximo_intento_at,enviado_at from mensajes_operflow where lead_id::text like 'abcd1234%';
select tipo,detalle,creado_at from actividades where lead_id::text like 'abcd1234%' order by creado_at;
-- Revisión general
select * from mensajes_operflow where estado in ('pendiente','fallido');
select * from eventos_pago where not procesado or error is not null order by recibido_at desc limit 20;
select * from pagos where estado in ('revisar','devuelto') and resuelto_at is null;
```

**Lo esperado mientras no exista O3:** mensajes A/C/E en "pendiente" con `SIN_CONEXION`. No es falla. Un mensaje "fallido" sí lo es (no avisa por correo: se ve en el panel del lead).

## Cómo corregir sin perder plata
- Nunca borrar pagos ni órdenes. Un pago mal registrado se resuelve con "Marcar devuelto / Conservar" en el panel.
- Cambios de datos por la pantalla de gerencia; si hace falta SQL: copia antes en `respaldos/` y anotarlo en `docs/DECISIONES.md` con cómo revertir.
- Cada arreglo de código: prueba nueva, commit "(hito 7)", anotado aquí. A `main` con etiqueta de respaldo antes (nivel 4 de W7).
- Si algo se ve raro en producción con dinero: dejar `COBROS_LEADS_ACTIVOS` sin valor (ya está así) y avisar a Alberto.

## Puente a Operflow (para el desarrollo de O3)
- La web ya deja en la bandeja `mensajes_operflow`: **A** (crear proyecto al pagar el diseño, con enlaces de fotos que duran 15 min), **C** (cada anticipo o saldo) y **E** (borrar al "no aprobó"). Forma exacta: `docs/CONTRATO-INTEGRACION.md`.
- Reintentos: al registrar cada pago, botón "Reenviar" del panel y tarea diaria 8:00 (Colombia) que necesita `CRON_SECRET`. Espera creciente hasta 24 h; tras 12 intentos queda "fallido"; un 400/422 lo deja "fallido" al instante.
- Producción solo envía leads reales; la vista previa envía los de ensayo al `OPERFLOW_URL` que tenga Preview (útil para probar O3 con una URL de prueba).
- Cuando O3 exista, Alberto pone en Vercel: `OPERFLOW_URL`, `OPERFLOW_API_KEY`, `OPERFLOW_WEBHOOK_SECRET`, `CRON_SECRET`. Por confirmar con Operflow: firma del mensaje B.

## 2026-11-24
**Hecho**
- Interruptor `COBROS_LEADS_ACTIVOS` (`lib/pagos/procesar.ts`): sin él producción no cobra ningún lead; la vista previa solo cobra con credencial de prueba (`TEST-`). La página de pago, el final del configurador y el panel lo dicen. Pago a mano en pausa solo para leads de ensayo. La tienda no cambia.
- Validador: sin caminos para cobrar dinero real con el interruptor apagado; 3 hallazgos corregidos (interruptor no cobra en Preview con credencial real, aviso neutro al cliente, prueba del botón del configurador). Pruebas: 359.
- Arreglo: si el envío a Operflow falla tras un pago (webhook o pago a mano), el correo del pago sale igual.
- Legal: privacidad con fotos, asistente de IA, proveedores y transferencia fuera de Colombia, borrado al "no aprobó"; términos con diseño, anticipo, medición y saldo; enlace a términos en el consentimiento; autorización `2026-11-24-v1`.
- Costos a 10x y 100x en `docs/REFERENCIA.md`.
- Pruebas: 357 (6 nuevas); lint, tipos y build sin errores.

**Leads de ensayo**
(se agregan aquí con la ficha de arriba)

### Lead 521787A3 · 2026-11-24 · Claude (envío directo a la ruta del formulario, datos ficticios) · computador
- [x] 1. Guardado en la vista previa (rango $10.450.000–$13.350.000, 1 foto). Correo "nuevo lead": por confirmar Alberto
- [x] 2. Ficha con "LEAD DE PRUEBA", foto visible, autorización 2026-11-24-v1
- [x] 3. Asignado a Asesor Prueba, Contactado, nota y próximo contacto 26/11: todo en el historial
- [x] 4. Diseño $300.000 a mano → "Diseño pagado"; mensaje A pendiente (SIN_CONEXION)
- [x] 5. Valor final $12.000.000 → anticipo calculado $3.900.000 (35% − diseño) a mano → "Aprobado"; mensaje C pendiente
- [x] 6. Valor con medidas $12.500.000 → saldo $8.300.000 a mano → pagó: saldo; segundo mensaje C pendiente
- [x] 8. Registros de Vercel (Preview, última hora): 0 errores, 0 advertencias
Fallas: ninguna.

### Lead 637D0BD9 · 2026-11-24 · Claude (datos ficticios) · computador
- [x] 1–2. Guardado (Santa Marta, lineal, 1 foto)
- [x] 4. Diseño $300.000 a mano → "Diseño pagado"
- [x] 7. "No aprobó": "Cliente borrado", foto borrada, pago conservado, estado "No aprobó"; el mensaje A quedó "Cancelado · datos borrados antes de enviar" (Operflow nunca lo recibió, por eso no hay E)
Fallas: ninguna.

**Hallazgos de la ronda**
- La vista previa tiene credencial de Mercado Pago **de prueba** (`TEST-`): el interruptor la deja cobrar y el panel muestra el enlace de pago. No mueve dinero. Corrige lo que decía ESTADO ("credencial real en todos los entornos"). El camino B quizá ya sirve, pero el aviso de Mercado Pago llega a la dirección del sitio configurada (`NEXT_PUBLIC_SITE_URL`); por confirmar antes de usarlo.
- Vercel está en plan **Hobby** (no permite uso comercial; ver costos en `docs/REFERENCIA.md`). Vercel también sugiere activar la verificación en dos pasos en la cuenta.
- Por confirmar (Alberto): que `ENABLE_PAYMENT_TEST_PAGE` no esté en `true` en producción (esa página de gerencia cobra $5.000 reales).
- Mejora opcional del validador: quien tenga el configurador abierto durante un despliegue que cambia la versión de la autorización recibe "recarga la página" y pierde lo llenado.
- Los 2 leads de ensayo quedan en la base marcados como prueba (no se envían a Operflow de producción).

## Cierre (2026-11-24)
- Alberto decidió cerrar W7 con los 2 ensayos de Claude (sin fallas) y pasar a Operflow O3. Pruebas desde el celular y con dinero real: W7b.
- Auditor: sin violaciones graves; se anotaron el cierre con 2 ensayos, la vuelta al nivel 3 y el parche temporal de `window.confirm` en Chrome (DECISIONES).
- Etiqueta `hito-7`. Nivel de autonomía de vuelta en 3.
- Pendientes de Alberto: confirmar correos de los ensayos; revisar `ENABLE_PAYMENT_TEST_PAGE` en producción; decidir Vercel Pro.
