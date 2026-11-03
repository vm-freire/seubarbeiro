/**
 * O que cada aviso (webhook) do Asaas muda na barbearia. Sem banco aqui:
 * a rota /api/asaas/webhook busca a situação atual, chama `efeitoDoEvento`
 * e grava o resultado. Nunca apaga nada.
 *
 * - Pagou (PAYMENT_RECEIVED / PAYMENT_CONFIRMED): "ativa" até o mesmo dia
 *   do mês seguinte ao vencimento da cobrança paga (nunca volta a data).
 * - Venceu sem pagar (PAYMENT_OVERDUE): "atrasada" (o banco ainda dá
 *   3 dias de tolerância a partir do vencimento antes de bloquear).
 * - Assinatura apagada/inativada no Asaas: marca como cancelada; o acesso
 *   segue até o fim do período já pago e depois bloqueia sozinho.
 */
import { somarMes } from "./assinatura.ts";

export type EventoAsaas = {
  id: string;
  event: string;
  payment?: { id: string; subscription?: string | null; dueDate: string; status?: string; billingType?: string } | null;
  subscription?: { id: string } | null;
};

type Atual = { assinatura_status: string; assinatura_valida_ate: string | null };

export type Efeito =
  | { tipo: "barbearia"; assinatura_status: "ativa" | "atrasada"; assinatura_valida_ate: string | null; plano?: string }
  | { tipo: "cancelou" }
  | { tipo: "nada" };

export const PAGOU = new Set(["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"]);

export function efeitoDoEvento(e: EventoAsaas, atual: Atual): Efeito {
  if (PAGOU.has(e.event) && e.payment?.dueDate) {
    const novo = somarMes(e.payment.dueDate);
    const ate = atual.assinatura_valida_ate && atual.assinatura_valida_ate > novo && atual.assinatura_status === "ativa" ? atual.assinatura_valida_ate : novo;
    return { tipo: "barbearia", assinatura_status: "ativa", assinatura_valida_ate: ate, plano: "mensal" };
  }
  if (e.event === "PAYMENT_OVERDUE" && e.payment) {
    // já pagou um período mais adiante (aviso velho chegando atrasado): ignora
    if (atual.assinatura_status === "ativa" && atual.assinatura_valida_ate && atual.assinatura_valida_ate > e.payment.dueDate) return { tipo: "nada" };
    return { tipo: "barbearia", assinatura_status: "atrasada", assinatura_valida_ate: atual.assinatura_valida_ate ?? e.payment.dueDate };
  }
  if (e.event === "SUBSCRIPTION_DELETED" || e.event === "SUBSCRIPTION_INACTIVATED") return { tipo: "cancelou" };
  return { tipo: "nada" };
}

/** Id da assinatura do Asaas a que o aviso se refere. */
export const assinaturaDoEvento = (e: EventoAsaas) => e.payment?.subscription ?? e.subscription?.id ?? null;
