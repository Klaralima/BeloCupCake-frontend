export type Campos = "nome" | "email" | "telefone" | "senha";

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

