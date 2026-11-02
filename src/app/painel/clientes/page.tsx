import Link from "next/link";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { FormularioAcao } from "@/components/FormularioAcao";
import { exigirBarbearia } from "@/lib/painel";
import { linkWhats, telefoneBonito } from "@/lib/whatsapp";
import { salvarCliente } from "../acoes";

export const metadata = { title: "Clientes" };

type Linha = { id: string; nome: string; telefone: string | null; user_id: string | null; agendamentos: { count: number }[] };

export default async function Page({ searchParams }: PageProps<"/painel/clientes">) {
  const { q } = await searchParams;
  const busca = typeof q === "string" ? q.trim() : "";
  const { supabase, barbearia } = await exigirBarbearia();

  let consulta = supabase
    .from("clientes")
    .select("id, nome, telefone, user_id, agendamentos(count)")
    .eq("barbearia_id", barbearia.id)
    .order("nome")
    .limit(200);
  if (busca) {
    const limpo = busca.replace(/[%,()]/g, " ");
    const digitos = busca.replace(/\D/g, "");
    consulta = digitos.length >= 4 ? consulta.or(`nome.ilike.%${limpo}%,telefone.ilike.%${digitos}%`) : consulta.ilike("nome", `%${limpo}%`);
  }
  const { data } = await consulta;
  const clientes = (data ?? []) as unknown as Linha[];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section>
        <h1 className="titulo mb-4">Clientes</h1>
        <form className="mb-4 flex gap-2" role="search">
          <input name="q" defaultValue={busca} placeholder="Buscar por nome ou telefone" className="campo" aria-label="Buscar cliente" />
          <button className="btn">Buscar</button>
        </form>
        {clientes.length === 0 ? (
          <p className="text-sm text-suave">{busca ? "Nenhum cliente encontrado." : "Os clientes aparecem aqui quando agendam ou quando você cadastra."}</p>
        ) : (
          <ul className="divide-y divide-borda rounded-xl border border-borda bg-superficie">
            {clientes.map((c) => {
              const w = linkWhats(c.telefone);
              return (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                  <Link href={`/painel/clientes/${c.id}`} className="min-w-0 flex-1">
                    <span className="block font-medium hover:underline">{c.nome}</span>
                    <span className="block text-xs text-suave">
                      {c.telefone ? telefoneBonito(c.telefone) : "sem telefone"} · {c.agendamentos?.[0]?.count ?? 0} horário(s)
                      {c.user_id ? " · tem conta no site" : ""}
                    </span>
                  </Link>
                  <span className="flex gap-2">
                    {w && <a href={w} target="_blank" rel="noopener noreferrer" className="btn btn-pequeno">WhatsApp</a>}
                    <Link href={`/painel/agenda?cliente=${c.id}#novo`} className="btn btn-pequeno">Agendar</Link>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <aside className="cartao h-fit">
        <h2 className="subtitulo mb-3">Cadastrar cliente</h2>
        <FormularioAcao acao={salvarCliente} limparAoSalvar className="space-y-3">
          <input name="nome" required placeholder="Nome" className="campo" aria-label="Nome" />
          <input name="telefone" type="tel" inputMode="tel" placeholder="WhatsApp" className="campo" aria-label="WhatsApp" />
          <textarea name="observacoes" placeholder="Observações (ex.: gosta do pezinho baixo)" rows={2} className="campo py-2" aria-label="Observações" />
          <BotaoEnviar className="btn-primario w-full">Cadastrar</BotaoEnviar>
        </FormularioAcao>
      </aside>
    </div>
  );
}
