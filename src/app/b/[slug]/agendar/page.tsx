import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Cabecalho } from "@/components/Cabecalho";
import { assinaturaLiberada } from "@/lib/assinatura";
import { carregarBarbeariaPublica, limiteAgenda, usuarioAtual } from "@/lib/dados";
import { hojeLocal } from "@/lib/tempo";
import { Agendador } from "./Agendador";

export const metadata: Metadata = { title: "Agendar" };

export default async function Page({ params, searchParams }: PageProps<"/b/[slug]/agendar">) {
  const { slug } = await params;
  const sp = await searchParams;
  const d = await carregarBarbeariaPublica(slug);
  if (!d) notFound();
  const usuario = await usuarioAtual();
  const texto = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

  return (
    <>
      <Cabecalho barbearia={d.barbearia.nome} link={`/b/${slug}`} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <Link href={`/b/${slug}`} className="text-sm text-suave underline">← {d.barbearia.nome}</Link>
        <h1 className="titulo entrar mt-2 mb-6 text-4xl">Agendar horário</h1>
        {assinaturaLiberada(d.barbearia) ? (
          <Agendador
            dados={d}
            hoje={hojeLocal(d.barbearia.fuso)}
            ultimoDia={limiteAgenda(d.barbearia)}
            usuario={usuario}
            inicial={{ s: texto(sp.s), p: texto(sp.p), d: texto(sp.d), h: texto(sp.h) }}
          />
        ) : (
          <p className="aviso selo-amarelo block">O agendamento online desta barbearia está pausado. Fale com ela pelo WhatsApp.</p>
        )}
      </main>
    </>
  );
}
