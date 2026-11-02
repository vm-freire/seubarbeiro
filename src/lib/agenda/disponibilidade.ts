/**
 * Junta os dados da barbearia (expediente, extras, ocupados) e devolve os
 * horários livres de um profissional num dia. Usado pelo agendamento do
 * cliente e pelo painel.
 */
import { horariosLivres, type Janela } from "./horariosLivres.ts";
import { diaSemana, localParaDate } from "../tempo.ts";

type HorarioSemana = { profissional_id: string; dia_semana: number; inicio: string; fim: string };
type Faixa = { profissional_id: string | null; inicio: string; fim: string };

export function janelasDoDia(horarios: HorarioSemana[], profissionalId: string, data: string): Janela[] {
  const dow = diaSemana(data);
  return horarios
    .filter((h) => h.profissional_id === profissionalId && h.dia_semana === dow)
    .map((h) => ({ inicio: h.inicio.slice(0, 5), fim: h.fim.slice(0, 5) }));
}

function extrasDoDia(extras: Faixa[], profissionalId: string, data: string, fuso: string) {
  const ini = localParaDate(data, "00:00", fuso).getTime();
  const fim = ini + 24 * 3600_000;
  return extras
    .filter((e) => e.profissional_id === profissionalId)
    .map((e) => ({ inicio: new Date(e.inicio), fim: new Date(e.fim) }))
    .filter((e) => e.inicio.getTime() < fim && e.fim.getTime() > ini);
}

export function diaTemAtendimento(
  horarios: HorarioSemana[],
  extras: Faixa[],
  profissionalId: string,
  data: string,
  fuso: string
) {
  return janelasDoDia(horarios, profissionalId, data).length > 0 || extrasDoDia(extras, profissionalId, data, fuso).length > 0;
}

export function livresDoDia(p: {
  fuso: string;
  passoMin: number;
  horarios: HorarioSemana[];
  extras: Faixa[];
  ocupados: Faixa[]; // profissional_id nulo = vale para todos
  profissionalId: string;
  data: string;
  duracaoMin: number;
  naoAntesDe?: Date;
}) {
  return horariosLivres({
    data: p.data,
    fuso: p.fuso,
    janelas: janelasDoDia(p.horarios, p.profissionalId, p.data),
    extras: extrasDoDia(p.extras, p.profissionalId, p.data, p.fuso),
    ocupados: p.ocupados
      .filter((o) => o.profissional_id === null || o.profissional_id === p.profissionalId)
      .map((o) => ({ inicio: new Date(o.inicio), fim: new Date(o.fim) })),
    duracaoMin: p.duracaoMin,
    passoMin: p.passoMin,
    naoAntesDe: p.naoAntesDe,
  });
}
