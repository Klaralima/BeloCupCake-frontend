import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  api,
  isApiConfigured,
  setUnauthorizedHandler,
  type SessaoResposta,
  type Usuario,
} from "./api";

interface AuthState {
  // Identificador público da sessão; não é o JWT e não autentica sem o cookie HttpOnly.
  token: string | null;
  usuario: Usuario | null;
  sessaoExpirada: boolean;
  login: (email: string, senha: string) => Promise<Usuario>;
  logout: () => Promise<void>;
}
const AuthContext = createContext<AuthState | null>(null);
const EVENT_KEY = "belocupcake:session-change";
// Serializa login/logout entre abas. Nenhuma credencial é gravada no Web Storage.
async function exclusive<T>(action: () => Promise<T>): Promise<T> {
  if (!navigator.locks) throw new Error("Atualize seu navegador para entrar com segurança.");
  return navigator.locks.request("belocupcake-session", action);
}
function notify(channel: BroadcastChannel | null) {
  try {
    localStorage.setItem(EVENT_KEY, crypto.randomUUID());
  } catch {
    /* sincronização por foco continua disponível */
  }
  channel?.postMessage("changed");
}
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<SessaoResposta>({ session_id: null, usuario: null });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [sessaoExpirada, setSessaoExpirada] = useState(false);
  const version = useRef(0);
  const current = useRef<string | null>(null);
  const busy = useRef(false);
  const mounted = useRef(true);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const apply = useCallback(
    (next: SessaoResposta) => {
      if (current.current !== next.session_id) {
        void queryClient.cancelQueries({ queryKey: ["protegido"] });
        queryClient.removeQueries({ queryKey: ["protegido"] });
      }
      current.current = next.session_id;
      setSession(next);
    },
    [queryClient],
  );
  const restore = useCallback(async () => {
    if (busy.current) return;
    const turn = ++version.current;
    if (!isApiConfigured()) {
      setReady(true);
      return;
    }
    try {
      const next = await api.sessao();
      if (!mounted.current || turn !== version.current) return;
      apply(next);
      setError(false);
      setReady(true);
    } catch {
      if (!mounted.current || turn !== version.current) return;
      // Falha de rede não apaga o cookie nem finge que a pessoa saiu.
      setError(true);
      setReady(false);
    }
  }, [apply]);
  useEffect(() => {
    mounted.current = true;
    void restore();
    const changed = () => {
      if (busy.current) return;
      setReady(false);
      void restore();
    };
    const storage = (e: StorageEvent) => {
      if (e.key === EVENT_KEY) changed();
    };
    const focus = () => {
      if (document.visibilityState === "visible") void restore();
    };
    const channel =
      typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(EVENT_KEY) : null;
    channelRef.current = channel;
    if (channel) channel.onmessage = changed;
    window.addEventListener("storage", storage);
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", focus);
    setUnauthorizedHandler((requestSession) => {
      if (busy.current || requestSession !== current.current) return;
      apply({ session_id: null, usuario: null });
      setSessaoExpirada(true);
      setReady(false);
      void restore();
    });
    return () => {
      mounted.current = false;
      version.current++;
      channel?.close();
      window.removeEventListener("storage", storage);
      window.removeEventListener("focus", focus);
      document.removeEventListener("visibilitychange", focus);
      setUnauthorizedHandler(null);
    };
  }, [apply, restore]);
  const login = useCallback(
    async (email: string, senha: string) => {
      const turn = ++version.current;
      busy.current = true;
      try {
        return await exclusive(async () => {
          const next = await api.login(email, senha);
          notify(channelRef.current);
          if (!mounted.current || turn !== version.current) throw new Error("Login cancelado.");
          if (!next.usuario || !next.session_id) throw new Error("Sessão inválida.");
          apply(next);
          setSessaoExpirada(false);
          return next.usuario;
        });
      } finally {
        busy.current = false;
      }
    },
    [apply],
  );
  const logout = useCallback(async () => {
    version.current++;
    busy.current = true;
    try {
      await exclusive(async () => {
        await api.logout();
        version.current++;
        apply({ session_id: null, usuario: null });
        setSessaoExpirada(false);
        notify(channelRef.current);
      });
    } finally {
      busy.current = false;
    }
  }, [apply]);
  const value = useMemo(
    () => ({ token: session.session_id, usuario: session.usuario, sessaoExpirada, login, logout }),
    [session, sessaoExpirada, login, logout],
  );
  if (!ready)
    return (
      <div role={error ? "alert" : "status"} className="p-8 text-center">
        {error ? (
          <>
            Não foi possível verificar sua sessão.{" "}
            <button onClick={() => void restore()} className="underline">
              Tentar novamente
            </button>
          </>
        ) : (
          "Verificando sessão…"
        )}
      </div>
    );
  return (
    <AuthContext.Provider value={value}>
      <div key={session.session_id ?? "anonimo"}>{children}</div>
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("AuthProvider ausente.");
  return ctx;
}
export function homeForPerfil(perfil?: string): "/" | "/admin" | "/entregador" {
  if (perfil === "ADMINISTRADOR") return "/admin";
  if (perfil === "ENTREGADOR") return "/entregador";
  return "/";
}
