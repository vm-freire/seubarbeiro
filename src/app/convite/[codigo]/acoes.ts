"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_BARBEARIA } from "@/lib/painel";
import { traduzirErro } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import type { ResultadoAcao } from "@/lib/tipos";

export async function aceitarConvite(_: ResultadoAcao, d: FormData): Promise<ResultadoAcao> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("aceitar_convite", {
    p_codigo: String(d.get("codigo") ?? ""),
    p_nome: String(d.get("nome") ?? "").trim(),
    p_titulo: String(d.get("titulo") ?? ""),
  });
  if (error) return { erro: traduzirErro(error) };
  (await cookies()).set(COOKIE_BARBEARIA, String(data), { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  redirect("/painel/perfil?bemvindo=1");
}
