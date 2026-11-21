-- W5 · Segundo refuerzo de pagos (segunda pasada del validador, 2026-11-19). No cambia datos existentes.
--  1. Un pago sobre un lead CERRADO (no aprobó, datos borrados u Operflow cancelado) no cuenta: queda
--     para revisar y devolver, con alerta.
--  2. Un pago de PRUEBA solo cuenta en un lead de prueba (`leads.es_prueba`, lo marca el servidor cuando
--     el lead se crea fuera de producción). Así una prueba en la vista previa nunca marca un lead real.
--  3. Mientras un lead tenga un pago devuelto sin resolver, ningún pago nuevo cuenta (queda para revisar).
--  4. Valor medido: debe dejar saldo a cobrar (si no, gerencia devuelve la diferencia a mano).
--  5. Avisos de Operflow: la regla de "aviso viejo" se aplica por separado a la etapa y a los valores, y
--     un aviso ignorado deja rastro en el historial. Un valor ajustado que no deja saldo avisa.
--  6. Mensaje E: sale si el A se intentó alguna vez (`respuesta_http` guarda también 0 = sin respuesta).

-- 0 ── Columnas ─────────────────────────────────────────────────────────────
alter table public.leads
  add column es_prueba boolean not null default false,
  add column operflow_valor_at timestamptz;

-- Un pago "para revisar" o "devuelto" bloquea nuevos cobros del lead hasta que gerencia lo marca resuelto.
alter table public.pagos
  add column resuelto_at timestamptz,
  add column resuelto_por uuid references public.perfiles (id) on delete set null;

-- 7 ── Gerencia marca resuelto un pago para revisar o devuelto (ya devolvió, cobró la diferencia, etc.) ──
create function public.resolver_pago(p_pago_id bigint, p_autor uuid, p_nota text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_pago public.pagos;
begin
  select * into v_pago from public.pagos where id = p_pago_id for update;
  if not found or v_pago.lead_id is null then return jsonb_build_object('ok', false, 'motivo', 'no_existe'); end if;
  if not public.puede_actuar(p_autor, v_pago.lead_id, true) then
    return jsonb_build_object('ok', false, 'motivo', 'no_autorizado');
  end if;
  if v_pago.estado not in ('revisar', 'devuelto') or v_pago.resuelto_at is not null then
    return jsonb_build_object('ok', false, 'motivo', 'estado');
  end if;
  if length(coalesce(trim(p_nota), '')) not between 3 and 300 then
    return jsonb_build_object('ok', false, 'motivo', 'datos');
  end if;
  update public.pagos set resuelto_at = now(), resuelto_por = p_autor, actualizado_at = now() where id = p_pago_id;
  insert into public.actividades (lead_id, autor_id, tipo, detalle)
  values (v_pago.lead_id, p_autor, 'pago',
          'Gerencia marcó resuelto el pago de ' || public.etiqueta_tipo_pago(v_pago.tipo) || ' por '
          || public.pesos_texto(v_pago.monto) || ': ' || left(trim(p_nota), 300));
  return jsonb_build_object('ok', true);
end;
$$;

-- Con sesión nadie marca ni desmarca un lead como de prueba (solo el servidor al crearlo).
create function public.proteger_es_prueba() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is not null and (new.es_prueba is distinct from old.es_prueba
                                 or new.operflow_valor_at is distinct from old.operflow_valor_at
                                 or new.operflow_aviso_at is distinct from old.operflow_aviso_at) then
    raise exception 'Ese dato del lead lo cambia solo el sistema' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger leads_proteger_es_prueba
  before update on public.leads
  for each row execute function public.proteger_es_prueba();

-- Deja un pago para revisar (no cuenta) con su explicación en el historial.
create function public.pago_a_revisar(p_pago public.pagos, p_autor uuid, p_detalle text, p_alerta text, p_estado_orden public.estado_orden)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  update public.pagos set cuenta = false, estado = 'revisar', actualizado_at = now() where id = p_pago.id;
  update public.ordenes set estado = p_estado_orden, actualizado_at = now() where id = p_pago.orden_id;
  insert into public.actividades (lead_id, autor_id, tipo, detalle) values (p_pago.lead_id, p_autor, 'pago', p_detalle);
  return jsonb_build_object('ok', true, 'nuevo_aprobado', false, 'alerta', p_alerta, 'repetido', p_alerta = 'repetido',
                            'tipo', p_pago.tipo, 'lead_id', p_pago.lead_id);
end;
$$;

-- 1, 2, 3 ── Aplicar un pago aprobado ──────────────────────────────────────
create or replace function public.aplicar_pago_aprobado(p_pago_id bigint, p_autor uuid, p_referencia text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_pago     public.pagos;
  v_lead     public.leads;
  v_req      public.pago_estado;
  v_esperado bigint;
  v_valor    text;
begin
  select * into v_pago from public.pagos where id = p_pago_id for update;
  if v_pago.tipo = 'tienda' then
    update public.pagos set cuenta = true, actualizado_at = now() where id = p_pago_id;
    update public.ordenes set estado = 'aprobada', actualizado_at = now() where id = v_pago.orden_id;
    return jsonb_build_object('ok', true, 'nuevo_aprobado', true, 'tipo', 'tienda');
  end if;

  select * into v_lead from public.leads where id = v_pago.lead_id for update;
  v_valor := public.etiqueta_tipo_pago(v_pago.tipo) || ' por ' || public.pesos_texto(v_pago.monto);

  -- 1. Lead cerrado: no aprobó, datos borrados u Operflow cancelado.
  if v_lead.estado = 'no_aprobo' or v_lead.operflow_estado = 'cancelado'
     or exists (select 1 from public.clientes c where c.id = v_lead.cliente_id and c.datos_borrados_at is not null) then
    return public.pago_a_revisar(v_pago, p_autor,
      'Llegó un pago de ' || v_valor || ' en un lead cerrado (no aprobó, datos borrados o cancelado). No cuenta: devolver.',
      'cerrado', 'revisar');
  end if;

  -- 2. Pago de prueba en un lead real.
  if v_pago.modo_prueba and not v_lead.es_prueba then
    return public.pago_a_revisar(v_pago, p_autor,
      'Llegó un pago de PRUEBA (sin dinero real) de ' || v_valor || ' en un lead real. No cuenta.',
      'prueba', 'revisar');
  end if;

  -- 3. Hay un pago devuelto sin resolver.
  if exists (select 1 from public.pagos
             where lead_id = v_pago.lead_id and estado = 'devuelto' and resuelto_at is null and id <> p_pago_id) then
    return public.pago_a_revisar(v_pago, p_autor,
      'Llegó un pago de ' || v_valor || ', pero el lead tiene un pago devuelto sin resolver. No cuenta: revisar.',
      'en_revision', 'revisar');
  end if;

  -- Repetido (ya se pagó ese tipo) o fuera de orden.
  v_req := case v_pago.tipo when 'diseno' then 'nada' when 'anticipo' then 'diseno' when 'saldo' then 'anticipo' end;
  if v_lead.pago_estado <> v_req or exists (
       select 1 from public.pagos
       where lead_id = v_pago.lead_id and tipo = v_pago.tipo and cuenta and id <> p_pago_id) then
    return public.pago_a_revisar(v_pago, p_autor,
      'Pago repetido o fuera de orden de ' || v_valor || '. No cuenta: revisar y devolver si corresponde.',
      'repetido', 'repetida');
  end if;

  -- El valor pagado debe ser exactamente lo que se debía pagar AHORA (no un cobro viejo).
  v_esperado := public.monto_esperado(v_pago.lead_id, v_pago.tipo);
  if v_esperado is null or v_esperado <= 0 or v_esperado <> v_pago.monto then
    return public.pago_a_revisar(v_pago, p_autor,
      'Llegó un pago de ' || v_valor || ', pero hoy se debía ' || coalesce(public.pesos_texto(v_esperado), 'otro valor')
      || ' (el valor cambió después de crear el cobro). No cuenta: revisar y devolver o cobrar la diferencia.',
      'valor_cambio', 'revisar');
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

  return jsonb_build_object('ok', true, 'nuevo_aprobado', true, 'tipo', v_pago.tipo, 'lead_id', v_pago.lead_id,
                            'modo_prueba', v_pago.modo_prueba);
end;
$$;

-- 4 ── Valor final y valor medido ───────────────────────────────────────────
create or replace function public.poner_valor_final(p_lead uuid, p_valor bigint, p_medido boolean, p_autor uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_lead     public.leads;
  v_anticipo bigint;
  v_pagado   bigint;
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
    select coalesce(sum(monto), 0) into v_pagado from public.pagos where lead_id = p_lead and cuenta and tipo in ('diseno', 'anticipo');
    if p_valor - v_pagado <= 0 then
      return jsonb_build_object('ok', false, 'motivo', 'saldo_cero');
    end if;
    update public.leads set valor_final_medido = p_valor where id = p_lead;
  else
    if v_lead.pago_estado <> 'diseno' or v_lead.estado not in ('diseno_pagado', 'propuesta_enviada') then
      return jsonb_build_object('ok', false, 'motivo', 'estado');
    end if;
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

-- 5 ── Avisos de Operflow (B) ───────────────────────────────────────────────
create or replace function public.registrar_aviso_operflow(
  p_huella text, p_lead uuid, p_evento text, p_proyecto_id text, p_etapa text, p_estado text,
  p_valor_final bigint, p_url_propuesta text, p_fecha timestamptz
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_lead    public.leads;
  v_final   boolean;
  v_fecha   timestamptz := coalesce(p_fecha, now());
  v_es_valor boolean := p_evento in ('propuesta_lista', 'valor_ajustado');
  v_viejo   boolean;
  v_pagado  bigint;
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

  -- "Viejo" se mide por separado: los valores contra el último valor recibido, la etapa contra la última etapa.
  v_viejo := case when v_es_valor then v_lead.operflow_valor_at is not null and v_fecha < v_lead.operflow_valor_at
                  else v_lead.operflow_aviso_at is not null and v_fecha < v_lead.operflow_aviso_at end;
  if v_viejo then
    insert into public.actividades (lead_id, autor_id, tipo, detalle)
    values (p_lead, null, 'operflow', 'Operflow: llegó un aviso "' || left(p_evento, 40) || '" más viejo que el último; no cambió nada.');
    return jsonb_build_object('ok', true, 'viejo', true);
  end if;
  v_final := coalesce(v_lead.operflow_estado in ('cancelado', 'entregado'), false);

  update public.leads
  set operflow_aviso_at = case when v_es_valor then operflow_aviso_at else v_fecha end,
      operflow_valor_at = case when v_es_valor then v_fecha else operflow_valor_at end,
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

  -- Un valor ajustado que no deja saldo: hay que devolver la diferencia (lo hace gerencia).
  if not v_final and p_evento = 'valor_ajustado' and p_valor_final > 0 and v_lead.pago_estado = 'anticipo' then
    select coalesce(sum(monto), 0) into v_pagado from public.pagos where lead_id = p_lead and cuenta and tipo in ('diseno', 'anticipo');
    if p_valor_final - v_pagado <= 0 then
      insert into public.actividades (lead_id, autor_id, tipo, detalle)
      values (p_lead, null, 'pago', 'El valor ajustado no deja saldo: el cliente ya pagó ' || public.pesos_texto(v_pagado)
              || '. Revisar y devolver la diferencia si corresponde.');
      return jsonb_build_object('ok', true, 'alerta', 'saldo_negativo');
    end if;
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- 6 ── Borrado: el E sale si el A se intentó alguna vez ─────────────────────
create or replace function public.borrar_datos_cliente(p_lead uuid, p_autor uuid, p_motivo text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_lead      public.leads;
  v_cliente   uuid;
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

  v_conservar := exists (
      select 1 from public.pagos p join public.leads l on l.id = p.lead_id
      where l.cliente_id = v_cliente and p.estado in ('aprobado', 'revisar', 'devuelto', 'pendiente'))
    or exists (
      select 1 from public.ordenes o join public.leads l on l.id = o.lead_id
      where l.cliente_id = v_cliente and o.url_pago is not null and o.creado_at > now() - interval '25 hours');

  if p_motivo = 'borrar' and not v_conservar then
    delete from public.pagos where lead_id in (select id from public.leads where cliente_id = v_cliente);
    delete from public.ordenes where lead_id in (select id from public.leads where cliente_id = v_cliente);
    delete from public.clientes where id = v_cliente;
    return jsonb_build_object('ok', true, 'resultado', 'borrado');
  end if;

  insert into public.mensajes_operflow (lead_id, mensaje)
  select l.id, 'E' from public.leads l
  where l.cliente_id = v_cliente
    and exists (select 1 from public.mensajes_operflow m
                where m.lead_id = l.id and m.mensaje = 'A'
                  and (m.estado = 'enviado' or m.intentos > 0 or m.respuesta_http is not null))
  on conflict do nothing;
  update public.mensajes_operflow set estado = 'cancelado', ultimo_error = 'Datos del cliente borrados antes de enviar'
  where lead_id in (select id from public.leads where cliente_id = v_cliente)
    and mensaje in ('A', 'C') and estado in ('pendiente', 'fallido');

  delete from public.actividades where tipo = 'nota' and lead_id in (select id from public.leads where cliente_id = v_cliente);
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
  public.resolver_pago(bigint, uuid, text),
  public.proteger_es_prueba(),
  public.pago_a_revisar(public.pagos, uuid, text, text, public.estado_orden),
  public.aplicar_pago_aprobado(bigint, uuid, text),
  public.poner_valor_final(uuid, bigint, boolean, uuid),
  public.registrar_aviso_operflow(text, uuid, text, text, text, text, bigint, text, timestamptz),
  public.borrar_datos_cliente(uuid, uuid, text)
from public, anon, authenticated;
grant execute on function
  public.resolver_pago(bigint, uuid, text),
  public.poner_valor_final(uuid, bigint, boolean, uuid),
  public.registrar_aviso_operflow(text, uuid, text, text, text, text, bigint, text, timestamptz),
  public.borrar_datos_cliente(uuid, uuid, text)
to service_role;
