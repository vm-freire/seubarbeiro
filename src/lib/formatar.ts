import { FUSO_PADRAO, hojeLocal, partesLocais, somarDias } from "./tempo.ts";

const moedaFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export function moeda(v: number | string | null | undefined) {
  return moedaFmt.format(Number(v ?? 0));
}

export function hora(d: Date | string, fuso = FUSO_PADRAO) {
  return partesLocais(new Date(d), fuso).hora;
}

export function dataCurta(data: string) {
  const [y, m, d] = data.split("-");
  return `${d}/${m}/${y}`;
}

export function dataExtensa(data: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${data}T12:00:00Z`));
}

/** "hoje às 15:00", "amanhã às 9:30", "sexta, 07/11 às 15:00" */
export function quando(d: Date | string, fuso = FUSO_PADRAO, agora = new Date()) {
  const { data, hora: h } = partesLocais(new Date(d), fuso);
  const hoje = hojeLocal(fuso, agora);
  if (data === hoje) return `hoje às ${h}`;
  if (data === somarDias(hoje, 1)) return `amanhã às ${h}`;
  const dia = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: "long" }).format(
    new Date(`${data}T12:00:00Z`)
  );
  return `${dia}, ${dataCurta(data).slice(0, 5)} às ${h}`;
}

export const STATUS = {
  agendado: { rotulo: "Marcado", curto: "Marcado", cor: "amarelo" },
  confirmado: { rotulo: "Confirmado", curto: "Confirmado", cor: "verde" },
  concluido: { rotulo: "Atendido", curto: "Atendido", cor: "azul" },
  faltou: { rotulo: "Faltou", curto: "Faltou", cor: "vermelho" },
  cancelado: { rotulo: "Cancelado", curto: "Cancelado", cor: "cinza" },
} as const;
export type Status = keyof typeof STATUS;

export const CATEGORIAS = {
  corte: "Corte",
  barba: "Barba",
  sobrancelha: "Sobrancelha",
  combo: "Combo",
  outro: "Outro",
} as const;
export type Categoria = keyof typeof CATEGORIAS;

export const PAGAMENTOS = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  debito: "Cartão de débito",
  credito: "Cartão de crédito",
  outro: "Outro",
  nao_informado: "Não informado",
} as const;
export type Pagamento = keyof typeof PAGAMENTOS;
