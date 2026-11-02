import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { Cabecalho } from "@/components/Cabecalho";
import { FormularioAcao } from "@/components/FormularioAcao";
import { LogoMarca } from "@/components/Logo";
import { usuarioAtual } from "@/lib/dados";
import { createClient } from "@/lib/supabase/server";
import { aceitarConvite } from "./acoes";

export const metadata: Metadata = { title: "Convite para a equipe", robots: { index: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Convite = { barbearia: string; slug: string; valido: boolean; usado: boolean; nome_sugerido: string | null };

export default async function Page({ params }: PageProps<"/convite/[codigo]">) {
  const { codigo } = await params;
  if (!UUID.test(codigo)) notFound();
  const supabase = await createClient();
  const { data } = await supabase.rpc("ver_convite", { p_codigo: codigo });
  const convite = data as Convite | null;
  if (!convite) notFound();
  const usuario = await usuarioAtual();
  const aqui = `/convite/${codigo}`;

  return (
    <>
      <Cabecalho />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-12">
        <div className="entrar text-center">
          <LogoMarca tamanho={72} animado className="mx-auto" />
          <p className="sobretitulo mt-6">Convite para a equipe</p>
          <h1 className="titulo mt-2 text-4xl">{convite.barbearia}</h1>
        </div>

        {!convite.valido ? (
          <p className="aviso selo-amarelo mt-8 block text-center">
            {convite.usado ? "Este convite já foi usado." : "Este convite expirou ou não está mais disponível."} Peça um novo ao dono da barbearia.
          </p>
        ) : !usuario ? (
          <div className="cartao mt-8 space-y-3 text-center">
            <p>Para entrar na equipe, primeiro crie a sua conta (ou entre, se já tiver).</p>
            <Link href={`/cadastro?proximo=${encodeURIComponent(aqui)}`} className="btn-primario w-full">Criar minha conta</Link>
            <Link href={`/entrar?proximo=${encodeURIComponent(aqui)}`} className="btn w-full">Já tenho conta</Link>
          </div>
        ) : (
          <FormularioAcao acao={aceitarConvite} className="cartao mt-8 space-y-4">
            <input type="hidden" name="codigo" value={codigo} />
            <div>
              <label className="rotulo" htmlFor="nome">Seu nome completo</label>
              <input id="nome" name="nome" required minLength={2} maxLength={60} defaultValue={convite.nome_sugerido ?? usuario.nome} className="campo" />
              <p className="ajuda">É assim que os clientes vão ver você na hora de agendar.</p>
            </div>
            <fieldset>
              <legend className="rotulo">Como você quer aparecer?</legend>
              <div className="grid grid-cols-2 gap-2">
                {["Barbeiro", "Barbeira"].map((t, i) => (
                  <label key={t} className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-borda p-3 font-semibold has-[:checked]:border-destaque has-[:checked]:bg-superficie-2">
                    <input type="radio" name="titulo" value={t} defaultChecked={i === 0} className="accent-[var(--destaque)]" /> {t}
                  </label>
                ))}
              </div>
            </fieldset>
            <BotaoEnviar className="btn-primario w-full" pendente="Entrando…">Entrar na equipe</BotaoEnviar>
            <p className="ajuda text-center">Você vai cuidar da sua agenda, seus horários e seus clientes. Depois coloque sua foto em “Meu perfil”.</p>
          </FormularioAcao>
        )}
      </main>
    </>
  );
}
