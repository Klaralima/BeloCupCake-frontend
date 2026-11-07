const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Converte preço decimal em string ("12.50") para o padrão brasileiro (R$ 12,50). */
export function formatPreco(preco: string | number | null | undefined): string {
  if (preco === null || preco === undefined || preco === "") return "—";
  const n = typeof preco === "number" ? preco : Number(String(preco).trim().replace(",", "."));
  return Number.isFinite(n) ? brl.format(n) : "—";
}
