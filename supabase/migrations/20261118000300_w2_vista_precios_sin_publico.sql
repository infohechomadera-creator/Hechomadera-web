-- W2 · La vista de precios vigentes tampoco se expone al público.
-- (Ya era segura por security_invoker, pero Supabase le da permisos por defecto a anon.)
revoke all on public.precios_vigentes from anon;
