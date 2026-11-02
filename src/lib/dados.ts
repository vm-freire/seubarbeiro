import "server-only";
import { cache } from "react";
import { createClient } from "./supabase/server";
import { hojeLocal, somarDias } from "./tempo";
import type { Barbearia, HorarioExtra, HorarioSemana, Profissional, Promocao, Servico } from "./tipos";

/** Tudo que a página pública e o agendamento precisam (só dados públicos). */
export const carregarBarbeariaPublica = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data: barbearia } = await supabase.from("barbearias").select("*").eq("slug", slug).maybeSingle<Barbearia>();
  if (!barbearia) return null;

  const agora = new Date().toISOString();
  const [prof, serv, promo, hs, ex] = await Promise.all([
    supabase.from("profissionais").select("*").eq("barbearia_id", barbearia.id).eq("ativo", true).order("ordem").order("nome"),
    supabase.from("servicos").select("*").eq("barbearia_id", barbearia.id).eq("ativo", true).order("ordem").order("nome"),
    supabase.from("promocoes").select("*").eq("barbearia_id", barbearia.id).eq("ativa", true),
    supabase.from("horarios_semana").select("*").eq("barbearia_id", barbearia.id).order("inicio"),
    supabase.from("horarios_extras").select("*").eq("barbearia_id", barbearia.id).gte("fim", agora).order("inicio"),
  ]);

  return {
    barbearia,
    profissionais: (prof.data ?? []) as Profissional[],
    servicos: (serv.data ?? []) as Servico[],
    promocoes: (promo.data ?? []) as Promocao[],
    horarios: (hs.data ?? []) as HorarioSemana[],
    extras: (ex.data ?? []) as HorarioExtra[],
  };
});

/** Último dia que o cliente pode escolher (igual à função limite_agenda do banco). */
export function limiteAgenda(b: Pick<Barbearia, "fuso" | "dias_agenda_aberta" | "agenda_aberta_ate">) {
  const pelaJanela = somarDias(hojeLocal(b.fuso), b.dias_agenda_aberta);
  return b.agenda_aberta_ate && b.agenda_aberta_ate < pelaJanela ? b.agenda_aberta_ate : pelaJanela;
}

export async function usuarioAtual() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: perfil } = await supabase.from("perfis").select("nome, telefone").eq("id", user.id).maybeSingle();
  return { id: user.id, email: user.email ?? "", nome: perfil?.nome ?? "", telefone: perfil?.telefone ?? "" };
}
