import "server-only";
import ExcelJS from "exceljs";
import { dataCurta, moeda } from "../formatar";
import {
  descontos,
  destaques,
  diasEntre,
  porDiaDaSemana,
  rotuloCategoria,
  rotuloPagamento,
  serieDoPeriodo,
  taxaFaltas,
  ticketMedio,
  variacao,
} from "./calculos";
import type { DadosRelatorio } from "./carregar";

/**
 * Relatório de caixa em Excel (.xlsx): aba "Resumo" com os números e os
 * destaques, e uma aba para cada tabela. Valores ficam como número (dá
 * para somar e filtrar); barras coloridas dentro das células fazem o
 * papel do gráfico.
 */

const ESCURO = "FF15110F";
const CREME = "FFF3EDE2";
const AREIA = "FFF1E9DB";
const VERMELHO = "FFB3122A";
const OURO = "FFC9A227";
const REAIS = '"R$" #,##0.00';
const PORCENTO = "0%";

type Coluna = { titulo: string; largura: number; formato?: string };

function cabecalhoAba(ws: ExcelJS.Worksheet, d: DadosRelatorio, titulo: string, ncol: number) {
  ws.mergeCells(1, 1, 1, ncol);
  const c1 = ws.getCell(1, 1);
  c1.value = `SEU BARBEIRO  ·  ${titulo.toUpperCase()}`;
  c1.font = { bold: true, size: 14, color: { argb: CREME } };
  c1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ESCURO } };
  c1.alignment = { vertical: "middle", indent: 1 };
  ws.getRow(1).height = 30;
  ws.mergeCells(2, 1, 2, ncol);
  const c2 = ws.getCell(2, 1);
  c2.value = `${d.barbearia.nome} · ${d.de === d.ate ? dataCurta(d.de) : `${dataCurta(d.de)} a ${dataCurta(d.ate)}`} · ${d.nomeProf ?? "Todos os profissionais"}`;
  c2.font = { size: 10, color: { argb: "FF655B51" } };
  c2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AREIA } };
  c2.alignment = { vertical: "middle", indent: 1 };
  ws.getRow(2).height = 20;
  // faixa vermelha (poste)
  for (let i = 1; i <= ncol; i++) ws.getCell(3, i).fill = { type: "pattern", pattern: "solid", fgColor: { argb: i % 2 ? VERMELHO : CREME } };
  ws.getRow(3).height = 4;
}

/** Tabela com cabeçalho escuro, linhas listradas, total e barra de dados na coluna de valor. */
function tabela(
  ws: ExcelJS.Worksheet,
  linhaInicial: number,
  colunas: Coluna[],
  linhas: (string | number)[][],
  opcoes: { total?: (string | number)[]; barraNaColuna?: number } = {},
) {
  colunas.forEach((c, i) => {
    const col = ws.getColumn(i + 1);
    col.width = Math.max(col.width ?? 0, c.largura);
  });
  const cab = ws.getRow(linhaInicial);
  colunas.forEach((c, i) => {
    const cel = cab.getCell(i + 1);
    cel.value = c.titulo;
    cel.font = { bold: true, color: { argb: CREME } };
    cel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ESCURO } };
    cel.alignment = { horizontal: i === 0 ? "left" : "right", vertical: "middle" };
  });
  cab.height = 20;
  linhas.forEach((l, k) => {
    const row = ws.getRow(linhaInicial + 1 + k);
    l.forEach((v, i) => {
      const cel = row.getCell(i + 1);
      cel.value = v;
      if (colunas[i].formato) cel.numFmt = colunas[i].formato!;
      cel.alignment = { horizontal: i === 0 ? "left" : "right" };
      if (k % 2) cel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFCF6" } };
      cel.border = { bottom: { style: "hair", color: { argb: "FFD9CFBF" } } };
    });
  });
  let fim = linhaInicial + linhas.length;
  if (opcoes.total) {
    fim++;
    const row = ws.getRow(fim);
    opcoes.total.forEach((v, i) => {
      const cel = row.getCell(i + 1);
      cel.value = v;
      if (colunas[i].formato) cel.numFmt = colunas[i].formato!;
      cel.font = { bold: true };
      cel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AREIA } };
      cel.border = { top: { style: "thin", color: { argb: ESCURO } } };
      cel.alignment = { horizontal: i === 0 ? "left" : "right" };
    });
  }
  if (opcoes.barraNaColuna && linhas.length) {
    const letra = ws.getColumn(opcoes.barraNaColuna).letter;
    ws.addConditionalFormatting({
      ref: `${letra}${linhaInicial + 1}:${letra}${linhaInicial + linhas.length}`,
      rules: [
        {
          type: "dataBar",
          priority: 1,
          minLength: 0,
          maxLength: 100,
          gradient: false,
          cfvo: [{ type: "num", value: 0 }, { type: "max" }],
          color: { argb: "FFF2A7B1" }, // vermelho claro: o número continua legível em cima da barra
        } as unknown as ExcelJS.ConditionalFormattingRule,
      ],
    });
  }
  return fim;
}

function aba(wb: ExcelJS.Workbook, nome: string) {
  return wb.addWorksheet(nome, { views: [{ state: "frozen", ySplit: 4, showGridLines: false }], properties: { tabColor: { argb: VERMELHO } } });
}

export async function gerarPlanilhaRelatorio(d: DadosRelatorio, geradoEm: string) {
  const r = d.r!;
  const a = d.anterior;
  const total = Number(r.total);
  const pct = (v: number) => (total ? Number(v) / total : 0);
  const wb = new ExcelJS.Workbook();
  wb.creator = "Seu Barbeiro";
  wb.created = new Date();

  // ---------------- Resumo
  const ws = aba(wb, "Resumo");
  cabecalhoAba(ws, d, "Relatório de caixa", 4);
  const ind: (string | number)[][] = [
    ["Total recebido", total, a ? Number(a.total) : "", a ? (variacao(total, Number(a.total)) ?? "") : ""],
    ["Atendimentos", r.atendimentos, a ? a.atendimentos : "", a ? (variacao(r.atendimentos, a.atendimentos) ?? "") : ""],
    ["Ticket médio", ticketMedio(r), a ? ticketMedio(a) : "", a ? (variacao(ticketMedio(r), ticketMedio(a)) ?? "") : ""],
    ["Faltas", r.faltas, a ? a.faltas : "", a ? (variacao(r.faltas, a.faltas) ?? "") : ""],
    ["Cancelados", r.cancelados, a ? a.cancelados : "", ""],
    ["Descontos e promoções", descontos(r), a ? descontos(a) : "", ""],
    ["Horários sem fechamento", r.sem_fechamento, "", ""],
  ].map((l) => [l[0], l[1], l[2], typeof l[3] === "number" ? l[3] / 100 : l[3]]);
  let fim = tabela(
    ws,
    5,
    [
      { titulo: "Indicador", largura: 30 },
      { titulo: "Este período", largura: 18 },
      { titulo: "Período anterior", largura: 18 },
      { titulo: "Variação", largura: 12, formato: "+0%;-0%;0%" },
    ],
    ind,
  );
  // dinheiro nas linhas de valor
  for (const lin of [6, 8, 11]) for (const col of [2, 3]) ws.getCell(lin, col).numFmt = REAIS;
  ws.getCell(6, 2).font = { bold: true, size: 12, color: { argb: VERMELHO } };
  ws.getCell(9, 2).value = r.faltas;
  ws.getCell(9, 2).note = `${Math.round(taxaFaltas(r))}% dos horários`;

  fim++;
  ws.getCell(fim, 3).value = `${dataCurta(d.anteriorDe)}${d.anteriorDe === d.anteriorAte ? "" : ` a ${dataCurta(d.anteriorAte)}`}`;
  ws.getCell(fim, 3).font = { size: 8, color: { argb: "FF655B51" } };
  ws.getCell(fim, 3).alignment = { horizontal: "right" };
  fim += 2;
  ws.mergeCells(fim, 1, fim, 4);
  const tit = ws.getCell(fim, 1);
  tit.value = "DESTAQUES DO PERÍODO";
  tit.font = { bold: true, color: { argb: VERMELHO } };
  for (const t of destaques(r, a, d.de, d.ate, moeda)) {
    fim++;
    ws.mergeCells(fim, 1, fim, 4);
    const c = ws.getCell(fim, 1);
    c.value = `•  ${t}`;
    c.alignment = { wrapText: true, vertical: "top" };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AREIA } };
    ws.getRow(fim).height = t.length > 95 ? 30 : 17;
  }
  fim += 2;
  ws.getCell(fim, 1).value = `Gerado em ${geradoEm} pelo Seu Barbeiro.`;
  ws.getCell(fim, 1).font = { italic: true, size: 9, color: { argb: "FF655B51" } };

  // ---------------- Por dia (ou mês)
  if (d.de !== d.ate) {
    const serie = serieDoPeriodo(r.por_dia, d.de, d.ate);
    const porMes = diasEntre(d.de, d.ate) > 31;
    const wd = aba(wb, porMes ? "Por mês" : "Por dia");
    cabecalhoAba(wd, d, porMes ? "Faturamento por mês" : "Faturamento por dia", 3);
    tabela(
      wd,
      5,
      [
        { titulo: porMes ? "Mês" : "Dia", largura: 18 },
        { titulo: "Atendimentos", largura: 15 },
        { titulo: "Valor", largura: 40, formato: REAIS },
      ],
      serie.map((p) => [p.detalhe, p.qtd, p.valor]),
      { total: ["Total", r.atendimentos, total], barraNaColuna: 3 },
    );
    if (diasEntre(d.de, d.ate) >= 14) {
      const sem = porDiaDaSemana(r.por_dia);
      const ini = 5 + serie.length + 4;
      wd.getCell(ini - 1, 1).value = "POR DIA DA SEMANA";
      wd.getCell(ini - 1, 1).font = { bold: true, color: { argb: VERMELHO } };
      tabela(
        wd,
        ini,
        [
          { titulo: "Dia da semana", largura: 18 },
          { titulo: "Atendimentos", largura: 15 },
          { titulo: "Valor", largura: 40, formato: REAIS },
        ],
        sem.map((x) => [x.dia, x.qtd, x.valor]),
        { barraNaColuna: 3 },
      );
    }
  }

  // ---------------- Serviços
  const wsv = aba(wb, "Serviços");
  cabecalhoAba(wsv, d, "Serviços", 5);
  const fimServ = tabela(
    wsv,
    5,
    [
      { titulo: "Serviço", largura: 30 },
      { titulo: "Quantidade", largura: 12 },
      { titulo: "Com desconto", largura: 14 },
      { titulo: "% do total", largura: 12, formato: PORCENTO },
      { titulo: "Valor", largura: 30, formato: REAIS },
    ],
    r.por_servico.map((x) => [x.nome, x.qtd, x.promocoes, pct(Number(x.valor)), Number(x.valor)]),
    { total: ["Total", r.por_servico.reduce((t, x) => t + x.qtd, 0), r.qtd_promocoes, 1, total], barraNaColuna: 5 },
  );
  wsv.getCell(fimServ + 2, 1).value = "POR TIPO DE SERVIÇO";
  wsv.getCell(fimServ + 2, 1).font = { bold: true, color: { argb: VERMELHO } };
  tabela(
    wsv,
    fimServ + 3,
    [
      { titulo: "Tipo", largura: 30 },
      { titulo: "Quantidade", largura: 12 },
      { titulo: "", largura: 14 },
      { titulo: "% do total", largura: 12, formato: PORCENTO },
      { titulo: "Valor", largura: 30, formato: REAIS },
    ],
    r.por_categoria.map((x) => [rotuloCategoria(x.categoria), x.qtd, "", pct(Number(x.valor)), Number(x.valor)]),
    { barraNaColuna: 5 },
  );

  // ---------------- Pagamentos
  const wp = aba(wb, "Pagamentos");
  cabecalhoAba(wp, d, "Formas de pagamento", 4);
  tabela(
    wp,
    5,
    [
      { titulo: "Forma", largura: 22 },
      { titulo: "Atendimentos", largura: 14 },
      { titulo: "% do total", largura: 12, formato: PORCENTO },
      { titulo: "Valor", largura: 30, formato: REAIS },
    ],
    r.por_pagamento.map((x) => [rotuloPagamento(x.forma), x.qtd, pct(Number(x.valor)), Number(x.valor)]),
    { total: ["Total", r.atendimentos, 1, total], barraNaColuna: 4 },
  );

  // ---------------- Profissionais
  if (!d.prof && r.por_profissional.length > 0) {
    const wpr = aba(wb, "Profissionais");
    cabecalhoAba(wpr, d, "Por profissional", 5);
    tabela(
      wpr,
      5,
      [
        { titulo: "Profissional", largura: 26 },
        { titulo: "Atendimentos", largura: 14 },
        { titulo: "Ticket médio", largura: 14, formato: REAIS },
        { titulo: "% do total", largura: 12, formato: PORCENTO },
        { titulo: "Valor", largura: 30, formato: REAIS },
      ],
      r.por_profissional.map((x) => [x.nome, x.qtd, x.qtd ? Number(x.valor) / x.qtd : 0, pct(Number(x.valor)), Number(x.valor)]),
      { total: ["Total", r.atendimentos, ticketMedio(r), 1, total], barraNaColuna: 5 },
    );
  }

  // cores do cabeçalho de dourado no detalhe do total
  ws.getCell(6, 1).font = { bold: true };
  ws.getCell(6, 1).border = { left: { style: "thick", color: { argb: OURO } } };

  return Buffer.from(await wb.xlsx.writeBuffer());
}
