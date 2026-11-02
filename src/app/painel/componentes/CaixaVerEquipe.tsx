"use client";

import { useRef } from "react";
import { alternarVerEquipe } from "../acoes";

/** Caixinha do dono: mostrar também a agenda e os avisos dos outros profissionais. */
export function CaixaVerEquipe({ marcado }: { marcado: boolean }) {
  const form = useRef<HTMLFormElement>(null);
  return (
    <form ref={form} action={alternarVerEquipe}>
      <input type="hidden" name="ver" value={marcado ? "0" : "1"} />
      <label className="flex cursor-pointer items-center gap-2 rounded-full border border-borda bg-superficie px-3 py-2 text-sm font-semibold">
        <input type="checkbox" className="size-4 accent-[var(--destaque)]" defaultChecked={marcado} onChange={() => form.current?.requestSubmit()} />
        Ver também a equipe
      </label>
    </form>
  );
}
