import Link from "next/link";
import { CopiarTexto } from "@/components/CopiarTexto";
import { agendamentosEntre, configuracaoAgenda } from "@/lib/consultasPainel";
import { hora, moeda, quando } from "@/lib/formatar";
import { faseLembrete, textoAntecedencia } from "@/lib/lembrete";
import { exigirBarbearia } from "@/lib/painel";
import { linkAgendamento, linkConfirmacao } from "@/lib/site";
import { hojeLocal, somarDias } from "@/lib/tempo";
import { linkWhats, mensagemLembrete } from "@/lib/whatsapp";
import { BotaoWhats } from "./componentes/BotaoWhats";
import { CartaoAgendamento } from "./componentes/CartaoAgendamento";

export const metadata = { title: "Hoje" };

export default async function Page() {
  const { supabase, barbearia: b, dono } = await exigirBarbearia();
  const hoje = hojeLocal(b.fuso);
  const [lista, amanha, cfg] = await Promise.all([
    agendamentosEntre(supabase, b.id, b.fuso, hoje, hoje),
    agendamentosEntre(supabase, b.id, b.fuso, somarDias(hoje, 1), somarDias(hoje, 1)),
    configuracaoAgenda(supabase, b.id),
  ]);

  const agora = new Date().getTime();
  const conta = (s: string) => lista.filter((a) => a.status === s).length;
  const caixa = lista
    .filter((a) => a.status === "concluido")
    .reduce((t, a) => t + a.agendamento_itens.reduce((x, i) => x + Number(i.preco_cobrado), 0), 0);

  // Lembretes: o link "Vou / Não vou" só vale a partir de lembrete_minutos
  // antes do horário. Quem marcou já dentro desse tempo não recebe lembrete.
  const lembretes = [...lista, ...amanha].filter(
    (a) => a.status === "agendado" && !a.lembrete_enviado_em && faseLembrete(a, b.lembrete_minutos, agora) === "aberta"
  );

  const link = linkAgendamento(b.slug);
  // barbeiro só recebe os próprios horários (RLS), então não precisa do nome do profissional
  const multiplos = dono && cfg.profissionais.filter((p) => p.ativo).length > 1;

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
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          ["Horários", lista.filter((a) => a.status !== "cancelado").length, ""],
          ["Confirmados", conta("confirmado"), "selo-verde"],
          ["Aguardando", conta("agendado"), "selo-amarelo"],
          ["Atendidos", conta("concluido"), "selo-azul"],
          ["Caixa do dia", moeda(caixa), ""],
        ].map(([rotulo, valor, cor]) => (
          <div key={rotulo} className={`cartao ${cor}`}>
            <p className="text-xs">{rotulo}</p>
            <p className="text-2xl font-bold">{valor}</p>
          </div>
        ))}
      </section>

      {lembretes.length > 0 && (
        <section className="cartao selo-amarelo">
          <h2 className="subtitulo">Lembretes para enviar</h2>
          <p className="mb-3 text-sm">
            Faltam {textoAntecedencia(b.lembrete_minutos)} ou menos para estes horários. Toque em “Enviar” para abrir o WhatsApp com a mensagem pronta: o cliente responde Vou/Não vou pelo link e a agenda se atualiza sozinha.
          </p>
          <ul className="space-y-2">
            {lembretes.map((a) => {
              const minutos = Math.round((new Date(a.inicio).getTime() - agora) / 60_000);
              const href = linkWhats(
                a.clientes?.telefone,
                mensagemLembrete({
                  cliente: a.clientes?.nome ?? "",
                  barbearia: b.nome,
                  quando: quando(a.inicio, b.fuso),
                  servicos: a.agendamento_itens.map((i) => i.nome),
                  linkConfirmacao: linkConfirmacao(a.token_confirmacao),
                })
              );
              return (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-superficie p-2 text-texto">
                  <span className="text-sm">
                    <strong>{hora(a.inicio, b.fuso)}</strong> · {a.clientes?.nome}{" "}
                    <span className="text-suave">(daqui a {minutos} min)</span>
                  </span>
                  {href ? (
                    <BotaoWhats href={href} agendamentoId={a.id} rotulo="Enviar" destaque />
                  ) : (
                    <span className="text-xs text-suave">sem WhatsApp cadastrado</span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

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
