import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { BotaoTema } from "@/components/BotaoTema";
import { Logo, LogoMarca } from "@/components/Logo";
import { SinoAvisos } from "@/components/SinoAvisos";
import { assinaturaLiberada, avisoAssinatura } from "@/lib/assinatura";
import { contextoPainel, filtroEquipe } from "@/lib/painel";
import { sair } from "@/app/(conta)/acoes";
import { CriarBarbearia } from "./CriarBarbearia";
import { escolherBarbearia } from "./acoes";
import { MenuPainel } from "./MenuPainel";

export const metadata: Metadata = { title: { default: "Painel", template: "%s · Painel" }, robots: { index: false } };

export default async function Layout({ children }: LayoutProps<"/painel">) {
  const { atual, barbearias, meuProfissional, user, supabase } = await contextoPainel();

  // conta de cliente não usa o painel (se a coluna ainda não existir, não bloqueia)
  const { data: perfil } = await supabase.from("perfis").select("tipo").eq("id", user.id).maybeSingle();
  if (perfil?.tipo === "cliente") redirect("/meus-agendamentos?aviso=cliente");

  if (!atual) {
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-10">
        <Link href="/" className="entrar mb-8 inline-block"><Logo animado /></Link>
        <h1 className="titulo entrar mb-1 text-4xl">Criar sua barbearia</h1>
        <p className="mb-6 text-sm text-suave">Depois você ajusta serviços, preços e horários. Já deixamos um exemplo pronto.</p>
        <CriarBarbearia />
        <p className="mt-8 text-center text-sm text-suave">Recebeu um convite de uma barbearia? Abra o link do convite.</p>
      </main>
    );
  }

  const b = atual.barbearia;
  const dono = atual.papel === "dono";
  const liberada = assinaturaLiberada(b);
  const aviso = dono ? avisoAssinatura(b) : null;
  const { soDe } = await filtroEquipe(dono, meuProfissional);
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
            <SinoAvisos barbeariaId={b.id} userId={user.id} dono={dono} fuso={b.fuso} soDe={soDe} />
            <BotaoTema />
            <Link href={`/b/${b.slug}`} target="_blank" className="btn btn-pequeno hidden sm:inline-flex">Ver página</Link>
            <form action={sair}>
              <button className="btn btn-pequeno">Sair</button>
            </form>
          </div>
        </div>
        <MenuPainel dono={dono} />
      </header>

      {aviso && (
        <div className={`aviso mx-auto mt-4 flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 ${aviso.tom === "vermelho" ? "selo-vermelho" : aviso.tom === "amarelo" ? "selo-amarelo" : "selo-cinza"}`}>
          <span>{aviso.texto}</span>
          <Link href="/painel/assinatura" className="btn-primario btn-pequeno">{liberada ? "Assinar" : "Assinar agora"}</Link>
        </div>
      )}
      {!dono && !liberada && (
        <p className="aviso selo-vermelho mx-auto mt-4 block w-full max-w-6xl">
          A agenda da barbearia está pausada: os clientes não conseguem agendar e as edições estão bloqueadas. Fale com o dono.
        </p>
      )}
      {!dono && !meuProfissional && (
        <p className="aviso selo-amarelo mx-auto mt-4 block w-full max-w-6xl">Seu cadastro de profissional não foi encontrado. Fale com o dono da barbearia.</p>
      )}

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
