import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SeloStatus } from "@/components/SeloStatus";
import { dataExtensa, hora, type Status } from "@/lib/formatar";
import { linkRota } from "@/lib/maps";
import { createClient } from "@/lib/supabase/server";
import { partesLocais } from "@/lib/tempo";
import { linkWhats } from "@/lib/whatsapp";
import { BotoesResposta } from "./BotoesResposta";

export const metadata: Metadata = { title: "Seu horário", robots: { index: false } };

type Info = {
  status: Status;
  inicio: string;
  fim: string;
  cliente: string;
  profissional: string;
  servicos: string[];
  barbearia: {
    nome: string;
    slug: string;
    endereco: string | null;
    cidade: string | null;
    maps_url: string | null;
    whatsapp: string | null;
    fuso: string;
  };
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function Page({ params, searchParams }: PageProps<"/c/[token]">) {
  const { token } = await params;
  const { novo } = await searchParams;
  if (!UUID.test(token)) notFound();

  const supabase = await createClient();
  const { data } = await supabase.rpc("confirmacao_ver", { p_token: token });
  const info = data as Info | null;
  if (!info) notFound();

  const b = info.barbearia;
  const dia = partesLocais(new Date(info.inicio), b.fuso).data;
  const aberto = (info.status === "agendado" || info.status === "confirmado") && new Date(info.fim) > new Date();
  const rota = linkRota(b);
  const whats = linkWhats(b.whatsapp, `Olá! Sobre meu horário de ${dataExtensa(dia)} às ${hora(info.inicio, b.fuso)}.`);

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-10">
      {novo === "1" && <p className="aviso selo-verde mb-6 block">Horário marcado! Guarde este link: por ele você confirma ou cancela.</p>}
      <p className="text-sm text-suave">{b.nome}</p>
      <h1 className="titulo mt-1">Olá, {info.cliente}!</h1>

      <div className="cartao mt-6 space-y-2">
        <p className="text-lg font-semibold capitalize">{dataExtensa(dia)}</p>
        <p className="text-3xl font-bold">{hora(info.inicio, b.fuso)}</p>
        <p className="text-sm">{info.servicos.join(" + ")} · com {info.profissional}</p>
        <SeloStatus status={info.status} />
      </div>

      {aberto ? (
        <section className="mt-6">
          <h2 className="subtitulo mb-3">Você vem?</h2>
          <BotoesResposta token={token} status={info.status} />
          <p className="ajuda mt-3">Se não puder vir, toque em “Não vou” para liberarmos o horário para outra pessoa.</p>
        </section>
      ) : info.status === "cancelado" ? (
        <p className="mt-6 text-sm">
          Este horário foi cancelado.{" "}
          <Link href={`/b/${b.slug}/agendar`} className="font-medium text-destaque underline">Marcar outro horário</Link>
        </p>
      ) : null}

      <div className="mt-8 flex flex-col gap-2">
        {rota && (
          <a href={rota} target="_blank" rel="noopener noreferrer" className="btn">📍 Como chegar (Google Maps)</a>
        )}
        {whats && (
          <a href={whats} target="_blank" rel="noopener noreferrer" className="btn">Falar com a barbearia</a>
        )}
        {b.endereco && <p className="text-center text-xs text-suave">{[b.endereco, b.cidade].filter(Boolean).join(" · ")}</p>}
      </div>
    </main>
  );
}
