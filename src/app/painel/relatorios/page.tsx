import Link from "next/link";
import { dataCurta, moeda } from "@/lib/formatar";
import {
  ATALHOS,
  descontos,
  destaques,
  rotuloCategoria,
  rotuloPagamento,
  serieDoPeriodo,
  taxaFaltas,
  textoVariacao,
  ticketMedio,
  variacao,
} from "@/lib/relatorio/calculos";
import { carregarRelatorio } from "@/lib/relatorio/carregar";
import { traduzirErro } from "@/lib/site";

export const metadata = { title: "Relatórios" };

function Tabela({ titulo, colunas, linhas }: { titulo: string; colunas: string[]; linhas: (string | number)[][] }) {
  return (
    <section className="cartao">
      <h2 className="mb-2 font-semibold">{titulo}</h2>
      {linhas.length === 0 ? (
        <p className="text-sm text-suave">Nada no período.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-suave">
              {colunas.map((c, i) => (
                <th key={c} className={`py-1 ${i > 0 ? "text-right" : ""}`}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((l, i) => (
              <tr key={i} className="border-t border-borda">
                {l.map((v, j) => (
                  <td key={j} className={`py-1.5 ${j > 0 ? "text-right tabular-nums" : ""}`}>{v}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

const corVar = (v: number | null) => (v === null ? "text-suave" : v >= 0 ? "text-[var(--verde-texto)]" : "text-[var(--vermelho-texto)]");

export default async function Page({ searchParams }: PageProps<"/painel/relatorios">) {
  const sp = await searchParams;
  const { barbearia: b, dono, equipe, prof, nomeProf, p, de, ate, r, anterior: a, erro } = await carregarRelatorio(sp);
  const comProf = (q: string) => `/painel/relatorios?${q}${prof && dono ? `&prof=${prof}` : ""}`;
  const periodoQuery = p === "livre" ? `p=livre&de=${de}&ate=${ate}` : `p=${p}`;
  const filtros = `${periodoQuery}${prof && dono ? `&prof=${prof}` : ""}`;
  const vTotal = r && a ? variacao(Number(r.total), Number(a.total)) : null;
  const vAtend = r && a ? variacao(r.atendimentos, a.atendimentos) : null;
  const vTicket = r && a ? variacao(ticketMedio(r), ticketMedio(a)) : null;
  const serie = r && de !== ate ? serieDoPeriodo(r.por_dia, de, ate) : [];
  const maxSerie = Math.max(...serie.map((x) => x.valor), 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="titulo text-4xl">{dono ? "Relatórios" : "Meu relatório"}</h1>
          <p className="text-sm text-suave">
            {b.nome} · {nomeProf ?? "Todos os profissionais"} · {de === ate ? dataCurta(de) : `${dataCurta(de)} a ${dataCurta(ate)}`}
          </p>
        </div>
        {r && (
          <div className="flex flex-wrap gap-2">
            <a href={`/painel/relatorios/pdf?${filtros}`} className="btn-primario" download>Baixar PDF</a>
            <a href={`/painel/relatorios/excel?${filtros}`} className="btn" download>Baixar Excel</a>
          </div>
        )}
      </div>

      <nav className="flex flex-wrap gap-2" aria-label="Período">
        {ATALHOS.map(([v, rotulo]) => (
          <Link key={v} href={comProf(`p=${v}`)} aria-current={p === v ? "page" : undefined} className={p === v ? "btn-primario btn-pequeno" : "btn btn-pequeno"}>
            {rotulo}
          </Link>
        ))}
      </nav>
      {dono && equipe.length > 1 && (
        <nav className="flex flex-wrap gap-2" aria-label="Profissional">
          <Link href={`/painel/relatorios?${periodoQuery}`} aria-current={!prof ? "page" : undefined} className={!prof ? "btn-primario btn-pequeno" : "btn btn-pequeno"}>
            Todos
          </Link>
          {equipe.map((x) => (
            <Link key={x.id} href={`/painel/relatorios?${periodoQuery}&prof=${x.id}`} aria-current={prof === x.id ? "page" : undefined} className={prof === x.id ? "btn-primario btn-pequeno" : "btn btn-pequeno"}>
              {x.nome}
            </Link>
          ))}
        </nav>
      )}
      <form className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="p" value="livre" />
        {prof && dono && <input type="hidden" name="prof" value={prof} />}
        <div>
          <label className="rotulo text-xs" htmlFor="de">De</label>
          <input id="de" name="de" type="date" defaultValue={de} className="campo" />
        </div>
        <div>
          <label className="rotulo text-xs" htmlFor="ate">Até</label>
          <input id="ate" name="ate" type="date" defaultValue={ate} className="campo" />
        </div>
        <button className="btn">Ver período</button>
      </form>

      {erro || !r ? (
        <p className="aviso selo-vermelho block">{traduzirErro(erro, "Não foi possível gerar o relatório.")}</p>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="cartao">
              <p className="text-xs text-suave">Total recebido</p>
              <p className="text-2xl font-bold">{moeda(r.total)}</p>
              <p className={`text-xs ${corVar(vTotal)}`}>{textoVariacao(vTotal)}</p>
            </div>
            <div className="cartao">
              <p className="text-xs text-suave">Atendimentos</p>
              <p className="text-2xl font-bold">{r.atendimentos}</p>
              <p className={`text-xs ${corVar(vAtend)}`}>{textoVariacao(vAtend)}</p>
            </div>
            <div className="cartao">
              <p className="text-xs text-suave">Ticket médio</p>
              <p className="text-2xl font-bold">{moeda(ticketMedio(r))}</p>
              <p className={`text-xs ${corVar(vTicket)}`}>{textoVariacao(vTicket)}</p>
            </div>
            <div className="cartao">
              <p className="text-xs text-suave">Faltas</p>
              <p className="text-2xl font-bold">{r.faltas}</p>
              <p className="text-xs text-suave">
                {Math.round(taxaFaltas(r))}% dos horários · {r.cancelados} cancelado(s)
                {descontos(r) > 0 ? ` · ${moeda(descontos(r))} em descontos` : ""}
              </p>
            </div>
          </section>

          <section className="cartao border-l-4 border-l-destaque">
            <h2 className="subtitulo mb-2">Destaques do período</h2>
            <ul className="list-disc space-y-1 pl-5 text-sm marker:text-destaque">
              {destaques(r, a, de, ate, moeda).map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </section>

          {serie.length > 1 && (
            <section className="cartao">
              <h2 className="subtitulo mb-3">{serie[0].rotulo.length > 2 ? "Faturamento por mês" : "Faturamento por dia"}</h2>
              <div className="flex h-40 items-end gap-0.5 border-b border-borda sm:gap-1" role="img" aria-label="Gráfico do faturamento no período">
                {serie.map((x) => (
                  <div key={x.detalhe} className="flex h-full flex-1 flex-col justify-end" title={`${x.detalhe}: ${moeda(x.valor)} (${x.qtd} atend.)`}>
                    <div className="rounded-t-sm bg-destaque" style={{ height: `${(x.valor / maxSerie) * 100}%`, minHeight: x.valor > 0 ? 2 : 0 }} />
                  </div>
                ))}
              </div>
              <div className="mt-1 flex gap-0.5 sm:gap-1" aria-hidden="true">
                {serie.map((x, i) => (
                  <span key={x.detalhe} className="flex-1 text-center text-[0.6rem] text-suave">
                    {serie.length <= 12 || i % Math.ceil(serie.length / 10) === 0 ? x.rotulo : ""}
                  </span>
                ))}
              </div>
            </section>
          )}

          {r.sem_fechamento > 0 && (
            <p className="aviso selo-amarelo block">
              {r.sem_fechamento} horário(s) já passaram e ainda não foram fechados (sem pagamento registrado). Feche-os na Agenda para entrarem no total.
            </p>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <Tabela
              titulo="Por forma de pagamento"
              colunas={["Forma", "Atend.", "Valor"]}
              linhas={r.por_pagamento.map((x) => [rotuloPagamento(x.forma), x.qtd, moeda(x.valor)])}
            />
            <Tabela
              titulo="Por tipo de serviço"
              colunas={["Tipo", "Qtd.", "Valor"]}
              linhas={r.por_categoria.map((x) => [rotuloCategoria(x.categoria), x.qtd, moeda(x.valor)])}
            />
            <Tabela
              titulo="Por serviço"
              colunas={["Serviço", "Qtd.", "Promo.", "Valor"]}
              linhas={r.por_servico.map((x) => [x.nome, x.qtd, x.promocoes, moeda(x.valor)])}
            />
            {!prof && r.por_profissional.length > 1 && (
              <Tabela titulo="Por profissional" colunas={["Profissional", "Atend.", "Valor"]} linhas={r.por_profissional.map((x) => [x.nome, x.qtd, moeda(x.valor)])} />
            )}
            {de !== ate && (
              <Tabela titulo="Por dia" colunas={["Dia", "Atend.", "Valor"]} linhas={r.por_dia.map((x) => [dataCurta(x.dia), x.qtd, moeda(x.valor)])} />
            )}
          </div>
        </>
      )}
    </div>
  );
}
