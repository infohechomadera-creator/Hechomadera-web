# Recibir en Gmail y enviar con Resend

## Regla de Resend

- **`CONTACT_TO_EMAIL`** (destino del aviso): **sí puede ser** `infohechomadera@gmail.com`.
- **`RESEND_FROM`** (remitente del correo): **no puede ser** `@gmail.com`. Debe ser un correo del **dominio verificado** en Resend, por ejemplo **`info@hechomadera.com`** (sin `noreply` si no quieres).

Así el cliente ve “De: Hechomadera &lt;info@hechomadera.com&gt;” y tú **recibes** la copia en Gmail si pones `CONTACT_TO_EMAIL=infohechomadera@gmail.com`.

## Variables en Vercel

| Variable | Ejemplo |
|----------|---------|
| `CONTACT_TO_EMAIL` | `infohechomadera@gmail.com` |
| `RESEND_FROM` | `Hechomadera <info@hechomadera.com>` |
| `RESEND_API_KEY` | (tu key) |

Tras cambiar variables: **Redeploy**.

## Responder al visitante

En el envío ya va **`reply_to`** = email que escribió en el formulario. Al dar **Responder** en Gmail, contestas al cliente.
