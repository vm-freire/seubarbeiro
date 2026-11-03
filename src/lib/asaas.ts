import "server-only";

/**
 * Conversa com a API do Asaas (cobrança da mensalidade). Só no servidor:
 * a chave ASAAS_API_KEY nunca vai para o navegador.
 *
 * ASAAS_AMBIENTE = "producao" usa a conta real; qualquer outro valor (ou
 * vazio) usa o sandbox, onde nada é cobrado de verdade.
 * O cartão é digitado na página do próprio Asaas (fatura): o site nunca
 * vê os dados do cartão.
 */

export type FormaAsaas = "PIX" | "BOLETO" | "CREDIT_CARD";

export type CobrancaAsaas = {
  id: string;
  status: string; // PENDING, RECEIVED, CONFIRMED, OVERDUE, REFUNDED...
  dueDate: string;
  value: number;
  billingType: string;
  invoiceUrl: string;
  bankSlipUrl?: string | null;
  paymentDate?: string | null;
};

export const FORMAS: Record<FormaAsaas, string> = { PIX: "Pix", BOLETO: "Boleto", CREDIT_CARD: "Cartão de crédito" };

export const asaasConfigurado = () => !!process.env.ASAAS_API_KEY && !!process.env.SUPABASE_SERVICE_ROLE_KEY;

const base = () => (process.env.ASAAS_AMBIENTE === "producao" ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3");

async function chamar<T>(caminho: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const r = await fetch(base() + caminho, {
    method: init.method ?? "GET",
    headers: {
      access_token: process.env.ASAAS_API_KEY ?? "",
      "Content-Type": "application/json",
      "User-Agent": "SeuBarbeiro",
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const j = (await r.json().catch(() => null)) as { errors?: { description?: string }[] } | null;
  if (!r.ok) throw new Error(j?.errors?.[0]?.description ?? `O Asaas respondeu com erro (${r.status}).`);
  return j as T;
}

export function criarCliente(c: { name: string; cpfCnpj: string; email: string; externalReference: string }) {
  return chamar<{ id: string }>("/customers", { method: "POST", body: { ...c, notificationDisabled: false } });
}

export function criarAssinatura(a: { customer: string; billingType: FormaAsaas; value: number; nextDueDate: string; description: string; externalReference: string }) {
  return chamar<{ id: string }>("/subscriptions", { method: "POST", body: { ...a, cycle: "MONTHLY" } });
}

/** Troca a forma de pagamento (vale também para a cobrança que já está em aberto). */
export function mudarForma(assinatura: string, billingType: FormaAsaas) {
  return chamar<{ id: string }>(`/subscriptions/${assinatura}`, { method: "PUT", body: { billingType, updatePendingPayments: true } });
}

export function cancelarAssinatura(assinatura: string) {
  return chamar<{ deleted: boolean }>(`/subscriptions/${assinatura}`, { method: "DELETE" });
}

export async function cobrancasDaAssinatura(assinatura: string) {
  const r = await chamar<{ data: CobrancaAsaas[] }>(`/subscriptions/${assinatura}/payments?limit=24`);
  return [...r.data].sort((a, b) => b.dueDate.localeCompare(a.dueDate));
}

export function pixDaCobranca(cobranca: string) {
  return chamar<{ encodedImage: string; payload: string; expirationDate?: string }>(`/payments/${cobranca}/pixQrCode`);
}

export function linhaDigitavel(cobranca: string) {
  return chamar<{ identificationField: string }>(`/payments/${cobranca}/identificationField`);
}

export const PAGA = new Set(["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"]);
export const EM_ABERTO = new Set(["PENDING", "OVERDUE"]);
