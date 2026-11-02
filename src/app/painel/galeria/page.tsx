import Image from "next/image";
import Link from "next/link";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { FormularioAcao } from "@/components/FormularioAcao";
import { exigirBarbearia } from "@/lib/painel";
import type { Trabalho } from "@/lib/tipos";
import { apagarTrabalho, salvarLegenda } from "../acoes";
import { EnviarTrabalhos } from "./EnviarTrabalhos";

export const metadata = { title: "Galeria" };

export default async function Page() {
  const { supabase, barbearia: b, dono, meuProfissional } = await exigirBarbearia();
  const [{ data: tr }, { data: pr }] = await Promise.all([
    supabase.from("trabalhos").select("*").eq("barbearia_id", b.id).order("criado_em", { ascending: false }),
    supabase.from("profissionais").select("id, nome").eq("barbearia_id", b.id).eq("ativo", true).order("ordem").order("nome"),
  ]);
  const trabalhos = (tr ?? []) as Trabalho[];
  const profissionais = (pr ?? []) as { id: string; nome: string }[];
  const nomeDe = (id: string | null) => (id ? profissionais.find((p) => p.id === id)?.nome ?? "" : "Barbearia");
  // barbeiro mexe só nas fotos dele (o banco garante; aqui só esconde os botões)
  const podeMexer = (t: Trabalho) => dono || (!!meuProfissional && t.profissional_id === meuProfissional.id);

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="titulo text-4xl">Galeria</h1>
          <p className="mt-1 max-w-2xl text-sm text-suave">
            Fotos de cortes e trabalhos. Elas passam no carrossel da página da barbearia e ficam todas na galeria. Até 120 fotos.
          </p>
        </div>
        <Link href={`/b/${b.slug}/galeria`} target="_blank" className="btn btn-pequeno">Ver galeria pública</Link>
      </section>

      <section className="cartao">
        <h2 className="subtitulo mb-3">Enviar fotos</h2>
        <EnviarTrabalhos barbeariaId={b.id} profissionais={profissionais} dono={dono} meuProfissionalId={meuProfissional?.id ?? null} />
      </section>

      <section>
        <h2 className="subtitulo mb-3">
          {trabalhos.length} foto{trabalhos.length === 1 ? "" : "s"}
        </h2>
        {trabalhos.length === 0 ? (
          <p className="cartao text-sm text-suave">Nenhuma foto ainda. Mande as primeiras: o carrossel aparece na página assim que tiver fotos.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {trabalhos.map((t) => (
              <li key={t.id} className="overflow-hidden rounded-2xl border border-borda bg-superficie">
                <div className="relative aspect-square bg-superficie-2">
                  <Image src={t.url} alt={t.legenda ?? "Trabalho"} fill sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw" className="object-cover" />
                  <span className="absolute top-2 left-2 rounded-full bg-black/65 px-2 py-0.5 text-xs font-semibold text-white">{nomeDe(t.profissional_id)}</span>
                </div>
                {podeMexer(t) ? (
                  <div className="space-y-2 p-2">
                    <FormularioAcao acao={salvarLegenda} className="flex gap-1">
                      <input type="hidden" name="id" value={t.id} />
                      <input name="legenda" defaultValue={t.legenda ?? ""} maxLength={120} placeholder="Legenda" className="campo min-h-9 min-w-0 flex-1 text-sm" aria-label="Legenda" />
                      <BotaoEnviar className="btn btn-pequeno" pendente="…">OK</BotaoEnviar>
                    </FormularioAcao>
                    <form action={apagarTrabalho}>
                      <input type="hidden" name="id" value={t.id} />
                      <button className="btn-perigo btn-pequeno w-full">Apagar foto</button>
                    </form>
                  </div>
                ) : (
                  t.legenda && <p className="p-2 text-sm">{t.legenda}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
