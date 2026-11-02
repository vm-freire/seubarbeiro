import { test } from "node:test";
import assert from "node:assert/strict";
import { faseLembrete, textoAntecedencia } from "./lembrete.ts";

const H = 3600_000;
const inicio = "2026-11-03T18:00:00Z";
const t = (iso) => new Date(iso).getTime();

test("lembrete: antes da janela, dentro dela e depois do início", () => {
  const a = { inicio, criado_em: "2026-11-01T12:00:00Z" };
  assert.equal(faseLembrete(a, 60, t(inicio) - 2 * H), "cedo");
  assert.equal(faseLembrete(a, 60, t(inicio) - H), "aberta");
  assert.equal(faseLembrete(a, 60, t(inicio) - 10 * 60_000), "aberta");
  assert.equal(faseLembrete(a, 60, t(inicio)), "passou");
});

test("lembrete: quem marca dentro da janela não recebe", () => {
  const a = { inicio, criado_em: new Date(t(inicio) - 30 * 60_000).toISOString() };
  assert.equal(faseLembrete(a, 60, t(inicio) - 20 * 60_000), "sem_lembrete");
  // marcou exatamente 1h antes: também não (o link nem chegou a "abrir" depois)
  const b = { inicio, criado_em: new Date(t(inicio) - H).toISOString() };
  assert.equal(faseLembrete(b, 60, t(inicio) - 30 * 60_000), "sem_lembrete");
});

test("texto da antecedência", () => {
  assert.equal(textoAntecedencia(60), "1 hora");
  assert.equal(textoAntecedencia(120), "2 horas");
  assert.equal(textoAntecedencia(30), "30 minutos");
  assert.equal(textoAntecedencia(90), "1h30");
});
