import Link from "next/link";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { FormularioAcao } from "@/components/FormularioAcao";
import { livresDoDia } from "@/lib/agenda/disponibilidade";
import { agendamentosEntre, configuracaoAgenda } from "@/lib/consultasPainel";
import { dataExtensa, hora, moeda } from "@/lib/formatar";
import { exigirBarbearia } from "@/lib/painel";
import { dataValida, diaSemana, hojeLocal, inicioDaSemana, NOMES_DIAS_CURTOS, partesLocais, somarDias } from "@/lib/tempo";
import type { Cliente } from "@/lib/tipos";
import { bloquearDia, novoAgendamento, removerBloqueio } from "../acoes";
import { CartaoAgendamento } from "../componentes/CartaoAgendamento";

export const metadata = { title: "Agenda" };

export default async function Page({ searchParams }: PageProps<"/painel/agenda">) {
  const sp = await searchParams;
  const { supabase, barbearia: b } = await exigirBarbearia();
  const hoje = hojeLocal(b.fuso);
  const dia = dataValida(sp.d) ? sp.d : hoje;
  const semana = inicioDaSemana(dia);
  const diasSemana = Array.from({ length: 7 }, (_, i) => somarDias(semana, i));

  const [daSemana, cfg] = await Promise.all([
    agendamentosEntre(supabase, b.id, b.fuso, semana, somarDias(semana, 6)),
    configuracaoAgenda(supabase, b.id),
  ]);
  const diaDe = (iso: string) => partesLocais(new Date(iso), b.fuso).data;
  const lista = daSemana.filter((a) => diaDe(a.inicio) === dia);

  const ativos = cfg.profissionais.filter((p) => p.ativo);
  const multiplos = ativos.length > 1;
  const profPadrao = ativos.find((p) => p.id === sp.p)?.id ?? ativos[0]?.id;

  // Cliente vindo da página de clientes ("Agendar para este cliente")
  let clientePre: Pick<Cliente, "id" | "nome" | "telefone"> | null = null;
  if (typeof sp.cliente === "string") {
    const { data } = await supabase.from("clientes").select("id, nome, telefone").eq("id", sp.cliente).maybeSingle();
    clientePre = data;
  }

  // Horários livres do dia (passo da agenda), por profissional
  const ocupados = [
    ...lista.filter((a) => a.status !== "cancelado" && a.status !== "faltou").map((a) => ({ profissional_id: a.profissional_id, inicio: a.inicio, fim: a.fim })),
    ...cfg.bloqueios.map((x) => ({ profissional_id: x.profissional_id, inicio: x.inicio, fim: x.fim })),
  ];
  const livresPorProf = ativos.map((p) => ({
    p,
    livres: livresDoDia({
      fuso: b.fuso,
      passoMin: b.passo_minutos,
      horarios: cfg.horarios,
      extras: cfg.extras,
      ocupados,
      profissionalId: p.id,
      data: dia,
      duracaoMin: b.passo_minutos,
      naoAntesDe: dia === hoje ? new Date() : undefined,
    }),
  }));

  const bloqueiosDoDia = cfg.bloqueios.filter((x) => diaDe(x.inicio) <= dia && diaDe(new Date(new Date(x.fim).getTime() - 1).toISOString()) >= dia);
  const contaDia = (d: string) => daSemana.filter((a) => diaDe(a.inicio) === d && a.status !== "cancelado").length;
  const horaPre = typeof sp.h === "string" ? sp.h : "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="titulo">Agenda</h1>
        <div className="flex gap-2">
          <Link href={`/painel/agenda?d=${somarDias(semana, -7)}`} className="btn btn-pequeno">← Semana anterior</Link>
          <Link href={`/painel/agenda?d=${hoje}`} className="btn btn-pequeno">Hoje</Link>
          <Link href={`/painel/agenda?d=${somarDias(semana, 7)}`} className="btn btn-pequeno">Próxima semana →</Link>
        </div>
      </div>

      <nav className="grid grid-cols-7 gap-1" aria-label="Dias da semana">
        {diasSemana.map((d) => (
          <Link
            key={d}
            href={`/painel/agenda?d=${d}`}
            aria-current={d === dia ? "date" : undefined}
            className={`flex flex-col items-center rounded-lg border py-2 text-xs ${d === dia ? "border-destaque bg-destaque text-destaque-texto" : "border-borda bg-superficie"}`}
          >
            <span>{NOMES_DIAS_CURTOS[diaSemana(d)]}</span>
            <span className="text-base font-bold">{d.slice(8, 10)}</span>
            <span>{contaDia(d) ? `${contaDia(d)} hor.` : "—"}</span>
          </Link>
        ))}
      </nav>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="subtitulo capitalize">{dataExtensa(dia)}</h2>
            {bloqueiosDoDia.length === 0 && (
              <form action={bloquearDia}>
                <input type="hidden" name="data" value={dia} />
                <button className="btn-perigo btn-pequeno">Não vou atender neste dia</button>
              </form>
            )}
          </div>

          {bloqueiosDoDia.map((x) => (
            <div key={x.id} className="aviso selo-cinza mb-3 flex flex-wrap items-center justify-between gap-2">
              <span>
                Bloqueado {hora(x.inicio, b.fuso)}–{hora(x.fim, b.fuso)}
                {x.profissional_id ? ` (${cfg.profissionais.find((p) => p.id === x.profissional_id)?.nome})` : ""}
                {x.motivo ? ` · ${x.motivo}` : ""}
              </span>
              <form action={removerBloqueio}>
                <input type="hidden" name="id" value={x.id} />
                <button className="btn btn-pequeno">Desbloquear</button>
              </form>
            </div>
          ))}

          {lista.length === 0 ? (
            <p className="cartao text-sm text-suave">Nenhum horário marcado neste dia.</p>
          ) : (
            <ul className="space-y-3">
              {lista.map((a) => (
                <CartaoAgendamento key={a.id} a={a} barbearia={b} servicos={cfg.servicos} mostrarProfissional={multiplos} />
              ))}
            </ul>
          )}

          <div className="mt-6 space-y-3">
            <h3 className="font-semibold">Horários livres</h3>
            {livresPorProf.map(({ p, livres }) => (
              <div key={p.id}>
                {multiplos && <p className="mb-1 text-sm text-suave">{p.nome}</p>}
                {livres.length === 0 ? (
                  <p className="text-sm text-suave">Nenhum horário livre.</p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {livres.map((l) => (
                      <Link
                        key={l.hora}
                        href={`/painel/agenda?d=${dia}&h=${l.hora}&p=${p.id}${clientePre ? `&cliente=${clientePre.id}` : ""}#novo`}
                        className="btn btn-pequeno"
                        title="Agendar neste horário"
                      >
                        {l.hora}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <aside id="novo" className="cartao h-fit">
          <h2 className="subtitulo mb-3">Novo agendamento</h2>
          <FormularioAcao acao={novoAgendamento} className="space-y-3" limparAoSalvar key={`${dia}-${horaPre}-${sp.p ?? ""}-${clientePre?.id ?? ""}`}>
            {clientePre ? (
              <div className="rounded-lg bg-superficie-2 p-2 text-sm">
                <input type="hidden" name="cliente_id" value={clientePre.id} />
                Cliente: <strong>{clientePre.nome}</strong>{" "}
                <Link href={`/painel/agenda?d=${dia}`} className="text-xs underline">trocar</Link>
              </div>
            ) : (
              <>
                <div>
                  <label className="rotulo" htmlFor="nome">Nome do cliente</label>
                  <input id="nome" name="nome" className="campo" required />
                </div>
                <div>
                  <label className="rotulo" htmlFor="telefone">WhatsApp</label>
                  <input id="telefone" name="telefone" type="tel" inputMode="tel" className="campo" placeholder="(41) 99999-8888" />
                  <p className="ajuda">Se o telefone já estiver cadastrado, usamos o mesmo cliente.</p>
                </div>
              </>
            )}
            <fieldset>
              <legend className="rotulo">Serviços</legend>
              <div className="space-y-1">
                {cfg.servicos.filter((s) => s.ativo).map((s) => (
                  <label key={s.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2">
                      <input type="checkbox" name="servicos" value={s.id} /> {s.nome}
                    </span>
                    <span className="text-suave">{moeda(s.preco)} · {s.duracao_min}min</span>
                  </label>
                ))}
              </div>
            </fieldset>
            {multiplos ? (
              <div>
                <label className="rotulo" htmlFor="prof">Profissional</label>
                <select id="prof" name="profissional_id" className="campo" defaultValue={profPadrao}>
                  {ativos.map((p) => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>
            ) : (
              <input type="hidden" name="profissional_id" value={profPadrao} />
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="rotulo" htmlFor="data">Dia</label>
                <input id="data" name="data" type="date" className="campo" defaultValue={dia} required />
              </div>
              <div>
                <label className="rotulo" htmlFor="hora">Hora</label>
                <input id="hora" name="hora" type="time" className="campo" defaultValue={horaPre} required />
              </div>
            </div>
            <input name="observacoes" className="campo" placeholder="Observação (opcional)" />
            <p className="ajuda">Pelo painel você pode marcar até fora do expediente.</p>
            <BotaoEnviar className="btn-primario w-full" pendente="Agendando…">Agendar</BotaoEnviar>
          </FormularioAcao>
        </aside>
      </div>
    </div>
  );
}
