import "server-only";
import type { createClient } from "./supabase/server";
import { localParaDate, somarDias } from "./tempo";
import type { AgendamentoCompleto, Bloqueio, HorarioExtra, HorarioSemana, Profissional, Servico } from "./tipos";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export const SELECT_AGENDAMENTO = "*, clientes(id, nome, telefone), profissionais(id, nome), agendamento_itens(*)";

/** Agendamentos com início entre os dias `de` e `ate` (inclusive), no fuso da barbearia. */
export async function agendamentosEntre(supabase: SupabaseClient, barbeariaId: string, fuso: string, de: string, ate: string) {
  const { data } = await supabase
    .from("agendamentos")
    .select(SELECT_AGENDAMENTO)
    .eq("barbearia_id", barbeariaId)
    .gte("inicio", localParaDate(de, "00:00", fuso).toISOString())
    .lt("inicio", localParaDate(somarDias(ate, 1), "00:00", fuso).toISOString())
    .order("inicio");
  return (data ?? []) as AgendamentoCompleto[];
}

export async function configuracaoAgenda(supabase: SupabaseClient, barbeariaId: string) {
  const agora = new Date(Date.now() - 24 * 3600_000).toISOString();
  const [prof, serv, hs, ex, bl] = await Promise.all([
    supabase.from("profissionais").select("*").eq("barbearia_id", barbeariaId).order("ordem").order("nome"),
    supabase.from("servicos").select("*").eq("barbearia_id", barbeariaId).order("ordem").order("nome"),
    supabase.from("horarios_semana").select("*").eq("barbearia_id", barbeariaId).order("dia_semana").order("inicio"),
    supabase.from("horarios_extras").select("*").eq("barbearia_id", barbeariaId).gte("fim", agora).order("inicio"),
    supabase.from("bloqueios").select("*").eq("barbearia_id", barbeariaId).gte("fim", agora).order("inicio"),
  ]);
  return {
    profissionais: (prof.data ?? []) as Profissional[],
    servicos: (serv.data ?? []) as Servico[],
    horarios: (hs.data ?? []) as HorarioSemana[],
    extras: (ex.data ?? []) as HorarioExtra[],
    bloqueios: (bl.data ?? []) as Bloqueio[],
  };
}
