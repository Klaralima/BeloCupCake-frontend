import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { formatPreco } from "@/lib/format";
import { ProductImage } from "@/components/ProductImage";
import { Empty, ErrorState, Loading } from "@/components/StatusViews";

export const Route = createFileRoute("/produto/$id")({
  head: () => ({
    meta: [
      { title: "Detalhes do cupcake | BeloCupCake" },
      { name: "description", content: "Veja sabor, tamanho, preço e disponibilidade deste cupcake." },
      { property: "og:title", content: "Detalhes do cupcake | BeloCupCake" },
      { property: "og:description", content: "Veja sabor, tamanho, preço e disponibilidade deste cupcake." },
    ],
  }),
  component: Detalhe,
});

function Detalhe() {
  const { id } = Route.useParams();
  const num = Number(id);
  const q = useQuery({
    queryKey: ["produto", num],
    queryFn: () => api.obterProduto(num),
    enabled: Number.isInteger(num) && num > 0,
    retry: false,
  });

  const back = (
    <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-primary">
      <ArrowLeft className="h-4 w-4" /> Voltar ao catálogo
    </Link>
  );

  if (!Number.isInteger(num) || num <= 0 || (q.error instanceof ApiError && q.error.status === 404))
    return <div>{back}<Empty title="Produto não encontrado" text="Este cupcake não existe ou foi removido." /></div>;
  if (q.isPending) return <div>{back}<Loading /></div>;
  if (q.isError) return <div>{back}<ErrorState error={q.error} onRetry={() => q.refetch()} /></div>;

  const p = q.data;
  const disponivel = p.ativo && p.estoque > 0;
  return (
    <div>
      {back}
      <article className="grid gap-6 overflow-hidden rounded-3xl bg-card shadow-card md:grid-cols-2">
        <ProductImage src={p.imagem_url} alt={p.nome} />
        <div className="flex flex-col gap-4 p-5 md:p-8">
          <h1 className="text-3xl font-bold">{p.nome}</h1>
          <p className="text-3xl font-bold text-primary">{formatPreco(p.preco)}</p>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-secondary px-3 py-1">Sabor: {p.sabor}</span>
            <span className="rounded-full bg-secondary px-3 py-1">Tamanho: {p.tamanho}</span>
          </div>
          <p className="leading-relaxed text-muted-foreground">{p.descricao}</p>
          <p className={disponivel ? "font-semibold text-success" : "font-semibold text-destructive"}>
            {disponivel ? `Disponível (${p.estoque} em estoque)` : "Indisponível no momento"}
          </p>
        </div>
      </article>
    </div>
  );
}
