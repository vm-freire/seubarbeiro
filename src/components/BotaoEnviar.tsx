"use client";

import { useFormStatus } from "react-dom";

export function BotaoEnviar({
  children,
  className = "btn-primario",
  pendente = "Salvando…",
  ...resto
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { pendente?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending || resto.disabled} {...resto}>
      {pending ? pendente : children}
    </button>
  );
}
