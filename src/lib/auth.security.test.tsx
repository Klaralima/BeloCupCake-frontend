import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./auth";
import { api, setUnauthorizedHandler, type Usuario } from "./api";
vi.mock("./api", () => ({
  api: { login: vi.fn(), meusDados: vi.fn() },
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
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
function montar() {
  const client = new QueryClient();
  const hook = renderHook(() => useAuth(), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    ),
  });
  return { client, ...hook };
}
describe("Isolamento de sessão", () => {
  it("não restaura uma sessão quando a resposta do login chega depois de Sair", async () => {
    let resolver!: (u: Usuario) => void;
    vi.mocked(api.login).mockResolvedValue({ access_token: "token-teste", expires_in: 1800 });
    vi.mocked(api.meusDados).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolver = resolve;
        }),
    );
    const { result } = montar();
    let login!: Promise<unknown>;
    await act(async () => {
      login = result.current.login("teste@example.com", "senha-teste").catch(() => null);
    });
    act(() => result.current.logout());
    await act(async () => {
      resolver(conta);
      await login;
    });
    expect(result.current.usuario).toBeNull();
    expect(result.current.token).toBeNull();
  });
  it("ignora erro 401 atrasado de uma sessão anterior", async () => {
    vi.mocked(api.login).mockResolvedValue({ access_token: "sessao-nova", expires_in: 1800 });
    vi.mocked(api.meusDados).mockResolvedValue(conta);
    const { result } = montar();
    await act(async () => {
      await result.current.login("teste@example.com", "senha-teste");
    });
    const handler = vi.mocked(setUnauthorizedHandler).mock.calls.find(([fn]) => fn)?.[0];
    act(() => handler?.("sessao-antiga"));
    expect(result.current.token).toBe("sessao-nova");
    act(() => handler?.("sessao-nova"));
    expect(result.current.token).toBeNull();
  });
  it("remove consultas privadas no logout", () => {
    const { client, result } = montar();
    client.setQueryData(["protegido", 1, "pedidos"], [{ endereco: "Endereço privado" }]);
    act(() => result.current.logout());
    expect(client.getQueryData(["protegido", 1, "pedidos"])).toBeUndefined();
  });
});
