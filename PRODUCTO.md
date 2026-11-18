# Hechomadera-web: definición de producto

La puerta de entrada y el centro comercial de Hechomadera, una carpintería digital (casi 100% remota, excepto la instalación): el cliente configura su cocina, ve un rango de precio, paga el diseño y queda como lead en el CRM.

## Misión
Que un cliente pueda pasar de "quiero una cocina" a "pagué mi diseño" desde el celular, sin visitas previas, con un precio claro y honesto.

## Visión
Operar en varias ciudades de Colombia y luego en otros países, con el mismo flujo: configurar, pagar el diseño, aprobar, producir e instalar.

## Problema
El cliente no sabe cuánto cuesta una cocina a medida ni cómo empezar; la carpintería pierde tiempo diseñando para quien no compra. Pagar el diseño filtra a los clientes serios.

## Usuarios y roles
| Rol | Qué hace | Qué ve / qué no ve |
| --- | --- | --- |
| Cliente | Configura, ve el rango, paga diseño, anticipo y saldo | Solo su propio proceso y su render. Nunca planos ni despiece |
| Asesor | Sigue sus leads: estados, notas, próximo contacto, "no aprobó" | Solo los leads asignados a él |
| Gerencia | Ve todo, asigna leads a mano, edita la tabla de precios | Todo |

Hoy el equipo es 1 asesor y 1 diseñador (el diseñador trabaja en Operflow).

## Versión 1 (Momento 1)
1. Catálogo de cocinas: 4 formas (lineal, L, U, isla) × 5 diseños base = 20 escenas (imágenes provisionales al inicio).
2. Rango de precio: fórmula por metro lineal + adicionales (diseño, colores, nivel de herrajes, isla), por ciudad (Barranquilla y Santa Marta). Precios de ejemplo editables por gerencia.
3. Configurador guiado paso a paso (sin IA): forma, diseño, colores, herrajes, electrodomésticos, medidas aproximadas, fotos del espacio, contacto y autorización de datos. Muestra rango e imagen de referencia.
4. Agente de IA encima del configurador (después de que el formulario funcione).
5. CRM mínimo: leads, estado, asesor, notas, próximo contacto, qué pagó (nada, diseño, anticipo, saldo), estado de Operflow y acción "no aprobó".
6. Usuarios de la web: gerencia y asesor (reemplaza el token único del admin).
7. Integración con Operflow según el contrato (mensajes A–E).
8. Cobros con Mercado Pago (reusa lo existente, con valor variable por lead): diseño → anticipo (35% del valor final − diseño) → saldo.
9. Términos y privacidad con las reglas del pago del diseño (revisa un abogado).

## Fuera de la versión 1
Integración con WhatsApp (el asesor comparte el enlace a mano), agenda sincronizada, tablero de métricas avanzado, otros productos además de cocinas, motor CAD propio.

## Métricas de éxito (y plazo)
- W7: de 3 a 5 leads reales recorren el flujo completo (configurador → pago del diseño → Operflow → anticipo).
- Propuesta al cliente en máximo 48 horas después de pagar el diseño.
- Por confirmar con Alberto: tasa de conversión objetivo (lead → diseño pagado → anticipo) y plazo.

## Negocio (cómo crea o ahorra dinero)
- El cliente paga el diseño (precio fijo por producto; cocina $300.000 COP), que se descuenta del anticipo si aprueba.
- Anticipo del 35% del valor final al aprobar el diseño; saldo sobre el valor recalculado con medidas confirmadas (sin tolerancia).
- Si no aprueba: el diseño no se devuelve, recibe solo el render, es suyo y se borran sus datos.
- Marketplace de la tienda a precio fijo (ya existe).
- Facturas por fuera del sistema; la web solo registra pagos.

## Integraciones
- **Operflow** (otro repositorio): recibe solo proyectos con diseño pagado. Contrato en `docs/CONTRATO-INTEGRACION.md`.
- **Mercado Pago** Checkout Pro (operativo en producción), **Resend** (correo, dominio verificado), **Vercel Analytics**.

## Tecnología (confirmada / por decidir)
- Confirmada: Next.js 15, React 19, Tailwind, Vercel, Upstash Redis (órdenes actuales), Mercado Pago, Resend.
- Por crear (W1): Supabase propio de la web, plan gratis, proyecto aparte del de Operflow. Evaluar Pro antes de clientes reales (requiere aprobación).
- Por aprobar: pasar las órdenes de Redis a Supabase durante el hito del CRM.
- Por decidir (W6): cuenta de API de Anthropic con tope de gasto mensual aprobado por Alberto.
