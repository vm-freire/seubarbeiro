/**
 * Calcula os horários livres de um profissional num dia.
 *
 * Segue as mesmas regras da função `agendar` do banco (migração 001):
 * o atendimento inteiro precisa caber DENTRO de uma janela do expediente
 * (ou de um horário extra), não pode encostar em agendamento/bloqueio e
 * precisa respeitar a antecedência mínima. O banco confere de novo na
 * hora de gravar; isto aqui só serve para mostrar as opções.
 */
import { localParaDate } from "../tempo.ts";

export type Intervalo = { inicio: Date; fim: Date };
export type Janela = { inicio: string; fim: string }; // "HH:MM"

export type EntradaHorarios = {
  data: string; // "AAAA-MM-DD" no fuso da barbearia
  fuso: string;
  janelas: Janela[]; // expediente do dia da semana
  extras?: Intervalo[]; // horários extras abertos
  ocupados?: Intervalo[]; // agendamentos + bloqueios
  duracaoMin: number;
  passoMin: number;
  naoAntesDe?: Date; // agora + antecedência mínima
};

export type HorarioLivre = { hora: string; inicio: Date };

function sobrepoe(a: Intervalo, b: Intervalo) {
  return a.inicio < b.fim && b.inicio < a.fim;
}

export function horariosLivres(e: EntradaHorarios): HorarioLivre[] {
  if (e.duracaoMin <= 0 || e.passoMin <= 0) return [];

  const janelas: Intervalo[] = e.janelas.map((j) => ({
    inicio: localParaDate(e.data, j.inicio, e.fuso),
    fim: localParaDate(e.data, j.fim, e.fuso),
  }));
  const diaInicio = localParaDate(e.data, "00:00", e.fuso);
  const diaFim = new Date(diaInicio.getTime() + 24 * 3600_000);
  for (const x of e.extras ?? []) {
    if (x.inicio < diaFim && x.fim > diaInicio) janelas.push(x);
  }

  const dur = e.duracaoMin * 60_000;
  const passo = e.passoMin * 60_000;
  const vistos = new Map<number, HorarioLivre>();

  for (const j of janelas) {
    for (let t = j.inicio.getTime(); t + dur <= j.fim.getTime(); t += passo) {
      if (t < diaInicio.getTime() || t >= diaFim.getTime()) continue;
      if (e.naoAntesDe && t < e.naoAntesDe.getTime()) continue;
      const cand = { inicio: new Date(t), fim: new Date(t + dur) };
      if ((e.ocupados ?? []).some((o) => sobrepoe(cand, o))) continue;
      if (!vistos.has(t)) vistos.set(t, { hora: horaLocal(cand.inicio, e.fuso), inicio: cand.inicio });
    }
  }
  return [...vistos.values()].sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
}

function horaLocal(d: Date, fuso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: fuso,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(d);
}
