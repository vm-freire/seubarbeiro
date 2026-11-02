import { test } from "node:test";
import assert from "node:assert/strict";
import { destaques, periodoAnterior, serieDoPeriodo, taxaFaltas, variacao } from "./calculos.ts";

test("relatório: período anterior", () => {
  assert.deepEqual(periodoAnterior("2026-11-01", "2026-11-30"), { de: "2026-10-01", ate: "2026-10-31" });
  assert.deepEqual(periodoAnterior("2026-03-01", "2026-03-31"), { de: "2026-02-01", ate: "2026-02-28" });
  assert.deepEqual(periodoAnterior("2026-01-01", "2026-12-31"), { de: "2025-01-01", ate: "2025-12-31" });
  assert.deepEqual(periodoAnterior("2026-11-02", "2026-11-08"), { de: "2026-10-26", ate: "2026-11-01" });
  assert.deepEqual(periodoAnterior("2026-11-02", "2026-11-02"), { de: "2026-11-01", ate: "2026-11-01" });
});

test("relatório: variação e faltas", () => {
  assert.equal(variacao(150, 100), 50);
  assert.equal(variacao(50, 0), null);
  assert.equal(taxaFaltas({ faltas: 1, atendimentos: 9 }), 10);
  assert.equal(taxaFaltas({ faltas: 0, atendimentos: 0 }), 0);
});

test("relatório: gráfico por dia completa os dias vazios; ano vira meses", () => {
  const s = serieDoPeriodo([{ dia: "2026-11-03", qtd: 2, valor: 80 }], "2026-11-02", "2026-11-08");
  assert.equal(s.length, 7);
  assert.equal(s[1].valor, 80);
  assert.equal(s[0].valor, 0);
  assert.equal(s[1].detalhe, "Ter 03/11");
  const ano = serieDoPeriodo([{ dia: "2026-02-10", qtd: 1, valor: 30 }, { dia: "2026-02-11", qtd: 1, valor: 20 }], "2026-01-01", "2026-12-31");
  assert.equal(ano.length, 12);
  assert.equal(ano[1].valor, 50);
  assert.equal(ano[1].detalhe, "fev/26");
});

test("relatório: destaques", () => {
  const r = {
    atendimentos: 9, faltas: 1, cancelados: 0, sem_fechamento: 2, total: 300, total_tabela: 330, qtd_promocoes: 1,
    por_categoria: [], por_servico: [{ nome: "Corte", qtd: 6, valor: 200, promocoes: 0 }],
    por_pagamento: [{ forma: "pix", qtd: 6, valor: 210 }], por_profissional: [{ nome: "João", qtd: 9, valor: 300 }],
    por_dia: [{ dia: "2026-11-03", qtd: 9, valor: 300 }],
  };
  const m = (v) => `R$ ${v}`;
  const d = destaques(r, { ...r, total: 200 }, "2026-11-02", "2026-11-08", m);
  assert.ok(d[0].includes("subiu 50%"));
  assert.ok(d.some((x) => x.includes("Serviço mais feito: Corte")));
  assert.ok(d.some((x) => x.includes("Pix (70%")));
  assert.ok(d.some((x) => x.includes("R$ 30 em descontos")));
  assert.ok(d.some((x) => x.includes("2 horário(s)")));
  assert.ok(!d.some((x) => x.includes("Profissional com maior")), "um profissional só: sem destaque de profissional");
});
