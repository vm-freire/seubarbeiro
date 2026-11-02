"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { destinoSeguro } from "./destino";

export async function sair(d?: FormData) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // usado no convite: sai da conta de cliente e já abre o cadastro de barbeiro
  const proximo = d instanceof FormData ? String(d.get("proximo") ?? "") : "";
  redirect(destinoSeguro(proximo, "/"));
}
