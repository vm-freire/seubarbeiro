/**
 * Regras da assinatura (mensalidade da barbearia).
 *
 * `assinaturaLiberada` espelha a função `barbearia_liberada` do banco
 * (migração 001), só para mostrar avisos. Quem bloqueia de verdade é o banco.
 *
 * - Barbearia nova: 7 dias de teste grátis (migração 007), sem cartão.
 * - Barbearias criadas antes da cobrança: plano "cortesia", grátis sempre.
 * - Venceu: mais 3 dias de tolerância, depois bloqueia (não agenda, não
 *   edita). NADA é apagado por falta de pagamento: pagou, volta tudo.
 * - Quem muda status/vencimento é o aviso do Asaas (webhook), nunca o dono.
 */
import type { Barbearia } from "./tipos.ts";

export const TOLERANCIA_DIAS = 3;
export const VALOR_MENSAL = 70;
export const DIAS_TESTE = 7;

type Situacao = Pick<Barbearia, "plano" | "assinatura_status" | "assinatura_valida_ate">;

export function assinaturaLiberada(
  b: Pick<Barbearia, "assinatura_status" | "assinatura_valida_ate">,
  hoje = new Date().toISOString().slice(0, 10)
) {
  const limite = b.assinatura_valida_ate ? somarDias(b.assinatura_valida_ate, TOLERANCIA_DIAS) : null;
  if (b.assinatura_status === "teste" || b.assinatura_status === "ativa") return !limite || limite >= hoje;
  if (b.assinatura_status === "atrasada") return !!limite && limite >= hoje;
  return false;
}

/** Grátis para sempre (barbearias de antes da cobrança). */
export const ehCortesia = (b: Situacao) => b.plano === "cortesia" || (b.assinatura_status === "teste" && !b.assinatura_valida_ate);

export function somarDias(data: string, dias: number) {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Mesmo dia do mês seguinte (31/01 → 28/02 ou 29/02; 31/03 → 30/04). */
export function somarMes(data: string) {
  const [a, m, d] = data.split("-").map(Number);
  const ultimoDia = new Date(Date.UTC(a, m + 1, 0)).getUTCDate();
  const r = new Date(Date.UTC(a, m, Math.min(d, ultimoDia)));
  return r.toISOString().slice(0, 10);
}

/** Dias inteiros de `de` até `ate` (negativo se já passou). */
export function diasAte(ate: string, de = new Date().toISOString().slice(0, 10)) {
  return Math.round((Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / 86_400_000);
}

export const ROTULO_ASSINATURA: Record<Barbearia["assinatura_status"], string> = {
  teste: "Teste grátis",
  ativa: "Assinatura ativa",
  atrasada: "Pagamento atrasado",
  suspensa: "Assinatura suspensa",
  cancelada: "Assinatura cancelada",
};

export function rotuloAssinatura(b: Situacao) {
  return ehCortesia(b) ? "Cortesia (grátis)" : ROTULO_ASSINATURA[b.assinatura_status];
}

/**
 * Faixa de aviso no topo do painel (só para o dono).
 * null = nada a avisar (cortesia, ou assinatura em dia).
 */
export function avisoAssinatura(b: Situacao, hoje = new Date().toISOString().slice(0, 10)) {
  if (ehCortesia(b)) return null;
  const liberada = assinaturaLiberada(b, hoje);
  const vence = b.assinatura_valida_ate;
  if (!liberada) {
    return { tom: "vermelho" as const, texto: "Assinatura vencida: os clientes não conseguem agendar e as edições estão bloqueadas. Seus dados continuam guardados. Assine para voltar ao normal." };
  }
  if (b.assinatura_status === "atrasada") {
    return { tom: "vermelho" as const, texto: "Pagamento atrasado. Pague para não bloquear a agenda." };
  }
  if (b.assinatura_status === "teste" && vence) {
    const dias = diasAte(vence, hoje);
    const texto =
      dias > 1 ? `Seu teste grátis termina em ${dias} dias.` : dias === 1 ? "Seu teste grátis termina amanhã." : dias === 0 ? "Seu teste grátis termina hoje." : "Seu teste grátis terminou.";
    return { tom: dias <= 2 ? ("amarelo" as const) : ("neutro" as const), texto: `${texto} Para continuar: R$ ${VALOR_MENSAL}/mês no Pix, boleto ou cartão.` };
  }
  return null;
}
