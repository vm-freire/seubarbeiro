import { BotaoEnviar } from "@/components/BotaoEnviar";
import { FormularioAcao } from "@/components/FormularioAcao";
import { CATEGORIAS, dataCurta, moeda } from "@/lib/formatar";
import { exigirDono } from "@/lib/painel";
import { NOMES_DIAS_CURTOS } from "@/lib/tempo";
import type { Promocao, Servico } from "@/lib/tipos";
import { alternarPromocao, removerPromocao, removerServico, salvarPromocao, salvarServico } from "../acoes";

export const metadata = { title: "Serviços e preços" };

function CamposServico({ s }: { s?: Servico }) {
  return (
    <>
      {s && <input type="hidden" name="id" value={s.id} />}
      <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <label className="rotulo text-xs" htmlFor={`nome-${s?.id ?? "novo"}`}>Nome</label>
          <input id={`nome-${s?.id ?? "novo"}`} name="nome" defaultValue={s?.nome} required maxLength={60} className="campo" placeholder="Ex.: Corte degradê" />
        </div>
        <div>
          <label className="rotulo text-xs" htmlFor={`cat-${s?.id ?? "novo"}`}>Tipo</label>
          <select id={`cat-${s?.id ?? "novo"}`} name="categoria" defaultValue={s?.categoria ?? "corte"} className="campo">
            {Object.entries(CATEGORIAS).map(([v, r]) => (
              <option key={v} value={v}>{r}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="rotulo text-xs" htmlFor={`preco-${s?.id ?? "novo"}`}>Preço (R$)</label>
          <input id={`preco-${s?.id ?? "novo"}`} name="preco" inputMode="decimal" defaultValue={s ? Number(s.preco).toFixed(2) : ""} required className="campo" />
        </div>
        <div>
          <label className="rotulo text-xs" htmlFor={`dur-${s?.id ?? "novo"}`}>Duração (min)</label>
          <input id={`dur-${s?.id ?? "novo"}`} name="duracao_min" type="number" min={5} max={480} step={5} defaultValue={s?.duracao_min ?? 30} required className="campo" />
        </div>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-[3fr_1fr_auto]">
        <input name="descricao" defaultValue={s?.descricao ?? ""} placeholder="Descrição (opcional)" className="campo" />
        <input name="ordem" type="number" defaultValue={s?.ordem ?? 0} className="campo" aria-label="Ordem na lista" title="Ordem na lista" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="ativo" defaultChecked={s ? s.ativo : true} /> Aparece para o cliente
        </label>
      </div>
    </>
  );
}

function descreverPromocao(p: Promocao) {
  const partes: string[] = [];
  partes.push(p.dias_semana?.length ? p.dias_semana.map((d) => NOMES_DIAS_CURTOS[d]).join(", ") : "todos os dias");
  if (p.data_inicio) partes.push(`a partir de ${dataCurta(p.data_inicio)}`);
  if (p.data_fim) partes.push(`até ${dataCurta(p.data_fim)}`);
  return partes.join(" · ");
}

export default async function Page() {
  const { supabase, barbearia } = await exigirDono();
  const [{ data: sv }, { data: pr }] = await Promise.all([
    supabase.from("servicos").select("*").eq("barbearia_id", barbearia.id).order("ordem").order("nome"),
    supabase.from("promocoes").select("*").eq("barbearia_id", barbearia.id).order("criado_em", { ascending: false }),
  ]);
  const servicos = (sv ?? []) as Servico[];
  const promocoes = (pr ?? []) as Promocao[];

  return (
    <div className="space-y-10">
      <section>
        <h1 className="titulo mb-1">Serviços e preços</h1>
        <p className="mb-4 text-sm text-suave">
          Combos (ex.: cabelo + barba) entram como um serviço do tipo “Combo”, com preço e duração próprios. O cliente pode marcar mais de um serviço.
        </p>
        <ul className="space-y-3">
          {servicos.map((s) => (
            <li key={s.id} className={`cartao ${s.ativo ? "" : "opacity-60"}`}>
              <FormularioAcao acao={salvarServico}>
                <CamposServico s={s} />
                <div className="mt-3 flex gap-2">
                  <BotaoEnviar className="btn btn-pequeno">Salvar</BotaoEnviar>
                </div>
              </FormularioAcao>
              <form action={removerServico} className="mt-2">
                <input type="hidden" name="id" value={s.id} />
                <button className="btn-perigo btn-pequeno">Excluir serviço</button>
              </form>
            </li>
          ))}
        </ul>

        <div className="cartao mt-4 border-dashed">
          <h2 className="mb-2 font-semibold">Adicionar serviço</h2>
          <FormularioAcao acao={salvarServico} limparAoSalvar>
            <CamposServico />
            <div className="mt-3">
              <BotaoEnviar pendente="Adicionando…">Adicionar</BotaoEnviar>
            </div>
          </FormularioAcao>
        </div>
      </section>

      <section>
        <h2 className="subtitulo mb-1">Promoções</h2>
        <p className="mb-4 text-sm text-suave">
          Preço especial por dia da semana (ex.: “terça do corte”) ou por período. Vale o menor preço. Na hora de fechar o atendimento você ainda pode mudar o valor.
        </p>

        {promocoes.length > 0 && (
          <ul className="mb-4 divide-y divide-borda rounded-xl border border-borda bg-superficie">
            {promocoes.map((p) => {
              const s = servicos.find((x) => x.id === p.servico_id);
              return (
                <li key={p.id} className={`flex flex-wrap items-center justify-between gap-2 p-3 ${p.ativa ? "" : "opacity-60"}`}>
                  <span className="text-sm">
                    <strong>{p.nome}</strong>: {s?.nome} por {moeda(p.preco)}
                    {s && <span className="text-suave"> (normal {moeda(s.preco)})</span>}
                    <span className="block text-xs text-suave">{descreverPromocao(p)}</span>
                  </span>
                  <span className="flex gap-2">
                    <form action={alternarPromocao}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="ativa" value={p.ativa ? "0" : "1"} />
                      <button className="btn btn-pequeno">{p.ativa ? "Pausar" : "Reativar"}</button>
                    </form>
                    <form action={removerPromocao}>
                      <input type="hidden" name="id" value={p.id} />
                      <button className="btn-perigo btn-pequeno">Excluir</button>
                    </form>
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        <div className="cartao border-dashed">
          <h3 className="mb-2 font-semibold">Nova promoção</h3>
          <FormularioAcao acao={salvarPromocao} limparAoSalvar className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-3">
              <div>
                <label className="rotulo text-xs" htmlFor="p-serv">Serviço</label>
                <select id="p-serv" name="servico_id" required className="campo">
                  {servicos.map((s) => (
                    <option key={s.id} value={s.id}>{s.nome} ({moeda(s.preco)})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="rotulo text-xs" htmlFor="p-nome">Nome da promoção</label>
                <input id="p-nome" name="nome" className="campo" placeholder="Ex.: Terça do corte" />
              </div>
              <div>
                <label className="rotulo text-xs" htmlFor="p-preco">Preço promocional (R$)</label>
                <input id="p-preco" name="preco" inputMode="decimal" required className="campo" />
              </div>
            </div>
            <fieldset>
              <legend className="rotulo text-xs">Dias da semana (nenhum marcado = todos)</legend>
              <div className="flex flex-wrap gap-2">
                {NOMES_DIAS_CURTOS.map((n, i) => (
                  <label key={n} className="flex items-center gap-1 rounded-lg border border-borda px-2 py-1 text-sm">
                    <input type="checkbox" name="dias" value={i} /> {n}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="rotulo text-xs" htmlFor="p-ini">Começa em (opcional)</label>
                <input id="p-ini" name="data_inicio" type="date" className="campo" />
              </div>
              <div>
                <label className="rotulo text-xs" htmlFor="p-fim">Termina em (opcional)</label>
                <input id="p-fim" name="data_fim" type="date" className="campo" />
              </div>
            </div>
            <BotaoEnviar pendente="Criando…">Criar promoção</BotaoEnviar>
          </FormularioAcao>
        </div>
      </section>
    </div>
  );
}
