import type { Metadata } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { PromoBanner } from "@/components/layout/PromoBanner";
import { CookieConsent } from "@/components/layout/CookieConsent";
import { WhatsAppFloat } from "@/components/layout/WhatsAppFloat";
import { JsonLdOrganization } from "@/components/seo/JsonLdOrganization";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { PageTracker } from "@/components/analytics/PageTracker";
import { Analytics } from "@vercel/analytics/react";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const display = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Hechomadera — Cocinas Integrales, Closets y Carpintería a Medida en Colombia",
    template: "%s | Hechomadera",
  },
  description:
    "Cocinas integrales, closets, muebles de madera y carpintería arquitectónica a medida. Ebanistería con 30 años de oficio, diseño digital y fabricación en Bogotá, Medellín, Cali, Barranquilla y más ciudades de Colombia.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  openGraph: {
    locale: "es_CO",
    siteName: "Hechomadera",
    type: "website",
    /**
     * og:image — reemplazar /og-image.jpg en /public cuando tengas la foto.
     * Tamaño recomendado: 1200 × 630 px. Mostrar un espacio terminado, luz
     * natural, sin texto encima. Esta imagen aparece al compartir en
     * WhatsApp, Instagram y LinkedIn.
     */
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Hechomadera — Carpintería y Muebles a Medida en Colombia",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hechomadera — Cocinas Integrales, Closets y Carpintería a Medida en Colombia",
    description:
      "Cocinas integrales, closets modernos, muebles de madera y ebanistería a medida. Carpinteros en Bogotá, Medellín, Cali y más. 30 años de oficio.",
    images: ["/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.variable} ${display.variable} min-h-screen font-sans antialiased`}>
        <JsonLdOrganization />
        <PromoBanner />
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
        <WhatsAppFloat />
        <CookieConsent />
        <GoogleAnalytics />
        <PageTracker />
        <Analytics />
      </body>
    </html>
  );
}
