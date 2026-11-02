import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Cabecalho } from "@/components/Cabecalho";
import { assinaturaLiberada } from "@/lib/assinatura";
import { carregarBarbeariaPublica } from "@/lib/dados";
import { CATEGORIAS, moeda } from "@/lib/formatar";
import { linkRota } from "@/lib/maps";
import { precoDoDia } from "@/lib/precos";
import { hojeLocal, NOMES_DIAS } from "@/lib/tempo";
import { linkWhats, telefoneBonito } from "@/lib/whatsapp";

export async function generateMetadata({ params }: PageProps<"/b/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const d = await carregarBarbeariaPublica(slug);
  return d ? { title: d.barbearia.nome, description: `Agende seu horário na ${d.barbearia.nome}.` } : {};
}

export default async function Page({ params }: PageProps<"/b/[slug]">) {
  const { slug } = await params;
  const d = await carregarBarbeariaPublica(slug);
  if (!d) notFound();
  const { barbearia: b, servicos, promocoes, horarios, profissionais } = d;

  const hoje = hojeLocal(b.fuso);
  const rota = linkRota(b);
  const whats = linkWhats(b.whatsapp, "Olá! Vim pelo site de agendamento.");
  const liberada = assinaturaLiberada(b);

  // Resumo dos dias de atendimento (somando todos os profissionais)
  const porDia = new Map<number, string[]>();
  for (const h of horarios) {
    if (!profissionais.some((p) => p.id === h.profissional_id)) continue;
    const faixa = `${h.inicio.slice(0, 5)}–${h.fim.slice(0, 5)}`;
    const lista = porDia.get(h.dia_semana) ?? [];
    if (!lista.includes(faixa)) lista.push(faixa);
    porDia.set(h.dia_semana, lista);
  }

  return (
    <>
      <Cabecalho />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <h1 className="titulo text-3xl">{b.nome}</h1>
        {b.descricao && <p className="mt-2 text-suave">{b.descricao}</p>}
        {(b.endereco || b.cidade) && (
          <p className="mt-2 text-sm">{[b.endereco, b.cidade].filter(Boolean).join(" · ")}</p>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          {liberada ? (
            <Link href={`/b/${b.slug}/agendar`} className="btn-primario">Agendar horário</Link>
          ) : (
            <p className="aviso selo-amarelo block w-full">O agendamento online está pausado. Fale com a barbearia pelo WhatsApp.</p>
          )}
          {rota && (
            <a href={rota} target="_blank" rel="noopener noreferrer" className="btn">📍 Como chegar (Google Maps)</a>
          )}
          {whats && (
            <a href={whats} target="_blank" rel="noopener noreferrer" className="btn">WhatsApp {telefoneBonito(b.whatsapp)}</a>
          )}
          {b.instagram && (
            <a href={`https://instagram.com/${b.instagram.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer" className="btn">
              Instagram
            </a>
          )}
        </div>

        <section className="mt-10">
          <h2 className="subtitulo mb-3">Serviços e preços</h2>
          {servicos.length === 0 ? (
            <p className="text-sm text-suave">A barbearia ainda não cadastrou os serviços.</p>
          ) : (
            <ul className="divide-y divide-borda rounded-xl border border-borda bg-superficie">
              {servicos.map((s) => {
                const p = precoDoDia(s, promocoes, hoje);
                return (
                  <li key={s.id} className="flex items-start justify-between gap-4 p-4">
                    <div>
                      <p className="font-medium">{s.nome}</p>
                      <p className="text-xs text-suave">
                        {CATEGORIAS[s.categoria]} · {s.duracao_min} min
                        {s.descricao ? ` · ${s.descricao}` : ""}
                      </p>
                      {p.promocao && <span className="selo selo-verde mt-1">Hoje: {p.promocao}</span>}
                    </div>
                    <div className="text-right whitespace-nowrap">
                      {p.promocao && <p className="text-xs text-suave line-through">{moeda(p.precoTabela)}</p>}
                      <p className="font-semibold">{moeda(p.preco)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {porDia.size > 0 && (
          <section className="mt-10">
            <h2 className="subtitulo mb-3">Horário de atendimento</h2>
            <ul className="cartao space-y-1 text-sm">
              {[1, 2, 3, 4, 5, 6, 0].map((dia) => (
                <li key={dia} className="flex justify-between gap-4">
                  <span>{NOMES_DIAS[dia]}</span>
                  <span className="text-suave">{porDia.get(dia)?.sort().join(", ") ?? "Fechado"}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}
