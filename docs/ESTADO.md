# Estado de Hechomadera-web
> Página única para retomar. Máximo ~50 líneas. Última actualización: 2026-11-19.

## Dónde vamos
- W0 cerrado (etiqueta `hito-0`). W1 a W5 hechos. **W6 hecho (agente de IA)**: botón "Prefiero conversar" en `/cocinas/configurar`; chat que llena el mismo configurador con 3 herramientas en el servidor. La IA no ve ni da precios (el rango sale de `calcularRango`; el lead lo crea solo el servidor al pulsar Enviar el cliente). Conversación no se guarda. Modelo `claude-haiku-5-5` (~US$0,01 por conversación). Todo en la rama `w1-w2-base` (no está en producción). Diarios: `docs/hitos/hito-1.md` a `hito-6.md`.
- Probado: 349 pruebas, lint, tipos y build sin errores; validador (2 pasadas en W6) y auditor sin violaciones graves. Pantalla del chat probada en celular con respuestas simuladas; **sin llamada real a Anthropic aún**.
- Agente apagado hasta que existan `ANTHROPIC_API_KEY` y `AGENTE_IA_ACTIVO=true` (sin ellos: botón oculto, API 503). Topes: 40 mensajes por IP por hora, 1.500 llamadas por día, 30 mensajes por conversación. Detalle en `docs/REFERENCIA.md`.
- Supabase (ref `seazgghpynhflxvrjpee`): migraciones hasta `20261119000600` aplicadas (W6 no agregó ninguna); cubeta privada `fotos-espacio`; gerencia y un "Asesor Prueba"; registro libre desactivado. Respaldos de W5 y W6 con etiquetas `respaldo-2026-11-19-w5-pagos` y `respaldo-2026-11-19-w6-agente`.
- La base decide si un pago cuenta (`registrar_pago`); todo pago raro avisa por correo a gerencia. Fuera de producción solo gerencia inicia cobros.
- Operflow: O3 no existe; los mensajes quedan en la bandeja y se reintentan. Firma del mensaje B propuesta por la web, por confirmar.
- Lead real 4DAF4A75: Contactado, nada pagado, sin cambios.
- Vista previa: https://hechomadera-web-git-w1-dce765-infohechomadera-creators-projects.vercel.app
- Autonomía nivel 3: todo dentro del proyecto sin preguntar; nunca llaves, contraseñas, dinero ni términos (ver `CLAUDE.md`).

## Riesgos abiertos
- Credencial de Mercado Pago real en TODOS los entornos de Vercel (también Preview). Mitigado por código: fuera de producción solo gerencia inicia cobros.
- Sin `CRON_SECRET` la tarea diaria de reintentos a Operflow no corre. `MERCADOPAGO_WEBHOOK_ENFORCE` no está en `true` en producción (recomendado).
- Firma del mensaje B por confirmar con Operflow.
- Agente: no se ha probado con la llave real (por confirmar que Haiku 5.5 acepte `thinking: disabled` y `effort: low`). Historial firmado viejo reutilizable (acotado por topes); ruta sin control de origen (aceptado en V1).
- Datos de clientes con `SUPABASE_SECRET_KEY` aún no tipo Secret; textos legales sin revisar por abogado.

## Siguiente paso exacto
1. Con visto bueno de Alberto: pasar a `main` y quitar `ADMIN_PASSWORD` y `ADMIN_API_TOKEN` de Vercel. Antes conviene que Alberto ponga los precios reales en `/admin/precios` (el configurador queda público).
2. **Al final (decisión de Alberto, 2026-11-21):** cuenta de Anthropic con su correo personal (organización "Hechomadera"), crédito, tope mensual (sugerido US$10), llave en Vercel como `ANTHROPIC_API_KEY` (Secret, Production y Preview) y `AGENTE_IA_ACTIVO=true`; agregar ambos nombres sin valor a `.env.example`. Luego prueba real del agente en la vista previa (conversación completa desde el celular hasta un lead guardado; revisar registros "[agente]"). El botón "Prefiero conversar" se muestra siempre (decisión de Alberto, 2026-11-21); sin llave, el chat avisa "disponible muy pronto" y no deja escribir.
4. Alberto, cuando exista O3: `CRON_SECRET`, `OPERFLOW_URL`, `OPERFLOW_API_KEY`, `OPERFLOW_WEBHOOK_SECRET`.
5. Alberto: cerrar la pestaña del SQL Editor de Supabase (descartar cambios).

## Pendientes abiertos
- `SUPABASE_SECRET_KEY` a tipo **Secret** en Vercel; precios reales en `/admin/precios` (D1 Barranquilla en $2.000.000 de prueba).
- Abogado: Ley 1581 (`2026-11-18-v1`), privacidad (no menciona fotos) y términos con la regla de diseño no reembolsable. Nuevo: nombre y celular llegan a Anthropic (fuera de Colombia) antes de la autorización y los textos no mencionan la IA; alternativa: que el agente no pida contacto.
- Página de invitación (propuesta, no aprobada) y asesor real.
- Confirmar la fórmula de precios provisional (suma de paredes, recargos, ±12%).
- Por definir: 5 diseños base definitivos; costo de la visita de medición; métricas de conversión; valor final por O3 (hoy lo escribe gerencia).
- Pago de prueba de Mercado Pago saltado por decisión de Alberto; el primer pago real por lead será la prueba.

## Antes de empezar una sesión
- Leer solo este archivo (o `/retomar`). Trabajar en la rama `w1-w2-base`.
- Nunca leer `.env` ni `.env.local`. Operflow solo por `docs/CONTRATO-INTEGRACION.md`.
- No correr `npm run build` con el servidor de desarrollo encendido.
- `.claude/launch.json` "web-agente-pantalla" usa una llave FALSA; nunca poner una real ahí.
