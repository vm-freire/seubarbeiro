import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { sair } from "@/app/(conta)/acoes";
import { BotaoTema } from "./BotaoTema";
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
  // cliente vê "Meus horários"; barbeiro vê "Painel" (contas separadas)
  const { data: perfil } = user ? await supabase.from("perfis").select("tipo").eq("id", user.id).maybeSingle() : { data: null };
  const profissional = perfil?.tipo === "profissional" || (!!user && !perfil);

  return (
    <header className="nao-imprimir cabecalho-rolagem sticky top-0 z-40 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href={link} aria-label="Início" className="min-w-0">
          <Logo animado tamanho={38} barbearia={barbearia} />
        </Link>
        <nav className="flex shrink-0 items-center gap-2">
          <BotaoTema />
          {user ? (
            <>
              {profissional ? (
                <Link href="/painel" className="btn btn-pequeno">Painel</Link>
              ) : (
                <Link href="/meus-agendamentos" className="btn btn-pequeno">Meus horários</Link>
              )}
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
