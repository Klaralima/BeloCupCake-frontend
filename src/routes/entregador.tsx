import { createFileRoute } from "@tanstack/react-router";
import { RoleHome } from "@/components/RoleHome";

export const Route = createFileRoute("/entregador")({
  head: () => ({
    meta: [
      { title: "Área do entregador | BeloCupCake" },
      { name: "description", content: "Área do entregador BeloCupCake." },
      { property: "og:title", content: "Área do entregador | BeloCupCake" },
      { property: "og:description", content: "Área do entregador BeloCupCake." },
    ],
  }),
  component: () => (
    <RoleHome perfil="ENTREGADOR" titulo="Área do entregador" texto="A escolha, aceite, rota e confirmação de entregas serão implementadas nas próximas etapas." />
  ),
});
