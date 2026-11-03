import { timingSafeEqual } from "node:crypto";
import { assinaturaDoEvento, efeitoDoEvento, type EventoAsaas } from "@/lib/asaasEventos";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Avisos do Asaas (pagou, venceu, assinatura cancelada...).
 * Configure no Asaas: Integrações → Webhooks → URL
 * https://<site>/api/asaas/webhook, com o mesmo token de ASAAS_WEBHOOK_TOKEN.
 *
 * O Asaas pode mandar o mesmo aviso mais de uma vez: cada id é guardado em
 * asaas_eventos e só é processado na primeira. Responder 200 = "recebido";
 * qualquer outro código faz o Asaas tentar de novo depois.
 * Nada é apagado da barbearia aqui: só muda status e vencimento.
 */
function tokenConfere(recebido: string | null) {
  const certo = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!certo || !recebido) return false;
  const a = Buffer.from(recebido);
  const b = Buffer.from(certo);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!tokenConfere(request.headers.get("asaas-access-token"))) {
    return Response.json({ erro: "não autorizado" }, { status: 401 });
  }
  const evento = (await request.json().catch(() => null)) as EventoAsaas | null;
  if (!evento?.id || !evento.event) return Response.json({ erro: "aviso inválido" }, { status: 400 });

  const db = supabaseAdmin();
  const assinatura = assinaturaDoEvento(evento);

  const { error: repetido } = await db.from("asaas_eventos").insert({
    id: evento.id,
    tipo: evento.event,
    cobranca: evento.payment?.id ?? null,
    assinatura,
    dados: evento,
  });
  if (repetido) {
    // 23505 = já recebido antes: tudo certo, não processa de novo
    if (repetido.code === "23505") return Response.json({ ok: true, repetido: true });
    return Response.json({ erro: "falha ao registrar" }, { status: 500 });
  }

  try {
    if (!assinatura) return Response.json({ ok: true, ignorado: true });
    const { data: ass } = await db.from("assinaturas").select("barbearia_id").eq("asaas_assinatura", assinatura).maybeSingle();
    if (!ass) return Response.json({ ok: true, ignorado: true });

    const { data: b, error } = await db
      .from("barbearias")
      .select("assinatura_status, assinatura_valida_ate")
      .eq("id", ass.barbearia_id)
      .single();
    if (error || !b) throw error ?? new Error("barbearia não encontrada");

    const efeito = efeitoDoEvento(evento, b);
    if (efeito.tipo === "barbearia") {
      const mudanca = { assinatura_status: efeito.assinatura_status, assinatura_valida_ate: efeito.assinatura_valida_ate, ...(efeito.plano ? { plano: efeito.plano } : {}) };
      const { error: e2 } = await db.from("barbearias").update(mudanca).eq("id", ass.barbearia_id);
      if (e2) throw e2;
    } else if (efeito.tipo === "cancelou") {
      const { error: e3 } = await db
        .from("assinaturas")
        .update({ situacao: "cancelada", atualizado_em: new Date().toISOString() })
        .eq("asaas_assinatura", assinatura);
      if (e3) throw e3;
    }
    return Response.json({ ok: true });
  } catch (e) {
    // não processou: tira o registro para o Asaas mandar de novo e tentarmos outra vez
    await db.from("asaas_eventos").delete().eq("id", evento.id);
    console.error("webhook asaas", e);
    return Response.json({ erro: "falha ao processar" }, { status: 500 });
  }
}
