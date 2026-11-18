# Contrato de integración: Web Hechomadera ↔ Operflow (v0.1 · 2026-11-17)

> **Dónde va:** el original vive en el repositorio de **Operflow** (`docs/CONTRATO-INTEGRACION.md`). La web guarda una copia de solo lectura en `docs/CONTRATO-INTEGRACION.md`. Si cambia, se cambia primero en Operflow y se copia a la web.
> **Estado:** borrador para aprobar. Nada de esto está construido todavía.

## 1. Reparto de responsabilidades

| Vive en la **web** | Vive en **Operflow** |
| --- | --- |
| Leads, clientes y CRM (seguimiento comercial) | Proyectos aprobados para diseñar y producir |
| Configurador, catálogo, rango de precio y **tabla de precios por ciudad** (única fuente) | Diseño, cotización final, propuesta, etapas, calidad y entrega |
| Cobros con Mercado Pago (anticipos y pagos) | Registro de que un pago llegó (no cobra en el Momento 1) |

**Regla:** cada dato tiene un solo dueño. La web no guarda etapas de producción; Operflow no guarda el historial comercial del lead.

## 2. Los 5 mensajes del Momento 1

### A. Web → Operflow: "crear proyecto con brief"
**Qué lo dispara (decidido 2026-11-17):** el **pago del diseño** confirmado por Mercado Pago. Es la única puerta de entrada. Se envía automáticamente desde el webhook de pagos de la web, sin que nadie oprima un botón. Si el pago no se confirma, no se envía nada.

- El diseño tiene un **precio fijo por producto**, editable en la tabla de precios de la web: cocina $300.000, closet $150.000, mueble de baño $150.000, centro de entretenimiento $200.000, puerta $100.000 y escritorio $100.000 (COP). En el Momento 1 solo aplica cocina.
- El valor del diseño se descuenta **del anticipo** si el cliente aprueba: anticipo = 35% del valor final − valor del diseño.
- El anticipo del 35% **no** se paga al entrar; se paga cuando el cliente aprueba el diseño (mensaje C).

`POST {OPERFLOW_URL}/api/v1/proyectos`

```json
{
  "id_externo": "lead_8f2c...",          
  "producto": "cocina",
  "ciudad": "Santa Marta",
  "cliente": { "nombre": "", "telefono": "", "email": "", "direccion": "" },
  "asesor_email": "asesor@hechomadera.com",
  "configuracion": {
    "forma": "L",                         
    "diseno_base": "D3",                  
    "colores": { "cuerpos": "", "frentes": "" },
    "herrajes": "estandar",              
    "electrodomesticos": ["estufa", "nevera", "campana"],
    "medidas_aprox_mm": { "pared_a": 3200, "pared_b": 2400, "alto": 2400 },
    "notas_cliente": ""
  },
  "rango_precio": { "min": 0, "max": 0, "moneda": "COP" },
  "archivos": [{ "tipo": "foto_espacio", "url": "https://...firmada" }],
  "pago_diseno": { "valor": 300000, "moneda": "COP", "referencia": "mp_...", "fecha": "..." }
}
```

Respuestas:
- `201`: `{ "proyecto_id": "...", "url": "..." }`. Operflow crea el proyecto con la plantilla de etapas de Hechomadera y lo asigna al diseñador.
- `200`: si ese `id_externo` ya existía, devuelve el mismo proyecto. Así no se crean duplicados si la web reintenta.
- `400`: datos inválidos, con la lista de campos.
- `401`: clave incorrecta.

### B. Operflow → Web: "aviso de cambio"
Operflow avisa a la web cuando un proyecto cambia de etapa, para que el CRM muestre el estado sin entrar a Operflow.

`POST {WEB_URL}/api/integraciones/operflow`

```json
{
  "evento": "etapa_cambiada",            
  "id_externo": "lead_8f2c...",
  "proyecto_id": "...",
  "etapa": "propuesta",
  "estado": "lista",
  "fecha": "2026-11-17T18:00:00-05:00",
  "datos": { "url_propuesta": "https://...", "valor_final": 0 }
}
```

Eventos del Momento 1: `etapa_cambiada`, `propuesta_lista`, `valor_ajustado` (tras confirmar medidas), `entregado`, `cancelado_tras_medicion`.

Si tras medir el cliente no acepta el valor ajustado, Operflow cierra el proyecto como cancelado y avisa a la web. La web gestiona la devolución en Mercado Pago: el anticipo menos el costo de la visita de medición; el diseño no se devuelve.

### C. Web → Operflow: "pago registrado"
Se envía cuando Mercado Pago confirma un pago posterior al diseño:
- **Anticipo:** cuando el cliente aprueba la propuesta (35% del valor final menos el diseño ya pagado). Con esto empieza la producción.
- **Saldo:** se calcula con el valor final recalculado después de confirmar medidas (no hay tolerancia: el precio depende de las medidas finales).
`POST {OPERFLOW_URL}/api/v1/proyectos/{id_externo}/pagos`

```json
{ "tipo": "anticipo | saldo", "valor": 0, "moneda": "COP", "referencia": "mp_...", "fecha": "..." }
```

Operflow lo registra y avanza la etapa "Aprobación y anticipo". El cobro lo hace la web, no Operflow. Operflow muestra en el proyecto cuánto se ha pagado y cuánto falta, con el diseño ya descontado.

### D. Operflow → Web: "consultar precios" (solo lectura)
La tabla de precios por ciudad vive en la web (decidido 2026-11-17). Operflow la consulta para armar la cotización final; no guarda su propia copia editable.

`GET {WEB_URL}/api/integraciones/precios?ciudad=Santa%20Marta`

Respuesta: los precios vigentes de esa ciudad (metro lineal por diseño base, adicionales por color, nivel de herrajes e isla), con su fecha de vigencia.
- Usa la misma clave entre servidores (`Authorization: Bearer ...`).
- En cada cotización final, Operflow guarda los precios que usó. Así, si la tabla cambia después, la cotización no se mueve.

### E. Web → Operflow: "cliente no aprobó: entregar y borrar"
Si el cliente no aprueba el diseño, no se le devuelve el pago. **El diseño es suyo**, Hechomadera garantiza que no lo usará y se borran sus datos (decidido 2026-11-17).

1. El cliente recibe **solo el render** (decidido 2026-11-17). Operflow lo entrega a la web y la web se lo envía al cliente por enlace. No se entregan planos, despiece ni `.skp`.
2. El asesor marca el lead como "no aprobó" en el CRM. La web envía:

   `POST {OPERFLOW_URL}/api/v1/proyectos/{id_externo}/eliminar`

3. Operflow borra los archivos del diseño (render, despiece y `.skp`), las fotos y los datos personales.
   - Solo conserva un registro anónimo: producto, ciudad, fecha y valor pagado, para métricas.
   - Responde con la confirmación del borrado.
4. La web borra los datos personales del lead y conserva solo lo que la ley obliga a guardar del pago (factura y registro contable).

## 3. Seguridad (obligatorio)

- **Solo de servidor a servidor.** El navegador del cliente nunca llama a Operflow.
- **Clave por negocio:** Operflow genera una clave para la cuenta de Hechomadera y guarda solo una versión cifrada (hash). La web la guarda en Vercel como `OPERFLOW_API_KEY` y la envía en `Authorization: Bearer ...`. Se puede revocar y cambiar sin tocar código.
- **Avisos firmados:** los mensajes de Operflow a la web llevan una firma (HMAC) con un secreto compartido (`OPERFLOW_WEBHOOK_SECRET`). La web rechaza lo que no venga firmado.
- **Fotos:** la web envía enlaces firmados de vida corta. Operflow copia los archivos a su propio almacenamiento al recibirlos.
- **Datos mínimos:** a Operflow solo va lo necesario para diseñar, producir e instalar. El historial comercial se queda en la web.
- **Consentimiento (Ley 1581):** el configurador pide autorización de tratamiento de datos antes de guardar el lead.
- **Límites:** máximo de solicitudes por minuto por clave y registro de cada llamada (sin datos sensibles).

## 4. Para después (Momento 2, no construir ahora)
- Que otros carpinteros (clientes comerciales de Operflow) usen esta misma API con su propia clave.

## 5. Decisiones abiertas
Ninguna por ahora (cerradas el 2026-11-17).