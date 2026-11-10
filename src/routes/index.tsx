import { Comprar } from "@/components/Commerce";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { api, PAGE_SIZE } from "@/lib/api";
import { formatPreco } from "@/lib/format";
import { ProductImage } from "@/components/ProductImage";
import { Empty, ErrorState, Loading } from "@/components/StatusViews";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Catálogo de cupcakes | BeloCupCake" },
      {
        name: "description",
        content: "Escolha seus cupcakes artesanais favoritos no BeloCupCake.",
      },
      { property: "og:title", content: "Catálogo de cupcakes | BeloCupCake" },
      {
        property: "og:description",
        content: "Escolha seus cupcakes artesanais favoritos no BeloCupCake.",
      },
    ],
  }),
  component: Catalogo,
});

function Catalogo() {
  const q = useInfiniteQuery({
    queryKey: ["produtos"],
    queryFn: ({ pageParam }) => api.listarProdutos(PAGE_SIZE, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, pages) =>
      last.length < PAGE_SIZE ? undefined : pages.length * PAGE_SIZE,
    retry: false,
  });
  const produtos = q.data?.pages.flat() ?? [];

  return (
    <div>
      <section className="mb-6">
        <h1 className="text-3xl font-bold sm:text-4xl">Nossos cupcakes</h1>
        <p className="mt-1 text-muted-foreground">Feitos com carinho, do forno para você.</p>
      </section>

      {q.isPending ? (
        <Loading label="Carregando cupcakes..." />
      ) : q.isError && produtos.length === 0 ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : produtos.length === 0 ? (
        <Empty
          title="Nenhum cupcake disponível"
          text="Volte em breve para conferir as novidades."
        />
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
            {produtos.map((p) => (
              <li key={p.id}>
                <Link
                  to="/produto/$id"
                  params={{ id: String(p.id) }}
                  className="block overflow-hidden rounded-2xl bg-card shadow-card transition-transform hover:-translate-y-0.5"
                >
                  <ProductImage src={p.imagem_url} alt={p.nome} />
                  <div className="space-y-1 p-3">
                    <h2 className="line-clamp-1 text-base font-semibold">{p.nome}</h2>
                    <p className="line-clamp-1 text-xs text-muted-foreground">
                      {p.sabor} · {p.tamanho}
                    </p>
                    <p className="text-lg font-bold text-primary">{formatPreco(p.preco)}</p>
                  </div>
                </Link>
                <div className="mt-2">
                  <Comprar produto={p} />
                </div>
              </li>
            ))}
          </ul>
          {q.isFetchNextPageError && (
            <p className="mt-4 text-center text-sm text-destructive">{q.error?.message}</p>
          )}
          {q.hasNextPage && (
            <div className="mt-8 flex justify-center">
              <Button
                size="touch"
                variant="secondary"
                disabled={q.isFetchingNextPage}
                onClick={() => q.fetchNextPage()}
              >
                {q.isFetchingNextPage ? "Carregando..." : "Carregar mais"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
