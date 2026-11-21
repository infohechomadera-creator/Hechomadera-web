"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { hasAnalyticsConsent, CONSENT_EVENT } from "@/lib/analytics";

/**
 * Carga el script de GA4 solo después de que el usuario acepta cookies.
 * Requiere NEXT_PUBLIC_GA_MEASUREMENT_ID = G-XXXXXXXXXX en Vercel env vars.
 */
export function GoogleAnalytics() {
  const [consented, setConsented] = useState(false);
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  // El enlace de pago lleva un código secreto en la dirección: ahí no se carga GA (W5).
  const enPagoLead = usePathname()?.startsWith("/pago/lead") ?? false;

  useEffect(() => {
    setConsented(hasAnalyticsConsent());

    const handler = () => setConsented(hasAnalyticsConsent());
    window.addEventListener(CONSENT_EVENT, handler);
    return () => window.removeEventListener(CONSENT_EVENT, handler);
  }, []);

  if (!consented || !id || enPagoLead) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${id}', {
            anonymize_ip: true,
            send_page_view: true,
            page_location: location.href.replace(/\\/pago\\/lead\\/[0-9a-f]{64}/, '/pago/lead/enlace')
          });
        `}
      </Script>
    </>
  );
}
