import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { PRECIOS_EJEMPLO } from "@/lib/precios/semilla";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => undefined }) }));
vi.mock("@/app/admin/precios/acciones", () => ({ publicarPrecios: async () => ({ ok: true, vigente_desde: "2026-11-18" }) }));

describe("editor de precios", () => {
  it("se dibuja con los precios vigentes y el ejemplo de rango", async () => {
    const { EditorPrecios } = await import("@/components/admin/EditorPrecios");
    const html = renderToString(<EditorPrecios tablas={PRECIOS_EJEMPLO} hoy="2026-11-18" />);
    expect(html).toContain("Guardar precios de Barranquilla");
    expect(html).toContain("Metro lineal por diseño");
    expect(html).toContain('value="1900000"'); // D1 Barranquilla
    expect(html).toContain("Mueble de baño");
    expect(html).toMatch(/\$\s?[\d.]+ – \$\s?[\d.]+/); // ejemplo de rango calculado
  });
});
