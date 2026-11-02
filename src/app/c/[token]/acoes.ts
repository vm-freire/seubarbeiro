"use server";

import { revalidatePath } from "next/cache";
import { traduzirErro } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import type { ResultadoAcao } from "@/lib/tipos";

export async function responder(_: ResultadoAcao, dados: FormData): Promise<ResultadoAcao> {
  const token = String(dados.get("token") ?? "");
  const vai = dados.get("vai") === "sim";
  const supabase = await createClient();
  const { error } = await supabase.rpc("confirmacao_responder", { p_token: token, p_vai: vai });
  if (error) return { erro: traduzirErro(error) };
  revalidatePath(`/c/${token}`);
  return { ok: vai ? "Confirmado. Até lá!" : "Horário liberado. Obrigado por avisar!" };
}
