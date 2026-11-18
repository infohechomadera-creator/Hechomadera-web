import { afterEach, describe, expect, it, vi } from "vitest";
import { ipDe } from "@/lib/limite";

const pedir = (ip: string) => new Request("http://local", { headers: { "x-forwarded-for": ip } });

describe("ipDe", () => {
  it("IPv4 tal cual; IPv6 agrupada por su prefijo /64", () => {
    expect(ipDe(pedir("203.0.113.7, 10.0.0.1"))).toBe("203.0.113.7");
    expect(ipDe(pedir("2001:db8:aa:1:1111:2222:3333:4444"))).toBe("2001:db8:aa:1::/64");
    expect(ipDe(pedir("2001:db8:aa:1::9"))).toBe("2001:db8:aa:1::/64");
    expect(ipDe(pedir("2001:0db8:00aa:0001:ffff::1"))).toBe("2001:db8:aa:1::/64");
    expect(ipDe(pedir("::ffff:198.51.100.4"))).toBe("198.51.100.4");
    expect(ipDe(new Request("http://local"))).toBe("desconocida");
  });
});

describe("aviso por correo de lead nuevo", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("escapa el nombre del cliente (sin HTML inyectado)", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_prueba");
    const envios: { html: string; subject: string }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_u: string, init: { body: string }) => (envios.push(JSON.parse(init.body)), new Response("{}"))),
    );
    const { sendNewLeadAlertToSeller } = await import("@/lib/email-notifications");
    await sendNewLeadAlertToSeller({
      leadId: "abc",
      nombre: '<img src=x onerror="alert(1)">',
      ciudad: "Barranquilla",
      resumen: "Cocina en L",
      rangoMin: 1,
      rangoMax: 2,
    });
    expect(envios[0].html).not.toContain("<img src=x");
    expect(envios[0].html).toContain("&lt;img");
  });
});
