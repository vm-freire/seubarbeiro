import { test } from "node:test";
import assert from "node:assert/strict";
import { horariosLivres } from "./horariosLivres.ts";
import { localParaDate, partesLocais, somarDias, diaSemana, inicioDaSemana } from "../tempo.ts";
import { precoDoDia } from "../precos.ts";
import { numeroWhats, linkWhats, telefoneBonito } from "../whatsapp.ts";

const F = "America/Sao_Paulo";
const D = "2026-11-03"; // terça
const h = (hora, data = D) => localParaDate(data, hora, F);

test("fuso: 15:00 em SP = 18:00 UTC", () => {
  assert.equal(h("15:00").toISOString(), "2026-11-03T18:00:00.000Z");
  assert.deepEqual(partesLocais(new Date("2026-11-04T02:30:00Z"), F), { data: "2026-11-03", hora: "23:30", diaSemana: 2 });
});

test("datas: somar dias, dia da semana, início da semana", () => {
  assert.equal(somarDias("2026-12-31", 1), "2027-01-01");
  assert.equal(diaSemana(D), 2);
  assert.equal(inicioDaSemana("2026-11-08"), "2026-11-02"); // domingo → segunda anterior
});

test("horários livres respeitam almoço, duração e ocupados", () => {
  const livres = horariosLivres({
    data: D, fuso: F,
    janelas: [{ inicio: "09:00", fim: "12:00" }, { inicio: "13:00", fim: "15:00" }],
    ocupados: [{ inicio: h("10:00"), fim: h("10:30") }],
    duracaoMin: 60, passoMin: 30,
  }).map((x) => x.hora);
  assert.deepEqual(livres, ["09:00", "10:30", "11:00", "13:00", "13:30", "14:00"]);
});

test("antecedência mínima corta horários do passado", () => {
  const livres = horariosLivres({
    data: D, fuso: F, janelas: [{ inicio: "09:00", fim: "11:00" }],
    duracaoMin: 30, passoMin: 30, naoAntesDe: h("09:40"),
  }).map((x) => x.hora);
  assert.deepEqual(livres, ["10:00", "10:30"]);
});

test("horário extra entra e não duplica", () => {
  const livres = horariosLivres({
    data: D, fuso: F, janelas: [{ inicio: "09:00", fim: "10:00" }],
    extras: [{ inicio: h("09:00"), fim: h("10:00") }, { inicio: h("20:00"), fim: h("21:00") }, { inicio: h("09:00", "2026-11-04"), fim: h("10:00", "2026-11-04") }],
    duracaoMin: 30, passoMin: 30,
  }).map((x) => x.hora);
  assert.deepEqual(livres, ["09:00", "09:30", "20:00", "20:30"]);
});

test("bloqueio do dia inteiro zera a agenda", () => {
  const livres = horariosLivres({
    data: D, fuso: F, janelas: [{ inicio: "09:00", fim: "19:00" }],
    ocupados: [{ inicio: h("00:00"), fim: h("00:00", "2026-11-04") }],
    duracaoMin: 30, passoMin: 30,
  });
  assert.equal(livres.length, 0);
});

test("promoção só no dia certo e só se for mais barata", () => {
  const s = { id: "corte", preco: "40.00" };
  const promos = [
    { servico_id: "corte", nome: "Terça do corte", preco: "30", dias_semana: [2], data_inicio: null, data_fim: null, ativa: true },
    { servico_id: "corte", nome: "Cara", preco: "50", dias_semana: null, data_inicio: null, data_fim: null, ativa: true },
    { servico_id: "corte", nome: "Vencida", preco: "10", dias_semana: null, data_inicio: null, data_fim: "2026-10-01", ativa: true },
  ];
  assert.deepEqual(precoDoDia(s, promos, D), { preco: 30, precoTabela: 40, promocao: "Terça do corte" });
  assert.deepEqual(precoDoDia(s, promos, "2026-11-04"), { preco: 40, precoTabela: 40, promocao: null });
});

test("telefone para WhatsApp", () => {
  assert.equal(numeroWhats("(41) 99999-8888"), "5541999998888");
  assert.equal(numeroWhats("+55 41 3333-4444"), "554133334444");
  assert.equal(numeroWhats("123"), null);
  assert.equal(linkWhats("41999998888", "oi"), "https://wa.me/5541999998888?text=oi");
  assert.equal(telefoneBonito("5541999998888"), "(41) 99999-8888");
});
