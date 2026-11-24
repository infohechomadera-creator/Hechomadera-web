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
| Cobros reales apagados mientras tanto | Hecho en código (`COBROS_LEADS_ACTIVOS`); falta pasar a `main` | Claude |
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
- Interruptor `COBROS_LEADS_ACTIVOS` (`lib/pagos/procesar.ts`): sin él no se cobra ningún lead; la página de pago, el final del configurador y el panel lo dicen. Pago a mano en pausa solo para leads de ensayo. Fuera de producción cobra si la credencial es de prueba (`TEST-`). La tienda no cambia.
- Arreglo: si el envío a Operflow falla tras un pago (webhook o pago a mano), el correo del pago sale igual.
- Legal: privacidad con fotos, asistente de IA, proveedores y transferencia fuera de Colombia, borrado al "no aprobó"; términos con diseño, anticipo, medición y saldo; enlace a términos en el consentimiento; autorización `2026-11-24-v1`.
- Costos a 10x y 100x en `docs/REFERENCIA.md`.
- Pruebas: 357 (6 nuevas); lint, tipos y build sin errores.

**Leads de ensayo**
(se agregan aquí con la ficha de arriba)
