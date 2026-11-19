"use client";

import { Analytics } from "@vercel/analytics/react";

/** Vercel Analytics sin el código secreto de los enlaces de pago (W5). */
export function AnaliticaVercel() {
  return (
    <Analytics
      beforeSend={(evento) => ({ ...evento, url: evento.url.replace(/\/pago\/lead\/[0-9a-f]{64}/, "/pago/lead/enlace") })}
    />
  );
}
