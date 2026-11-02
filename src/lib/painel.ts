import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { Barbearia, Profissional } from "./tipos";

export const COOKIE_BARBEARIA = "barbearia_atual";
export const COOKIE_VER_EQUIPE = "ver_equipe";

/**
 * Usuário logado + barbearia que ele está gerenciando. Quem tem mais de
 * uma barbearia escolhe pelo seletor do menu (fica salvo num cookie).
 *
 * Papéis: "dono" mexe em tudo; "barbeiro" só no que é dele (agenda,
 * horários, clientes, perfil e relatório próprios). O banco garante isso.
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

  let meuProfissional: Profissional | null = null;
  if (atual) {
    const { data } = await supabase
      .from("profissionais")
      .select("*")
      .eq("barbearia_id", atual.barbearia.id)
      .eq("user_id", user.id)
      .maybeSingle<Profissional>();
    meuProfissional = data;
  }

  return { supabase, user, barbearias: lista.map((m) => m.barbearia), atual, meuProfissional };
});

/** Para páginas e ações que exigem uma barbearia já criada. */
export async function exigirBarbearia() {
  const ctx = await contextoPainel();
  if (!ctx.atual) redirect("/painel");
  const dono = ctx.atual.papel === "dono";
  return { ...ctx, barbearia: ctx.atual.barbearia, papel: ctx.atual.papel, dono };
}

/**
 * O dono vê, por padrão, só a própria agenda e os próprios avisos. Marcando
 * "Ver também a equipe" (cookie neste aparelho), vê e mexe nos dos outros.
 * Dono que não atende (sem cadastro de profissional) sempre vê a equipe.
 * Barbeiro comum já só recebe o que é dele (o banco garante).
 */
export async function filtroEquipe(dono: boolean, meuProfissional: Profissional | null) {
  const marcado = (await cookies()).get(COOKIE_VER_EQUIPE)?.value === "1";
  const verEquipe = dono && (marcado || !meuProfissional);
  return {
    verEquipe,
    /** mostrar a caixinha? (só para dono que também atende) */
    podeEscolher: dono && !!meuProfissional,
    marcado,
    /** profissional que fica na tela quando a equipe está escondida */
    soDe: verEquipe ? null : (meuProfissional?.id ?? null),
  };
}

/** Páginas só do dono (serviços, configurações, equipe). */
export async function exigirDono() {
  const ctx = await exigirBarbearia();
  if (!ctx.dono) redirect("/painel");
  return ctx;
}
