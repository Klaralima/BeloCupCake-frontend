import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Administration } from "./Administration";
import { apiRequest } from "@/lib/api";
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ token: "teste", usuario: { id: 1, perfil: "ADMINISTRADOR" } }),
}));
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  apiRequest: vi.fn(),
  API_BASE_URL: "https://example.test",
}));
vi.mock("./Commerce", () => ({
  Pedidos: () => null,
  Campo: ({ nome, titulo }: { nome: string; titulo: string }) => (
    <label>
      {titulo}
      <input name={nome} />
    </label>
  ),
}));
const request = vi.mocked(apiRequest);
const centro = {
  id: 1,
  nome: "Centro",
  cidade: "João Pessoa",
  uf: "PB",
  taxa_entrega: "5.00",
  prazo_minutos: 40,
};
function montar() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <Administration />
    </QueryClientProvider>,
  );
  fireEvent.click(screen.getByText("Regiões e bairros"));
}
function regioes() {
  return [{ id: 1, nome: "Região central", taxa: "5.00", prazo_minutos: 40, ativo: true }];
}
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it("consulta todas as páginas e pesquisa bairro sem diferenciar acentos", async () => {
  request.mockImplementation(async (path, opts) => {
    if (path === "/admin/regioes") return regioes();
    if (path === "/bairros")
      return opts?.query?.["deslocamento"] === 0
        ? Array.from({ length: 200 }, (_, i) => ({ ...centro, id: i + 1, nome: `Bairro ${i + 1}` }))
        : [{ ...centro, id: 201, nome: "Água Fria" }];
    return [];
  });
  montar();
  await screen.findByText("201 de 201 bairros disponíveis");
  expect(request).toHaveBeenCalledWith("/bairros", { query: { limite: 200, deslocamento: 200 } });
  fireEvent.change(screen.getByLabelText("Buscar bairro, cidade ou UF"), {
    target: { value: "agua fria" },
  });
  expect(
    within(screen.getByRole("list", { name: "Bairros cadastrados" })).getAllByRole("listitem"),
  ).toHaveLength(1);
  expect(screen.getByText("Água Fria")).toBeVisible();
  fireEvent.change(screen.getByLabelText("Buscar bairro, cidade ou UF"), {
    target: { value: "inexistente" },
  });
  expect(screen.getByText("Nenhum bairro corresponde à busca.")).toBeVisible();
});
it("atualiza a lista após cadastrar bairro e mantém o contrato existente", async () => {
  let criado = false;
  request.mockImplementation(async (path, opts) => {
    if (path === "/admin/regioes") return regioes();
    if (path === "/admin/bairros" && opts?.method === "POST") {
      criado = true;
      return centro;
    }
    if (path === "/bairros") return criado ? [centro] : [];
    return [];
  });
  montar();
  await screen.findByText("Nenhum bairro disponível cadastrado.");
  fireEvent.change(screen.getByLabelText("Região"), { target: { value: "1" } });
  fireEvent.change(screen.getByLabelText("Nome do bairro"), { target: { value: "Centro" } });
  fireEvent.change(screen.getByLabelText("Cidade"), { target: { value: "João Pessoa" } });
  fireEvent.change(screen.getByLabelText("UF (ex. PB)"), { target: { value: "pb" } });
  fireEvent.submit(screen.getByText("Cadastrar bairro").closest("form")!);
  expect(await screen.findByText("Centro")).toBeVisible();
  expect(request).toHaveBeenCalledWith("/admin/bairros", {
    method: "POST",
    token: "teste",
    body: { nome: "Centro", cidade: "João Pessoa", uf: "PB", regiao_entrega_id: 1 },
  });
});
it("mostra erro de consulta com tentativa de recuperação", async () => {
  let falha = true;
  request.mockImplementation(async (path) => {
    if (path === "/admin/regioes") return regioes();
    if (path === "/bairros") {
      if (falha) throw new Error("Falha ao consultar bairros");
      return [centro];
    }
    return [];
  });
  montar();
  await screen.findByText("Falha ao consultar bairros");
  expect(screen.queryByText("Nenhum bairro disponível cadastrado.")).toBeNull();
  falha = false;
  fireEvent.click(screen.getByText("Tentar novamente"));
  await waitFor(() => expect(screen.getByText("Centro")).toBeVisible());
});
