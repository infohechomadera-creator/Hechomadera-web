import type { Metadata } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { PromoBanner } from "@/components/layout/PromoBanner";
import { CookieConsent } from "@/components/layout/CookieConsent";
import { JsonLdOrganization } from "@/components/seo/JsonLdOrganization";

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
    default: "Hechomadera — Carpintería digital a medida en Colombia",
    template: "%s | Hechomadera",
  },
  description:
    "Diseñamos y construimos tu espacio a medida con proceso 100% digital, precios transparentes y experiencia que vale la pena. 30 años de oficio, 10 ciudades en Colombia.",
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
        alt: "Hechomadera — Carpintería digital a medida en Colombia",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hechomadera — Carpintería digital a medida en Colombia",
    description:
      "Diseñamos y construimos tu espacio a medida. Proceso digital, precios transparentes, 30 años de oficio. Colombia.",
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
        <CookieConsent />
      </body>
    </html>
  );
}
