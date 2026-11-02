import type { Metadata } from "next";
import Link from "next/link";
import { Cabecalho } from "@/components/Cabecalho";
import { SeloStatus } from "@/components/SeloStatus";
import { quando, type Status } from "@/lib/formatar";
import { createClient } from "@/lib/supabase/server";
import { cancelarMeu } from "./acoes";

export const metadata: Metadata = { title: "Meus horários" };

type Linha = {
  id: string;
  inicio: string;
  fim: string;
  status: Status;
  token_confirmacao: string;
  barbearias: { nome: string; slug: string; fuso: string } | null;
  agendamento_itens: { nome: string }[];
};

export default async function Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Só os agendamentos ligados à conta (a regra de acesso do banco já filtra)
  const { data } = await supabase
    .from("agendamentos")
    .select("id, inicio, fim, status, token_confirmacao, barbearias(nome, slug, fuso), agendamento_itens(nome), clientes!inner(user_id)")
    .eq("clientes.user_id", user?.id ?? "")
    .order("inicio", { ascending: false })
    .limit(50);
  const lista = (data ?? []) as unknown as Linha[];
  const agora = new Date();
  const proximos = lista.filter((a) => new Date(a.fim) > agora && a.status !== "cancelado").reverse();
  const anteriores = lista.filter((a) => !proximos.includes(a));

  return (
    <>
      <Cabecalho />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <h1 className="titulo mb-6">Meus horários</h1>

        <h2 className="subtitulo mb-3">Próximos</h2>
        {proximos.length === 0 ? (
          <p className="text-sm text-suave">Nenhum horário marcado.</p>
        ) : (
          <ul className="space-y-3">
            {proximos.map((a) => (
              <li key={a.id} className="cartao flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{a.barbearias?.nome}</p>
                  <p className="text-sm">{quando(a.inicio, a.barbearias?.fuso)} · {a.agendamento_itens.map((i) => i.nome).join(" + ")}</p>
                  <div className="mt-1"><SeloStatus status={a.status} /></div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/c/${a.token_confirmacao}`} className="btn btn-pequeno">Detalhes e rota</Link>
                  <form action={cancelarMeu}>
                    <input type="hidden" name="id" value={a.id} />
                    <button className="btn-perigo btn-pequeno">Cancelar</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}

        {anteriores.length > 0 && (
          <>
            <h2 className="subtitulo mt-10 mb-3">Anteriores</h2>
            <ul className="divide-y divide-borda rounded-xl border border-borda bg-superficie">
              {anteriores.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                  <span>
                    {a.barbearias?.nome} · {quando(a.inicio, a.barbearias?.fuso)}
                  </span>
                  <span className="flex items-center gap-2">
                    <SeloStatus status={a.status} curto />
                    {a.barbearias && (
                      <Link href={`/b/${a.barbearias.slug}/agendar`} className="text-destaque underline">Marcar de novo</Link>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </>
  );
}
