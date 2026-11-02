import Link from "next/link";
import { CopiarTexto } from "@/components/CopiarTexto";
import { agendamentosEntre, configuracaoAgenda } from "@/lib/consultasPainel";
import { moeda } from "@/lib/formatar";
import { exigirBarbearia, filtroEquipe } from "@/lib/painel";
import { linkAgendamento } from "@/lib/site";
import { hojeLocal } from "@/lib/tempo";
import { CaixaVerEquipe } from "./componentes/CaixaVerEquipe";
import { CartaoAgendamento } from "./componentes/CartaoAgendamento";

export const metadata = { title: "Hoje" };

export default async function Page() {
  const { supabase, barbearia: b, dono, meuProfissional } = await exigirBarbearia();
  const filtro = await filtroEquipe(dono, meuProfissional);
  const hoje = hojeLocal(b.fuso);
  const [todosHoje, cfg] = await Promise.all([
    agendamentosEntre(supabase, b.id, b.fuso, hoje, hoje),
    configuracaoAgenda(supabase, b.id),
  ]);

  // dono vê só os próprios horários, a não ser que marque "Ver também a equipe"
  const lista = todosHoje.filter((a) => !filtro.soDe || a.profissional_id === filtro.soDe);
  const conta = (s: string) => lista.filter((a) => a.status === s).length;
  const caixa = lista
    .filter((a) => a.status === "concluido")
    .reduce((t, a) => t + a.agendamento_itens.reduce((x, i) => x + Number(i.preco_cobrado), 0), 0);

  const link = linkAgendamento(b.slug);
  // barbeiro só recebe os próprios horários (RLS), então não precisa do nome do profissional
  const multiplos = dono && filtro.verEquipe && cfg.profissionais.filter((p) => p.ativo).length > 1;

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="titulo">Hoje</h1>
          <p className="text-sm text-suave capitalize">
            {new Intl.DateTimeFormat("pt-BR", { timeZone: b.fuso, weekday: "long", day: "numeric", month: "long" }).format(new Date())}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-suave">Seu link:</span>
          <code className="rounded bg-superficie-2 px-2 py-1 text-xs">{link}</code>
          <CopiarTexto texto={link} rotulo="Copiar link" />
          {filtro.podeEscolher && <CaixaVerEquipe key={String(filtro.marcado)} marcado={filtro.marcado} />}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Horários", lista.filter((a) => a.status !== "cancelado").length, ""],
          ["A atender", conta("agendado") + conta("confirmado"), "selo-amarelo"],
          ["Atendidos", conta("concluido"), "selo-azul"],
          ["Caixa do dia", moeda(caixa), ""],
        ].map(([rotulo, valor, cor]) => (
          <div key={rotulo} className={`cartao ${cor}`}>
            <p className="text-xs">{rotulo}</p>
            <p className="text-2xl font-bold">{valor}</p>
          </div>
        ))}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="subtitulo">Agenda de hoje</h2>
          <Link href="/painel/agenda" className="btn btn-pequeno">+ Novo agendamento</Link>
        </div>
        {lista.length === 0 ? (
          <p className="cartao text-sm text-suave">Nenhum horário marcado para hoje.</p>
        ) : (
          <ul className="space-y-3">
            {lista.map((a) => (
              <CartaoAgendamento key={a.id} a={a} barbearia={b} servicos={cfg.servicos} mostrarProfissional={multiplos} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
