import { Avatar } from "@/components/Avatar";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { CopiarTexto } from "@/components/CopiarTexto";
import { EnviarFoto } from "@/components/EnviarFoto";
import { FormularioAcao } from "@/components/FormularioAcao";
import { dataCurta } from "@/lib/formatar";
import { exigirDono } from "@/lib/painel";
import { urlSite } from "@/lib/site";
import { partesLocais } from "@/lib/tempo";
import type { NaoFaz, Profissional, Servico } from "@/lib/tipos";
import { apagarConvite, criarConvite, removerDaEquipe, salvarProfissional, salvarServicosDoProfissional } from "../acoes";

export const metadata = { title: "Equipe" };

type Convite = { id: string; codigo: string; profissional_id: string | null; expira_em: string; usado_em: string | null };

export default async function Page() {
  const { supabase, barbearia: b, user } = await exigirDono();
  const [{ data: pr }, { data: cv }, { data: sv }, { data: nf }] = await Promise.all([
    supabase.from("profissionais").select("*").eq("barbearia_id", b.id).order("ativo", { ascending: false }).order("ordem").order("nome"),
    supabase.from("convites").select("*").eq("barbearia_id", b.id).is("usado_em", null).gt("expira_em", new Date().toISOString()).order("criado_em", { ascending: false }),
    supabase.from("servicos").select("*").eq("barbearia_id", b.id).eq("ativo", true).order("ordem").order("nome"),
    supabase.from("profissional_nao_faz").select("profissional_id, servico_id").eq("barbearia_id", b.id),
  ]);
  const profissionais = (pr ?? []) as Profissional[];
  const servicos = (sv ?? []) as Servico[];
  const naoFaz = (nf ?? []) as NaoFaz[];
  const faz = (p: string, s: string) => !naoFaz.some((x) => x.profissional_id === p && x.servico_id === s);
  const convites = (cv ?? []) as Convite[];
  const linkConvite = (c: Convite) => `${urlSite()}/convite/${c.codigo}`;
  const msgConvite = (c: Convite) =>
    `Olá! Este é o convite para você entrar na equipe da ${b.nome} no Seu Barbeiro. Crie sua conta e aceite por aqui (vale por 7 dias):\n${linkConvite(c)}`;

  return (
    <div className="space-y-10">
      <section>
        <h1 className="titulo text-4xl">Equipe</h1>
        <p className="mt-1 max-w-2xl text-sm text-suave">
          Cada barbeiro cuida da própria agenda, dos horários, dos clientes e vê só o próprio relatório. Você, como dono, vê e mexe em tudo.
        </p>
      </section>

      <section className="cartao">
        <h2 className="subtitulo mb-1">Convidar barbeiro</h2>
        <p className="mb-4 text-sm text-suave">
          Gere um link e mande para o barbeiro. Ele cria a conta dele, escolhe “Barbeiro” ou “Barbeira” e já entra na equipe. Cada link serve para uma pessoa e vale 7 dias.
        </p>
        <form action={criarConvite}>
          <BotaoEnviar pendente="Gerando…">Gerar link de convite</BotaoEnviar>
        </form>
        {convites.length > 0 && (
          <ul className="mt-4 space-y-2">
            {convites.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-superficie-2 p-3 text-sm">
                <code className="min-w-0 flex-1 truncate text-xs">{linkConvite(c)}</code>
                <span className="text-xs text-suave">até {dataCurta(partesLocais(new Date(c.expira_em), b.fuso).data)}</span>
                <CopiarTexto texto={linkConvite(c)} rotulo="Copiar link" />
                <a href={`https://wa.me/?text=${encodeURIComponent(msgConvite(c))}`} target="_blank" rel="noopener noreferrer" className="btn btn-pequeno">
                  Mandar no WhatsApp
                </a>
                <form action={apagarConvite}>
                  <input type="hidden" name="id" value={c.id} />
                  <button className="btn-perigo btn-pequeno">Cancelar</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="subtitulo mb-3">Profissionais</h2>
        <ul className="grid gap-4 md:grid-cols-2">
          {profissionais.map((p) => {
            const souEu = p.user_id === user.id;
            return (
              <li key={p.id} className={`cartao ${p.ativo ? "" : "opacity-60"}`}>
                <div className="flex items-center gap-3">
                  <Avatar nome={p.nome} foto={p.foto_url} tamanho={64} />
                  <div className="min-w-0">
                    <p className="text-xs font-bold tracking-[0.2em] text-destaque uppercase">{p.titulo}</p>
                    <p className="truncate font-titulo text-2xl leading-none font-extrabold uppercase">{p.nome}</p>
                    <p className="mt-1 text-xs text-suave">
                      {souEu ? "Você (dono)" : p.user_id ? "Tem conta própria" : p.ativo ? "Sem conta: você cuida da agenda dele" : "Fora da equipe"}
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <EnviarFoto barbeariaId={b.id} tipo="profissional" id={p.id} temFoto={!!p.foto_url} rotulo={p.foto_url ? "Trocar foto" : "Pôr foto"} />
                </div>
                <FormularioAcao acao={salvarProfissional} className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                  <input type="hidden" name="id" value={p.id} />
                  <input name="nome" defaultValue={p.nome} className="campo" aria-label="Nome" />
                  <select name="titulo" defaultValue={p.titulo} className="campo" aria-label="Título">
                    <option>Barbeiro</option>
                    <option>Barbeira</option>
                  </select>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="ativo" defaultChecked={p.ativo} /> Atendendo (aparece para os clientes)
                  </label>
                  <BotaoEnviar className="btn btn-pequeno">Salvar</BotaoEnviar>
                </FormularioAcao>
                {p.ativo && servicos.length > 0 && (
                  <FormularioAcao acao={salvarServicosDoProfissional} className="mt-3 border-t border-borda pt-3">
                    <input type="hidden" name="profissional_id" value={p.id} />
                    <fieldset>
                      <legend className="mb-2 text-sm font-semibold">Serviços que {p.nome.split(" ")[0]} faz</legend>
                      <div className="flex flex-wrap gap-2">
                        {servicos.map((s) => (
                          <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded-full border border-borda bg-superficie-2 px-3 py-1.5 text-sm has-[:checked]:border-destaque">
                            <input type="checkbox" name="servicos" value={s.id} defaultChecked={faz(p.id, s.id)} className="accent-[var(--destaque)]" />
                            {s.nome}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <p className="ajuda mt-2">O cliente só consegue marcar com {p.nome.split(" ")[0]} os serviços marcados aqui.</p>
                    <BotaoEnviar className="btn btn-pequeno mt-2">Salvar serviços</BotaoEnviar>
                  </FormularioAcao>
                )}
                {!souEu && (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-borda pt-3">
                    {!p.user_id && p.ativo && (
                      <form action={criarConvite}>
                        <input type="hidden" name="profissional_id" value={p.id} />
                        <button className="btn btn-pequeno">Convidar para ter conta própria</button>
                      </form>
                    )}
                    {p.user_id && (
                      <form action={removerDaEquipe}>
                        <input type="hidden" name="id" value={p.id} />
                        <button className="btn-perigo btn-pequeno">Remover da equipe</button>
                      </form>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="cartao border-dashed">
        <h2 className="subtitulo mb-1">Cadastrar profissional sem conta</h2>
        <p className="mb-3 text-sm text-suave">Para quem não vai usar o painel. Você cuida da agenda dele e pode convidá-lo depois.</p>
        <FormularioAcao acao={salvarProfissional} limparAoSalvar className="flex flex-wrap gap-2">
          <input name="nome" className="campo max-w-xs" placeholder="Nome completo" required />
          <select name="titulo" className="campo w-auto" aria-label="Título">
            <option>Barbeiro</option>
            <option>Barbeira</option>
          </select>
          <BotaoEnviar className="btn" pendente="Adicionando…">Adicionar</BotaoEnviar>
        </FormularioAcao>
      </section>
    </div>
  );
}
