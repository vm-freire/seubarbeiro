import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Cabecalho } from "@/components/Cabecalho";
import { Rodape } from "@/components/Rodape";
import { assinaturaLiberada } from "@/lib/assinatura";
import { carregarBarbeariaPublica } from "@/lib/dados";
import { Galeria } from "./Galeria";

export async function generateMetadata({ params }: PageProps<"/b/[slug]/galeria">): Promise<Metadata> {
  const { slug } = await params;
  const d = await carregarBarbeariaPublica(slug);
  return d ? { title: `Galeria · ${d.barbearia.nome}`, description: `Cortes e trabalhos da ${d.barbearia.nome}.` } : {};
}

export default async function Page({ params, searchParams }: PageProps<"/b/[slug]/galeria">) {
  const { slug } = await params;
  const { foto } = await searchParams;
  const d = await carregarBarbeariaPublica(slug);
  if (!d) notFound();
  const { barbearia: b, trabalhos, profissionais } = d;
  const fotos = trabalhos.map((t) => ({
    id: t.id,
    url: t.url,
    legenda: t.legenda,
    profissional: profissionais.find((p) => p.id === t.profissional_id)?.nome ?? null,
  }));

  return (
    <>
      <Cabecalho barbearia={b.nome} link={`/b/${b.slug}`} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <Link href={`/b/${b.slug}`} className="text-sm font-semibold text-suave hover:text-texto">← {b.nome}</Link>
        <div className="mt-3 mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="sobretitulo">Feito aqui</p>
            <h1 className="titulo mt-2 text-5xl">Galeria</h1>
          </div>
          {assinaturaLiberada(b) && (
            <Link href={`/b/${b.slug}/agendar`} className="btn-primario">Agendar horário</Link>
          )}
        </div>
        {fotos.length === 0 ? (
          <p className="cartao text-sm text-suave">Ainda não há fotos por aqui.</p>
        ) : (
          <Galeria fotos={fotos} inicial={typeof foto === "string" ? foto : undefined} />
        )}
      </main>
      <Rodape />
    </>
  );
}
