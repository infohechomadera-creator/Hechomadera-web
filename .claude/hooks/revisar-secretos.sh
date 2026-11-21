#!/usr/bin/env bash
# Bloquea commits o pushes que parezcan incluir secretos (hito 0).
# Revisa solo líneas agregadas y excluye este mismo archivo (contiene los patrones).
input=$(cat)
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

# Patrones del estándar + los de esta web (Mercado Pago, Resend, Upstash, admin).
patron='(PRIVATE KEY|service_role|sk_live_|sk-[A-Za-z0-9]{20,}|eyJhbGciOi[A-Za-z0-9_-]{20,}|APP_USR-[0-9]{6,}|TEST-[0-9]{6,}-|re_[A-Za-z0-9]{20,}|sb_secret_[A-Za-z0-9_-]{10,}|(MERCADOPAGO_ACCESS_TOKEN|MERCADOPAGO_WEBHOOK_SECRET|RESEND_API_KEY|UPSTASH_REDIS_REST_TOKEN|ADMIN_API_TOKEN|DEBUG_WEBHOOK_TOKEN|OPERFLOW_API_KEY|OPERFLOW_WEBHOOK_SECRET|SUPABASE_[A-Z_]*KEY)=[^[:space:]"]{8,})'
excluir=':(exclude).claude/hooks/revisar-secretos.sh'

case "$input" in
  *"git commit"*)
    if git diff --cached -- . "$excluir" | grep -E '^\+' | grep -Eq "$patron"; then
      echo "Bloqueado: los cambios parecen incluir un secreto. Revisa antes de guardar." >&2; exit 2
    fi ;;
  *"git push"*)
    if git log -p @{u}..HEAD -- . "$excluir" 2>/dev/null | grep -E '^\+' | grep -Eq "$patron"; then
      echo "Bloqueado: los commits a subir parecen incluir un secreto." >&2; exit 2
    fi ;;
esac
exit 0
