"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { hasAnalyticsConsent, CONSENT_EVENT } from "@/lib/analytics";

/**
 * Carga el script de GA4 solo después de que el usuario acepta cookies.
 * Requiere NEXT_PUBLIC_GA_MEASUREMENT_ID = G-XXXXXXXXXX en Vercel env vars.
 */
export function GoogleAnalytics() {
  const [consented, setConsented] = useState(false);
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  useEffect(() => {
    setConsented(hasAnalyticsConsent());

    const handler = () => setConsented(hasAnalyticsConsent());
    window.addEventListener(CONSENT_EVENT, handler);
    return () => window.removeEventListener(CONSENT_EVENT, handler);
  }, []);

  if (!consented || !id) return null;

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
            send_page_view: true
          });
        `}
      </Script>
    </>
  );
}
