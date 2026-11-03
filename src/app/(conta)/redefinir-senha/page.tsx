import type { Metadata } from "next";
import Link from "next/link";
import { Cabecalho } from "@/components/Cabecalho";
import { createClient } from "@/lib/supabase/server";
import { FormRedefinir } from "./FormRedefinir";

export const metadata: Metadata = { title: "Criar senha nova", robots: { index: false } };

/** Chega aqui pelo link do e-mail (já conectado pelo /auth/confirmar). */
export default async function Page({ searchParams }: PageProps<"/redefinir-senha">) {
  const { erro } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <Cabecalho />
      <main className="mx-auto w-full max-w-sm flex-1 px-4 py-10">
        <h1 className="titulo mb-2">Criar senha nova</h1>
        {user && !erro ? (
          <>
            <p className="mb-6 text-sm text-suave">Conta: {user.email}. Escolha a senha nova e repita para conferir.</p>
            <FormRedefinir />
          </>
        ) : (
          <div className="space-y-4">
            <p className="aviso selo-vermelho block" role="alert">
              Esse link de recuperação não vale mais (ele expira em 1 hora e só pode ser usado uma vez). Peça outro.
            </p>
            <Link href="/esqueci-senha" className="btn-primario w-full">Pedir outro link</Link>
          </div>
        )}
      </main>
    </>
  );
}
