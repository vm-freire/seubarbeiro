import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { destinoSeguro } from "@/app/(conta)/destino";
import { createClient } from "@/lib/supabase/server";

/**
 * Para onde aponta o link do e-mail de recuperação de senha.
 * Aceita os dois formatos do Supabase:
 *   - ?token_hash=...&type=recovery  (modelo de e-mail recomendado: funciona
 *     mesmo se a pessoa abrir o link em outro navegador/aparelho)
 *   - ?code=...                      (modelo padrão do Supabase)
 * Deu certo: a pessoa fica conectada e vai para `proximo` (criar a senha nova).
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const proximo = destinoSeguro(url.searchParams.get("proximo") ?? url.searchParams.get("next"), "/redefinir-senha");
  const tokenHash = url.searchParams.get("token_hash");
  const tipo = url.searchParams.get("type") as EmailOtpType | null;
  const codigo = url.searchParams.get("code");
  const supabase = await createClient();

  let ok = false;
  if (tokenHash && tipo) {
    ok = !(await supabase.auth.verifyOtp({ type: tipo, token_hash: tokenHash })).error;
  } else if (codigo) {
    ok = !(await supabase.auth.exchangeCodeForSession(codigo)).error;
  }

  const destino = new URL(ok ? proximo : "/redefinir-senha?erro=link", request.url);
  return NextResponse.redirect(destino);
}
