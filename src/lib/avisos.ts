import { quando } from "./formatar.ts";
import { FUSO_PADRAO } from "./tempo.ts";

export type TipoAviso = "marcou" | "desmarcou" | "confirmou" | "remarcou";

export type Aviso = {
  id: string;
  barbearia_id: string;
  profissional_id: string | null;
  agendamento_id: string | null;
  tipo: TipoAviso;
  cliente_nome: string;
  profissional_nome: string;
  inicio: string | null;
  autor: string | null;
  criado_em: string;
};

export const ROTULO_AVISO: Record<TipoAviso, { verbo: string; titulo: string; cor: "verde" | "vermelho" | "azul" | "amarelo" }> = {
  marcou: { verbo: "marcou", titulo: "Novo horário", cor: "verde" },
  desmarcou: { verbo: "desmarcou", titulo: "Horário desmarcado", cor: "vermelho" },
  confirmou: { verbo: "confirmou", titulo: "Presença confirmada", cor: "azul" },
  remarcou: { verbo: "remarcou para", titulo: "Horário remarcado", cor: "amarelo" },
};

/**
 * "Pedro marcou hoje às 15:00 com João". O nome do profissional só aparece
 * para o dono (o barbeiro já sabe que é com ele).
 */
export function textoAviso(a: Aviso, opcoes: { comProfissional: boolean; fuso?: string; agora?: Date }) {
  const cliente = a.cliente_nome.trim() || "Um cliente";
  const quandoTxt = a.inicio ? ` ${quando(a.inicio, opcoes.fuso ?? FUSO_PADRAO, opcoes.agora)}` : "";
  const com = opcoes.comProfissional && a.profissional_nome ? ` com ${a.profissional_nome}` : "";
  return `${cliente} ${ROTULO_AVISO[a.tipo].verbo}${quandoTxt}${com}`;
}

/** "agora", "há 5 min", "há 2 h", "há 3 dias" */
export function haQuanto(iso: string, agora = Date.now()) {
  const min = Math.max(0, Math.floor((agora - new Date(iso).getTime()) / 60_000));
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return `há ${d} dia${d === 1 ? "" : "s"}`;
}

/** Conta os avisos que chegaram depois da última vez que o sino foi aberto. */
export function naoLidos(avisos: Pick<Aviso, "criado_em">[], vistoAte: string | null) {
  if (!vistoAte) return avisos.length;
  const limite = new Date(vistoAte).getTime();
  return avisos.filter((a) => new Date(a.criado_em).getTime() > limite).length;
}
