import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
  type FormEvent,
} from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, type Produto } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatPreco } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ErrorState, Loading } from "@/components/StatusViews";

interface ItemCarrinho {
  produto: Produto;
  quantidade: number;
}
interface Bairro {
  id: number;
  nome: string;
  cidade: string;
  uf: string;
  taxa_entrega: string;
  prazo_minutos: number;
}
interface Pedido {
  id: number;
  status: string;
  valor_total: string;
  criado_em: string;
}
interface Detalhe extends Pedido {
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro_nome: string;
  cidade: string;
  uf: string;
  cep: string;
  itens: { id: number; nome_produto: string; quantidade: number; preco_unitario: string }[];
}
interface Entrega {
  pedido_id: number;
  status?: string;
  bairro_nome?: string;
  cidade?: string;
  uf?: string;
}
const panel = "my-5 space-y-4 rounded-2xl border bg-card p-5 shadow-card";
const input = "w-full rounded-lg border bg-background p-3";
const Carrinho = createContext<{
  itens: ItemCarrinho[];
  adicionar: (produto: Produto) => void;
  processando: boolean;
}>({
  itens: [],
  adicionar: () => {},
  processando: false,
});

export function CompraProvider({ children }: { children: ReactNode }) {
  const { usuario } = useAuth();
  const [itens, setItens] = useState<ItemCarrinho[]>([]);
  const [aberto, setAberto] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [historico, setHistorico] = useState(false);
  useEffect(() => {
    setItens([]);
    setAberto(false);
    setHistorico(false);
  }, [usuario?.id]);
  function adicionar(produto: Produto) {
    if (processando) return;
    setItens((atual) => {
      const existente = atual.find((item) => item.produto.id === produto.id);
      if (existente)
        return atual.map((item) =>
          item.produto.id === produto.id
            ? { produto, quantidade: Math.min(item.quantidade + 1, produto.estoque) }
            : item,
        );
      return [...atual, { produto, quantidade: 1 }];
    });
    setAberto(true);
  }
  return (
    <Carrinho.Provider value={{ itens, adicionar, processando }}>
      {usuario?.perfil === "CLIENTE" && (
        <div className="mx-auto max-w-6xl px-4">
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="secondary" disabled={processando} onClick={() => setAberto(!aberto)}>
              Carrinho ({itens.reduce((s, i) => s + i.quantidade, 0)})
            </Button>
            <Button variant="outline" onClick={() => setHistorico(!historico)}>
              Meus pedidos
            </Button>
          </div>
          {itens.length > 0 && (
            <div hidden={!aberto}>
              <Checkout
                continuar={() => setAberto(false)}
                ocupar={setProcessando}
                itens={itens}
                alterar={(id, quantidade) =>
                  setItens((atual) =>
                    atual.flatMap((i) => {
                      if (i.produto.id !== id) return [i];
                      return quantidade <= 0
                        ? []
                        : [{ ...i, quantidade: Math.min(quantidade, i.produto.estoque) }];
                    }),
                  )
                }
                concluir={() => {
                  setItens([]);
                  setAberto(false);
                  setHistorico(true);
                }}
              />
            </div>
          )}
          {aberto && itens.length === 0 && (
            <p className={panel}>Escolha os cupcakes no catálogo para começar.</p>
          )}
          {historico && <Pedidos perfil="CLIENTE" />}
        </div>
      )}
      {children}
    </Carrinho.Provider>
  );
}

export function Comprar({ produto }: { produto: Produto }) {
  const { usuario } = useAuth();
  const { adicionar, processando } = useContext(Carrinho);
  if (!usuario)
    return (
      <Button asChild>
        <Link to="/login">Entre para comprar</Link>
      </Button>
    );
  if (usuario.perfil !== "CLIENTE") return null;
  return (
    <Button
      className="h-auto min-h-10 w-full whitespace-normal"
      disabled={processando || !produto.ativo || produto.estoque < 1}
      onClick={() => adicionar(produto)}
    >
      Adicionar ao carrinho
    </Button>
  );
}

function Checkout({
  itens,
  alterar,
  concluir,
  continuar,
  ocupar,
}: {
  itens: ItemCarrinho[];
  alterar: (id: number, quantidade: number) => void;
  concluir: () => void;
  continuar: () => void;
  ocupar: (valor: boolean) => void;
}) {
  const { token } = useAuth();
  const client = useQueryClient();
  const [bairroId, setBairroId] = useState("");
  const [enderecoAberto, setEnderecoAberto] = useState(false);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const trava = useRef(false);
  const bairros = useQuery({
    queryKey: ["bairros-checkout"],
    queryFn: async () => {
      const todos: Bairro[] = [];
      let pagina: Bairro[];
      do {
        pagina = await apiRequest<Bairro[]>("/bairros", {
          query: { limite: 200, deslocamento: todos.length },
        });
        todos.push(...pagina);
      } while (pagina.length === 200);
      return todos;
    },
    retry: false,
  });
  const bairro = bairros.data?.find((b) => b.id === Number(bairroId));
  const subtotal = itens.reduce(
    (s, i) => s + Math.round(Number(i.produto.preco) * 100) * i.quantidade,
    0,
  );
  async function finalizar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (trava.current || !enderecoAberto || !bairro || !itens.length) return;
    trava.current = true;
    setEnviando(true);
    ocupar(true);
    setErro("");
    const dados = new FormData(event.currentTarget);
    try {
      await apiRequest("/pedidos", {
        method: "POST",
        token,
        body: {
          bairro_id: bairro.id,
          logradouro: dados.get("logradouro"),
          numero: dados.get("numero"),
          complemento: dados.get("complemento") || null,
          cep: String(dados.get("cep")).replace(/\D/g, ""),
          itens: itens.map((i) => ({ produto_id: i.produto.id, quantidade: i.quantidade })),
        },
      });
      await client.invalidateQueries({ queryKey: ["produtos"] });
      await client.invalidateQueries({ queryKey: ["produto"] });
      await client.invalidateQueries({ queryKey: ["protegido"] });
      concluir();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao finalizar pedido.");
    } finally {
      trava.current = false;
      setEnviando(false);
      ocupar(false);
    }
  }
  return (
    <section className={panel}>
      <h2 className="text-2xl font-bold">Seu carrinho</h2>
      <p>
        Junte sabores diferentes no mesmo pedido. Informe o endereço uma única vez ao finalizar.
      </p>
      {itens.length === 0 ? (
        <p>Escolha um cupcake no catálogo para começar.</p>
      ) : (
        <form onSubmit={finalizar}>
          <fieldset disabled={enviando} className="space-y-4">
            {itens.map((i) => (
              <div
                key={i.produto.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b pb-3"
              >
                <span>
                  {i.produto.nome} · {formatPreco(i.produto.preco)}
                </span>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    aria-label={`Diminuir ${i.produto.nome}`}
                    onClick={() => alterar(i.produto.id, i.quantidade - 1)}
                  >
                    −
                  </Button>
                  <span>{i.quantidade}</span>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={i.quantidade >= i.produto.estoque}
                    aria-label={`Aumentar ${i.produto.nome}`}
                    onClick={() => alterar(i.produto.id, i.quantidade + 1)}
                  >
                    +
                  </Button>
                </div>
              </div>
            ))}
            <p>
              Subtotal estimado <strong>{formatPreco(String(subtotal / 100))}</strong>
            </p>
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="outline" asChild>
                <Link
                  to="/"
                  onClick={(event) => {
                    if (enviando) {
                      event.preventDefault();
                      return;
                    }
                    setEnderecoAberto(false);
                    continuar();
                  }}
                >
                  Continuar comprando
                </Link>
              </Button>
              {!enderecoAberto && (
                <Button type="button" onClick={() => setEnderecoAberto(true)}>
                  Finalizar compra
                </Button>
              )}
            </div>
            <fieldset
              hidden={!enderecoAberto}
              disabled={!enderecoAberto || enviando}
              className="space-y-4"
            >
              <legend className="text-xl font-semibold">Endereço de entrega do pedido</legend>
              {bairros.isPending && <Loading />}
              {bairros.isError && (
                <ErrorState error={bairros.error} onRetry={() => bairros.refetch()} />
              )}
              <label className="block">
                Bairro
                <select
                  required
                  className={input}
                  value={bairroId}
                  onChange={(e) => setBairroId(e.target.value)}
                >
                  <option value="">Selecione o bairro atendido</option>
                  {bairros.data?.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nome} — {b.cidade}/{b.uf}
                    </option>
                  ))}
                </select>
              </label>
              {bairros.data?.length === 0 && <p>Nenhum bairro disponível para entrega.</p>}
              <Campo nome="logradouro" titulo="Logradouro" max={200} />
              <Campo nome="numero" titulo="Número" max={20} />
              <Campo nome="complemento" titulo="Complemento" max={150} obrigatorio={false} />
              <label className="block">
                CEP
                <input
                  name="cep"
                  required
                  pattern="[0-9]{5}-?[0-9]{3}"
                  placeholder="58000-000"
                  className={input}
                />
              </label>
              {bairro && (
                <p>
                  Entrega {formatPreco(bairro.taxa_entrega)} · Prazo estimado {bairro.prazo_minutos}{" "}
                  minutos
                  <br />
                  Total estimado{" "}
                  <strong>
                    {formatPreco(
                      String((subtotal + Math.round(Number(bairro.taxa_entrega) * 100)) / 100),
                    )}
                  </strong>
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                Pagamento presencial. Os preços e o estoque serão conferidos ao finalizar.
              </p>
              {erro && (
                <p role="alert" className="text-destructive">
                  {erro}
                </p>
              )}
              <Button disabled={!bairro || enviando} type="submit">
                {enviando ? "Finalizando..." : "Confirmar pedido"}
              </Button>
            </fieldset>
          </fieldset>
        </form>
      )}
    </section>
  );
}

export function Campo({
  nome,
  titulo,
  tipo = "text",
  valor,
  max,
  obrigatorio = true,
}: {
  nome: string;
  titulo: string;
  tipo?: string;
  valor?: string | number;
  max?: number;
  obrigatorio?: boolean;
}) {
  return (
    <label className="block">
      {titulo}
      <input
        name={nome}
        type={tipo}
        defaultValue={valor}
        required={obrigatorio}
        maxLength={max}
        min={tipo === "number" ? 0 : undefined}
        step={tipo === "number" ? "1" : undefined}
        className={input}
      />
    </label>
  );
}

function Detalhes({ id, perfil }: { id: number; perfil: string }) {
  const { token, usuario } = useAuth();
  const prefixo =
    perfil === "ADMINISTRADOR"
      ? "/admin/pedidos"
      : perfil === "ENTREGADOR"
        ? "/entregas"
        : "/pedidos";
  const q = useQuery({
    queryKey: ["protegido", usuario?.id, "detalhe", id, perfil],
    queryFn: () => apiRequest<Detalhe>(`${prefixo}/${id}`, { token }),
    retry: false,
  });
  if (q.isPending) return <Loading />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const p = q.data;
  return (
    <div className="space-y-2 rounded-xl bg-muted p-4">
      <p>
        {p.logradouro}, {p.numero} {p.complemento && `— ${p.complemento}`}
      </p>
      <p>
        {p.bairro_nome} · {p.cidade}/{p.uf} · CEP {p.cep}
      </p>
      <ul>
        {p.itens.map((i) => (
          <li key={i.id}>
            {i.quantidade} × {i.nome_produto} · {formatPreco(i.preco_unitario)} cada
          </li>
        ))}
      </ul>
      <p>
        Total <strong>{formatPreco(p.valor_total)}</strong> · Pagamento presencial
      </p>
    </div>
  );
}

const nomes: Record<string, string> = {
  RECEBIDO: "Recebido",
  EM_PREPARO: "Em preparo",
  PRONTO: "Pronto",
  ATRIBUIDA: "Aceito pelo entregador",
  EM_ROTA: "Em rota",
  ENTREGUE: "Entregue",
  CANCELADO: "Cancelado",
};

export function Pedidos({ perfil }: { perfil: "CLIENTE" | "ADMINISTRADOR" | "ENTREGADOR" }) {
  const { token, usuario } = useAuth();
  const client = useQueryClient();
  const [pagina, setPagina] = useState(0);
  const [status, setStatus] = useState("");
  const [detalhe, setDetalhe] = useState<number | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const trava = useRef(false);
  const [erro, setErro] = useState("");
  const [disponiveis, setDisponiveis] = useState(false);
  const prefixo =
    perfil === "ADMINISTRADOR"
      ? "/admin/pedidos"
      : perfil === "ENTREGADOR"
        ? `/entregas/${disponiveis ? "disponiveis" : "minhas"}`
        : "/pedidos";
  const q = useQuery({
    queryKey: ["protegido", usuario?.id, "pedidos", prefixo, pagina, status],
    queryFn: () =>
      apiRequest<(Pedido & Entrega)[]>(prefixo, {
        token,
        query: { limite: 20, deslocamento: pagina * 20, status: status || undefined },
      }),
    retry: false,
  });
  async function agir(id: number, acao: string) {
    if (trava.current) return;
    if (
      acao === "cancelar" &&
      !window.confirm("Cancelar este pedido e devolver os itens ao estoque?")
    )
      return;
    trava.current = true;
    setOcupado(true);
    setErro("");
    try {
      const preparo = acao === "EM_PREPARO" || acao === "PRONTO";
      const base = perfil === "ADMINISTRADOR" ? "/admin/pedidos" : "/entregas";
      await apiRequest(`${base}/${id}/${preparo ? "status" : acao}`, {
        method: preparo ? "PATCH" : "POST",
        token,
        ...(preparo ? { body: { status: acao } } : {}),
      });
      await client.invalidateQueries({ queryKey: ["protegido"] });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha na operação.");
      await q.refetch();
    } finally {
      trava.current = false;
      setOcupado(false);
    }
  }
  return (
    <section className={panel}>
      <h2 className="text-2xl font-bold">{perfil === "ENTREGADOR" ? "Entregas" : "Pedidos"}</h2>
      {perfil === "ENTREGADOR" && (
        <Button
          variant="secondary"
          onClick={() => {
            setDisponiveis(!disponiveis);
            setPagina(0);
            setStatus("");
            setDetalhe(null);
          }}
        >
          {disponiveis ? "Ver minhas entregas" : "Escolher entrega disponível"}
        </Button>
      )}
      {perfil !== "CLIENTE" && !disponiveis && (
        <label className="block">
          Status
          <select
            className={input}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPagina(0);
            }}
          >
            <option value="">Todos</option>
            {Object.entries(nomes)
              .filter(
                ([s]) =>
                  perfil !== "ENTREGADOR" || ["ATRIBUIDA", "EM_ROTA", "ENTREGUE"].includes(s),
              )
              .map(([s, n]) => (
                <option key={s} value={s}>
                  {n}
                </option>
              ))}
          </select>
        </label>
      )}
      <Button variant="outline" onClick={() => q.refetch()} disabled={q.isFetching}>
        Atualizar
      </Button>
      {erro && (
        <p role="alert" className="text-destructive">
          {erro}
        </p>
      )}
      {q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <>
          {q.data.length === 0 && <p>Nenhum registro nesta página.</p>}
          {q.data.map((p) => {
            const id = perfil === "ENTREGADOR" ? p.pedido_id : p.id;
            return (
              <article key={id} className="space-y-3 border-b pb-4">
                <h3 className="font-bold">
                  Pedido #{id} · {nomes[p.status] ?? "Disponível"}
                </h3>
                {p.valor_total && <p>{formatPreco(p.valor_total)}</p>}
                {p.bairro_nome && (
                  <p>
                    {p.bairro_nome} · {p.cidade}/{p.uf}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {!disponiveis && (
                    <Button
                      variant="outline"
                      onClick={() => setDetalhe(detalhe === id ? null : id)}
                    >
                      Detalhes
                    </Button>
                  )}
                  {perfil === "ADMINISTRADOR" && p.status === "RECEBIDO" && (
                    <>
                      <Button disabled={ocupado} onClick={() => agir(id, "EM_PREPARO")}>
                        Iniciar preparo
                      </Button>
                      <Button
                        disabled={ocupado}
                        variant="outline"
                        onClick={() => agir(id, "cancelar")}
                      >
                        Cancelar
                      </Button>
                    </>
                  )}
                  {perfil === "ADMINISTRADOR" && p.status === "EM_PREPARO" && (
                    <Button disabled={ocupado} onClick={() => agir(id, "PRONTO")}>
                      Marcar pronto
                    </Button>
                  )}
                  {perfil === "ENTREGADOR" && disponiveis && (
                    <Button disabled={ocupado} onClick={() => agir(id, "aceitar")}>
                      Aceitar entrega
                    </Button>
                  )}
                  {perfil === "ENTREGADOR" && p.status === "ATRIBUIDA" && (
                    <Button disabled={ocupado} onClick={() => agir(id, "iniciar")}>
                      Iniciar rota
                    </Button>
                  )}
                  {perfil === "ENTREGADOR" && p.status === "EM_ROTA" && (
                    <Button disabled={ocupado} onClick={() => agir(id, "concluir")}>
                      Confirmar entrega
                    </Button>
                  )}
                </div>
                {detalhe === id && !disponiveis && <Detalhes id={id} perfil={perfil} />}
              </article>
            );
          })}
          <div className="flex items-center gap-3">
            <Button variant="outline" disabled={pagina === 0} onClick={() => setPagina(pagina - 1)}>
              Anterior
            </Button>
            <span>Página {pagina + 1}</span>
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
