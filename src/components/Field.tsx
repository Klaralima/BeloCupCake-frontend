import type { InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function Field({ label, error, id, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string | undefined; id: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} aria-invalid={!!error} aria-describedby={error ? `${id}-erro` : undefined} className="h-12 rounded-xl bg-card text-base" {...props} />
      {error && <p id={`${id}-erro`} className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
