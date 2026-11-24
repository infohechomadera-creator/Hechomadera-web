# Estado de Hechomadera-web
> Página única para retomar. Máximo ~50 líneas. Última actualización: 2026-11-24.

## Dónde vamos
- W0–W6 hechos y en producción (hechomadera.com). Diarios: `docs/hitos/hito-1.md` a `hito-7.md`.
- **W7 cerrado (etiqueta `hito-7`), sin dinero real:** 2 leads de ensayo recorrieron el flujo completo en la vista previa con pagos a mano, sin fallas (decisión de Alberto cerrar con 2). El W7 con plata real queda como **W7b** (después de O3 y precios reales). **Nivel de autonomía de vuelta en 3.**
- **Cobros a leads en pausa** en producción (`COBROS_LEADS_ACTIVOS` sin valor; PR #2 en `main`, respaldo `respaldo-2026-11-24-antes-w7`). La vista previa cobra solo con credencial de prueba (`TEST-`), y hoy la tiene. La tienda no cambió.
- Legal completado y **dado por revisado por Alberto** (sin abogado): privacidad (fotos, asistente de IA, proveedores fuera de Colombia, borrado al "no aprobó"), términos (diseño, anticipo, medición, saldo), autorización `2026-11-24-v1`.
- Costos a 10x y 100x en `docs/REFERENCIA.md`. Vercel está en plan **Hobby** (no permite uso comercial).
- Ensayos hechos por Claude: `521787A3` (diseño → anticipo → saldo, todo bien) y `637D0BD9` ("No aprobó", todo bien). Registros de Vercel sin errores. Bitácora y fichas en `docs/hitos/hito-7.md`.
- Probado: 359 pruebas, lint, tipos y build sin errores; validador sin caminos para cobrar dinero real con la pausa.
- Agente de IA construido y apagado (sin `ANTHROPIC_API_KEY` ni `AGENTE_IA_ACTIVO`). Operflow: O3 no existe; los mensajes quedan pendientes en la bandeja.
- Supabase (ref `seazgghpynhflxvrjpee`): migraciones hasta `20261119000600`; gerencia y "Asesor Prueba". Lead real 4DAF4A75 sin cambios.
- Vista previa: https://hechomadera-web-git-w1-dce765-infohechomadera-creators-projects.vercel.app

## Siguiente paso exacto
1. **Operflow O3** en la sesión de Operflow (otro proyecto). Puente: sección "Puente a Operflow" de `docs/hitos/hito-7.md` y `docs/CONTRATO-INTEGRACION.md`. En la vista previa hay 1 mensaje A y 2 C pendientes del ensayo 521787A3 para probar O3.
2. Cuando O3 exista, Alberto pone en Vercel `OPERFLOW_URL`, `OPERFLOW_API_KEY`, `OPERFLOW_WEBHOOK_SECRET` y `CRON_SECRET` (primero en Preview para probar con los ensayos).
3. Alberto: confirmar que llegaron los correos de los ensayos a `CONTACT_TO_EMAIL` y que `ENABLE_PAYMENT_TEST_PAGE` no esté en `true` en producción.

## Riesgos abiertos
- Vercel Hobby no permite uso comercial (Pro US$20/mes; decide Alberto). Supabase gratis se pausa tras 1 semana sin uso.
- Producción tiene credencial real de Mercado Pago; protegida por la pausa de cobros a leads.
- Sin `CRON_SECRET` la tarea diaria de reintentos a Operflow no corre. `MERCADOPAGO_WEBHOOK_ENFORCE` no está en `true` en producción.
- Firma del mensaje B por confirmar con Operflow. Agente sin probar con la llave real.
- Legal sin abogado (riesgo aceptado por Alberto). `SUPABASE_SECRET_KEY` aún no tipo Secret.

## Pendientes para W7b (dinero real)
- Precios reales en `/admin/precios`, asesor real (página de invitación propuesta), fotos reales, O3 de Operflow, encender `COBROS_LEADS_ACTIVOS=true` solo en Production.
- Llave de Anthropic al final (decisión de Alberto).
- Por definir: 5 diseños base, costo de la visita de medición, métricas de conversión.

## Antes de empezar una sesión
- Leer solo este archivo (o `/retomar`). Trabajar en la rama `w1-w2-base`.
- Nunca leer `.env` ni `.env.local`. Operflow solo por `docs/CONTRATO-INTEGRACION.md`.
- No correr `npm run build` con el servidor de desarrollo encendido.
- `.claude/launch.json` "web-agente-pantalla" usa una llave FALSA; nunca poner una real ahí.
