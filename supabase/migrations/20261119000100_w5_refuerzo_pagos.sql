-- W5 · Refuerzo de seguridad de pagos (revisión detallada pedida por Alberto y hallazgos del validador,
-- 2026-11-19). No cambia datos existentes.
--  1. Al aprobar un diseño, anticipo o saldo, la base recalcula cuánto debía pagarse en ese momento
--     (tabla de precios vigente, valor final, valor medido y lo ya pagado). Si no coincide (por ejemplo,
--     el cliente pagó un cobro viejo calculado con otro valor), el pago NO cuenta y queda para revisar.
--     Así un lead nunca queda "pagado" con plata faltante.
--  2. Cada pago guarda si fue de prueba (Mercado Pago `live_mode = false`).
--  3. Un pago devuelto deja de contar. Un reclamo abierto sobre un pago aprobado queda en el historial.
--  4. `registrar_pago` devuelve una "alerta" para que el servidor avise a gerencia por correo.
--  5. Valor final: el anticipo que resulta debe ser mayor que cero.
--  6. Avisos de Operflow (B): se revisa el lead antes de guardar la huella; los avisos más viejos que el
--     último se ignoran; "cancelado" y "entregado" no se pisan; el valor medido solo cambia antes del saldo.
--  7. Borrado: un cliente con un cobro reciente aún pagable no se borra entero (se borran sus datos y se
--     conservan las órdenes); el mensaje E sale también si el A se intentó enviar; se limpian las notas
--     de los pagos a mano. Con sesión ya nadie borra clientes ni leads directamente (solo el servidor,
--     que primero borra las fotos de la cubeta).

-- 0 ── Columnas ─────────────────────────────────────────────────────────────
alter table public.pagos add column modo_prueba boolean not null default false;
alter table public.leads add column operflow_aviso_at timestamptz;

-- 7 ── Sin borrado directo con sesión (las fotos de la cubeta quedarían huérfanas) ─────────────────
drop policy clientes_borrar on public.clientes;
drop policy leads_borrar on public.leads;
revoke delete on public.clientes, public.leads from authenticated;

-- 1 ── Cuánto debía pagarse ahora por este tipo de cobro (null si no se puede calcular) ───────────
create function public.monto_esperado(p_lead uuid, p_tipo public.tipo_orden) returns bigint
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_lead    public.leads;
  v_datos   jsonb;
  v_pct     numeric;
  v_diseno  bigint;
  v_anticipo bigint;
begin
  select * into v_lead from public.leads where id = p_lead;
  if not found then return null; end if;
  select pv.datos into v_datos from public.precios_vigentes pv where pv.ciudad = v_lead.ciudad;
  select coalesce(sum(monto) filter (where tipo = 'diseno'), 0), coalesce(sum(monto) filter (where tipo = 'anticipo'), 0)
    into v_diseno, v_anticipo
  from public.pagos where lead_id = p_lead and cuenta;

  if p_tipo = 'diseno' then
    return nullif((v_datos -> 'valor_diseno' ->> v_lead.producto)::bigint, 0);
  elsif p_tipo = 'anticipo' then
    v_pct := (v_datos ->> 'anticipo_pct')::numeric;
    if v_lead.valor_final is null or v_pct is null then return null; end if;
    return round(v_lead.valor_final::numeric * v_pct / 100)::bigint - v_diseno;
  elsif p_tipo = 'saldo' then
    if v_lead.valor_final_medido is null then return null; end if;
    return v_lead.valor_final_medido - v_diseno - v_anticipo;
  end if;
  return null;
end;
$$;

-- 1 y 4 ── Aplicar un pago aprobado ────────────────────────────────────────
create or replace function public.aplicar_pago_aprobado(p_pago_id bigint, p_autor uuid, p_referencia text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_pago     public.pagos;
  v_lead     public.leads;
  v_req      public.pago_estado;
  v_esperado bigint;
begin
  select * into v_pago from public.pagos where id = p_pago_id for update;
  if v_pago.tipo = 'tienda' then
    update public.pagos set cuenta = true, actualizado_at = now() where id = p_pago_id;
    update public.ordenes set estado = 'aprobada', actualizado_at = now() where id = v_pago.orden_id;
    return jsonb_build_object('ok', true, 'nuevo_aprobado', true, 'tipo', 'tienda');
  end if;

  select * into v_lead from public.leads where id = v_pago.lead_id for update;
  v_req := case v_pago.tipo when 'diseno' then 'nada' when 'anticipo' then 'diseno' when 'saldo' then 'anticipo' end;

  -- Repetido (ya se pagó ese tipo) o fuera de orden: queda registrado, no cuenta y se avisa.
  if v_lead.pago_estado <> v_req or exists (
       select 1 from public.pagos
       where lead_id = v_pago.lead_id and tipo = v_pago.tipo and cuenta and id <> p_pago_id) then
    update public.pagos set cuenta = false, estado = 'revisar', actualizado_at = now() where id = p_pago_id;
    update public.ordenes set estado = 'repetida', actualizado_at = now() where id = v_pago.orden_id;
    insert into public.actividades (lead_id, autor_id, tipo, detalle)
    values (v_pago.lead_id, p_autor, 'pago',
            'Pago repetido o fuera de orden de ' || public.etiqueta_tipo_pago(v_pago.tipo) || ' por '
            || public.pesos_texto(v_pago.monto) || '. No cuenta: revisar y devolver si corresponde.');
    return jsonb_build_object('ok', true, 'nuevo_aprobado', false, 'repetido', true, 'alerta', 'repetido',
                              'tipo', v_pago.tipo, 'lead_id', v_pago.lead_id);
  end if;

  -- El valor pagado debe ser exactamente lo que se debía pagar AHORA (no un cobro viejo).
  v_esperado := public.monto_esperado(v_pago.lead_id, v_pago.tipo);
  if v_esperado is null or v_esperado <= 0 or v_esperado <> v_pago.monto then
    update public.pagos set cuenta = false, estado = 'revisar', actualizado_at = now() where id = p_pago_id;
    update public.ordenes set estado = 'revisar', actualizado_at = now() where id = v_pago.orden_id;
    insert into public.actividades (lead_id, autor_id, tipo, detalle)
    values (v_pago.lead_id, p_autor, 'pago',
            'Llegó un pago de ' || public.etiqueta_tipo_pago(v_pago.tipo) || ' por ' || public.pesos_texto(v_pago.monto)
            || ', pero hoy se debía ' || coalesce(public.pesos_texto(v_esperado), 'otro valor')
            || ' (el valor cambió después de crear el cobro). No cuenta: revisar y devolver o cobrar la diferencia.');
    return jsonb_build_object('ok', true, 'nuevo_aprobado', false, 'alerta', 'valor_cambio',
                              'tipo', v_pago.tipo, 'lead_id', v_pago.lead_id);
  end if;

  update public.pagos set cuenta = true, actualizado_at = now() where id = p_pago_id;
  update public.ordenes set estado = 'aprobada', actualizado_at = now() where id = v_pago.orden_id;

  update public.leads
  set pago_estado = case v_pago.tipo when 'diseno' then 'diseno'::public.pago_estado
                                     when 'anticipo' then 'anticipo'::public.pago_estado
                                     else 'saldo'::public.pago_estado end,
      estado = case
                 when v_pago.tipo = 'diseno' and estado in ('nuevo', 'contactado', 'perdido') then 'diseno_pagado'::public.estado_lead
                 when v_pago.tipo = 'anticipo' then 'aprobado'::public.estado_lead
                 else estado end
  where id = v_pago.lead_id;

  insert into public.actividades (lead_id, autor_id, tipo, detalle)
  values (v_pago.lead_id, p_autor, 'pago',
          'Pagó ' || public.etiqueta_tipo_pago(v_pago.tipo) || ': ' || public.pesos_texto(v_pago.monto)
          || case when v_pago.modo_prueba then ' (PRUEBA, sin dinero real)' else '' end
          || coalesce(' (' || p_referencia || ')', ''));

  if v_pago.tipo = 'diseno' then
    insert into public.mensajes_operflow (lead_id, mensaje) values (v_pago.lead_id, 'A') on conflict do nothing;
  else
    insert into public.mensajes_operflow (lead_id, mensaje, pago_id) values (v_pago.lead_id, 'C', p_pago_id) on conflict do nothing;
  end if;

  return jsonb_build_object('ok', true, 'nuevo_aprobado', true, 'tipo', v_pago.tipo, 'lead_id', v_pago.lead_id);
end;
$$;

-- 2, 3 y 4 ── Registrar el pago de Mercado Pago ────────────────────────────
drop function public.registrar_pago(text, bigint, text, numeric, text, text, text, timestamptz);

create function public.registrar_pago(
  p_orden_id text, p_mp_pago_id bigint, p_estado_mp text, p_monto numeric, p_moneda text,
  p_metodo text, p_detalle text, p_pagado_at timestamptz, p_modo_prueba boolean
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_orden  public.ordenes;
  v_estado public.estado_pago;
  v_previo public.estado_pago;
  v_pago   bigint;
  v_aviso  text;
begin
  select * into v_orden from public.ordenes where id = p_orden_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'orden_no_existe');
  end if;

  v_estado := case
    when p_estado_mp = 'approved' then 'aprobado'
    when p_estado_mp in ('pending', 'in_process', 'in_mediation', 'authorized') then 'pendiente'
    when p_estado_mp in ('refunded', 'charged_back') then 'devuelto'
    else 'rechazado' end;
  -- Aprobado, pero no cuadra con lo que se cobró: no cuenta.
  if v_estado = 'aprobado' and (p_monto is distinct from v_orden.total_cop::numeric or p_moneda is distinct from 'COP') then
    v_estado := 'revisar';
  end if;

  select id, estado into v_pago, v_previo from public.pagos where mp_pago_id = p_mp_pago_id for update;
  if v_pago is null then
    insert into public.pagos (orden_id, lead_id, tipo, mp_pago_id, estado, estado_mp, detalle, metodo, monto, pagado_at, modo_prueba)
    values (p_orden_id, v_orden.lead_id, v_orden.tipo, p_mp_pago_id, v_estado, left(p_estado_mp, 40), left(p_detalle, 200),
            left(p_metodo, 60), greatest(coalesce(round(p_monto), 0), 0)::bigint, p_pagado_at, coalesce(p_modo_prueba, false))
    returning id into v_pago;
  else
    if v_previo = 'aprobado' and p_estado_mp = 'in_mediation' then
      -- Reclamo abierto sobre un pago aprobado: sigue contando, pero gerencia debe saberlo (una vez).
      v_aviso := 'Mercado Pago abrió un reclamo sobre el pago ' || p_mp_pago_id || '. Revisar.';
      if v_orden.lead_id is not null
         and not exists (select 1 from public.actividades where lead_id = v_orden.lead_id and tipo = 'pago' and detalle = v_aviso) then
        insert into public.actividades (lead_id, autor_id, tipo, detalle) values (v_orden.lead_id, null, 'pago', v_aviso);
        return jsonb_build_object('ok', true, 'nuevo_aprobado', false, 'alerta', 'reclamo', 'lead_id', v_orden.lead_id, 'tipo', v_orden.tipo);
      end if;
      return jsonb_build_object('ok', true, 'nuevo_aprobado', false, 'sin_cambios', true);
    end if;
    if (v_previo in ('aprobado', 'revisar') and v_estado in ('pendiente', 'rechazado'))
       or (v_previo = 'revisar' and v_estado in ('aprobado', 'revisar'))
       or (v_previo = 'devuelto') then
      -- Un aviso viejo no deshace un pago; uno en revisión o devuelto espera a gerencia.
      return jsonb_build_object('ok', true, 'nuevo_aprobado', false, 'sin_cambios', true);
    end if;
    update public.pagos
    set estado = v_estado, estado_mp = left(p_estado_mp, 40), detalle = left(p_detalle, 200),
        metodo = left(p_metodo, 60), pagado_at = coalesce(p_pagado_at, pagado_at), actualizado_at = now(),
        cuenta = case when v_estado = 'devuelto' then false else cuenta end
    where id = v_pago;
  end if;

  if v_estado = 'aprobado' and v_previo is distinct from 'aprobado' then
    return public.aplicar_pago_aprobado(v_pago, null, 'Mercado Pago ' || p_mp_pago_id);
  end if;

  if v_estado = 'revisar' and v_previo is distinct from 'revisar' then
    update public.ordenes set estado = 'revisar', actualizado_at = now() where id = p_orden_id;
    if v_orden.lead_id is not null then
      insert into public.actividades (lead_id, autor_id, tipo, detalle)
      values (v_orden.lead_id, null, 'pago',
              'Mercado Pago aprobó un pago que no cuadra con el cobro (' || coalesce(public.pesos_texto(round(p_monto)::bigint), '?')
              || ' en vez de ' || public.pesos_texto(v_orden.total_cop) || '). No cuenta: revisar.');
    end if;
    return jsonb_build_object('ok', true, 'nuevo_aprobado', false, 'estado', v_estado, 'alerta', 'monto',
                              'lead_id', v_orden.lead_id, 'tipo', v_orden.tipo);
  elsif v_estado = 'devuelto' and v_previo = 'aprobado' then
    update public.ordenes set estado = 'devuelta', actualizado_at = now() where id = p_orden_id;
    if v_orden.lead_id is not null then
      insert into public.actividades (lead_id, autor_id, tipo, detalle)
      values (v_orden.lead_id, null, 'pago',
              'Mercado Pago informa que el pago de ' || public.etiqueta_tipo_pago(v_orden.tipo)
              || ' fue devuelto o reclamado. Ya no cuenta como pagado.');
    end if;
    return jsonb_build_object('ok', true, 'nuevo_aprobado', false, 'estado', v_estado, 'alerta', 'devuelto',
                              'lead_id', v_orden.lead_id, 'tipo', v_orden.tipo);
  elsif v_estado in ('pendiente', 'rechazado') and v_orden.estado in ('creada', 'pendiente', 'rechazada') then
    update public.ordenes
    set estado = case v_estado when 'pendiente' then 'pendiente'::public.estado_orden else 'rechazada'::public.estado_orden end,
        actualizado_at = now()
    where id = p_orden_id;
  end if;

  return jsonb_build_object('ok', true, 'nuevo_aprobado', false, 'estado', v_estado);
end;
$$;

-- 5 ── Valor final: el anticipo que resulta debe ser mayor que cero ──────────
create or replace function public.poner_valor_final(p_lead uuid, p_valor bigint, p_medido boolean, p_autor uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_lead public.leads;
  v_anticipo bigint;
begin
  if not public.puede_actuar(p_autor, p_lead, true) then
    return jsonb_build_object('ok', false, 'motivo', 'no_autorizado');
  end if;
  if p_valor is null or p_valor <= 0 or p_valor > 10000000000 then
    return jsonb_build_object('ok', false, 'motivo', 'datos');
  end if;
  select * into v_lead from public.leads where id = p_lead for update;
  if not found then return jsonb_build_object('ok', false, 'motivo', 'no_existe'); end if;
  if p_medido then
    if v_lead.pago_estado <> 'anticipo' then return jsonb_build_object('ok', false, 'motivo', 'estado'); end if;
    update public.leads set valor_final_medido = p_valor where id = p_lead;
  else
    if v_lead.pago_estado <> 'diseno' or v_lead.estado not in ('diseno_pagado', 'propuesta_enviada') then
      return jsonb_build_object('ok', false, 'motivo', 'estado');
    end if;
    -- Anticipo que resultaría: pct de la tabla vigente × valor − diseño pagado. Debe ser > 0.
    select round(p_valor::numeric * (pv.datos ->> 'anticipo_pct')::numeric / 100)::bigint
           - coalesce((select sum(monto) from public.pagos where lead_id = p_lead and cuenta and tipo = 'diseno'), 0)
      into v_anticipo
    from public.precios_vigentes pv where pv.ciudad = v_lead.ciudad;
    if v_anticipo is null or v_anticipo <= 0 then
      return jsonb_build_object('ok', false, 'motivo', 'anticipo_cero');
    end if;
    update public.leads set valor_final = p_valor, estado = 'propuesta_enviada' where id = p_lead;
  end if;
  insert into public.actividades (lead_id, autor_id, tipo, detalle)
  values (p_lead, p_autor, 'pago',
          case when p_medido then 'Valor final con medidas confirmadas: ' else 'Valor final de la propuesta: ' end
          || public.pesos_texto(p_valor));
  return jsonb_build_object('ok', true);
end;
$$;

-- 6 ── Avisos de Operflow (B) ───────────────────────────────────────────────
drop function public.registrar_aviso_operflow(text, uuid, text, text, text, text, bigint, text);

create function public.registrar_aviso_operflow(
  p_huella text, p_lead uuid, p_evento text, p_proyecto_id text, p_etapa text, p_estado text,
  p_valor_final bigint, p_url_propuesta text, p_fecha timestamptz
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_lead   public.leads;
  v_final  boolean;
begin
  if exists (select 1 from public.avisos_operflow where huella = p_huella) then
    return jsonb_build_object('ok', true, 'repetido', true);
  end if;
  select * into v_lead from public.leads where id = p_lead for update;
  if not found or v_lead.pago_estado = 'nada' then
    return jsonb_build_object('ok', false, 'motivo', 'lead_no_existe');
  end if;
  insert into public.avisos_operflow (huella, lead_id, evento) values (p_huella, p_lead, p_evento) on conflict do nothing;
  if not found then return jsonb_build_object('ok', true, 'repetido', true); end if;

  -- Un aviso más viejo que el último aplicado se guarda (huella) pero no cambia nada.
  if p_fecha is not null and v_lead.operflow_aviso_at is not null and p_fecha < v_lead.operflow_aviso_at then
    return jsonb_build_object('ok', true, 'viejo', true);
  end if;
  -- Los estados finales no se pisan.
  v_final := coalesce(v_lead.operflow_estado in ('cancelado', 'entregado'), false);

  update public.leads
  set operflow_aviso_at = coalesce(p_fecha, now()),
      operflow_proyecto_id = coalesce(left(p_proyecto_id, 120), operflow_proyecto_id),
      operflow_etapa = case when v_final then operflow_etapa else coalesce(left(p_etapa, 80), operflow_etapa) end,
      operflow_estado = case when v_final then operflow_estado
                             when p_evento = 'entregado' then 'entregado'
                             when p_evento = 'cancelado_tras_medicion' then 'cancelado'
                             else coalesce(left(p_estado, 80), operflow_estado) end,
      operflow_url_propuesta = case when p_evento = 'propuesta_lista' and p_url_propuesta ~ '^https://'
                                    then left(p_url_propuesta, 500) else operflow_url_propuesta end,
      valor_final = case when not v_final and p_evento = 'propuesta_lista' and p_valor_final > 0 and pago_estado = 'diseno'
                              and estado in ('diseno_pagado', 'propuesta_enviada')
                         then p_valor_final else valor_final end,
      valor_final_medido = case when not v_final and p_evento = 'valor_ajustado' and p_valor_final > 0
                                     and pago_estado in ('diseno', 'anticipo') and estado <> 'no_aprobo'
                                then p_valor_final else valor_final_medido end,
      estado = case when p_evento = 'propuesta_lista' and estado = 'diseno_pagado'
                    then 'propuesta_enviada'::public.estado_lead else estado end
  where id = p_lead;

  insert into public.actividades (lead_id, autor_id, tipo, detalle)
  values (p_lead, null, 'operflow',
          case p_evento
            when 'propuesta_lista' then 'Operflow: propuesta lista'
                 || case when p_valor_final > 0 then ' por ' || public.pesos_texto(p_valor_final) else '' end
            when 'valor_ajustado' then 'Operflow: valor ajustado tras medir'
                 || case when p_valor_final > 0 then ' a ' || public.pesos_texto(p_valor_final) else '' end
            when 'entregado' then 'Operflow: proyecto entregado'
            when 'cancelado_tras_medicion' then
              'Operflow: cancelado tras la medición. Devolución pendiente: anticipo menos la visita (la hace gerencia en Mercado Pago).'
            else 'Operflow: etapa ' || coalesce(left(p_etapa, 80), '?') || coalesce(' · ' || left(p_estado, 80), '')
          end
          || case when v_final then ' (el proyecto ya estaba cerrado; no cambia nada)' else '' end);
  return jsonb_build_object('ok', true);
end;
$$;

-- 7 ── Borrado de datos del cliente ─────────────────────────────────────────
create or replace function public.borrar_datos_cliente(p_lead uuid, p_autor uuid, p_motivo text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_lead    public.leads;
  v_cliente uuid;
  v_conservar boolean;
begin
  if p_motivo not in ('no_aprobo', 'borrar') or not public.puede_actuar(p_autor, p_lead, p_motivo = 'borrar') then
    return jsonb_build_object('ok', false, 'motivo', 'no_autorizado');
  end if;
  select * into v_lead from public.leads where id = p_lead for update;
  if not found then return jsonb_build_object('ok', false, 'motivo', 'no_existe'); end if;
  v_cliente := v_lead.cliente_id;
  if p_motivo = 'no_aprobo' and (v_lead.pago_estado <> 'diseno' or v_lead.estado not in ('diseno_pagado', 'propuesta_enviada')) then
    return jsonb_build_object('ok', false, 'motivo', 'estado');
  end if;

  -- Se conservan las órdenes (y no se borra el cliente entero) si hubo pagos o si hay un cobro de
  -- las últimas 25 horas que el cliente todavía podría pagar en Mercado Pago (vencen a las 24 h).
  v_conservar := exists (
      select 1 from public.pagos p join public.leads l on l.id = p.lead_id
      where l.cliente_id = v_cliente and p.estado in ('aprobado', 'revisar', 'devuelto', 'pendiente'))
    or exists (
      select 1 from public.ordenes o join public.leads l on l.id = o.lead_id
      where l.cliente_id = v_cliente and o.url_pago is not null and o.creado_at > now() - interval '25 hours');

  if p_motivo = 'borrar' and not v_conservar then
    delete from public.pagos where lead_id in (select id from public.leads where cliente_id = v_cliente);
    delete from public.ordenes where lead_id in (select id from public.leads where cliente_id = v_cliente);
    delete from public.clientes where id = v_cliente; -- en cascada: leads, notas, fotos (filas) y bandeja
    return jsonb_build_object('ok', true, 'resultado', 'borrado');
  end if;

  -- Operflow: si el proyecto llegó (o pudo llegar) allá, se le pide borrar; lo que no salió, ya no sale.
  insert into public.mensajes_operflow (lead_id, mensaje)
  select l.id, 'E' from public.leads l
  where l.cliente_id = v_cliente
    and exists (select 1 from public.mensajes_operflow m
                where m.lead_id = l.id and m.mensaje = 'A' and (m.estado = 'enviado' or m.intentos > 0))
  on conflict do nothing;
  update public.mensajes_operflow set estado = 'cancelado', ultimo_error = 'Datos del cliente borrados antes de enviar'
  where lead_id in (select id from public.leads where cliente_id = v_cliente)
    and mensaje in ('A', 'C') and estado in ('pendiente', 'fallido');

  delete from public.actividades where tipo = 'nota' and lead_id in (select id from public.leads where cliente_id = v_cliente);
  -- La nota libre de un pago a mano puede traer nombres: se quita.
  update public.actividades set detalle = regexp_replace(detalle, ' \(a mano: .*\)$', ' (a mano)')
  where tipo = 'pago' and lead_id in (select id from public.leads where cliente_id = v_cliente) and detalle like '% (a mano: %';
  update public.ordenes set nota = null where nota is not null and lead_id in (select id from public.leads where cliente_id = v_cliente);
  delete from public.archivos where lead_id in (select id from public.leads where cliente_id = v_cliente);
  update public.clientes
  set nombre = 'Cliente borrado', telefono = null, email = null, direccion = null, datos_borrados_at = now()
  where id = v_cliente;

  if p_motivo = 'no_aprobo' then
    update public.leads set estado = 'no_aprobo', proximo_contacto = null where id = p_lead;
  else
    update public.leads set proximo_contacto = null where cliente_id = v_cliente;
  end if;
  insert into public.actividades (lead_id, autor_id, tipo, detalle)
  values (p_lead, p_autor, 'cambio_estado',
          case p_motivo when 'no_aprobo' then 'No aprobó: se borraron sus datos personales, fotos y notas'
                        else 'Se borraron los datos personales, fotos y notas del cliente (se conservan los pagos)' end);
  return jsonb_build_object('ok', true, 'resultado', 'anonimizado');
end;
$$;

revoke execute on function
  public.monto_esperado(uuid, public.tipo_orden),
  public.aplicar_pago_aprobado(bigint, uuid, text),
  public.registrar_pago(text, bigint, text, numeric, text, text, text, timestamptz, boolean),
  public.poner_valor_final(uuid, bigint, boolean, uuid),
  public.registrar_aviso_operflow(text, uuid, text, text, text, text, bigint, text, timestamptz),
  public.borrar_datos_cliente(uuid, uuid, text)
from public, anon, authenticated;
grant execute on function
  public.registrar_pago(text, bigint, text, numeric, text, text, text, timestamptz, boolean),
  public.poner_valor_final(uuid, bigint, boolean, uuid),
  public.registrar_aviso_operflow(text, uuid, text, text, text, text, bigint, text, timestamptz),
  public.borrar_datos_cliente(uuid, uuid, text)
to service_role;
