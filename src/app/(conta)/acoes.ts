"use server";

import { redirect } from "next/navigation";
import { emailRecuperacao } from "@/lib/emailRecuperacao";
import { urlSite } from "@/lib/site";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { destinoSeguro } from "./destino";

export async function sair(d?: FormData) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // usado no convite: sai da conta de cliente e já abre o cadastro de barbeiro
  const proximo = d instanceof FormData ? String(d.get("proximo") ?? "") : "";
  redirect(destinoSeguro(proximo, "/"));
}

/**
 * "Esqueci minha senha": o site gera o link de recuperação (Supabase, com a
 * chave de serviço) e manda o e-mail em português pelo Resend.
 * A resposta é sempre a mesma, exista a conta ou não (ninguém descobre
 * quais e-mails estão cadastrados). Sem RESEND_API_KEY, avisa a tela para
 * usar o envio do próprio Supabase.
 */
export async function pedirRecuperacao(email: string): Promise<{ ok?: true; usarSupabase?: true; erro?: string }> {
  const e = email.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(e)) return { erro: "Informe um e-mail válido." };
  if (!process.env.RESEND_API_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) return { usarSupabase: true };

  const { data, error } = await supabaseAdmin().auth.admin.generateLink({ type: "recovery", email: e });
  // conta não existe: responde igual, sem enviar nada
  if (error || !data.properties?.hashed_token) return { ok: true };

  const link = `${baseDoSite()}/auth/confirmar?token_hash=${data.properties.hashed_token}&type=recovery&proximo=/redefinir-senha`;
  const { assunto, texto, html } = emailRecuperacao(link);
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || "Seu Barbeiro <nao-responda@elodocente.com>",
        to: [e],
        subject: assunto,
        text: texto,
        html,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!r.ok) {
      console.error("resend", r.status, await r.text().catch(() => ""));
      return { erro: "Não conseguimos enviar o e-mail agora. Tente de novo em alguns minutos." };
    }
  } catch {
    return { erro: "Não conseguimos enviar o e-mail agora. Tente de novo em alguns minutos." };
  }
  return { ok: true };
}

/** Endereço do site nos links de e-mail: em produção, o domínio principal da Vercel. */
function baseDoSite() {
  if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return urlSite();
}
