/**
 * Contas do relatório de caixa (sem banco): período escolhido, período
 * anterior para comparar, série do gráfico e os destaques. Usado pela
 * página, pelo PDF e pela planilha, para os três mostrarem o mesmo.
 */
import { CATEGORIAS, dataCurta, PAGAMENTOS, type Categoria, type Pagamento } from "../formatar.ts";
import {
  dataValida,
  diaSemana,
  inicioDaSemana,
  NOMES_DIAS,
  NOMES_DIAS_CURTOS,
  primeiroDiaDoMes,
  somarDias,
  ultimoDiaDoMes,
} from "../tempo.ts";

export type Relatorio = {
  atendimentos: number;
  faltas: number;
  cancelados: number;
  sem_fechamento: number;
  total: number;
  total_tabela: number;
  qtd_promocoes: number;
  por_categoria: { categoria: Categoria; qtd: number; valor: number }[];
  por_servico: { nome: string; qtd: number; valor: number; promocoes: number }[];
  por_pagamento: { forma: Pagamento | "nao_informado"; qtd: number; valor: number }[];
  por_profissional: { nome: string; qtd: number; valor: number }[];
  por_dia: { dia: string; qtd: number; valor: number }[];
};

export type Busca = Record<string, string | string[] | undefined>;

export const ATALHOS = [
  ["hoje", "Hoje (fechamento do dia)"],
  ["semana", "Esta semana"],
  ["7dias", "Últimos 7 dias"],
  ["mes", "Este mês"],
  ["mespassado", "Mês passado"],
  ["ano", "Este ano"],
] as const;

export function periodo(sp: Busca, hoje: string) {
  const p = typeof sp.p === "string" ? sp.p : "hoje";
  if (p === "semana") return { p, de: inicioDaSemana(hoje), ate: hoje };
  if (p === "7dias") return { p, de: somarDias(hoje, -6), ate: hoje };
  if (p === "mes") return { p, de: primeiroDiaDoMes(hoje), ate: ultimoDiaDoMes(hoje) };
  if (p === "mespassado") {
    const ref = somarDias(primeiroDiaDoMes(hoje), -1);
    return { p, de: primeiroDiaDoMes(ref), ate: ref };
  }
  if (p === "ano") return { p, de: `${hoje.slice(0, 4)}-01-01`, ate: `${hoje.slice(0, 4)}-12-31` };
  if (p === "livre" && dataValida(sp.de) && dataValida(sp.ate) && sp.de <= sp.ate) return { p, de: sp.de, ate: sp.ate };
  return { p: "hoje", de: hoje, ate: hoje };
}

export function diasEntre(de: string, ate: string) {
  return Math.round((Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / 86_400_000) + 1;
}

/** Período anterior do mesmo tamanho (mês inteiro → mês anterior; ano inteiro → ano anterior). */
export function periodoAnterior(de: string, ate: string) {
  if (de.endsWith("-01-01") && ate === `${de.slice(0, 4)}-12-31`) {
    const ano = Number(de.slice(0, 4)) - 1;
    return { de: `${ano}-01-01`, ate: `${ano}-12-31` };
  }
  if (de === primeiroDiaDoMes(de) && ate === ultimoDiaDoMes(de)) {
    const ref = somarDias(de, -1);
    return { de: primeiroDiaDoMes(ref), ate: ref };
  }
  const n = diasEntre(de, ate);
  return { de: somarDias(de, -n), ate: somarDias(de, -1) };
}

/** Variação em % (null quando não dá para comparar). */
export function variacao(atual: number, anterior: number) {
  if (!anterior) return null;
  return ((atual - anterior) / anterior) * 100;
}

export function textoVariacao(v: number | null) {
  if (v === null) return "sem base de comparação";
  const r = Math.round(v);
  if (r === 0) return "igual ao período anterior";
  return `${r > 0 ? "+" : ""}${r}% em relação ao período anterior`;
}

export const ticketMedio = (r: Pick<Relatorio, "total" | "atendimentos">) => (r.atendimentos ? Number(r.total) / r.atendimentos : 0);

/** Faltas em relação aos horários que deveriam ter acontecido. */
export const taxaFaltas = (r: Pick<Relatorio, "faltas" | "atendimentos">) =>
  r.atendimentos + r.faltas ? (r.faltas / (r.atendimentos + r.faltas)) * 100 : 0;

export const descontos = (r: Pick<Relatorio, "total" | "total_tabela">) => Math.max(0, Number(r.total_tabela) - Number(r.total));

export type PontoGrafico = { rotulo: string; detalhe: string; valor: number; qtd: number };

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/**
 * Faturamento ao longo do período: um ponto por dia (até 31 dias, com os
 * dias sem movimento zerados) ou um por mês (períodos maiores).
 */
export function serieDoPeriodo(porDia: Relatorio["por_dia"], de: string, ate: string): PontoGrafico[] {
  const n = diasEntre(de, ate);
  if (n <= 31) {
    const mapa = new Map(porDia.map((d) => [d.dia, d]));
    return Array.from({ length: n }, (_, i) => {
      const dia = somarDias(de, i);
      const d = mapa.get(dia);
      return { rotulo: dia.slice(8, 10), detalhe: `${NOMES_DIAS_CURTOS[diaSemana(dia)]} ${dataCurta(dia).slice(0, 5)}`, valor: Number(d?.valor ?? 0), qtd: d?.qtd ?? 0 };
    });
  }
  const meses: PontoGrafico[] = [];
  for (let m = primeiroDiaDoMes(de); m <= ate; m = somarDias(ultimoDiaDoMes(m), 1)) {
    const chave = m.slice(0, 7);
    const doMes = porDia.filter((d) => d.dia.startsWith(chave));
    meses.push({
      rotulo: MESES[Number(m.slice(5, 7)) - 1],
      detalhe: `${MESES[Number(m.slice(5, 7)) - 1]}/${m.slice(2, 4)}`,
      valor: doMes.reduce((t, d) => t + Number(d.valor), 0),
      qtd: doMes.reduce((t, d) => t + d.qtd, 0),
    });
  }
  return meses;
}

/** Soma por dia da semana (segunda a domingo). */
export function porDiaDaSemana(porDia: Relatorio["por_dia"]) {
  const ordem = [1, 2, 3, 4, 5, 6, 0];
  return ordem.map((dow) => {
    const dias = porDia.filter((d) => diaSemana(d.dia) === dow);
    return { dia: NOMES_DIAS[dow], curto: NOMES_DIAS_CURTOS[dow], valor: dias.reduce((t, d) => t + Number(d.valor), 0), qtd: dias.reduce((t, d) => t + d.qtd, 0) };
  });
}

export const rotuloPagamento = (f: string) => (f === "nao_informado" ? "Não informado" : (PAGAMENTOS[f as Pagamento] ?? f));
export const rotuloCategoria = (c: string) => CATEGORIAS[c as Categoria] ?? c;

const pct = (parte: number, todo: number) => (todo ? Math.round((parte / todo) * 100) : 0);

/** Frases curtas com o que mais importa no período (para o topo do PDF e da planilha). */
export function destaques(r: Relatorio, anterior: Relatorio | null, de: string, ate: string, moeda: (v: number) => string): string[] {
  const linhas: string[] = [];
  const total = Number(r.total);
  if (!r.atendimentos) {
    linhas.push("Nenhum atendimento fechado neste período.");
  } else {
    if (anterior) {
      const v = variacao(total, Number(anterior.total));
      if (v !== null) linhas.push(`Faturamento ${v >= 0 ? "subiu" : "caiu"} ${Math.abs(Math.round(v))}% em relação ao período anterior (${moeda(Number(anterior.total))}).`);
    }
    const servico = r.por_servico[0];
    if (servico) linhas.push(`Serviço mais feito: ${servico.nome} (${servico.qtd}x, ${moeda(Number(servico.valor))}).`);
    const pag = r.por_pagamento[0];
    if (pag) linhas.push(`Forma de pagamento principal: ${rotuloPagamento(pag.forma)} (${pct(Number(pag.valor), total)}% do valor).`);
    if (r.por_profissional.length > 1) {
      const p = r.por_profissional[0];
      linhas.push(`Profissional com maior faturamento: ${p.nome} (${moeda(Number(p.valor))}, ${p.qtd} atendimento${p.qtd === 1 ? "" : "s"}).`);
    }
    if (de !== ate && r.por_dia.length) {
      const melhor = [...r.por_dia].sort((a, b) => Number(b.valor) - Number(a.valor))[0];
      linhas.push(`Melhor dia: ${NOMES_DIAS[diaSemana(melhor.dia)].toLowerCase()}, ${dataCurta(melhor.dia)} (${moeda(Number(melhor.valor))}).`);
      if (diasEntre(de, ate) >= 14) {
        const semana = porDiaDaSemana(r.por_dia).sort((a, b) => b.valor - a.valor)[0];
        if (semana.valor > 0) linhas.push(`Dia da semana mais forte: ${semana.dia.toLowerCase()}.`);
      }
    }
    const desc = descontos(r);
    if (desc > 0) linhas.push(`${moeda(desc)} em descontos e promoções (${pct(desc, Number(r.total_tabela))}% do preço de tabela).`);
  }
  const tf = taxaFaltas(r);
  if (r.faltas) linhas.push(`${r.faltas} falta${r.faltas === 1 ? "" : "s"} (${Math.round(tf)}% dos horários${tf >= 10 ? ": vale ficar de olho" : ""}).`);
  if (r.sem_fechamento) linhas.push(`Atenção: ${r.sem_fechamento} horário(s) já passaram sem fechamento. Eles não entram no total.`);
  return linhas;
}
