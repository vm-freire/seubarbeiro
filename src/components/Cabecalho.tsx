import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { sair } from "@/app/(conta)/acoes";
import { Logo } from "./Logo";

/**
 * Cabeçalho público. Fixo no topo; ganha fundo ao rolar (animação ligada à
 * rolagem, sem JavaScript). Com `barbearia`, mostra o nome dela + "por Seu Barbeiro".
 */
export async function Cabecalho({ barbearia, link = "/" }: { barbearia?: string; link?: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="nao-imprimir cabecalho-rolagem sticky top-0 z-40 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href={link} aria-label="Início" className="min-w-0">
          <Logo animado tamanho={38} barbearia={barbearia} />
        </Link>
        <nav className="flex shrink-0 items-center gap-2">
          {user ? (
            <>
              <Link href="/meus-agendamentos" className="btn btn-pequeno hidden sm:inline-flex">Meus horários</Link>
              <Link href="/painel" className="btn btn-pequeno">Painel</Link>
              <form action={sair}>
                <button className="btn btn-pequeno">Sair</button>
              </form>
            </>
          ) : (
            <Link href="/entrar" className="btn btn-pequeno">Entrar</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
