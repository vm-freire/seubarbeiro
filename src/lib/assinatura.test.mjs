import { test } from "node:test";
import assert from "node:assert/strict";
import { assinaturaLiberada, avisoAssinatura, diasAte, ehCortesia, somarMes } from "./assinatura.ts";
import { assinaturaDoEvento, efeitoDoEvento } from "./asaasEventos.ts";

test("assinatura: mês seguinte respeita o fim do mês", () => {
  assert.equal(somarMes("2026-11-02"), "2026-12-02");
  assert.equal(somarMes("2026-12-15"), "2027-01-15");
  assert.equal(somarMes("2027-01-31"), "2027-02-28");
  assert.equal(somarMes("2028-01-31"), "2028-02-29");
  assert.equal(somarMes("2026-03-31"), "2026-04-30");
});

test("assinatura: teste de 7 dias + 3 de tolerância, cortesia sempre liberada", () => {
  const teste = { plano: "teste", assinatura_status: "teste", assinatura_valida_ate: "2026-11-09" };
  assert.equal(assinaturaLiberada(teste, "2026-11-12"), true);
  assert.equal(assinaturaLiberada(teste, "2026-11-13"), false);
  const cortesia = { plano: "cortesia", assinatura_status: "teste", assinatura_valida_ate: null };
  assert.equal(ehCortesia(cortesia), true);
  assert.equal(ehCortesia(teste), false);
  assert.equal(assinaturaLiberada(cortesia, "2099-01-01"), true);
  assert.equal(avisoAssinatura(cortesia), null);
  assert.equal(diasAte("2026-11-09", "2026-11-02"), 7);
});

test("assinatura: textos da faixa do painel", () => {
  const b = (valida, status = "teste") => ({ plano: "teste", assinatura_status: status, assinatura_valida_ate: valida });
  assert.match(avisoAssinatura(b("2026-11-09"), "2026-11-02").texto, /termina em 7 dias/);
  assert.match(avisoAssinatura(b("2026-11-03"), "2026-11-02").texto, /amanhã/);
  assert.equal(avisoAssinatura(b("2026-11-03"), "2026-11-02").tom, "amarelo");
  assert.match(avisoAssinatura(b("2026-11-01"), "2026-11-10").texto, /dados continuam guardados/);
  assert.equal(avisoAssinatura(b("2026-12-02", "ativa"), "2026-11-10"), null);
  assert.match(avisoAssinatura(b("2026-11-09", "atrasada"), "2026-11-10").texto, /atrasado/);
});

test("asaas: pagamento ativa até o mês seguinte ao vencimento", () => {
  const pago = { id: "evt_1", event: "PAYMENT_RECEIVED", payment: { id: "pay_1", subscription: "sub_1", dueDate: "2026-11-09" } };
  assert.deepEqual(efeitoDoEvento(pago, { assinatura_status: "teste", assinatura_valida_ate: "2026-11-09" }), {
    tipo: "barbearia",
    assinatura_status: "ativa",
    assinatura_valida_ate: "2026-12-09",
    plano: "mensal",
  });
  // aviso repetido/antigo não volta a data para trás
  const adiantada = efeitoDoEvento(pago, { assinatura_status: "ativa", assinatura_valida_ate: "2027-01-09" });
  assert.equal(adiantada.assinatura_valida_ate, "2027-01-09");
  // pagou depois de bloqueado: volta a ficar ativa
  assert.equal(efeitoDoEvento(pago, { assinatura_status: "atrasada", assinatura_valida_ate: "2026-11-09" }).assinatura_status, "ativa");
  assert.equal(assinaturaDoEvento(pago), "sub_1");
});

test("asaas: vencida vira atrasada; cancelamento e outros avisos", () => {
  const venceu = { id: "evt_2", event: "PAYMENT_OVERDUE", payment: { id: "pay_2", subscription: "sub_1", dueDate: "2026-12-09" } };
  assert.deepEqual(efeitoDoEvento(venceu, { assinatura_status: "ativa", assinatura_valida_ate: "2026-12-09" }), {
    tipo: "barbearia",
    assinatura_status: "atrasada",
    assinatura_valida_ate: "2026-12-09",
  });
  // aviso de vencimento velho, já pago um período adiante: ignora
  assert.deepEqual(efeitoDoEvento(venceu, { assinatura_status: "ativa", assinatura_valida_ate: "2027-01-09" }), { tipo: "nada" });
  assert.deepEqual(efeitoDoEvento({ id: "e", event: "SUBSCRIPTION_DELETED", subscription: { id: "sub_1" } }, { assinatura_status: "ativa", assinatura_valida_ate: null }), { tipo: "cancelou" });
  assert.deepEqual(efeitoDoEvento({ id: "e", event: "PAYMENT_CREATED", payment: { id: "p", dueDate: "2026-12-09" } }, { assinatura_status: "ativa", assinatura_valida_ate: null }), { tipo: "nada" });
});
