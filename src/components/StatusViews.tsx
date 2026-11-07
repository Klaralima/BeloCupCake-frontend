import { ApiError, API_BASE_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Loader2, PlugZap, WifiOff, CakeSlice } from "lucide-react";

export function Loading({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground" role="status">
      <Loader2 className="h-8 w-8 animate-spin text-accent" />
      <p>{label}</p>
    </div>
  );
}

export function Empty({ title, text }: { title: string; text?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <CakeSlice className="h-10 w-10 text-accent" />
      <h2 className="text-xl font-semibold">{title}</h2>
      {text && <p className="max-w-sm text-muted-foreground">{text}</p>}
    </div>
  );
}

export function PendingConnection() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-dashed bg-card p-8 text-center">
      <PlugZap className="h-10 w-10 text-accent" />
      <h2 className="text-xl font-semibold">Conexão com a API pendente</h2>
      <p className="text-muted-foreground">
        O endereço público da API do BeloCupCake ainda não foi configurado. Assim que estiver disponível, os
        produtos, o cadastro e o login passarão a funcionar.
      </p>
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  if (error instanceof ApiError && error.kind === "not_configured") return <PendingConnection />;
  const msg = error instanceof Error ? error.message : "Ocorreu um erro inesperado.";
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl bg-card p-8 text-center shadow-card">
      <WifiOff className="h-10 w-10 text-destructive" />
      <h2 className="text-xl font-semibold">Não foi possível carregar</h2>
      <p className="text-muted-foreground">{msg}</p>
      {onRetry && (
        <Button size="touch" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}

export const apiConfigured = API_BASE_URL.length > 0;
