import { afterEach, expect, it, vi } from "vitest";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});
it("não guarda respostas privadas no cache nem segue redirecionamentos", async () => {
  vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
  const fetcher = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetcher);
  const { apiRequest } = await import("./api");
  await apiRequest("/usuarios/me", { token: "token-teste" });
  expect(fetcher).toHaveBeenCalledWith(
    window.location.origin + "/bff/usuarios/me",
    expect.objectContaining({ cache: "no-store", credentials: "same-origin", redirect: "error" }),
  );
});
it("informa qual sessão recebeu 401 para não encerrar uma conta mais recente", async () => {
  vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 401 })));
  const { apiRequest, setUnauthorizedHandler } = await import("./api");
  const expired = vi.fn();
  setUnauthorizedHandler(expired);
  await expect(apiRequest("/pedidos", { token: "sessao-antiga" })).rejects.toMatchObject({
    status: 401,
  });
  expect(expired).toHaveBeenCalledWith("sessao-antiga");
});
