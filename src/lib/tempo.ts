/**
 * Datas e horas no fuso da barbearia (padrão: America/Sao_Paulo).
 * Datas "locais" circulam como texto "AAAA-MM-DD" e horas como "HH:MM",
 * para não depender do fuso do celular do cliente nem do servidor.
 */
export const FUSO_PADRAO = "America/Sao_Paulo";

const formatadores = new Map<string, Intl.DateTimeFormat>();
function formatador(fuso: string) {
  let f = formatadores.get(fuso);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", {
      timeZone: fuso,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    formatadores.set(fuso, f);
  }
  return f;
}

export function partesLocais(d: Date, fuso = FUSO_PADRAO) {
  const p = Object.fromEntries(formatador(fuso).formatToParts(d).map((x) => [x.type, x.value]));
  const data = `${p.year}-${p.month}-${p.day}`;
  return { data, hora: `${p.hour}:${p.minute}`, diaSemana: diaSemana(data) };
}

/** Diferença (em minutos) entre a hora local do fuso e o UTC naquele instante. */
function deslocamentoMin(d: Date, fuso: string) {
  const { data, hora } = partesLocais(d, fuso);
  const [y, m, dia] = data.split("-").map(Number);
  const [h, mi] = hora.split(":").map(Number);
  const comoUTC = Date.UTC(y, m - 1, dia, h, mi);
  return Math.round((comoUTC - Math.floor(d.getTime() / 60000) * 60000) / 60000);
}

/** "2026-11-03" + "15:00" no fuso → instante (Date). */
export function localParaDate(data: string, hora: string, fuso = FUSO_PADRAO): Date {
  const [y, m, d] = data.split("-").map(Number);
  const [h, mi] = hora.split(":").map(Number);
  const palpite = Date.UTC(y, m - 1, d, h, mi);
  const off1 = deslocamentoMin(new Date(palpite), fuso);
  let t = palpite - off1 * 60000;
  const off2 = deslocamentoMin(new Date(t), fuso);
  if (off2 !== off1) t = palpite - off2 * 60000;
  return new Date(t);
}

export function hojeLocal(fuso = FUSO_PADRAO, agora = new Date()) {
  return partesLocais(agora, fuso).data;
}

export function somarDias(data: string, n: number) {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 0 = domingo ... 6 = sábado */
export function diaSemana(data: string) {
  return new Date(`${data}T12:00:00Z`).getUTCDay();
}

export function inicioDaSemana(data: string) {
  // semana começando na segunda-feira
  const dow = diaSemana(data);
  return somarDias(data, dow === 0 ? -6 : 1 - dow);
}

export function primeiroDiaDoMes(data: string) {
  return `${data.slice(0, 7)}-01`;
}

export function ultimoDiaDoMes(data: string) {
  const [y, m] = data.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

export const NOMES_DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
export const NOMES_DIAS_CURTOS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function dataValida(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T12:00:00Z`));
}

export function horaValida(s: unknown): s is string {
  return typeof s === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}
