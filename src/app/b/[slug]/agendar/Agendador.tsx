"use client";

import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { useEffect, useMemo, useState } from "react";
import { diaTemAtendimento, livresDoDia } from "@/lib/agenda/disponibilidade";
import { moeda } from "@/lib/formatar";
import { precoDoDia } from "@/lib/precos";
import { traduzirErro } from "@/lib/site";
import { createClient } from "@/lib/supabase/client";
import { localParaDate, NOMES_DIAS_CURTOS, somarDias, diaSemana } from "@/lib/tempo";
import type { Barbearia, HorarioExtra, HorarioSemana, NaoFaz, Profissional, Promocao, Servico } from "@/lib/tipos";

type Ocupado = { profissional_id: string | null; inicio: string; fim: string };

type Props = {
  dados: {
    barbearia: Barbearia;
    profissionais: Profissional[];
    servicos: Servico[];
    promocoes: Promocao[];
    horarios: HorarioSemana[];
    extras: HorarioExtra[];
    naoFaz: NaoFaz[];
  };
  hoje: string;
  ultimoDia: string;
  usuario: { nome: string; telefone: string } | null;
  inicial: { s?: string; p?: string; d?: string; h?: string };
};

export function Agendador({ dados, hoje, ultimoDia, usuario, inicial }: Props) {
  const { barbearia: b, profissionais, servicos: todosServicos, promocoes, horarios, extras, naoFaz } = dados;
  const faz = (prof: string, servico: string) => !naoFaz.some((x) => x.profissional_id === prof && x.servico_id === servico);
  const router = useRouter();

  const [marcados, setEscolhidos] = useState<string[]>(
    () => inicial.s?.split(",").filter((id) => todosServicos.some((s) => s.id === id)) ?? []
  );
  // sem profissional no link: o primeiro que faz os serviços já marcados
  const [profId, setProfId] = useState(
    () =>
      profissionais.find((p) => p.id === inicial.p)?.id ??
      profissionais.find((p) => marcados.every((s) => faz(p.id, s)))?.id ??
      profissionais[0]?.id ??
      ""
  );
  // só aparecem (e só valem) os serviços que o profissional escolhido faz
  const servicos = todosServicos.filter((s) => faz(profId, s.id));
  const escolhidos = marcados.filter((id) => faz(profId, id));
  const [data, setData] = useState(inicial.d ?? "");
  const [hora, setHora] = useState(inicial.h ?? "");
  const [ocupados, setOcupados] = useState<{ chave: string; lista: Ocupado[]; em: number } | null>(null);
  const [nome, setNome] = useState(usuario?.nome ?? "");
  const [telefone, setTelefone] = useState(usuario?.telefone ?? "");
  const [obs, setObs] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [versao, setVersao] = useState(0);

  const duracao = servicos.filter((s) => escolhidos.includes(s.id)).reduce((t, s) => t + s.duracao_min, 0);

  // Dias com atendimento entre hoje e o último dia aberto
  const dias = useMemo(() => {
    const lista: string[] = [];
    for (let d = hoje; d <= ultimoDia && lista.length < 60; d = somarDias(d, 1)) {
      if (diaTemAtendimento(horarios, extras, profId, d, b.fuso)) lista.push(d);
    }
    return lista;
  }, [hoje, ultimoDia, horarios, extras, profId, b.fuso]);

  const dataValida = dias.includes(data) ? data : "";
  const chave = `${profId}|${dataValida}`;

  // Busca os horários ocupados do dia escolhido
  useEffect(() => {
    if (!dataValida) return;
    let cancelado = false;
    const de = localParaDate(dataValida, "00:00", b.fuso);
    const ate = new Date(de.getTime() + 24 * 3600_000);
    createClient()
      .rpc("horarios_ocupados", { p_barbearia: b.id, p_de: de.toISOString(), p_ate: ate.toISOString() })
      .then(({ data: linhas, error }) => {
        if (cancelado) return;
        if (error) setErro(traduzirErro(error, "Não foi possível carregar os horários. Tente de novo."));
        setOcupados({ chave: `${profId}|${dataValida}`, lista: (linhas ?? []) as Ocupado[], em: Date.now() });
      });
    return () => {
      cancelado = true;
    };
  }, [b.id, b.fuso, dataValida, profId, versao]);

  const carregandoHorarios = !!dataValida && ocupados?.chave !== chave;
  // (o React Compiler já memoriza; cálculo leve: um dia de horários)
  const livres =
    !dataValida || !duracao || ocupados?.chave !== chave
      ? []
      : livresDoDia({
          fuso: b.fuso,
          passoMin: b.passo_minutos,
          horarios,
          extras,
          ocupados: ocupados.lista,
          profissionalId: profId,
          data: dataValida,
          duracaoMin: duracao,
          // "agora" = momento em que os horários foram carregados
          naoAntesDe: new Date(ocupados.em + b.antecedencia_minima_min * 60_000),
        });

  const horaValida = livres.some((l) => l.hora === hora) ? hora : "";

  // Mantém a escolha no endereço (se precisar entrar na conta, volta tudo marcado)
  const consulta = new URLSearchParams();
  if (escolhidos.length) consulta.set("s", escolhidos.join(","));
  if (profId) consulta.set("p", profId);
  if (dataValida) consulta.set("d", dataValida);
  if (horaValida) consulta.set("h", horaValida);
  const consultaTexto = consulta.toString();
  useEffect(() => {
    window.history.replaceState(null, "", `${window.location.pathname}${consultaTexto ? `?${consultaTexto}` : ""}`);
  }, [consultaTexto]);

  const precoData = dataValida || hoje;
  const itens = servicos.filter((s) => escolhidos.includes(s.id)).map((s) => ({ s, p: precoDoDia(s, promocoes, precoData) }));
  const total = itens.reduce((t, i) => t + i.p.preco, 0);

  function alternar(id: string) {
    setEscolhidos((atual) => (atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]));
  }

  async function confirmar() {
    setErro(null);
    if (!usuario) {
      const volta = `${window.location.pathname}?${consultaTexto}`;
      router.push(`/entrar?proximo=${encodeURIComponent(volta)}`);
      return;
    }
    if (telefone.replace(/\D/g, "").length < 10) {
      setErro("Informe seu WhatsApp com DDD para a barbearia confirmar o horário.");
      return;
    }
    setEnviando(true);
    const supabase = createClient();
    const { data: id, error } = await supabase.rpc("agendar", {
      p_barbearia: b.id,
      p_profissional: profId,
      p_inicio: localParaDate(dataValida, horaValida, b.fuso).toISOString(),
      p_servicos: escolhidos,
      p_nome: nome,
      p_telefone: telefone,
      p_observacoes: obs,
    });
    if (error || !id) {
      setEnviando(false);
      setErro(traduzirErro(error));
      // o horário pode ter sido ocupado: recarrega a lista
      setOcupados(null);
      setVersao((v) => v + 1);
      return;
    }
    const { data: ag } = await supabase.from("agendamentos").select("token_confirmacao").eq("id", id).single();
    router.push(ag ? `/c/${ag.token_confirmacao}?novo=1` : "/meus-agendamentos");
  }

  // numeração dos passos: sem escolha de profissional, começa no 1
  const n = (passo: number) => (profissionais.length > 1 ? passo : passo - 1);

  return (
    <div className="space-y-8">
      {profissionais.length > 1 && (
        <section>
          <h2 className="subtitulo mb-3">1. Com quem?</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {profissionais.map((p) => {
              const ativo = profId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProfId(p.id)}
                  aria-pressed={ativo}
                  className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition hover:-translate-y-0.5 ${ativo ? "border-destaque bg-superficie-2 ring-2 ring-destaque" : "border-borda bg-superficie"}`}
                >
                  <Avatar nome={p.nome} foto={p.foto_url} tamanho={72} />
                  <span className="text-[0.65rem] font-bold tracking-[0.2em] text-destaque uppercase">{p.titulo}</span>
                  <span className="font-titulo text-lg leading-tight font-extrabold uppercase">{p.nome}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className="subtitulo mb-3">{n(2)}. O que você vai fazer?</h2>
        {servicos.length === 0 && <p className="text-sm text-suave">Este profissional ainda não tem serviços cadastrados. Escolha outro.</p>}
        <div className="grid gap-2">
          {servicos.map((s) => {
            const p = precoDoDia(s, promocoes, precoData);
            const marcado = escolhidos.includes(s.id);
            return (
              <label
                key={s.id}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 ${marcado ? "border-destaque bg-superficie-2" : "border-borda bg-superficie"}`}
              >
                <span className="flex items-center gap-3">
                  <input type="checkbox" className="size-5 accent-[var(--destaque)]" checked={marcado} onChange={() => alternar(s.id)} />
                  <span>
                    <span className="block font-medium">{s.nome}</span>
                    <span className="block text-xs text-suave">{s.duracao_min} min{p.promocao ? ` · ${p.promocao}` : ""}</span>
                  </span>
                </span>
                <span className="text-right whitespace-nowrap">
                  {p.promocao && <span className="block text-xs text-suave line-through">{moeda(p.precoTabela)}</span>}
                  <span className="font-semibold">{moeda(p.preco)}</span>
                </span>
              </label>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="subtitulo mb-3">{n(3)}. Qual dia?</h2>
        {dias.length === 0 ? (
          <p className="text-sm text-suave">Não há dias abertos na agenda agora. Fale com a barbearia pelo WhatsApp.</p>
        ) : (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
            {dias.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setData(d)}
                aria-pressed={dataValida === d}
                className={`flex min-w-16 flex-col items-center rounded-xl border px-3 py-2 ${dataValida === d ? "border-destaque bg-destaque text-destaque-texto" : "border-borda bg-superficie"}`}
              >
                <span className="text-xs">{d === hoje ? "Hoje" : NOMES_DIAS_CURTOS[diaSemana(d)]}</span>
                <span className="text-lg font-semibold">{d.slice(8, 10)}</span>
                <span className="text-xs">{d.slice(5, 7)}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {dataValida && (
        <section>
          <h2 className="subtitulo mb-3">{n(4)}. Qual horário?</h2>
          {!duracao ? (
            <p className="text-sm text-suave">Escolha pelo menos um serviço lá em cima.</p>
          ) : carregandoHorarios ? (
            <p className="text-sm text-suave">Carregando horários…</p>
          ) : livres.length === 0 ? (
            <p className="text-sm text-suave">Nenhum horário livre nesse dia. Tente outro dia.</p>
          ) : (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {livres.map((l) => (
                <button
                  key={l.hora}
                  type="button"
                  onClick={() => setHora(l.hora)}
                  aria-pressed={horaValida === l.hora}
                  className={horaValida === l.hora ? "btn-primario" : "btn"}
                >
                  {l.hora}
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {horaValida && duracao > 0 && (
        <section className="cartao space-y-4">
          <h2 className="subtitulo">Confirmar</h2>
          <ul className="text-sm">
            {itens.map(({ s, p }) => (
              <li key={s.id} className="flex justify-between">
                <span>{s.nome}</span>
                <span>{moeda(p.preco)}</span>
              </li>
            ))}
            <li className="mt-2 flex justify-between border-t border-borda pt-2 font-semibold">
              <span>Total (pago na barbearia)</span>
              <span>{moeda(total)}</span>
            </li>
          </ul>
          <p className="text-sm">
            <strong>{NOMES_DIAS_CURTOS[diaSemana(dataValida)]}, {dataValida.slice(8, 10)}/{dataValida.slice(5, 7)} às {horaValida}</strong>
            {profissionais.length > 1 && <> com {profissionais.find((p) => p.id === profId)?.nome}</>} · {duracao} min
          </p>

          {usuario ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="rotulo" htmlFor="nome">Nome</label>
                  <input id="nome" className="campo" value={nome} onChange={(e) => setNome(e.target.value)} />
                </div>
                <div>
                  <label className="rotulo" htmlFor="tel">WhatsApp</label>
                  <input id="tel" type="tel" inputMode="tel" className="campo" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="rotulo" htmlFor="obs">Observação (opcional)</label>
                <input id="obs" className="campo" maxLength={200} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex.: degradê, tesoura em cima" />
              </div>
            </>
          ) : (
            <p className="text-sm text-suave">Para confirmar, entre na sua conta ou crie uma (leva menos de um minuto). Suas escolhas ficam guardadas.</p>
          )}

          {erro && <p className="aviso selo-vermelho block" role="alert">{erro}</p>}
          <button type="button" className="btn-primario w-full" onClick={confirmar} disabled={enviando}>
            {enviando ? "Agendando…" : usuario ? "Confirmar agendamento" : "Entrar e confirmar"}
          </button>
        </section>
      )}
    </div>
  );
}
