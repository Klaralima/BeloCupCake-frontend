import { Administration } from "./Administration";
import { Pedidos } from "./Commerce";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function RoleHome({
  perfil,
  titulo,
  texto,
}: {
  perfil: string;
  titulo: string;
  texto: string;
}) {
  const { usuario, sessaoExpirada } = useAuth();
  if (!usuario) {
    return (
      <div className="mx-auto max-w-md rounded-2xl bg-card p-8 text-center shadow-card">
        <h1 className="text-2xl font-bold">
          {sessaoExpirada ? "Sessão expirada" : "Acesso restrito"}
        </h1>
        <p className="mt-2 text-muted-foreground">Entre com sua conta para acessar esta área.</p>
        <Button asChild size="touch" className="mt-6">
          <Link to="/login">Entrar</Link>
        </Button>
      </div>
    );
  }
  if (usuario.perfil !== perfil) {
    return (
      <div className="mx-auto max-w-md rounded-2xl bg-card p-8 text-center shadow-card">
        <h1 className="text-2xl font-bold">Área indisponível</h1>
        <p className="mt-2 text-muted-foreground">
          Esta área não corresponde ao perfil da sua conta.
        </p>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-5xl rounded-2xl bg-card p-8 shadow-card">
      <p className="text-sm font-semibold uppercase tracking-wide text-accent">{perfil}</p>
      <h1 className="mt-1 text-3xl font-bold">{titulo}</h1>
      <dl className="mt-6 space-y-1 text-sm">
        <div>
          <dt className="inline font-semibold">Conta: </dt>
          <dd className="inline">{usuario.nome}</dd>
        </div>
        <div>
          <dt className="inline font-semibold">E-mail: </dt>
          <dd className="inline">{usuario.email}</dd>
        </div>
      </dl>
      {perfil === "ADMINISTRADOR" ? <Administration /> : <Pedidos perfil="ENTREGADOR" />}
    </div>
  );
}
