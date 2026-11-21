/** tokenDeOrden: "Intentar de nuevo" en /pago/resultado vuelve al enlace de pago del lead dueño de la orden. */
import { describe, expect, it, vi } from "vitest";

const TOKEN = "a".repeat(64);
const filas: Record<string, Record<string, Record<string, unknown>>> = {
  ordenes: {
    ord_mf1abc_0123456789abcdef: { lead_id: "lead-1" },
    ord_mf1abc_fedcba9876543210: { lead_id: null }, // orden de la tienda
  },
  leads: { "lead-1": { pago_token: TOKEN } },
};

vi.mock("@/lib/supabase/servidor", () => ({
  clienteSistema: () => ({
    from: (tabla: string) => {
      let id = "";
      const q = {
        select: () => q,
        eq: (_c: string, v: string) => ((id = v), q),
        maybeSingle: async () => ({ data: filas[tabla]?.[id] ?? null, error: null }),
      };
      return q;
    },
  }),
}));

import { tokenDeOrden } from "@/lib/pagos/lead";

describe("tokenDeOrden", () => {
  it("orden de un lead → su enlace de pago", async () => {
    expect(await tokenDeOrden("ord_mf1abc_0123456789abcdef")).toBe(TOKEN);
  });
  it("orden de la tienda, inexistente o con formato raro → null", async () => {
    expect(await tokenDeOrden("ord_mf1abc_fedcba9876543210")).toBeNull();
    expect(await tokenDeOrden("ord_mf1abc_1111111111111111")).toBeNull();
    expect(await tokenDeOrden("lead-1")).toBeNull();
    expect(await tokenDeOrden(undefined)).toBeNull();
  });
});
