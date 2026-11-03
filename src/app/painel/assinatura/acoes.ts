"use server";

/**
 * Assinar, trocar a forma de pagamento e cancelar a mensalidade.
 * Só o dono. A gravação usa a chave de serviço (o dono não pode mudar a
 * própria assinatura direto no banco) e funciona mesmo com a barbearia
 * bloqueada, para ela conseguir voltar.
 */
import { revalidatePath } from "next/cache";
import { asaasConfigurado, cancelarAssinatura, criarAssinatura, criarCliente, FORMAS, mudarForma, type FormaAsaas } from "@/lib/asaas";
import { ehCortesia, VALOR_MENSAL } from "@/lib/assinatura";
import { exigirDono } from "@/lib/painel";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { hojeLocal } from "@/lib/tempo";
import type { ResultadoAcao } from "@/lib/tipos";

const txt = (d: FormData, k: string) => String(d.get(k) ?? "").trim();
const formaValida = (v: string): v is FormaAsaas => v in FORMAS;
const erroDe = (e: unknown, padrao: string) => (e instanceof Error && e.message ? e.message : padrao);

export async function assinar(_: ResultadoAcao, d: FormData): Promise<ResultadoAcao> {
  const { barbearia: b, user } = await exigirDono();
  if (!asaasConfigurado()) return { erro: "O pagamento ainda não está disponível. Tente mais tarde." };
  if (ehCortesia(b)) return { erro: "Sua barbearia é cortesia: não precisa pagar." };

  const nome = txt(d, "nome");
  const documento = txt(d, "documento").replace(/\D/g, "");
  const email = txt(d, "email") || user.email || "";
  const forma = txt(d, "forma");
  if (nome.length < 3) return { erro: "Informe o nome completo (ou a razão social)." };
  if (documento.length !== 11 && documento.length !== 14) return { erro: "CPF (11 números) ou CNPJ (14 números) inválido." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { erro: "Informe um e-mail válido para receber as cobranças." };
  if (!formaValida(forma)) return { erro: "Escolha Pix, boleto ou cartão." };

  const db = supabaseAdmin();
  const { data: atual } = await db.from("assinaturas").select("asaas_cliente, situacao").eq("barbearia_id", b.id).maybeSingle();
  if (atual?.situacao === "ativa") return { erro: "Sua barbearia já tem assinatura. Recarregue a página." };

  // primeira cobrança: no fim do teste (ou do período pago); se já venceu, hoje
  const hoje = hojeLocal(b.fuso);
  const vencimento = b.assinatura_valida_ate && b.assinatura_valida_ate > hoje ? b.assinatura_valida_ate : hoje;

  try {
    const cliente = atual?.asaas_cliente ?? (await criarCliente({ name: nome, cpfCnpj: documento, email, externalReference: b.id })).id;
    const ass = await criarAssinatura({
      customer: cliente,
      billingType: forma,
      value: VALOR_MENSAL,
      nextDueDate: vencimento,
      description: `Seu Barbeiro: mensalidade de ${b.nome}`,
      externalReference: b.id,
    });
    const { error } = await db.from("assinaturas").upsert({
      barbearia_id: b.id,
      asaas_cliente: cliente,
      asaas_assinatura: ass.id,
      forma,
      valor: VALOR_MENSAL,
      situacao: "ativa",
      atualizado_em: new Date().toISOString(),
    });
    if (error) throw new Error("Assinatura criada no Asaas, mas não foi salva aqui. Fale com o suporte antes de tentar de novo.");
  } catch (e) {
    return { erro: erroDe(e, "Não foi possível criar a assinatura. Tente de novo.") };
  }
  revalidatePath("/painel", "layout");
  return { ok: "Assinatura criada! A cobrança aparece logo abaixo." };
}

export async function trocarForma(_: ResultadoAcao, d: FormData): Promise<ResultadoAcao> {
  const { barbearia: b } = await exigirDono();
  const forma = txt(d, "forma");
  if (!formaValida(forma)) return { erro: "Escolha Pix, boleto ou cartão." };
  const db = supabaseAdmin();
  const { data: atual } = await db.from("assinaturas").select("asaas_assinatura, situacao").eq("barbearia_id", b.id).maybeSingle();
  if (!atual?.asaas_assinatura || atual.situacao !== "ativa") return { erro: "Nenhuma assinatura ativa." };
  try {
    await mudarForma(atual.asaas_assinatura, forma);
    await db.from("assinaturas").update({ forma, atualizado_em: new Date().toISOString() }).eq("barbearia_id", b.id);
  } catch (e) {
    return { erro: erroDe(e, "Não foi possível trocar a forma de pagamento.") };
  }
  revalidatePath("/painel/assinatura");
  return { ok: `Pronto: agora a cobrança é por ${FORMAS[forma]}.` };
}

export async function cancelar(): Promise<ResultadoAcao> {
  const { barbearia: b } = await exigirDono();
  const db = supabaseAdmin();
  const { data: atual } = await db.from("assinaturas").select("asaas_assinatura, situacao").eq("barbearia_id", b.id).maybeSingle();
  if (!atual?.asaas_assinatura || atual.situacao !== "ativa") return { erro: "Nenhuma assinatura ativa." };
  try {
    await cancelarAssinatura(atual.asaas_assinatura);
    await db.from("assinaturas").update({ situacao: "cancelada", atualizado_em: new Date().toISOString() }).eq("barbearia_id", b.id);
  } catch (e) {
    return { erro: erroDe(e, "Não foi possível cancelar. Tente de novo.") };
  }
  revalidatePath("/painel", "layout");
  return { ok: "Assinatura cancelada. Tudo continua funcionando até o fim do período pago, e seus dados ficam guardados." };
}
