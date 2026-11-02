"use server";

import { revalidatePath } from "next/cache";
import { traduzirErro } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import type { ResultadoAcao } from "@/lib/tipos";

/** Cliente desmarca pelo link do horário (sem precisar entrar na conta). */
export async function desmarcar(_: ResultadoAcao, dados: FormData): Promise<ResultadoAcao> {
  const token = String(dados.get("token") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.rpc("confirmacao_responder", { p_token: token, p_vai: false });
  if (error) return { erro: traduzirErro(error) };
  revalidatePath(`/c/${token}`);
  return { ok: "Horário desmarcado. Obrigado por avisar!" };
}
