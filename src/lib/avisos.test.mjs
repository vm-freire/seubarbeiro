import { test } from "node:test";
import assert from "node:assert/strict";
import { haQuanto, naoLidos, textoAviso } from "./avisos.ts";

const base = {
  id: "1",
  barbearia_id: "b",
  profissional_id: "p",
  agendamento_id: "a",
  cliente_nome: "Pedro",
  profissional_nome: "João",
  inicio: "2026-11-03T18:00:00Z", // 15:00 em São Paulo
  autor: null,
  criado_em: "2026-11-03T12:00:00Z",
};
const agora = new Date("2026-11-03T12:00:00Z");

test("aviso: texto para o dono traz o profissional; para o barbeiro, não", () => {
  assert.equal(textoAviso({ ...base, tipo: "marcou" }, { comProfissional: true, agora }), "Pedro marcou hoje às 15:00 com João");
  assert.equal(textoAviso({ ...base, tipo: "desmarcou" }, { comProfissional: false, agora }), "Pedro desmarcou hoje às 15:00");
  assert.equal(textoAviso({ ...base, tipo: "remarcou", cliente_nome: " " }, { comProfissional: false, agora }), "Um cliente remarcou para hoje às 15:00");
});

test("aviso: há quanto tempo", () => {
  const t = new Date("2026-11-03T12:00:00Z").getTime();
  assert.equal(haQuanto("2026-11-03T11:59:40Z", t), "agora");
  assert.equal(haQuanto("2026-11-03T11:55:00Z", t), "há 5 min");
  assert.equal(haQuanto("2026-11-03T09:00:00Z", t), "há 3 h");
  assert.equal(haQuanto("2026-11-02T11:00:00Z", t), "há 1 dia");
});

test("aviso: não lidos contam só o que chegou depois de abrir o sino", () => {
  const lista = [{ criado_em: "2026-11-03T12:00:00Z" }, { criado_em: "2026-11-03T10:00:00Z" }];
  assert.equal(naoLidos(lista, null), 2);
  assert.equal(naoLidos(lista, "2026-11-03T11:00:00Z"), 1);
  assert.equal(naoLidos(lista, "2026-11-03T12:00:00Z"), 0);
});
