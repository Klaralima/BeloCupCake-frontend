// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { handleSession, sessionId } from "./session";
const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature";
const base = "https://api.example.com";
const req = (path: string, method = "GET", extra: Record<string, string> = {}) =>
  new Request("https://site.example.com/bff" + path, {
    method,
    headers: { "X-Belo-Request": "1", ...extra },
  });
afterEach(() => vi.unstubAllGlobals());
it("guarda JWT apenas em cookie HttpOnly e devolve identificador sem credencial", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ access_token: jwt, expires_in: 1800 }))
    .mockResolvedValueOnce(Response.json({ id: 1 }));
  vi.stubGlobal("fetch", fetcher);
  const r = (await handleSession(req("/auth/login", "POST"), base))!;
  expect(r.status).toBe(200);
  expect(r.headers.get("set-cookie")).toContain("HttpOnly; SameSite=Lax; Max-Age=1800; Secure");
  expect(r.headers.get("set-cookie")).toContain("__Host-belocupcake=");
  expect(await r.text()).not.toContain(jwt);
  expect(fetcher.mock.calls[1]![1].headers.Authorization).toBe(`Bearer ${jwt}`);
});
it("recupera a conta ao receber cookie após reload", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ id: 1 })));
  const r = (await handleSession(
    req("/session", "GET", { cookie: `__Host-belocupcake=${jwt}` }),
    base,
  ))!;
  expect(await r.json()).toEqual({ session_id: await sessionId(jwt), usuario: { id: 1 } });
});
it("bloqueia CSRF e chamadas sem cabeçalho próprio", async () => {
  expect(
    (await handleSession(req("/session", "DELETE", { origin: "https://evil.example" }), base))!
      .status,
  ).toBe(403);
  expect(
    (await handleSession(
      new Request("https://site.example.com/bff/auth/login", { method: "POST" }),
      base,
    ))!.status,
  ).toBe(403);
});
it("impede aba antiga de efetuar pedido na conta recém-selecionada", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  const r = await handleSession(
    req("/pedidos", "POST", {
      cookie: `__Host-belocupcake=${jwt}`,
      "X-Belo-Session": "conta-anterior",
    }),
    base,
  );
  expect(r!.status).toBe(401);
  expect(fetcher).not.toHaveBeenCalled();
});
it("encaminha credencial apenas ao backend fixo e não copia cookie para ele", async () => {
  const fetcher = vi.fn().mockResolvedValue(Response.json([]));
  vi.stubGlobal("fetch", fetcher);
  await handleSession(
    req("/pedidos", "GET", {
      cookie: `__Host-belocupcake=${jwt}; outro=privado`,
      "X-Belo-Session": await sessionId(jwt),
    }),
    base,
  );
  expect(fetcher.mock.calls[0]![0]).toBe(base + "/pedidos");
  expect(fetcher.mock.calls[0]![1].headers).not.toHaveProperty("Cookie");
});
it("logout apaga cookie e resposta 401 atrasada não altera cookies", async () => {
  const r = (await handleSession(req("/session", "DELETE"), base))!;
  expect(r.headers.get("set-cookie")).toContain("Max-Age=0");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({}, { status: 401 })));
  const expired = (await handleSession(
    req("/session", "GET", { cookie: `__Host-belocupcake=${jwt}` }),
    base,
  ))!;
  expect(await expired.json()).toEqual({ session_id: null, usuario: null });
  expect(expired.headers.has("set-cookie")).toBe(false);
});
it("falha de rede preserva cookie para nova tentativa", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  const r = (await handleSession(
    req("/session", "GET", { cookie: `__Host-belocupcake=${jwt}` }),
    base,
  ))!;
  expect(r.status).toBe(502);
  expect(r.headers.has("set-cookie")).toBe(false);
});
it("exige sair antes de substituir uma conta conectada", async () => {
  const fetcher = vi.fn().mockResolvedValue(Response.json({ id: 1 }));
  vi.stubGlobal("fetch", fetcher);
  const r = (await handleSession(
    req("/auth/login", "POST", { cookie: `__Host-belocupcake=${jwt}` }),
    base,
  ))!;
  expect(r.status).toBe(409);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(r.headers.has("set-cookie")).toBe(false);
});
it("conta desativada deixa de ser restaurada sem prender a tela de acesso", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({}, { status: 403 })));
  const r = (await handleSession(
    req("/session", "GET", { cookie: `__Host-belocupcake=${jwt}` }),
    base,
  ))!;
  expect(r.status).toBe(200);
  expect(await r.json()).toEqual({ session_id: null, usuario: null });
});
it("recusa redirecionamento do backend sem seguir destino externo", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      new Response(null, { status: 307, headers: { Location: "https://evil.example" } }),
    );
  vi.stubGlobal("fetch", fetcher);
  const r = (await handleSession(req("/produtos"), base))!;
  expect(r.status).toBe(502);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0]![1].redirect).toBe("manual");
});
