// Cliente HTTP centralizado da API BeloCupCake (FastAPI).
// Configure a URL base em VITE_API_BASE_URL (arquivo .env na raiz do projeto).

export const API_BASE_URL: string = (
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? ""
).replace(/\/+$/, "");

export const isApiConfigured = () => API_BASE_URL.length > 0;

export type Perfil = "CLIENTE" | "ADMINISTRADOR" | "ENTREGADOR";

export interface Produto {
  id: number;
  nome: string;
  descricao: string;
  sabor: string;
  tamanho: string;
  preco: string;
  estoque: number;
  imagem_url: string | null;
  ativo: boolean;
}

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  perfil: Perfil | string;
  ativo: boolean;
}

export interface TokenResposta {
  access_token: string;
  token_type?: string;
  expires_in: number;
}

export interface UsuarioCriar {
  nome: string;
  email: string;
  telefone: string;
  senha: string;
}

export type ErrorKind = "not_configured" | "network" | "http";

export class ApiError extends Error {
  kind: ErrorKind;
  status: number | undefined;
  fieldErrors: Record<string, string>;
  constructor(kind: ErrorKind, message: string, status?: number, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.kind = kind;
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

const STATUS_MESSAGES: Record<number, string> = {
  400: "Requisição inválida.",
  401: "Sua sessão expirou ou as credenciais são inválidas. Faça login novamente.",
  403: "Você não tem permissão para realizar esta ação.",
  404: "Não encontramos o que você procurava.",
  409: "Já existe um registro com esses dados.",
  422: "Alguns dados estão inválidos. Verifique os campos.",
  500: "O servidor encontrou um erro. Tente novamente mais tarde.",
};

interface ValidationItem {
  loc?: (string | number)[];
  msg?: string;
}

/** Converte o campo `detail` do FastAPI (string ou lista) em mensagem + erros por campo. */
export function parseDetail(detail: unknown): { message?: string | undefined; fieldErrors: Record<string, string> } {
  const fieldErrors: Record<string, string> = {};
  if (typeof detail === "string") return { message: detail, fieldErrors };
  if (Array.isArray(detail)) {
    const loose: string[] = [];
    for (const item of detail as ValidationItem[]) {
      const msg = translateMsg(item?.msg ?? "Valor inválido");
      const loc = item?.loc ?? [];
      const field = loc.length > 1 ? String(loc[loc.length - 1]) : undefined;
      if (field && loc[0] === "body") {
        if (!fieldErrors[field]) fieldErrors[field] = msg;
      } else loose.push(msg);
    }
    return { message: loose.length ? loose.join(" ") : undefined, fieldErrors };
  }
  return { fieldErrors };
}

function translateMsg(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("valid email")) return "Informe um e-mail válido.";
  if (m.includes("field required")) return "Campo obrigatório.";
  const min = msg.match(/at least (\d+) character/);
  if (min) return `Deve ter pelo menos ${min[1]} caracteres.`;
  const max = msg.match(/at most (\d+) character/);
  if (max) return `Deve ter no máximo ${max[1]} caracteres.`;
  return msg;
}

type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;
export function setUnauthorizedHandler(fn: UnauthorizedHandler | null) {
  onUnauthorized = fn;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
  query?: Record<string, string | number | undefined>;
}

export async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  if (!isApiConfigured()) {
    throw new ApiError("not_configured", "A conexão com a API ainda não foi configurada.");
  }
  const url = new URL(API_BASE_URL + path);
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }
  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.token) headers["Authorization"] = `Bearer ${opts.token}`;

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: opts.method ?? "GET",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : null,
    });
  } catch {
    throw new ApiError("network", "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.");
  }

  const text = await res.text();
  let data: unknown = undefined;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const { message, fieldErrors } = parseDetail((data as { detail?: unknown } | undefined)?.detail);
    if (res.status === 401 && opts.token && onUnauthorized) onUnauthorized();
    throw new ApiError(
      "http",
      message ?? STATUS_MESSAGES[res.status] ?? `Erro inesperado (${res.status}).`,
      res.status,
      fieldErrors,
    );
  }
  return data as T;
}

export const PAGE_SIZE = 12; // contrato: limite entre 1 e 100

export const api = {
  listarProdutos: (limite: number, deslocamento: number) =>
    apiRequest<Produto[]>("/produtos", {
      query: { limite: Math.min(100, Math.max(1, limite)), deslocamento: Math.max(0, deslocamento) },
    }),
  obterProduto: (id: number) => apiRequest<Produto>(`/produtos/${id}`),
  criarUsuario: (dados: UsuarioCriar) => apiRequest<Usuario>("/usuarios", { method: "POST", body: dados }),
  login: (email: string, senha: string) =>
    apiRequest<TokenResposta>("/auth/login", { method: "POST", body: { email, senha } }),
  meusDados: (token: string) => apiRequest<Usuario>("/usuarios/me", { token }),
};
