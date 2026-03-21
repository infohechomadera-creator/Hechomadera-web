import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  robots: { index: false, follow: false },
};

export default function TerminosPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <h1 className="font-display text-3xl font-semibold">Términos y condiciones</h1>
      <p className="mt-6 text-sm text-ink-muted">
        Placeholder legal. Sustituir por texto revisado (manual). Facturación comercial puede ser externa al sitio según su proceso.
      </p>
    </div>
  );
}
