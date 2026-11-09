// Executado apenas no servidor do front. Nunca devolve o JWT ao JavaScript.
const PREFIX = "/bff";
const BASE = (import.meta.env["VITE_API_BASE_URL"] ?? "").replace(/\/+$/, "");
const COOKIE = "__Host-belocupcake";
const DEV_COOKIE = "belocupcake-local";
const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
  });
export async function sessionId(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
export async function handleSession(request: Request, base = BASE): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith(PREFIX + "/")) return null;
  const path = url.pathname.slice(PREFIX.length);
  const local =
    url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  const cookieName = local ? DEV_COOKIE : COOKIE;
  const cookie = (value: string, age: number) =>
    `${cookieName}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${local ? "" : "; Secure"}`;
  const token =
    (request.headers.get("cookie") ?? "")
      .split(";")
      .map((v) => v.trim())
      .find((v) => v.startsWith(cookieName + "="))
      ?.slice(cookieName.length + 1) ?? "";
  // Cabeçalho não simples + verificação de origem: impede CSRF inclusive no login.
  if (
    request.headers.get("X-Belo-Request") !== "1" ||
    (request.headers.get("origin") && request.headers.get("origin") !== url.origin) ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    return json({ detail: "Origem não permitida." }, 403);
  if (!base) return json({ detail: "API não configurada." }, 503);
  const method = request.method;
  if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(method)) return json({}, 405);
  const fingerprint = token ? await sessionId(token) : null;
  const expected = request.headers.get("X-Belo-Session");
  if (expected && expected !== fingerprint)
    return json({ detail: "A conta mudou em outra aba. Atualize a sessão." }, 401);
  const upstream = async (target: string, verb = "GET", body?: string, bearer = token) => {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (bearer) headers["Authorization"] = `Bearer ${bearer}`;
    const response = await fetch(base + target, {
      method: verb,
      headers,
      body: body ?? null,
      redirect: "manual",
      credentials: "omit",
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    // Workers não implementa redirect:error; rejeitamos 3xx explicitamente.
    if (response.status >= 300 && response.status < 400)
      throw new Error("Redirecionamento recusado.");
    return response;
  };
  try {
    if (path === "/session" && method === "DELETE")
      return json({ ok: true }, 200, { "Set-Cookie": cookie("", 0) });
    if (path === "/session" && method === "GET") {
      if (!token) return json({ session_id: null, usuario: null });
      const response = await upstream("/usuarios/me");
      if (response.status === 401 || response.status === 403)
        return json({ session_id: null, usuario: null });
      if (!response.ok)
        return json({ detail: "Não foi possível verificar a sessão." }, response.status);
      return json({ session_id: fingerprint, usuario: await response.json() });
    }
    if (path === "/auth/login" && method === "POST") {
      if (token) {
        const existing = await upstream("/usuarios/me");
        if (existing.ok)
          return json(
            { detail: "Você já está conectado. Clique em Sair antes de trocar de conta." },
            409,
          );
        if (existing.status !== 401 && existing.status !== 403)
          return json({ detail: "Não foi possível verificar a sessão atual." }, 503);
      }
      const body = await request.text();
      if (body.length > 4096) return json({}, 413);
      const response = await upstream("/auth/login", "POST", body, "");
      const data = await response.json();
      if (!response.ok) return json(data, response.status);
      const jwt = data.access_token;
      if (
        typeof jwt !== "string" ||
        !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(jwt) ||
        jwt.length > 3800
      )
        return json({}, 502);
      const me = await upstream("/usuarios/me", "GET", undefined, jwt);
      if (!me.ok) return json({ detail: "Não foi possível validar a conta." }, me.status);
      const age = Math.max(1, Math.min(Number(data.expires_in) || 1800, 86400));
      return json({ session_id: await sessionId(jwt), usuario: await me.json() }, 200, {
        "Set-Cookie": cookie(jwt, age),
      });
    }
    // Lista de recursos fixa; nunca aceita host/URL fornecido pelo navegador.
    if (
      !/^\/(produtos|usuarios|bairros|regioes-entrega|regioes|pedidos|entregas|admin)(\/[A-Za-z0-9_-]+)*$/.test(
        path,
      )
    )
      return json({}, 404);
    const publicRequest =
      (method === "GET" && /^\/(produtos|bairros)(\/\d+)?$/.test(path)) ||
      (path === "/usuarios" && method === "POST");
    if (!publicRequest && (!token || !expected))
      return json({ detail: "Faça login novamente." }, 401);
    const body = method === "GET" ? undefined : await request.text();
    if (body && body.length > 65536) return json({}, 413);
    const response = await upstream(path + url.search, method, body, publicRequest ? "" : token);
    // Não encaminha cookies, CORS, redirecionamentos ou cabeçalhos do upstream.
    return new Response(response.body, {
      status: response.status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch {
    return json({ detail: "Não foi possível conectar à API. Tente novamente." }, 502);
  }
}
