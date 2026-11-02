import type { Metadata } from "next";
import Link from "next/link";
import { assinaturaLiberada, ROTULO_ASSINATURA } from "@/lib/assinatura";
import { contextoPainel } from "@/lib/painel";
import { sair } from "@/app/(conta)/acoes";
import { CriarBarbearia } from "./CriarBarbearia";
import { escolherBarbearia } from "./acoes";
import { MenuPainel } from "./MenuPainel";

export const metadata: Metadata = { title: { default: "Painel", template: "%s · Painel" }, robots: { index: false } };

export default async function Layout({ children }: LayoutProps<"/painel">) {
  const { atual, barbearias } = await contextoPainel();

  if (!atual) {
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-10">
        <h1 className="titulo mb-1">Criar sua barbearia</h1>
        <p className="mb-6 text-sm text-suave">Depois você ajusta serviços, preços e horários. Já deixamos um exemplo pronto.</p>
        <CriarBarbearia />
        <p className="mt-8 text-center text-sm text-suave">
          É cliente? <Link href="/meus-agendamentos" className="underline">Ver meus horários</Link>
        </p>
      </main>
    );
  }

  const b = atual.barbearia;
  const liberada = assinaturaLiberada(b);

  return (
    <div className="flex flex-1 flex-col">
      <header className="nao-imprimir border-b border-borda bg-superficie">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="font-bold">✂</span>
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
              <span className="font-semibold">{b.nome}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/b/${b.slug}`} target="_blank" className="btn btn-pequeno">Ver minha página</Link>
            <form action={sair}>
              <button className="btn btn-pequeno">Sair</button>
            </form>
          </div>
        </div>
        <MenuPainel />
      </header>

      {!liberada && (
        <p className="aviso selo-vermelho mx-auto mt-4 block w-full max-w-6xl">
          {ROTULO_ASSINATURA[b.assinatura_status]}: os clientes não conseguem agendar e as edições estão bloqueadas. Regularize para voltar ao normal.
        </p>
      )}

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
