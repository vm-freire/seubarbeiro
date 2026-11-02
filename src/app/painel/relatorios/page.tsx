import Link from "next/link";
import { CATEGORIAS, dataCurta, moeda, PAGAMENTOS, type Categoria, type Pagamento } from "@/lib/formatar";
import { exigirBarbearia } from "@/lib/painel";
import { traduzirErro } from "@/lib/site";
import { dataValida, hojeLocal, inicioDaSemana, primeiroDiaDoMes, somarDias, ultimoDiaDoMes } from "@/lib/tempo";
import { BotaoImprimir } from "./BotaoImprimir";

export const metadata = { title: "Relatórios" };

type Relatorio = {
  atendimentos: number;
  faltas: number;
  cancelados: number;
  sem_fechamento: number;
  total: number;
  total_tabela: number;
  qtd_promocoes: number;
  por_categoria: { categoria: Categoria; qtd: number; valor: number }[];
  por_servico: { nome: string; qtd: number; valor: number; promocoes: number }[];
  por_pagamento: { forma: Pagamento; qtd: number; valor: number }[];
  por_profissional: { nome: string; qtd: number; valor: number }[];
  por_dia: { dia: string; qtd: number; valor: number }[];
};

function periodo(sp: Record<string, string | string[] | undefined>, hoje: string) {
  const p = typeof sp.p === "string" ? sp.p : "hoje";
  if (p === "semana") return { p, de: inicioDaSemana(hoje), ate: hoje };
  if (p === "7dias") return { p, de: somarDias(hoje, -6), ate: hoje };
  if (p === "mes") return { p, de: primeiroDiaDoMes(hoje), ate: ultimoDiaDoMes(hoje) };
  if (p === "mespassado") {
    const ref = somarDias(primeiroDiaDoMes(hoje), -1);
    return { p, de: primeiroDiaDoMes(ref), ate: ref };
  }
  if (p === "ano") return { p, de: `${hoje.slice(0, 4)}-01-01`, ate: `${hoje.slice(0, 4)}-12-31` };
  if (p === "livre" && dataValida(sp.de) && dataValida(sp.ate) && sp.de <= sp.ate) return { p, de: sp.de, ate: sp.ate };
  return { p: "hoje", de: hoje, ate: hoje };
}

const ATALHOS = [
  ["hoje", "Hoje (fechamento do dia)"],
  ["semana", "Esta semana"],
  ["7dias", "Últimos 7 dias"],
  ["mes", "Este mês"],
  ["mespassado", "Mês passado"],
  ["ano", "Este ano"],
] as const;

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

export default async function Page({ searchParams }: PageProps<"/painel/relatorios">) {
  const sp = await searchParams;
  const { supabase, barbearia: b, dono, meuProfissional } = await exigirBarbearia();
  const hoje = hojeLocal(b.fuso);
  const { p, de, ate } = periodo(sp, hoje);
  // dono escolhe: todos ou um profissional; barbeiro sempre vê só o dele (o banco garante)
  const { data: equipe } = dono
    ? await supabase.from("profissionais").select("id, nome").eq("barbearia_id", b.id).order("ordem").order("nome")
    : { data: [] as { id: string; nome: string }[] };
  const prof = dono ? (equipe ?? []).find((x) => x.id === sp.prof)?.id ?? null : meuProfissional?.id ?? null;
  const nomeProf = dono ? (equipe ?? []).find((x) => x.id === prof)?.nome : meuProfissional?.nome;
  const { data, error } = await supabase.rpc("relatorio_caixa", { p_barbearia: b.id, p_de: de, p_ate: ate, p_profissional: prof });
  const comProf = (q: string) => `/painel/relatorios?${q}${prof && dono ? `&prof=${prof}` : ""}`;
  const periodoQuery = p === "livre" ? `p=livre&de=${de}&ate=${ate}` : `p=${p}`;
  const r = data as Relatorio | null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="titulo text-4xl">{dono ? "Relatórios" : "Meu relatório"}</h1>
          <p className="text-sm text-suave">
            {b.nome} · {nomeProf ?? "Todos os profissionais"} · {de === ate ? dataCurta(de) : `${dataCurta(de)} a ${dataCurta(ate)}`}
          </p>
        </div>
        <BotaoImprimir />
      </div>

      <nav className="nao-imprimir flex flex-wrap gap-2" aria-label="Período">
        {ATALHOS.map(([v, rotulo]) => (
          <Link key={v} href={comProf(`p=${v}`)} aria-current={p === v ? "page" : undefined} className={p === v ? "btn-primario btn-pequeno" : "btn btn-pequeno"}>
            {rotulo}
          </Link>
        ))}
      </nav>
      {dono && (equipe ?? []).length > 1 && (
        <nav className="nao-imprimir flex flex-wrap gap-2" aria-label="Profissional">
          <Link href={`/painel/relatorios?${periodoQuery}`} aria-current={!prof ? "page" : undefined} className={!prof ? "btn-primario btn-pequeno" : "btn btn-pequeno"}>
            Todos
          </Link>
          {(equipe ?? []).map((x) => (
            <Link key={x.id} href={`/painel/relatorios?${periodoQuery}&prof=${x.id}`} aria-current={prof === x.id ? "page" : undefined} className={prof === x.id ? "btn-primario btn-pequeno" : "btn btn-pequeno"}>
              {x.nome}
            </Link>
          ))}
        </nav>
      )}
      <form className="nao-imprimir flex flex-wrap items-end gap-2">
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

      {error || !r ? (
        <p className="aviso selo-vermelho block">{traduzirErro(error, "Não foi possível gerar o relatório.")}</p>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="cartao">
              <p className="text-xs text-suave">Total recebido</p>
              <p className="text-2xl font-bold">{moeda(r.total)}</p>
              {Number(r.total_tabela) > Number(r.total) && (
                <p className="text-xs text-suave">{moeda(Number(r.total_tabela) - Number(r.total))} em descontos</p>
              )}
            </div>
            <div className="cartao">
              <p className="text-xs text-suave">Atendimentos</p>
              <p className="text-2xl font-bold">{r.atendimentos}</p>
              <p className="text-xs text-suave">{r.qtd_promocoes} serviço(s) com promoção/desconto</p>
            </div>
            <div className="cartao">
              <p className="text-xs text-suave">Faltas</p>
              <p className="text-2xl font-bold">{r.faltas}</p>
              <p className="text-xs text-suave">{r.cancelados} cancelado(s)</p>
            </div>
            <div className="cartao">
              <p className="text-xs text-suave">Ticket médio</p>
              <p className="text-2xl font-bold">{moeda(r.atendimentos ? Number(r.total) / r.atendimentos : 0)}</p>
            </div>
          </section>

          {r.sem_fechamento > 0 && (
            <p className="aviso selo-amarelo block">
              {r.sem_fechamento} horário(s) já passaram e ainda não foram fechados (sem pagamento registrado). Feche-os na Agenda para entrarem no total.
            </p>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <Tabela
              titulo="Por forma de pagamento"
              colunas={["Forma", "Atend.", "Valor"]}
              linhas={r.por_pagamento.map((x) => [PAGAMENTOS[x.forma] ?? x.forma, x.qtd, moeda(x.valor)])}
            />
            <Tabela
              titulo="Por tipo de serviço"
              colunas={["Tipo", "Qtd.", "Valor"]}
              linhas={r.por_categoria.map((x) => [CATEGORIAS[x.categoria] ?? x.categoria, x.qtd, moeda(x.valor)])}
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
