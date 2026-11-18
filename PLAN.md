# Hechomadera-web: plan técnico

## Palabras que aparecen (glosario simple)
- **Lead:** persona interesada que dejó sus datos en el configurador.
- **Filtro:** el pago del diseño. Solo los leads que pagan pasan a Operflow.
- **Anticipo:** 35% del valor final menos el diseño ya pagado. Se paga al aprobar el diseño.
- **Saldo:** lo que falta, con el valor recalculado tras confirmar medidas.
- **RLS:** reglas de la base de datos que deciden qué filas ve cada usuario.
- **Webhook:** aviso automático que un servicio (Mercado Pago, Operflow) envía a la web.
- **Contrato:** acuerdo de mensajes entre la web y Operflow (`docs/CONTRATO-INTEGRACION.md`).

## Hitos en orden
| # | Hito | Qué se ve funcionando | Piezas | Qué se prueba | Claude hace | Alberto hace | Nivel |
| --- | --- | --- | --- | --- | --- | --- | --- |
| W0 | Kit técnico y limpieza | `CLAUDE.md`, permisos, hook, agentes, docs base | `.claude/`, raíz, `docs/` | Bloqueos de `.env` y comandos peligrosos; hook | Crear el kit | Aprobar plan | 2 |
| W1 | Base de datos y usuarios | Supabase conectado; tablas de leads, clientes y actividades; login de gerencia y asesor; RLS | Supabase, `lib/`, `app/admin` | Pruebas de permisos por rol con usuarios ficticios | Esquema, migraciones, login, pruebas | Crear el proyecto Supabase (sesión y plan son suyos); poner llaves en Vercel | 3 (pedir) |
| W2 | Catálogo y rango de precio | Página de cocinas con 20 escenas; tabla de precios por ciudad editable; consulta de precios para Operflow | `app/cocinas`, tabla precios, API mensaje D | Cálculo del rango con casos; solo gerencia edita | Construir y probar | Revisar precios de ejemplo | 3 |
| W3 | Configurador guiado | Un cliente completa el formulario en el celular, sube fotos, autoriza datos, ve el rango y queda como lead | Formulario, almacenamiento de fotos | Flujo en celular; consentimiento Ley 1581 | Construir y probar | Probar en su celular | 3 |
| W4 | CRM mínimo | El asesor ve sus leads, cambia estados, deja notas y marca el filtro | Panel CRM | Asesor no ve leads ajenos | Construir y probar | Probar con el asesor | 3 |
| W5 | Pagos y conexión con Operflow | Pago del diseño crea el proyecto en Operflow; avisos llegan al CRM; anticipo y saldo se registran; "no aprobó" borra en ambos lados | Webhook MP, mensajes A, B, C, E | Firmas, idempotencia, montos en servidor, borrado | Construir y probar | Coordinar O3 de Operflow; aprobar paso a producción | 3–4 |
| W6 | Agente de IA | El cliente conversa y el agente llena el configurador | API de Anthropic | Que el agente no invente precios | Construir y probar | Crear cuenta y aprobar tope de gasto | 3 |
| W7 | Prueba real | 3 a 5 leads reales recorren el flujo completo | Todo | Flujo de punta a punta | Acompañar y corregir | Atender clientes reales | 4 |

W0–W4 no dependen de Operflow. W5 necesita el hito O3 de Operflow. W6 depende de W3.

## Modelo de datos (preliminar, se confirma en W1)
- **usuarios_web:** gerencia o asesor.
- **clientes:** datos de contacto y autorización de datos (fecha y versión del texto).
- **leads:** cliente, ciudad, producto, configuración, rango, estado, asesor asignado, qué pagó, estado de Operflow, próximo contacto.
- **actividades:** notas y cambios de estado de cada lead.
- **archivos:** fotos del espacio (almacenamiento privado, enlaces firmados de vida corta).
- **precios:** por ciudad y vigencia: metro lineal por diseño base, adicionales, valor del diseño por producto. Única fuente.
- **pagos:** tipo (diseño, anticipo, saldo), valor, referencia de Mercado Pago, lead.
- **eventos_integracion:** registro de mensajes con Operflow (sin datos sensibles).
- Las órdenes de la tienda siguen en Redis por ahora (migración por aprobar).

## Riesgos principales
| Riesgo | Cómo se reduce |
| --- | --- |
| Fuga de datos entre asesores o hacia el público | RLS desde W1 y pruebas por rol en cada hito |
| Cobro con monto equivocado | Montos calculados en el servidor desde la tabla de precios; pruebas de cálculo |
| Webhook falso o repetido crea proyectos dobles | Firma obligatoria e `id_externo` idempotente (contrato) |
| Supabase plan gratis se pausa o se queda corto | Evaluar Pro antes de clientes reales (requiere aprobación) |
| Romper pagos que ya funcionan en producción | Etiqueta de respaldo antes de tocar pagos; pruebas en modo prueba |
| Términos sin revisión legal | Revisión de abogado antes de W7 |
| Costo del agente de IA | Tope de gasto mensual aprobado antes de W6 |

## Escalabilidad (decisiones tomadas)
- Varias ciudades desde el inicio: los precios y los leads llevan ciudad. Barranquilla y Santa Marta primero, luego 5 ciudades más; otros países después.
- La web y Operflow tienen bases separadas; cada dato tiene un solo dueño.
- Costos a 10x y 100x: por calcular antes de W7.

## Herramientas de Claude por hito
- Modo plan al empezar cada hito; `/retomar` y `/cierre` en cada sesión.
- `validador` y `security-review` en W1, W3, W5 (usuarios, archivos, pagos).
- `auditor` en cada cierre; `archivista` para documentar.
- Navegador para probar en tamaño celular desde W2.

## Dónde está el resto
- Estado: `docs/ESTADO.md` · Decisiones: `docs/DECISIONES.md` · Referencia: `docs/REFERENCIA.md` · Diarios: `docs/hitos/`
- Origen del Momento 1: `docs/TRASPASO-MOMENTO-1.md` · Contrato: `docs/CONTRATO-INTEGRACION.md`
