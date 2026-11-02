"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function cancelarMeu(dados: FormData) {
  const supabase = await createClient();
  await supabase.rpc("cancelar_agendamento_cliente", { p_agendamento: String(dados.get("id")) });
  revalidatePath("/meus-agendamentos");
}
