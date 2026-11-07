import { createFileRoute } from "@tanstack/react-router";
import { RoleHome } from "@/components/RoleHome";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administração | BeloCupCake" },
      { name: "description", content: "Área do administrador BeloCupCake." },
      { property: "og:title", content: "Administração | BeloCupCake" },
      { property: "og:description", content: "Área do administrador BeloCupCake." },
    ],
  }),
  component: () => (
    <RoleHome perfil="ADMINISTRADOR" titulo="Painel do administrador" texto="A gestão de produtos, pedidos, regiões e bairros será implementada nas próximas etapas." />
  ),
});
