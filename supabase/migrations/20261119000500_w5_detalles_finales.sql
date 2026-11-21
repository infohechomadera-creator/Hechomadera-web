-- W5 · Detalles finales de pagos (quinta pasada del validador, sin riesgo de plata, 2026-11-19). No cambia datos.
--  1. Un pago que se devuelve SIN haber contado nunca (llegó devuelto, o pasó de pendiente a devuelto) queda
--     resuelto solo: la plata entró y salió, no hay nada que revisar ni que bloquear.
--  2. Gerencia puede ajustar el valor medido también con el saldo ya pagado (por ejemplo, un descuento
--     acordado y devuelto en Mercado Pago), siempre que no quede por debajo de lo pagado.
--  3. Al completar el anticipo con el valor medido ya conocido, si no queda saldo se deja aviso en el historial.

-- 1 ── Devuelto sin haber contado: resuelto solo ────────────────────────────
create function public.resolver_devuelto_sin_contar() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.estado = 'devuelto' and not new.cuenta and new.resuelto_at is null
     and (tg_op = 'INSERT' or (not old.cuenta and old.estado in ('pendiente', 'rechazado'))) then
    new.resuelto_at := now();
  end if;
  return new;
end;
$$;

create trigger pagos_resolver_devuelto_sin_contar
  before insert or update on public.pagos
  for each row execute function public.resolver_devuelto_sin_contar();

-- 3 ── Completar un tipo: aviso si con el anticipo ya no queda saldo ────────
create or replace function public.completar_tipo(p_lead uuid, p_tipo public.tipo_orden, p_pago_id bigint) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_saldo bigint;
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
  if p_tipo = 'anticipo' and exists (select 1 from public.leads where id = p_lead and valor_final_medido is not null) then
    v_saldo := public.monto_esperado(p_lead, 'saldo');
    if v_saldo is not null and v_saldo <= 0 then
      insert into public.actividades (lead_id, autor_id, tipo, detalle)
      values (p_lead, null, 'pago', 'Con el anticipo pagado no queda saldo por cobrar (el valor medido ya está cubierto). Revisar y devolver la diferencia si corresponde.');
    end if;
  end if;
end;
$$;

-- 2 ── Valor medido ajustable también con el saldo pagado ───────────────────
create or replace function public.poner_valor_final(p_lead uuid, p_valor bigint, p_medido boolean, p_autor uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_lead     public.leads;
  v_anticipo bigint;
  v_falta    bigint;
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
    if v_lead.pago_estado not in ('anticipo', 'saldo') then return jsonb_build_object('ok', false, 'motivo', 'estado'); end if;
    v_falta := p_valor - public.pagado_neto(p_lead, 'diseno') - public.pagado_neto(p_lead, 'anticipo') - public.pagado_neto(p_lead, 'saldo');
    -- Antes del saldo debe quedar algo por cobrar; con el saldo pagado basta con no quedar por debajo de lo pagado.
    if (v_lead.pago_estado = 'anticipo' and v_falta <= 0) or (v_lead.pago_estado = 'saldo' and v_falta < 0) then
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

revoke execute on function
  public.resolver_devuelto_sin_contar(),
  public.completar_tipo(uuid, public.tipo_orden, bigint),
  public.poner_valor_final(uuid, bigint, boolean, uuid)
from public, anon, authenticated;
grant execute on function public.poner_valor_final(uuid, bigint, boolean, uuid) to service_role;
