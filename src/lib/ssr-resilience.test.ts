import { QueryClient, queryOptions } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { safeEnsureQueryData, safeEnsureQueryResult } from "./ssr-resilience";

describe("ssr-resilience", () => {
  it("retorna los datos reales y degraded=false cuando la consulta responde a tiempo", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const opts = queryOptions({
      queryKey: ["ok"],
      queryFn: async (): Promise<Record<string, string>> => ({ site_title: "Will Design 3D" }),
    });

    const result = await safeEnsureQueryResult(qc, opts, {}, "site_content", 1000);
    expect(result).toEqual({
      data: { site_title: "Will Design 3D" },
      degraded: false,
    });
  });

  it("retorna fallback seguro y degraded=true cuando Supabase falla (DNS/1016/error)", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const opts = queryOptions({
      queryKey: ["fail"],
      queryFn: async (): Promise<unknown[]> => {
        throw new Error("getaddrinfo ENOTFOUND pizulwniobctfiedefiu.supabase.co");
      },
    });

    const result = await safeEnsureQueryResult(qc, opts, [], "products", 1000);
    expect(result).toEqual({ data: [], degraded: true });
    expect(warnSpy).toHaveBeenCalledOnce();
    warnSpy.mockRestore();
  });

  it("retorna fallback seguro cuando la consulta supera el timeout SSR", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const opts = queryOptions({
      queryKey: ["slow"],
      queryFn: () => new Promise<string[]>((resolve) => setTimeout(() => resolve(["late"]), 500)),
    });

    const data = await safeEnsureQueryData(qc, opts, ["fallback"], "slow_query", 20);
    expect(data).toEqual(["fallback"]);
    expect(warnSpy).toHaveBeenCalledOnce();
    warnSpy.mockRestore();
  });
});
