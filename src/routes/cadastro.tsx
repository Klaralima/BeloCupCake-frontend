import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { Field } from "@/components/Field";
import { PendingConnection, apiConfigured } from "@/components/StatusViews";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/cadastro")({
  head: () => ({
    meta: [
      { title: "Criar conta | BeloCupCake" },
      { name: "description", content: "Cadastre-se no BeloCupCake para pedir seus cupcakes." },
      { property: "og:title", content: "Criar conta | BeloCupCake" },
      { property: "og:description", content: "Cadastre-se no BeloCupCake para pedir seus cupcakes." },
    ],
  }),
  component: Cadastro,
});

type Campos = "nome" | "email" | "telefone" | "senha";

export function validarCadastro(d: Record<Campos, string>) {
  const e: Partial<Record<Campos, string>> = {};
  if (!d.nome.trim()) e.nome = "Informe seu nome.";
  else if (d.nome.length > 150) e.nome = "Máximo de 150 caracteres.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) e.email = "Informe um e-mail válido.";
  else if (d.email.length > 254) e.email = "Máximo de 254 caracteres.";
  if (!d.telefone.trim()) e.telefone = "Informe seu telefone.";
  else if (d.telefone.length > 20) e.telefone = "Máximo de 20 caracteres.";
  if (d.senha.length < 8) e.senha = "A senha deve ter pelo menos 8 caracteres.";
  else if (d.senha.length > 128) e.senha = "A senha deve ter no máximo 128 caracteres.";
  return e;
}

function Cadastro() {
  const navigate = useNavigate();
  const [dados, setDados] = useState({ nome: "", email: "", telefone: "", senha: "" });
  const [erros, setErros] = useState<Partial<Record<Campos, string>>>({});
  const [geral, setGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const set = (k: Campos) => (ev: React.ChangeEvent<HTMLInputElement>) => setDados({ ...dados, [k]: ev.target.value });

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    setGeral(null);
    const v = validarCadastro(dados);
    setErros(v);
    if (Object.keys(v).length) return;
    setEnviando(true);
    try {
      await api.criarUsuario({ ...dados, nome: dados.nome.trim(), email: dados.email.trim() });
      navigate({ to: "/login", search: { cadastro: "ok" } });
    } catch (e) {
      if (e instanceof ApiError) {
        setErros(e.fieldErrors as Partial<Record<Campos, string>>);
        setGeral(e.status === 409 ? "Este e-mail já está cadastrado." : e.message);
      } else setGeral("Erro inesperado.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-3xl font-bold">Criar conta</h1>
      <p className="mb-6 mt-1 text-muted-foreground">Cadastre-se para fazer seus pedidos.</p>
      {!apiConfigured ? (
        <PendingConnection />
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-4 rounded-2xl bg-card p-5 shadow-card">
          <Field id="nome" label="Nome" autoComplete="name" maxLength={150} value={dados.nome} onChange={set("nome")} error={erros.nome} />
          <Field id="email" label="E-mail" type="email" autoComplete="email" maxLength={254} value={dados.email} onChange={set("email")} error={erros.email} />
          <Field id="telefone" label="Telefone" type="tel" autoComplete="tel" maxLength={20} value={dados.telefone} onChange={set("telefone")} error={erros.telefone} />
          <Field id="senha" label="Senha (8 a 128 caracteres)" type="password" autoComplete="new-password" maxLength={128} value={dados.senha} onChange={set("senha")} error={erros.senha} />
          {geral && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{geral}</p>}
          <Button type="submit" size="touch" className="w-full" disabled={enviando}>
            {enviando ? "Cadastrando..." : "Criar conta"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Já tem conta? <Link to="/login" className="font-semibold text-primary underline">Entrar</Link>
          </p>
        </form>
      )}
    </div>
  );
}
