-- W5 · Tercer refuerzo de pagos: abonos netos (tercera pasada del validador, 2026-11-19). No cambia datos.
--  1. Lo pagado se cuenta NETO: monto − lo que Mercado Pago devolvió (`pagos.monto_devuelto`). Una
--     devolución parcial ya no anula todo el pago: cuenta lo que quedó y se avisa a gerencia.
--  2. Cada cobro pide exactamente LO QUE FALTA de su tipo (abonos): diseño = valor − lo pagado de diseño;
--     anticipo = 35% del valor final − diseño − anticipo ya pagado; saldo = valor medido − todo lo pagado.
--     El lead avanza (pago_estado) cuando lo que falta de ese tipo llega a cero.
--  3. Resolver un pago para revisar exige decir qué pasó: "devuelto" (no cuenta) o "conservar" (cuenta como
--     abono de su tipo, solo si no pasa de lo que falta). Así nunca se vuelve a cobrar lo que ya entró.
--  4. La base bloquea igual que la pantalla: con un pago devuelto o para revisar sin resolver, otro pago no cuenta.

-- 0 ── Columna ──────────────────────────────────────────────────────────────
alter table public.pagos
  add column monto_devuelto bigint not null default 0,
  add constraint pagos_devuelto_valido check (monto_devuelto >= 0 and monto_devuelto <= monto);

-- 1 ── Lo pagado neto de un tipo ────────────────────────────────────────────
create function public.pagado_neto(p_lead uuid, p_tipo public.tipo_orden) returns bigint
language sql stable security definer set search_path = ''
as $$
  select coalesce(sum(monto - monto_devuelto), 0)::bigint from public.pagos
  where lead_id = p_lead and tipo = p_tipo and cuenta
$$;

-- 2 ── Lo que falta pagar de un tipo (null si no se puede calcular) ─────────
create or replace function public.monto_esperado(p_lead uuid, p_tipo public.tipo_orden) returns bigint
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_lead  public.leads;
  v_datos jsonb;
  v_pct   numeric;
  v_d     bigint := public.pagado_neto(p_lead, 'diseno');
  v_a     bigint := public.pagado_neto(p_lead, 'anticipo');
  v_s     bigint := public.pagado_neto(p_lead, 'saldo');
begin
  select * into v_lead from public.leads where id = p_lead;
  if not found then return null; end if;
  select pv.datos into v_datos from public.precios_vigentes pv where pv.ciudad = v_lead.ciudad;

  if p_tipo = 'diseno' then
    return nullif((v_datos -> 'valor_diseno' ->> v_lead.producto)::bigint, 0) - v_d;
  elsif p_tipo = 'anticipo' then
    v_pct := (v_datos ->> 'anticipo_pct')::numeric;
    if v_lead.valor_final is null or v_pct is null then return null; end if;
    return round(v_lead.valor_final::numeric * v_pct / 100)::bigint - v_d - v_a;
  elsif p_tipo = 'saldo' then
    if v_lead.valor_final_medido is null then return null; end if;
    return v_lead.valor_final_medido - v_d - v_a - v_s;
  end if;
  return null;
end;
$$;

-- El lead completó un tipo de pago: avanza, deja historial y el mensaje para Operflow.
create function public.completar_tipo(p_lead uuid, p_tipo public.tipo_orden, p_pago_id bigint) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  update public.leads
  set pago_estado = case p_tipo when 'diseno' then 'diseno'::public.pago_estado
                                when 'anticipo' then 'anticipo'::public.pago_estado
                                else 'saldo'::public.pago_estado end,
      estado = case
                 when p_tipo = 'diseno' and estado in ('nuevo', 'contactado', 'perdido') then 'diseno_pagado'::public.estado_lead
                 when p_tipo = 'anticipo' then 'aprobado'::public.estado_lead
                 else estado end
  where id = p_lead;
  if p_tipo = 'diseno' then
    insert into public.mensajes_operflow (lead_id, mensaje) values (p_lead, 'A') on conflict do nothing;
  else
    insert into public.mensajes_operflow (lead_id, mensaje, pago_id) values (p_lead, 'C', p_pago_id) on conflict do nothing;
  end if;
end;
$$;

-- 2 y 4 ── Aplicar un pago aprobado ─────────────────────────────────────────
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

  if v_lead.estado = 'no_aprobo' or v_lead.operflow_estado = 'cancelado'
     or exists (select 1 from public.clientes c where c.id = v_lead.cliente_id and c.datos_borrados_at is not null) then
    return public.pago_a_revisar(v_pago, p_autor,
      'Llegó un pago de ' || v_valor || ' en un lead cerrado (no aprobó, datos borrados o cancelado). No cuenta: devolver.',
      'cerrado', 'revisar');
  end if;

  if v_pago.modo_prueba and not v_lead.es_prueba then
    return public.pago_a_revisar(v_pago, p_autor,
      'Llegó un pago de PRUEBA (sin dinero real) de ' || v_valor || ' en un lead real. No cuenta.',
      'prueba', 'revisar');
  end if;

  -- 4. Igual que la pantalla: un pago devuelto o para revisar sin resolver bloquea los demás.
  if exists (select 1 from public.pagos
             where lead_id = v_pago.lead_id and estado in ('devuelto', 'revisar') and resuelto_at is null and id <> p_pago_id) then
    return public.pago_a_revisar(v_pago, p_autor,
      'Llegó un pago de ' || v_valor || ', pero el lead tiene otro pago sin resolver (devuelto o para revisar). No cuenta: revisar.',
      'en_revision', 'revisar');
  end if;

  -- Fuera de orden o repetido: el lead no está esperando este tipo de pago.
  v_req := case v_pago.tipo when 'diseno' then 'nada' when 'anticipo' then 'diseno' when 'saldo' then 'anticipo' end;
  if v_lead.pago_estado <> v_req then
    return public.pago_a_revisar(v_pago, p_autor,
      'Pago repetido o fuera de orden de ' || v_valor || '. No cuenta: revisar y devolver si corresponde.',
      'repetido', 'repetida');
  end if;

  -- 2. Debe ser exactamente lo que falta pagar de ese tipo AHORA (no un cobro viejo).
  v_esperado := public.monto_esperado(v_pago.lead_id, v_pago.tipo);
  if v_esperado is null or v_esperado <= 0 or v_esperado <> v_pago.monto then
    return public.pago_a_revisar(v_pago, p_autor,
      'Llegó un pago de ' || v_valor || ', pero hoy faltaba ' || coalesce(public.pesos_texto(v_esperado), 'otro valor')
      || ' (el valor cambió después de crear el cobro). No cuenta: revisar.',
      'valor_cambio', 'revisar');
  end if;

  update public.pagos set cuenta = true, actualizado_at = now() where id = p_pago_id;
  update public.ordenes set estado = 'aprobada', actualizado_at = now() where id = v_pago.orden_id;
  insert into public.actividades (lead_id, autor_id, tipo, detalle)
  values (v_pago.lead_id, p_autor, 'pago',
          'Pagó ' || public.etiqueta_tipo_pago(v_pago.tipo) || ': ' || public.pesos_texto(v_pago.monto)
          || case when v_pago.modo_prueba then ' (PRUEBA, sin dinero real)' else '' end
          || coalesce(' (' || p_referencia || ')', ''));
  perform public.completar_tipo(v_pago.lead_id, v_pago.tipo, p_pago_id);

  return jsonb_build_object('ok', true, 'nuevo_aprobado', true, 'tipo', v_pago.tipo, 'lead_id', v_pago.lead_id,
                            'modo_prueba', v_pago.modo_prueba);
end;
$$;

-- 1 ── Registrar el pago de Mercado Pago (con lo devuelto) ──────────────────
drop function public.registrar_pago(text, bigint, text, numeric, text, text, text, timestamptz, boolean);

create function public.registrar_pago(
  p_orden_id text, p_mp_pago_id bigint, p_estado_mp text, p_monto numeric, p_moneda text,
  p_metodo text, p_detalle text, p_pagado_at timestamptz, p_modo_prueba boolean, p_monto_devuelto numeric
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_orden      public.ordenes;
  v_estado     public.estado_pago;
  v_previo     public.estado_pago;
  v_pago       bigint;
  v_aviso      text;
  v_monto      bigint := greatest(coalesce(round(p_monto), 0), 0)::bigint;
  v_dev        bigint;
  v_dev_previo bigint;
begin
  select * into v_orden from public.ordenes where id = p_orden_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'orden_no_existe');
  end if;
  v_dev := least(greatest(coalesce(round(p_monto_devuelto), 0), 0)::bigint, v_monto);

  v_estado := case
    when p_estado_mp = 'approved' then 'aprobado'
    when p_estado_mp in ('pending', 'in_process', 'in_mediation', 'authorized') then 'pendiente'
    when p_estado_mp in ('refunded', 'charged_back') then 'devuelto'
    else 'rechazado' end;
  if v_estado = 'aprobado' and (p_monto is distinct from v_orden.total_cop::numeric or p_moneda is distinct from 'COP') then
    v_estado := 'revisar';
  end if;

  select id, estado, monto_devuelto into v_pago, v_previo, v_dev_previo
  from public.pagos where mp_pago_id = p_mp_pago_id for update;
  if v_pago is null then
    insert into public.pagos (orden_id, lead_id, tipo, mp_pago_id, estado, estado_mp, detalle, metodo, monto, monto_devuelto,
                              pagado_at, modo_prueba)
    values (p_orden_id, v_orden.lead_id, v_orden.tipo, p_mp_pago_id, v_estado, left(p_estado_mp, 40), left(p_detalle, 200),
            left(p_metodo, 60), v_monto, case when v_estado = 'devuelto' then v_monto else v_dev end, p_pagado_at,
            coalesce(p_modo_prueba, false))
    returning id into v_pago;
  else
    if v_previo = 'aprobado' and p_estado_mp = 'in_mediation' then
      v_aviso := 'Mercado Pago abrió un reclamo sobre el pago ' || p_mp_pago_id || '. Revisar.';
      if v_orden.lead_id is not null
         and not exists (select 1 from public.actividades where lead_id = v_orden.lead_id and tipo = 'pago' and detalle = v_aviso) then
        insert into public.actividades (lead_id, autor_id, tipo, detalle) values (v_orden.lead_id, null, 'pago', v_aviso);
        return jsonb_build_object('ok', true, 'nuevo_aprobado', false, 'alerta', 'reclamo', 'lead_id', v_orden.lead_id, 'tipo', v_orden.tipo);
      end if;
      return jsonb_build_object('ok', true, 'nuevo_aprobado', false, 'sin_cambios', true);
    end if;
    -- Devolución parcial sobre un pago aprobado: cuenta lo que quedó (neto) y se avisa.
    if v_previo = 'aprobado' and v_estado = 'aprobado' then
      if v_dev > v_dev_previo then
        update public.pagos set monto_devuelto = v_dev, actualizado_at = now() where id = v_pago;
        if v_orden.lead_id is not null then
          insert into public.actividades (lead_id, autor_id, tipo, detalle)
          values (v_orden.lead_id, null, 'pago',
                  'Mercado Pago devolvió ' || public.pesos_texto(v_dev) || ' de un pago de ' || public.etiqueta_tipo_pago(v_orden.tipo)
                  || ' por ' || public.pesos_texto(v_monto) || '. Cuenta solo lo que quedó; lo que falta se cobra en el siguiente pago.');
        end if;
        return jsonb_build_object('ok', true, 'nuevo_aprobado', false, 'alerta', 'devolucion_parcial',
                                  'lead_id', v_orden.lead_id, 'tipo', v_orden.tipo);
      end if;
      return jsonb_build_object('ok', true, 'nuevo_aprobado', false, 'sin_cambios', true);
    end if;
    -- Un pago "para revisar" al que gerencia devolvió una parte: se registra lo devuelto (para poder conservar el resto).
    if v_previo = 'revisar' and v_dev > v_dev_previo then
      update public.pagos set monto_devuelto = v_dev, actualizado_at = now() where id = v_pago;
    end if;
    if (v_previo in ('aprobado', 'revisar') and v_estado in ('pendiente', 'rechazado'))
       or (v_previo = 'revisar' and v_estado in ('aprobado', 'revisar'))
       or (v_previo = 'devuelto') then
      return jsonb_build_object('ok', true, 'nuevo_aprobado', false, 'sin_cambios', true);
    end if;
    update public.pagos
    set estado = v_estado, estado_mp = left(p_estado_mp, 40), detalle = left(p_detalle, 200),
        metodo = left(p_metodo, 60), pagado_at = coalesce(p_pagado_at, pagado_at), actualizado_at = now(),
        monto_devuelto = case when v_estado = 'devuelto' then monto else greatest(monto_devuelto, v_dev) end,
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

-- 3 ── Resolver un pago: "devuelto" o "conservar" como abono ────────────────
drop function public.resolver_pago(bigint, uuid, text);

create function public.resolver_pago(p_pago_id bigint, p_autor uuid, p_nota text, p_resultado text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_pago     public.pagos;
  v_lead     public.leads;
  v_req      public.pago_estado;
  v_neto     bigint;
  v_falta    bigint;
  v_completo boolean := false;
begin
  select * into v_pago from public.pagos where id = p_pago_id for update;
  if not found or v_pago.lead_id is null then return jsonb_build_object('ok', false, 'motivo', 'no_existe'); end if;
  if not public.puede_actuar(p_autor, v_pago.lead_id, true) then
    return jsonb_build_object('ok', false, 'motivo', 'no_autorizado');
  end if;
  if v_pago.estado not in ('revisar', 'devuelto') or v_pago.resuelto_at is not null or p_resultado not in ('devuelto', 'conservar') then
    return jsonb_build_object('ok', false, 'motivo', 'estado');
  end if;
  if length(coalesce(trim(p_nota), '')) not between 3 and 300 then
    return jsonb_build_object('ok', false, 'motivo', 'datos');
  end if;

  if p_resultado = 'devuelto' then
    update public.pagos set resuelto_at = now(), resuelto_por = p_autor, cuenta = false,
                            monto_devuelto = monto, actualizado_at = now()
    where id = p_pago_id;
  else
    -- Conservar: solo un pago "para revisar" de dinero real, del tipo que el lead espera y sin pasar de lo que falta.
    select * into v_lead from public.leads where id = v_pago.lead_id for update;
    v_req := case v_pago.tipo when 'diseno' then 'nada' when 'anticipo' then 'diseno' when 'saldo' then 'anticipo' end;
    v_neto := v_pago.monto - v_pago.monto_devuelto;
    v_falta := public.monto_esperado(v_pago.lead_id, v_pago.tipo);
    if v_pago.estado <> 'revisar' or (v_pago.modo_prueba and not v_lead.es_prueba) or v_lead.estado = 'no_aprobo'
       or v_lead.operflow_estado = 'cancelado' or v_lead.pago_estado <> v_req then
      return jsonb_build_object('ok', false, 'motivo', 'no_conservable');
    end if;
    if v_falta is null or v_neto <= 0 or v_neto > v_falta then
      return jsonb_build_object('ok', false, 'motivo', 'excede');
    end if;
    update public.pagos set resuelto_at = now(), resuelto_por = p_autor, cuenta = true, actualizado_at = now()
    where id = p_pago_id;
    if v_neto = v_falta then
      perform public.completar_tipo(v_pago.lead_id, v_pago.tipo, p_pago_id);
      v_completo := true;
    end if;
  end if;

  insert into public.actividades (lead_id, autor_id, tipo, detalle)
  values (v_pago.lead_id, p_autor, 'pago',
          'Gerencia resolvió el pago de ' || public.etiqueta_tipo_pago(v_pago.tipo) || ' por ' || public.pesos_texto(v_pago.monto)
          || case p_resultado when 'devuelto' then ' como DEVUELTO (no cuenta)'
                              else ' como ABONO que cuenta' || case when v_completo then ' (completa ' || public.etiqueta_tipo_pago(v_pago.tipo) || ')' else '' end
             end
          || ': ' || left(trim(p_nota), 300));
  return jsonb_build_object('ok', true, 'completo', v_completo);
end;
$$;

-- 2 ── Valor final / medido con lo pagado neto ──────────────────────────────
create or replace function public.poner_valor_final(p_lead uuid, p_valor bigint, p_medido boolean, p_autor uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_lead     public.leads;
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
    if p_valor - public.pagado_neto(p_lead, 'diseno') - public.pagado_neto(p_lead, 'anticipo') - public.pagado_neto(p_lead, 'saldo') <= 0 then
      return jsonb_build_object('ok', false, 'motivo', 'saldo_cero');
    end if;
    update public.leads set valor_final_medido = p_valor where id = p_lead;
  else
    if v_lead.pago_estado <> 'diseno' or v_lead.estado not in ('diseno_pagado', 'propuesta_enviada') then
      return jsonb_build_object('ok', false, 'motivo', 'estado');
    end if;
    select round(p_valor::numeric * (pv.datos ->> 'anticipo_pct')::numeric / 100)::bigint
           - public.pagado_neto(p_lead, 'diseno') - public.pagado_neto(p_lead, 'anticipo')
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


-- 2 ── Aviso B: el saldo que queda tras un valor ajustado también se calcula con lo pagado neto ──
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
    v_pagado := public.pagado_neto(p_lead, 'diseno') + public.pagado_neto(p_lead, 'anticipo');
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
revoke execute on function
  public.pagado_neto(uuid, public.tipo_orden),
  public.monto_esperado(uuid, public.tipo_orden),
  public.completar_tipo(uuid, public.tipo_orden, bigint),
  public.aplicar_pago_aprobado(bigint, uuid, text),
  public.registrar_pago(text, bigint, text, numeric, text, text, text, timestamptz, boolean, numeric),
  public.resolver_pago(bigint, uuid, text, text),
  public.poner_valor_final(uuid, bigint, boolean, uuid)
from public, anon, authenticated;
grant execute on function
  public.registrar_pago(text, bigint, text, numeric, text, text, text, timestamptz, boolean, numeric),
  public.resolver_pago(bigint, uuid, text, text),
  public.poner_valor_final(uuid, bigint, boolean, uuid)
to service_role;
