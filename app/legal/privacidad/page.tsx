import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de privacidad",
  robots: { index: false, follow: false },
};

export default function PrivacidadPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <h1 className="font-display text-3xl font-semibold">Política de privacidad</h1>
      <p className="mt-6 text-sm text-ink-muted">Placeholder. Completar con asesoría legal y política de datos (manual).</p>
    </div>
  );
}
