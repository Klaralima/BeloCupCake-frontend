import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./auth";
import { api, setUnauthorizedHandler, type Usuario } from "./api";
vi.mock("./api", () => ({
  api: { login: vi.fn(), sessao: vi.fn(), logout: vi.fn() },
  isApiConfigured: () => true,
  setUnauthorizedHandler: vi.fn(),
}));
const conta = {
  id: 1,
  nome: "Teste",
  email: "teste@example.com",
  telefone: "",
  perfil: "CLIENTE",
  ativo: true,
} as Usuario;
const connected = { session_id: "sessao-1", usuario: conta };
beforeEach(() => {
  vi.mocked(api.sessao).mockResolvedValue({ session_id: null, usuario: null });
  vi.mocked(api.logout).mockResolvedValue({ ok: true });
  Object.defineProperty(navigator, "locks", {
    configurable: true,
    value: { request: async (_: string, fn: () => Promise<unknown>) => fn() },
  });
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  localStorage.clear();
});
async function montar() {
  const client = new QueryClient();
  const hook = renderHook(() => useAuth(), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    ),
  });
  await waitFor(() => expect(hook.result.current).toBeTruthy());
  return { client, ...hook };
}
it("restaura sessão do servidor ao montar novamente após reload", async () => {
  vi.mocked(api.sessao).mockResolvedValue(connected);
  const first = await montar();
  expect(first.result.current.usuario?.id).toBe(1);
  first.unmount();
  const second = await montar();
  expect(second.result.current.usuario?.id).toBe(1);
  expect(localStorage.length).toBe(0);
});
it("sincroniza conta alterada por outra aba e limpa consultas privadas", async () => {
  vi.mocked(api.sessao).mockResolvedValue(connected);
  const { result, client } = await montar();
  client.setQueryData(["protegido", 1], { privado: true });
  vi.mocked(api.sessao).mockResolvedValue({ session_id: "sessao-2", usuario: { ...conta, id: 2 } });
  await act(async () => {
    window.dispatchEvent(new StorageEvent("storage", { key: "belocupcake:session-change" }));
  });
  await waitFor(() => expect(result.current.usuario?.id).toBe(2));
  expect(client.getQueryData(["protegido", 1])).toBeUndefined();
});
it("logout aguarda remoção do cookie e avisa outras abas sem gravar token", async () => {
  vi.mocked(api.sessao).mockResolvedValue(connected);
  const { result, client } = await montar();
  client.setQueryData(["protegido", 1], { privado: true });
  await act(async () => {
    await result.current.logout();
  });
  expect(result.current.usuario).toBeNull();
  expect(api.logout).toHaveBeenCalled();
  expect(client.getQueryData(["protegido", 1])).toBeUndefined();
  expect(localStorage.getItem("belocupcake:session-change")).not.toContain("sessao-1");
});
it("erro 401 antigo não encerra sessão nova", async () => {
  vi.mocked(api.sessao).mockResolvedValue(connected);
  const { result } = await montar();
  const handler = vi.mocked(setUnauthorizedHandler).mock.calls.find(([fn]) => fn)?.[0];
  act(() => handler?.("anterior"));
  expect(result.current.token).toBe("sessao-1");
});
it("falha no logout não informa falsamente que sessão foi encerrada", async () => {
  vi.mocked(api.sessao).mockResolvedValue(connected);
  vi.mocked(api.logout).mockRejectedValue(new Error("offline"));
  const { result } = await montar();
  await act(async () => {
    await expect(result.current.logout()).rejects.toThrow("offline");
  });
  expect(result.current.token).toBe("sessao-1");
});
it("resposta de login atrasada não restaura conta depois de Sair", async () => {
  let resolveLogin!: (value: typeof connected) => void;
  let queue = Promise.resolve<unknown>(null);
  Object.defineProperty(navigator, "locks", {
    configurable: true,
    value: {
      request: (_: string, fn: () => Promise<unknown>) => {
        const next = queue.then(fn);
        queue = next.catch(() => null);
        return next;
      },
    },
  });
  vi.mocked(api.login).mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveLogin = resolve;
      }),
  );
  const { result } = await montar();
  let login!: Promise<unknown>;
  let logout!: Promise<unknown>;
  await act(async () => {
    login = result.current.login("teste@example.com", "senha").catch(() => null);
  });
  act(() => {
    logout = result.current.logout();
  });
  await act(async () => {
    resolveLogin(connected);
    await login;
    await logout;
  });
  expect(result.current.usuario).toBeNull();
  expect(api.logout).toHaveBeenCalled();
});
it("atualização por foco não elimina carrinho ou conteúdo se sessão é a mesma", async () => {
  vi.mocked(api.sessao).mockResolvedValue(connected);
  const { result, client } = await montar();
  client.setQueryData(["protegido", 1], { pedido: 5 });
  await act(async () => {
    window.dispatchEvent(new Event("focus"));
  });
  expect(result.current.token).toBe(connected.session_id);
  expect(client.getQueryData(["protegido", 1])).toEqual({ pedido: 5 });
});
