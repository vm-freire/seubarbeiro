/**
 * Regra do "Vou / Não vou": o link só vale a partir de `lembreteMin` antes do
 * horário. Quem marcou já dentro desse intervalo (ex.: marcou 30 min antes,
 * com lembrete de 60) não recebe lembrete: a pessoa obviamente vem.
 * O banco aplica a mesma regra em confirmacao_responder (migração 003).
 */
export type FaseLembrete =
  | "cedo" // ainda falta mais que o tempo do lembrete
  | "aberta" // dentro do tempo: hora de mandar o link
  | "sem_lembrete" // marcou em cima da hora
  | "passou"; // o horário já começou

export function faseLembrete(a: { inicio: string; criado_em: string }, lembreteMin: number, agora: number): FaseLembrete {
  const inicio = new Date(a.inicio).getTime();
  const libera = inicio - lembreteMin * 60_000;
  if (agora >= inicio) return "passou";
  if (new Date(a.criado_em).getTime() >= libera) return "sem_lembrete";
  return agora >= libera ? "aberta" : "cedo";
}

/** "1 hora", "2 horas", "30 minutos", "1h30" */
export function textoAntecedencia(min: number) {
  if (min % 60 === 0) return min === 60 ? "1 hora" : `${min / 60} horas`;
  if (min < 60) return `${min} minutos`;
  return `${Math.floor(min / 60)}h${String(min % 60).padStart(2, "0")}`;
}
