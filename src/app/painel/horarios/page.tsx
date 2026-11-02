import { BotaoEnviar } from "@/components/BotaoEnviar";
import { FormularioAcao } from "@/components/FormularioAcao";
import { configuracaoAgenda } from "@/lib/consultasPainel";
import { dataCurta, hora } from "@/lib/formatar";
import { limiteAgenda } from "@/lib/dados";
import { exigirBarbearia } from "@/lib/painel";
import { hojeLocal, NOMES_DIAS, partesLocais } from "@/lib/tempo";
import type { HorarioSemana, Profissional } from "@/lib/tipos";
import {
  adicionarBloqueio,
  adicionarExtra,
  removerBloqueio,
  removerExtra,
  salvarAgendaAberta,
  salvarHorariosSemana,
  salvarProfissional,
} from "../acoes";

export const metadata = { title: "Horários e folgas" };

const ORDEM_DIAS = [1, 2, 3, 4, 5, 6, 0];

function FormSemana({ p, horarios }: { p: Profissional; horarios: HorarioSemana[] }) {
  return (
    <FormularioAcao acao={salvarHorariosSemana} className="space-y-2">
      <input type="hidden" name="profissional_id" value={p.id} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="text-left text-xs text-suave">
              <th className="py-1">Dia</th>
              <th>Atende</th>
              <th>Manhã / 1º período</th>
              <th>Tarde / 2º período</th>
            </tr>
          </thead>
          <tbody>
            {ORDEM_DIAS.map((d) => {
              const doDia = horarios.filter((h) => h.profissional_id === p.id && h.dia_semana === d).sort((a, b) => a.inicio.localeCompare(b.inicio));
              const [h1, h2] = doDia;
              return (
                <tr key={d} className="border-t border-borda">
                  <td className="py-2 pr-2 font-medium">{NOMES_DIAS[d]}</td>
                  <td>
                    <input type="checkbox" name={`atende_${d}`} defaultChecked={doDia.length > 0} aria-label={`Atende ${NOMES_DIAS[d]}`} />
                  </td>
                  <td>
                    <span className="flex items-center gap-1">
                      <input type="time" name={`i1_${d}`} defaultValue={h1?.inicio.slice(0, 5) ?? "09:00"} className="campo min-h-9 w-28" aria-label="Entrada" />
                      –
                      <input type="time" name={`f1_${d}`} defaultValue={h1?.fim.slice(0, 5) ?? "12:00"} className="campo min-h-9 w-28" aria-label="Saída" />
                    </span>
                  </td>
                  <td>
                    <span className="flex items-center gap-1">
                      <input type="time" name={`i2_${d}`} defaultValue={h2?.inicio.slice(0, 5) ?? (doDia.length ? "" : "13:00")} className="campo min-h-9 w-28" aria-label="Volta" />
                      –
                      <input type="time" name={`f2_${d}`} defaultValue={h2?.fim.slice(0, 5) ?? (doDia.length ? "" : "19:00")} className="campo min-h-9 w-28" aria-label="Saída" />
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="ajuda">Deixe o 2º período em branco se não houver intervalo de almoço.</p>
      <BotaoEnviar>Salvar horários de {p.nome}</BotaoEnviar>
    </FormularioAcao>
  );
}

export default async function Page() {
  const { supabase, barbearia: b } = await exigirBarbearia();
  const cfg = await configuracaoAgenda(supabase, b.id);
  const hoje = hojeLocal(b.fuso);
  const ativos = cfg.profissionais.filter((p) => p.ativo);
  const nomeProf = (id: string | null) => (id ? cfg.profissionais.find((p) => p.id === id)?.nome ?? "" : "Todos");
  const quandoBloqueio = (ini: string, fim: string) => {
    const a = partesLocais(new Date(ini), b.fuso);
    const z = partesLocais(new Date(new Date(fim).getTime() - 60_000), b.fuso);
    const diaInteiro = a.hora === "00:00" && hora(fim, b.fuso) === "00:00";
    if (diaInteiro) return a.data === z.data ? `${dataCurta(a.data)} (dia inteiro)` : `${dataCurta(a.data)} a ${dataCurta(z.data)} (dias inteiros)`;
    return a.data === z.data ? `${dataCurta(a.data)}, ${a.hora}–${hora(fim, b.fuso)}` : `${dataCurta(a.data)} ${a.hora} a ${dataCurta(z.data)} ${hora(fim, b.fuso)}`;
  };

  return (
    <div className="space-y-10">
      <section>
        <h1 className="titulo mb-1">Horários e folgas</h1>
        <p className="text-sm text-suave">O cliente só vê os horários que cabem no expediente, fora das folgas e dos horários já ocupados.</p>
      </section>

      <section className="cartao">
        <h2 className="subtitulo mb-1">Abertura da agenda</h2>
        <p className="mb-3 text-sm text-suave">
          Hoje os clientes conseguem marcar até <strong>{dataCurta(limiteAgenda(b))}</strong>.
        </p>
        <FormularioAcao acao={salvarAgendaAberta} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div>
            <label className="rotulo" htmlFor="dias">Deixar aberta por (dias)</label>
            <input id="dias" name="dias_agenda_aberta" type="number" min={1} max={120} defaultValue={b.dias_agenda_aberta} className="campo" />
          </div>
          <div>
            <label className="rotulo" htmlFor="ate">…mas no máximo até (opcional)</label>
            <input id="ate" name="agenda_aberta_ate" type="date" defaultValue={b.agenda_aberta_ate ?? ""} className="campo" />
          </div>
          <BotaoEnviar>Salvar</BotaoEnviar>
        </FormularioAcao>
        <p className="ajuda mt-2">Para “abrir a semana”, coloque no segundo campo o último dia da semana que você quer liberar.</p>
      </section>

      {ativos.map((p) => (
        <section key={p.id} className="cartao">
          <h2 className="subtitulo mb-3">Expediente semanal{ativos.length > 1 ? ` — ${p.nome}` : ""}</h2>
          <FormSemana p={p} horarios={cfg.horarios} />
        </section>
      ))}

      <section className="cartao">
        <h2 className="subtitulo mb-1">Folgas e bloqueios</h2>
        <p className="mb-3 text-sm text-suave">Dia que você não vai atender, feriado, consulta médica… O sistema esconde esses horários dos clientes.</p>
        {cfg.bloqueios.length > 0 && (
          <ul className="mb-4 divide-y divide-borda rounded-lg border border-borda">
            {cfg.bloqueios.map((x) => (
              <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 p-2 text-sm">
                <span>
                  {quandoBloqueio(x.inicio, x.fim)} · {nomeProf(x.profissional_id)}
                  {x.motivo ? <span className="text-suave"> · {x.motivo}</span> : null}
                </span>
                <form action={removerBloqueio}>
                  <input type="hidden" name="id" value={x.id} />
                  <button className="btn-perigo btn-pequeno">Remover</button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <FormularioAcao acao={adicionarBloqueio} limparAoSalvar className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="rotulo text-xs" htmlFor="b-ini">De</label>
              <input id="b-ini" name="data_inicio" type="date" min={hoje} required className="campo" />
            </div>
            <div>
              <label className="rotulo text-xs" htmlFor="b-fim">Até (opcional, para vários dias)</label>
              <input id="b-fim" name="data_fim" type="date" min={hoje} className="campo" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="dia_inteiro" defaultChecked /> Dia inteiro
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="rotulo text-xs" htmlFor="b-hi">Das (se não for o dia inteiro)</label>
              <input id="b-hi" name="hora_inicio" type="time" className="campo" />
            </div>
            <div>
              <label className="rotulo text-xs" htmlFor="b-hf">Até</label>
              <input id="b-hf" name="hora_fim" type="time" className="campo" />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {ativos.length > 1 && (
              <select name="profissional_id" className="campo" defaultValue="" aria-label="Para quem">
                <option value="">Barbearia toda</option>
                {ativos.map((p) => (
                  <option key={p.id} value={p.id}>Só {p.nome}</option>
                ))}
              </select>
            )}
            <input name="motivo" className="campo" placeholder="Motivo (só você vê)" />
          </div>
          <BotaoEnviar pendente="Bloqueando…">Bloquear</BotaoEnviar>
        </FormularioAcao>
      </section>

      <section className="cartao">
        <h2 className="subtitulo mb-1">Horários extras</h2>
        <p className="mb-3 text-sm text-suave">Abrir horários fora do expediente normal (ex.: domingo antes do Natal).</p>
        {cfg.extras.length > 0 && (
          <ul className="mb-4 divide-y divide-borda rounded-lg border border-borda">
            {cfg.extras.map((x) => (
              <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 p-2 text-sm">
                <span>
                  {dataCurta(partesLocais(new Date(x.inicio), b.fuso).data)}, {hora(x.inicio, b.fuso)}–{hora(x.fim, b.fuso)}
                  {ativos.length > 1 ? ` · ${nomeProf(x.profissional_id)}` : ""}
                </span>
                <form action={removerExtra}>
                  <input type="hidden" name="id" value={x.id} />
                  <button className="btn-perigo btn-pequeno">Remover</button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <FormularioAcao acao={adicionarExtra} limparAoSalvar className="grid gap-2 sm:grid-cols-4 sm:items-end">
          <div>
            <label className="rotulo text-xs" htmlFor="e-dia">Dia</label>
            <input id="e-dia" name="data" type="date" min={hoje} required className="campo" />
          </div>
          <div>
            <label className="rotulo text-xs" htmlFor="e-hi">Das</label>
            <input id="e-hi" name="hora_inicio" type="time" required className="campo" />
          </div>
          <div>
            <label className="rotulo text-xs" htmlFor="e-hf">Até</label>
            <input id="e-hf" name="hora_fim" type="time" required className="campo" />
          </div>
          {ativos.length > 1 ? (
            <select name="profissional_id" className="campo" aria-label="Profissional">
              {ativos.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          ) : (
            <input type="hidden" name="profissional_id" value={ativos[0]?.id} />
          )}
          <BotaoEnviar pendente="Abrindo…">Abrir horário</BotaoEnviar>
        </FormularioAcao>
      </section>

      <section className="cartao">
        <h2 className="subtitulo mb-1">Profissionais</h2>
        <p className="mb-3 text-sm text-suave">Se mais de um barbeiro atende, o cliente escolhe com quem quer cortar.</p>
        <ul className="mb-4 space-y-2">
          {cfg.profissionais.map((p) => (
            <li key={p.id}>
              <FormularioAcao acao={salvarProfissional} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={p.id} />
                <input name="nome" defaultValue={p.nome} className="campo max-w-xs" aria-label="Nome do profissional" />
                <label className="flex items-center gap-1 text-sm">
                  <input type="checkbox" name="ativo" defaultChecked={p.ativo} /> Atendendo
                </label>
                <BotaoEnviar className="btn btn-pequeno">Salvar</BotaoEnviar>
              </FormularioAcao>
            </li>
          ))}
        </ul>
        <FormularioAcao acao={salvarProfissional} limparAoSalvar className="flex flex-wrap gap-2">
          <input name="nome" className="campo max-w-xs" placeholder="Nome do novo barbeiro" required />
          <BotaoEnviar className="btn" pendente="Adicionando…">Adicionar</BotaoEnviar>
        </FormularioAcao>
      </section>
    </div>
  );
}
