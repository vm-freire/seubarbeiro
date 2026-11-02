import Link from "next/link";
import { notFound } from "next/navigation";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { FormularioAcao } from "@/components/FormularioAcao";
import { SELECT_AGENDAMENTO } from "@/lib/consultasPainel";
import { moeda } from "@/lib/formatar";
import { exigirBarbearia } from "@/lib/painel";
import type { AgendamentoCompleto, Cliente, Servico } from "@/lib/tipos";
import { linkWhats, telefoneBonito } from "@/lib/whatsapp";
import { salvarCliente } from "../../acoes";
import { CartaoAgendamento } from "../../componentes/CartaoAgendamento";

export const metadata = { title: "Cliente" };

export default async function Page({ params }: PageProps<"/painel/clientes/[id]">) {
  const { id } = await params;
  const { supabase, barbearia } = await exigirBarbearia();
  const { data: c } = await supabase.from("clientes").select("*").eq("id", id).eq("barbearia_id", barbearia.id).maybeSingle<Cliente>();
  if (!c) notFound();

  const [{ data: ag }, { data: sv }] = await Promise.all([
    supabase.from("agendamentos").select(SELECT_AGENDAMENTO).eq("cliente_id", id).order("inicio", { ascending: false }).limit(30),
    supabase.from("servicos").select("*").eq("barbearia_id", barbearia.id),
  ]);
  const historico = (ag ?? []) as AgendamentoCompleto[];
  const concluidos = historico.filter((a) => a.status === "concluido");
  const gasto = concluidos.reduce((t, a) => t + a.agendamento_itens.reduce((x, i) => x + Number(i.preco_cobrado), 0), 0);
  const faltas = historico.filter((a) => a.status === "faltou").length;
  const w = linkWhats(c.telefone);

  return (
    <div className="space-y-6">
      <Link href="/painel/clientes" className="text-sm text-suave underline">← Clientes</Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="titulo">{c.nome}</h1>
          <p className="text-sm text-suave">
            {c.telefone ? telefoneBonito(c.telefone) : "sem telefone"}
            {c.email ? ` · ${c.email}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {w && <a href={w} target="_blank" rel="noopener noreferrer" className="btn">WhatsApp</a>}
          <Link href={`/painel/agenda?cliente=${c.id}#novo`} className="btn-primario">Agendar</Link>
        </div>
      </div>

      <section className="grid grid-cols-3 gap-3">
        <div className="cartao"><p className="text-xs text-suave">Atendimentos</p><p className="text-xl font-bold">{concluidos.length}</p></div>
        <div className="cartao"><p className="text-xs text-suave">Já gastou</p><p className="text-xl font-bold">{moeda(gasto)}</p></div>
        <div className={`cartao ${faltas ? "selo-vermelho" : ""}`}><p className="text-xs">Faltas</p><p className="text-xl font-bold">{faltas}</p></div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section>
          <h2 className="subtitulo mb-3">Histórico</h2>
          {historico.length === 0 ? (
            <p className="text-sm text-suave">Nenhum horário ainda.</p>
          ) : (
            <ul className="space-y-3">
              {historico.map((a) => (
                <CartaoAgendamento key={a.id} a={a} barbearia={barbearia} servicos={(sv ?? []) as Servico[]} mostrarProfissional={false} mostrarData />
              ))}
            </ul>
          )}
        </section>
        <aside className="cartao h-fit">
          <h2 className="subtitulo mb-3">Dados</h2>
          <FormularioAcao acao={salvarCliente} className="space-y-3">
            <input type="hidden" name="id" value={c.id} />
            <input name="nome" defaultValue={c.nome} required className="campo" aria-label="Nome" />
            <input name="telefone" defaultValue={c.telefone ?? ""} type="tel" className="campo" aria-label="WhatsApp" />
            <textarea name="observacoes" defaultValue={c.observacoes ?? ""} rows={3} className="campo py-2" aria-label="Observações" placeholder="Observações" />
            <BotaoEnviar className="btn w-full">Salvar</BotaoEnviar>
          </FormularioAcao>
        </aside>
      </div>
    </div>
  );
}
