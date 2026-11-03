import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente com a chave de serviço: passa por cima do RLS. Só no servidor e
 * só para o que o usuário não pode fazer sozinho (gravar a assinatura e
 * processar os avisos do Asaas). Nunca use em componente de navegador.
 */
export function supabaseAdmin() {
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!chave) throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, chave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
