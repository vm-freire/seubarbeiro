import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { Barbearia } from "./tipos";

export const COOKIE_BARBEARIA = "barbearia_atual";

/**
 * Usuário logado + barbearia que ele está gerenciando. Quem tem mais de
 * uma barbearia escolhe pelo seletor do menu (fica salvo num cookie).
 */
export const contextoPainel = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar?proximo=/painel");

  const { data: membros } = await supabase
    .from("membros")
    .select("papel, barbearias(*)")
    .eq("user_id", user.id)
    .order("criado_em");
  const lista = (membros ?? [])
    .map((m) => ({ papel: m.papel as "dono" | "barbeiro", barbearia: m.barbearias as unknown as Barbearia }))
    .filter((m) => m.barbearia);

  const escolhida = (await cookies()).get(COOKIE_BARBEARIA)?.value;
  const atual = lista.find((m) => m.barbearia.id === escolhida) ?? lista[0] ?? null;

  return { supabase, user, barbearias: lista.map((m) => m.barbearia), atual };
});

/** Para páginas e ações que exigem uma barbearia já criada. */
export async function exigirBarbearia() {
  const ctx = await contextoPainel();
  if (!ctx.atual) redirect("/painel");
  return { ...ctx, barbearia: ctx.atual.barbearia, papel: ctx.atual.papel };
}
