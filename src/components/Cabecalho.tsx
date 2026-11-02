import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { sair } from "@/app/(conta)/acoes";

export async function Cabecalho() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="nao-imprimir border-b border-borda bg-superficie">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="font-bold tracking-tight">
          ✂ Agenda de Barbearia
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          {user ? (
            <>
              <Link href="/meus-agendamentos" className="btn btn-pequeno">
                Meus horários
              </Link>
              <Link href="/painel" className="btn btn-pequeno">
                Painel
              </Link>
              <form action={sair}>
                <button className="btn btn-pequeno">Sair</button>
              </form>
            </>
          ) : (
            <Link href="/entrar" className="btn btn-pequeno">
              Entrar
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
