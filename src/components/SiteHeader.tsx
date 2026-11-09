import { toast } from "sonner";
import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const perfil = usuario?.perfil;
  const linkCls = "rounded-full px-3 py-2 text-sm font-semibold hover:bg-secondary";
  const active = { className: "bg-secondary" };

  return (
    <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3">
        <Link to="/" className="font-display text-2xl font-bold text-primary">
          Belo<span className="text-accent">Cup</span>Cake
        </Link>
        <nav className="flex flex-wrap items-center gap-1">
          <Link to="/" className={linkCls} activeProps={active} activeOptions={{ exact: true }}>
            Catálogo
          </Link>
          {perfil === "ADMINISTRADOR" && (
            <Link to="/admin" className={linkCls} activeProps={active}>
              Administração
            </Link>
          )}
          {perfil === "ENTREGADOR" && (
            <Link to="/entregador" className={linkCls} activeProps={active}>
              Entregas
            </Link>
          )}
          {usuario ? (
            <>
              <span className="hidden px-2 text-sm text-muted-foreground sm:inline">
                Olá, {usuario.nome.split(" ")[0]}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={async () => {
                  try {
                    await logout();
                    navigate({ to: "/login", replace: true });
                  } catch {
                    toast.error("Não foi possível sair. Verifique sua conexão e tente novamente.");
                  }
                }}
              >
                Sair
              </Button>
            </>
          ) : (
            <>
              <Link to="/login" className={linkCls} activeProps={active}>
                Entrar
              </Link>
              <Button asChild size="sm" className="rounded-full">
                <Link to="/cadastro">Criar conta</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
