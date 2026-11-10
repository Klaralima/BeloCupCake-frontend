import { useRef, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, type Produto } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatPreco } from "@/lib/format";
import { Campo, Pedidos } from "./Commerce";
import { safeImageUrl } from "./ProductImage";
import { Button } from "./ui/button";
import { ErrorState, Loading } from "./StatusViews";

interface Regiao {
  id: number;
  nome: string;
  taxa: string;
  prazo_minutos: number;
  ativo: boolean;
}
interface BairroDisponivel {
  id: number;
  nome: string;
  cidade: string;
  uf: string;
  taxa_entrega: string;
  prazo_minutos: number;
}
const normalizarBusca = (valor: string) =>
  valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();

function BairrosCadastrados() {
  const [busca, setBusca] = useState("");
  const bairros = useQuery({
    queryKey: ["bairros-checkout"],
    queryFn: async () => {
      const todos: BairroDisponivel[] = [];
      let pagina: BairroDisponivel[];
      do {
        pagina = await apiRequest<BairroDisponivel[]>("/bairros", {
          query: { limite: 200, deslocamento: todos.length },
        });
        todos.push(...pagina);
      } while (pagina.length === 200);
      return todos;
    },
    retry: false,
  });
  const termo = normalizarBusca(busca);
  const filtrados =
    bairros.data?.filter((b) => normalizarBusca(`${b.nome} ${b.cidade} ${b.uf}`).includes(termo)) ??
    [];
  return (
    <section aria-labelledby="bairros-cadastrados" className="space-y-3 border-t pt-4">
      <h3 id="bairros-cadastrados" className="text-xl font-bold">
        Bairros já cadastrados e disponíveis
      </h3>
      <p className="text-sm text-muted-foreground">
        Confira a lista antes de cadastrar. São exibidos bairros ativos vinculados a regiões ativas.
        O sistema também impede duplicidade de nome, cidade e UF no cadastro.
      </p>
      <label className="block">
        Buscar bairro, cidade ou UF
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full rounded-lg border bg-background p-3"
          placeholder="Ex.: Centro ou João Pessoa"
        />
      </label>
      <Button
        type="button"
        variant="outline"
        disabled={bairros.isFetching}
        onClick={() => bairros.refetch()}
      >
        Atualizar bairros
      </Button>
      {bairros.isPending ? (
        <Loading label="Carregando bairros cadastrados..." />
      ) : bairros.isError ? (
        <ErrorState error={bairros.error} onRetry={() => bairros.refetch()} />
      ) : (
        <>
          <p role="status">
            {filtrados.length} de {bairros.data.length} bairros disponíveis
          </p>
          {bairros.data.length === 0 ? (
            <p>Nenhum bairro disponível cadastrado.</p>
          ) : filtrados.length === 0 ? (
            <p>Nenhum bairro corresponde à busca.</p>
          ) : (
            <ul className="max-h-96 space-y-3 overflow-y-auto" aria-label="Bairros cadastrados">
              {filtrados.map((b) => (
                <li key={b.id} className="rounded-lg border p-3">
                  <strong>{b.nome}</strong>
                  <p>
                    {b.cidade}/{b.uf}
                  </p>
                  <p className="text-sm">
                    Entrega {formatPreco(b.taxa_entrega)} · {b.prazo_minutos} minutos
                  </p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

const panel = "my-5 space-y-4 rounded-2xl border bg-card p-5 shadow-card";

export function Administration() {
  const [aba, setAba] = useState("pedidos");
  return (
    <>
      <nav className="my-4 flex flex-wrap gap-2">
        {["pedidos", "produtos", "entrega"].map((a) => (
          <Button key={a} variant={aba === a ? "default" : "outline"} onClick={() => setAba(a)}>
            {a === "entrega" ? "Regiões e bairros" : a === "produtos" ? "Produtos" : "Pedidos"}
          </Button>
        ))}
      </nav>
      {aba === "pedidos" ? (
        <Pedidos perfil="ADMINISTRADOR" />
      ) : aba === "produtos" ? (
        <Produtos />
      ) : (
        <Regioes />
      )}
    </>
  );
}

function Produtos() {
  const { token, usuario } = useAuth();
  const client = useQueryClient();
  const [pagina, setPagina] = useState(0);
  const [edicao, setEdicao] = useState<Produto | null>(null);
  const [formulario, setFormulario] = useState(false);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const trava = useRef(false);
  const q = useQuery({
    queryKey: ["protegido", usuario?.id, "produtos-admin", pagina],
    queryFn: () =>
      apiRequest<Produto[]>("/admin/produtos", {
        token,
        query: { limite: 20, deslocamento: pagina * 20 },
      }),
    retry: false,
  });
  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (trava.current) return;
    trava.current = true;
    setOcupado(true);
    setErro("");
    const f = new FormData(event.currentTarget);
    const imagem = String(f.get("imagem_url") ?? "").trim();
    const body = {
      nome: f.get("nome"),
      descricao: f.get("descricao"),
      sabor: f.get("sabor"),
      tamanho: f.get("tamanho"),
      preco: String(f.get("preco")).replace(",", "."),
      estoque: Number(f.get("estoque")),
      imagem_url: imagem || null,
      ...(edicao ? { ativo: f.get("ativo") === "on" } : {}),
    };
    try {
      if (imagem && !safeImageUrl(imagem)) {
        throw new Error("Informe uma URL HTTPS de imagem, sem usuário ou senha no endereço.");
      }
      await apiRequest(edicao ? `/produtos/${edicao.id}` : "/produtos", {
        token,
        method: edicao ? "PATCH" : "POST",
        body,
      });
      setFormulario(false);
      setEdicao(null);
      await client.invalidateQueries({ queryKey: ["protegido"] });
      await client.invalidateQueries({ queryKey: ["produtos"] });
      await client.invalidateQueries({ queryKey: ["produto"] });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao salvar.");
    } finally {
      trava.current = false;
      setOcupado(false);
    }
  }
  return (
    <section className={panel}>
      <h2 className="text-2xl font-bold">Produtos</h2>
      <Button
        onClick={() => {
          setEdicao(null);
          setFormulario(true);
          setErro("");
        }}
      >
        Novo produto
      </Button>
      {formulario && (
        <form key={edicao?.id ?? "novo"} onSubmit={salvar}>
          <fieldset disabled={ocupado} className="grid gap-4 sm:grid-cols-2">
            <Campo nome="nome" titulo="Nome" valor={edicao?.nome ?? ""} max={150} />
            <Campo nome="descricao" titulo="Descrição" valor={edicao?.descricao ?? ""} max={5000} />
            <Campo nome="sabor" titulo="Sabor" valor={edicao?.sabor ?? ""} max={100} />
            <Campo nome="tamanho" titulo="Tamanho" valor={edicao?.tamanho ?? ""} max={30} />
            <Campo nome="preco" titulo="Preço (ex. 8,50)" valor={edicao?.preco ?? ""} />
            <Campo nome="estoque" titulo="Estoque" tipo="number" valor={edicao?.estoque ?? 0} />
            <Campo
              nome="imagem_url"
              titulo="Endereço HTTPS da imagem"
              tipo="url"
              valor={edicao?.imagem_url ?? ""}
              max={2048}
              obrigatorio={false}
            />
            {edicao && (
              <label>
                <input type="checkbox" name="ativo" defaultChecked={edicao.ativo} /> Produto ativo
              </label>
            )}
            <div className="flex gap-2">
              <Button type="submit">{ocupado ? "Salvando..." : "Salvar"}</Button>
              <Button type="button" variant="outline" onClick={() => setFormulario(false)}>
                Fechar
              </Button>
            </div>
            {erro && (
              <p role="alert" className="text-destructive">
                {erro}
              </p>
            )}
          </fieldset>
        </form>
      )}
      {q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <>
          {q.data.length === 0 && <p>Nenhum produto nesta página.</p>}
          {q.data.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 border-b pb-3"
            >
              <div>
                <strong>{p.nome}</strong>
                <p>
                  {formatPreco(p.preco)} · Estoque {p.estoque} · {p.ativo ? "Ativo" : "Inativo"}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setEdicao(p);
                  setFormulario(true);
                  setErro("");
                }}
              >
                Editar
              </Button>
            </div>
          ))}
          <div className="flex gap-3">
            <Button variant="outline" disabled={pagina === 0} onClick={() => setPagina(pagina - 1)}>
              Anterior
            </Button>
            <Button
              variant="outline"
              disabled={q.data.length < 20}
              onClick={() => setPagina(pagina + 1)}
            >
              Próxima
            </Button>
          </div>
        </>
      )}
    </section>
  );
}

function Regioes() {
  const { token, usuario } = useAuth();
  const client = useQueryClient();
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const trava = useRef(false);
  const q = useQuery({
    queryKey: ["protegido", usuario?.id, "regioes"],
    queryFn: async () => {
      const todas: Regiao[] = [];
      let pagina: Regiao[];
      do {
        pagina = await apiRequest<Regiao[]>("/admin/regioes", {
          token,
          query: { limite: 100, deslocamento: todas.length },
        });
        todas.push(...pagina);
      } while (pagina.length === 100);
      return todas;
    },
    retry: false,
  });
  async function salvar(event: FormEvent<HTMLFormElement>, bairro: boolean) {
    event.preventDefault();
    if (trava.current) return;
    const form = event.currentTarget;
    const f = new FormData(form);
    trava.current = true;
    setOcupado(true);
    setErro("");
    setMensagem("");
    const body = bairro
      ? {
          nome: f.get("nome"),
          regiao_entrega_id: Number(f.get("regiao")),
          cidade: f.get("cidade"),
          uf: String(f.get("uf")).toUpperCase(),
        }
      : {
          nome: f.get("nome"),
          taxa: String(f.get("taxa")).replace(",", "."),
          prazo_minutos: Number(f.get("prazo")),
        };
    try {
      await apiRequest(bairro ? "/admin/bairros" : "/admin/regioes", {
        token,
        method: "POST",
        body,
      });
      form.reset();
      setMensagem(bairro ? "Bairro cadastrado." : "Região cadastrada.");
      await client.invalidateQueries({ queryKey: ["protegido"] });
      await client.invalidateQueries({ queryKey: ["bairros-checkout"] });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao cadastrar.");
    } finally {
      trava.current = false;
      setOcupado(false);
    }
  }
  return (
    <section className={panel}>
      <h2 className="text-2xl font-bold">Regiões e bairros atendidos</h2>
      <form onSubmit={(e) => salvar(e, false)}>
        <fieldset disabled={ocupado} className="space-y-3">
          <h3 className="text-xl font-bold">Nova região</h3>
          <Campo nome="nome" titulo="Nome da região" max={100} />
          <Campo nome="taxa" titulo="Taxa (ex. 5,00)" />
          <Campo nome="prazo" titulo="Prazo em minutos" tipo="number" />
          <Button type="submit">Cadastrar região</Button>
        </fieldset>
      </form>
      {q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <>
          <ul>
            {q.data.map((r) => (
              <li key={r.id}>
                {r.nome} · {formatPreco(r.taxa)} · {r.prazo_minutos} minutos
              </li>
            ))}
          </ul>
          <BairrosCadastrados />
          <form onSubmit={(e) => salvar(e, true)}>
            <fieldset disabled={ocupado || !q.data.some((r) => r.ativo)} className="space-y-3">
              <h3 className="text-xl font-bold">Novo bairro</h3>
              <label className="block">
                Região
                <select
                  name="regiao"
                  required
                  defaultValue=""
                  className="w-full rounded-lg border bg-background p-3"
                >
                  <option value="">Selecione</option>
                  {q.data
                    .filter((r) => r.ativo)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nome}
                      </option>
                    ))}
                </select>
              </label>
              <Campo nome="nome" titulo="Nome do bairro" max={100} />
              <Campo nome="cidade" titulo="Cidade" max={100} />
              <Campo nome="uf" titulo="UF (ex. PB)" max={2} />
              <Button type="submit">Cadastrar bairro</Button>
            </fieldset>
          </form>
        </>
      )}
      {mensagem && <p role="status">{mensagem}</p>}
      {erro && (
        <p role="alert" className="text-destructive">
          {erro}
        </p>
      )}
    </section>
  );
}
