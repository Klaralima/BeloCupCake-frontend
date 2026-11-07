import type React from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, setUnauthorizedHandler, type Usuario } from "./api";

// Sessão mantida apenas em memória (atualizar a página exige novo login).
interface AuthState {
  token: string | null;
  usuario: Usuario | null;
  sessaoExpirada: boolean;
  login: (email: string, senha: string) => Promise<Usuario>;
  logout: () => void;
}

// Mantém uma única instância do contexto mesmo após recarregamentos rápidos (HMR).
const g = globalThis as { __beloAuthCtx?: React.Context<AuthState | null> };
const AuthContext = g.__beloAuthCtx ?? (g.__beloAuthCtx = createContext<AuthState | null>(null));

const fallback: AuthState = {
  token: null,
  usuario: null,
  sessaoExpirada: false,
  login: async () => {
    throw new Error("Sessão indisponível. Recarregue a página.");
  },
  logout: () => {},
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [sessaoExpirada, setSessaoExpirada] = useState(false);

  const clear = useCallback(() => {
    setToken(null);
    setUsuario(null);
    queryClient.removeQueries({ queryKey: ["protegido"] });
  }, [queryClient]);

  const logout = useCallback(() => {
    setSessaoExpirada(false);
    clear();
  }, [clear]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clear();
      setSessaoExpirada(true);
    });
    return () => setUnauthorizedHandler(null);
  }, [clear]);

  const login = useCallback(async (email: string, senha: string) => {
    const t = await api.login(email, senha);
    const me = await api.meusDados(t.access_token);
    setToken(t.access_token);
    setUsuario(me);
    setSessaoExpirada(false);
    return me;
  }, []);

  const value = useMemo(
    () => ({ token, usuario, sessaoExpirada, login, logout }),
    [token, usuario, sessaoExpirada, login, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  return ctx ?? fallback;
}

export function homeForPerfil(perfil?: string): "/" | "/admin" | "/entregador" {
  if (perfil === "ADMINISTRADOR") return "/admin";
  if (perfil === "ENTREGADOR") return "/entregador";
  return "/";
}
