/**
 * Espelha a função `barbearia_liberada` do banco (migração 001), só para
 * mostrar avisos. Quem bloqueia de verdade é o banco.
 *
 * Por enquanto toda barbearia nasce em "teste", sem vencimento (grátis).
 * Quando a cobrança entrar, basta preencher `assinatura_valida_ate` e
 * mudar o status para "ativa"/"atrasada"/"suspensa".
 */
import type { Barbearia } from "./tipos.ts";

export const TOLERANCIA_DIAS = 3;

export function assinaturaLiberada(
  b: Pick<Barbearia, "assinatura_status" | "assinatura_valida_ate">,
  hoje = new Date().toISOString().slice(0, 10)
) {
  const limite = b.assinatura_valida_ate ? somar(b.assinatura_valida_ate, TOLERANCIA_DIAS) : null;
  if (b.assinatura_status === "teste" || b.assinatura_status === "ativa") return !limite || limite >= hoje;
  if (b.assinatura_status === "atrasada") return !!limite && limite >= hoje;
  return false;
}

function somar(data: string, dias: number) {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export const ROTULO_ASSINATURA: Record<Barbearia["assinatura_status"], string> = {
  teste: "Período de testes (grátis)",
  ativa: "Assinatura ativa",
  atrasada: "Pagamento atrasado",
  suspensa: "Assinatura suspensa",
  cancelada: "Assinatura cancelada",
};
