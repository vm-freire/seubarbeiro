import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { EnviarFoto } from "@/components/EnviarFoto";
import { FormularioAcao } from "@/components/FormularioAcao";
import { exigirBarbearia } from "@/lib/painel";
import { salvarPerfil } from "../acoes";

export const metadata = { title: "Meu perfil" };

export default async function Page({ searchParams }: PageProps<"/painel/perfil">) {
  const { bemvindo } = await searchParams;
  const { barbearia: b, meuProfissional: p, user } = await exigirBarbearia();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {bemvindo === "1" && (
        <p className="aviso selo-verde entrar block">
          Bem-vindo à equipe da {b.nome}! Coloque sua foto e confira seus horários em <Link href="/painel/horarios" className="underline">Horários e folgas</Link>.
        </p>
      )}
      <h1 className="titulo text-4xl">Meu perfil</h1>

      {!p ? (
        <p className="cartao text-sm text-suave">
          Você ainda não aparece como profissional nesta barbearia. O dono pode cadastrar você em Equipe.
        </p>
      ) : (
        <>
          <section className="cartao flex flex-wrap items-center gap-4">
            <Avatar nome={p.nome} foto={p.foto_url} tamanho={96} />
            <div className="space-y-2">
              <p className="text-sm text-suave">É esta foto que os clientes veem na hora de escolher o profissional.</p>
              <EnviarFoto barbeariaId={b.id} tipo="profissional" id={p.id} temFoto={!!p.foto_url} rotulo={p.foto_url ? "Trocar foto" : "Enviar foto"} />
            </div>
          </section>

          <section className="cartao">
            <FormularioAcao acao={salvarPerfil} className="space-y-4">
              <div>
                <label className="rotulo" htmlFor="nome">Nome completo</label>
                <input id="nome" name="nome" defaultValue={p.nome} required minLength={2} maxLength={60} className="campo" />
              </div>
              <fieldset>
                <legend className="rotulo">Como você aparece para os clientes</legend>
                <div className="grid grid-cols-2 gap-2">
                  {["Barbeiro", "Barbeira"].map((t) => (
                    <label key={t} className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-borda p-3 font-semibold has-[:checked]:border-destaque has-[:checked]:bg-superficie-2">
                      <input type="radio" name="titulo" value={t} defaultChecked={p.titulo === t} className="accent-[var(--destaque)]" /> {t}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div>
                <label className="rotulo" htmlFor="bio">Sobre você (opcional)</label>
                <textarea id="bio" name="bio" defaultValue={p.bio ?? ""} maxLength={160} rows={2} className="campo py-2" placeholder="Ex.: Especialista em degradê e barba desenhada." />
              </div>
              <BotaoEnviar>Salvar perfil</BotaoEnviar>
            </FormularioAcao>
          </section>
        </>
      )}
      <p className="text-sm text-suave">Conta: {user.email}</p>
    </div>
  );
}
