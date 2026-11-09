import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ApiError } from "@/lib/api";
import { homeForPerfil, useAuth } from "@/lib/auth";
import { Field } from "@/components/Field";
import { PendingConnection, apiConfigured } from "@/components/StatusViews";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): { cadastro?: string } =>
    typeof s["cadastro"] === "string" ? { cadastro: s["cadastro"] } : {},
  head: () => ({
    meta: [
      { title: "Entrar | BeloCupCake" },
      { name: "description", content: "Acesse sua conta BeloCupCake." },
      { property: "og:title", content: "Entrar | BeloCupCake" },
      { property: "og:description", content: "Acesse sua conta BeloCupCake." },
    ],
  }),
  component: Login,
});

function Login() {
  const { cadastro } = Route.useSearch();
  const { login, sessaoExpirada, usuario } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erros, setErros] = useState<Record<string, string>>({});
  const [geral, setGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    setGeral(null);
    const v: Record<string, string> = {};
    if (!email.trim()) v["email"] = "Informe seu e-mail.";
    if (!senha) v["senha"] = "Informe sua senha.";
    setErros(v);
    if (Object.keys(v).length) return;
    setEnviando(true);
    try {
      const u = await login(email.trim(), senha);
      navigate({ to: homeForPerfil(u.perfil), replace: true });
    } catch (e) {
      if (e instanceof ApiError) {
        setErros(e.fieldErrors);
        setGeral(
          e.status === 401
            ? "E-mail ou senha incorretos."
            : e.status === 403
              ? "Sua conta não tem acesso no momento."
              : e.message,
        );
      } else setGeral("Erro inesperado.");
    } finally {
      setEnviando(false);
    }
  }

  if (usuario)
    return (
      <div className="mx-auto max-w-md">
        <h1 className="text-3xl font-bold">Você já está conectado</h1>
        <p className="my-4">Conta: {usuario.email}. Para trocar de conta, clique em Sair.</p>
        <Link to={homeForPerfil(usuario.perfil)} className="underline">
          Ir para minha área
        </Link>
      </div>
    );

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-3xl font-bold">Entrar</h1>
      <p className="mb-6 mt-1 text-muted-foreground">Bom te ver de novo!</p>
      {cadastro === "ok" && (
        <p
          role="status"
          className="mb-4 rounded-xl bg-success/10 p-3 text-sm font-semibold text-success"
        >
          Cadastro realizado com sucesso! Agora é só entrar.
        </p>
      )}
      {sessaoExpirada && (
        <p role="status" className="mb-4 rounded-xl bg-secondary p-3 text-sm">
          Sua sessão expirou. Entre novamente.
        </p>
      )}
      {!apiConfigured ? (
        <PendingConnection />
      ) : (
        <form
          onSubmit={onSubmit}
          noValidate
          className="space-y-4 rounded-2xl bg-card p-5 shadow-card"
        >
          <Field
            id="email"
            label="E-mail"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={erros["email"]}
          />
          <Field
            id="senha"
            label="Senha"
            type="password"
            autoComplete="current-password"
            maxLength={128}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            error={erros["senha"]}
          />
          {geral && (
            <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
              {geral}
            </p>
          )}
          <Button type="submit" size="touch" className="w-full" disabled={enviando}>
            {enviando ? "Entrando..." : "Entrar"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Ainda não tem conta?{" "}
            <Link to="/cadastro" className="font-semibold text-primary underline">
              Cadastre-se
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}
