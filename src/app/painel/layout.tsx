import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { Logo, LogoMarca } from "@/components/Logo";
import { assinaturaLiberada, ROTULO_ASSINATURA } from "@/lib/assinatura";
import { contextoPainel } from "@/lib/painel";
import { sair } from "@/app/(conta)/acoes";
import { CriarBarbearia } from "./CriarBarbearia";
import { escolherBarbearia } from "./acoes";
import { MenuPainel } from "./MenuPainel";

export const metadata: Metadata = { title: { default: "Painel", template: "%s · Painel" }, robots: { index: false } };

export default async function Layout({ children }: LayoutProps<"/painel">) {
  const { atual, barbearias, meuProfissional, user } = await contextoPainel();

  if (!atual) {
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-10">
        <Link href="/" className="entrar mb-8 inline-block"><Logo animado /></Link>
        <h1 className="titulo entrar mb-1 text-4xl">Criar sua barbearia</h1>
        <p className="mb-6 text-sm text-suave">Depois você ajusta serviços, preços e horários. Já deixamos um exemplo pronto.</p>
        <CriarBarbearia />
        <p className="mt-8 text-center text-sm text-suave">
          Recebeu um convite de uma barbearia? Abra o link do convite.{" "}
          <br />É cliente? <Link href="/meus-agendamentos" className="underline">Ver meus horários</Link>
        </p>
      </main>
    );
  }

  const b = atual.barbearia;
  const dono = atual.papel === "dono";
  const liberada = assinaturaLiberada(b);
  const nomeUsuario = meuProfissional?.nome ?? user.email ?? "";

  return (
    <div className="flex flex-1 flex-col">
      <header className="nao-imprimir sticky top-0 z-40 border-b border-borda bg-superficie/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <Link href="/painel" aria-label="Início do painel"><LogoMarca tamanho={34} animado /></Link>
            {barbearias.length > 1 ? (
              <form action={escolherBarbearia} className="flex items-center gap-2">
                <select name="id" defaultValue={b.id} className="campo min-h-9 w-auto py-1 text-sm" aria-label="Barbearia">
                  {barbearias.map((x) => (
                    <option key={x.id} value={x.id}>{x.nome}</option>
                  ))}
                </select>
                <button className="btn btn-pequeno">Trocar</button>
              </form>
            ) : (
              <span className="flex min-w-0 flex-col leading-none">
                <span className="truncate font-titulo text-xl font-extrabold uppercase">{b.nome}</span>
                <span className="text-[0.6rem] font-semibold tracking-[0.2em] text-suave uppercase">Seu Barbeiro · {dono ? "Dono" : "Barbeiro"}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link href="/painel/perfil" className="flex items-center gap-2 rounded-full pr-2 hover:bg-superficie-2" title="Meu perfil">
              <Avatar nome={nomeUsuario} foto={meuProfissional?.foto_url} tamanho={32} />
              <span className="hidden text-sm font-semibold sm:inline">{nomeUsuario.split(" ")[0]}</span>
            </Link>
            <Link href={`/b/${b.slug}`} target="_blank" className="btn btn-pequeno hidden sm:inline-flex">Ver página</Link>
            <form action={sair}>
              <button className="btn btn-pequeno">Sair</button>
            </form>
          </div>
        </div>
        <MenuPainel dono={dono} />
      </header>

      {!liberada && (
        <p className="aviso selo-vermelho mx-auto mt-4 block w-full max-w-6xl">
          {ROTULO_ASSINATURA[b.assinatura_status]}: os clientes não conseguem agendar e as edições estão bloqueadas. Regularize para voltar ao normal.
        </p>
      )}
      {!dono && !meuProfissional && (
        <p className="aviso selo-amarelo mx-auto mt-4 block w-full max-w-6xl">Seu cadastro de profissional não foi encontrado. Fale com o dono da barbearia.</p>
      )}

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
